// Backend for the Polotno + Teemill demo.
//
// The editor runs in the browser, so it cannot hold the Teemill credentials.
// This server holds them and exposes:
//
//   GET /health
//   GET /teemill/print-area
//   POST /teemill/product
//
// Env:
//   TEEMILL_PUBLIC_KEY
//   ALLOWED_ORIGINS comma-separated, defaults to localhost:5173

import http from 'node:http';

const env = process.env;
const PORT = Number(env.PORT || 8787);
const PUBLIC_URL = (env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ALLOWED_ORIGINS = (
  env.ALLOWED_ORIGINS ||
  'http://localhost:5173'
).split(',');

const SIDES = ['front', 'back'];

const MAX_BODY = 25 * 1024 * 1024;

// --- helpers ------------------------------------------------------------------

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(base, token, path, { method = 'GET', body, headers = {} } = {}) {
  // A provider with its own auth header passes Authorization: undefined.
  const allHeaders = Object.fromEntries(
    Object.entries({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }).filter(
      ([, v]) => v !== undefined
    )
  );
  const res = await fetch(base + path, {
    method,
    headers: allHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const detail = json?.error?.message || json?.message || json?.result || text;
    throw new HttpError(502, `${method} ${path} failed (${res.status}): ${detail}`);
  }
  return json;
}

// The demo posts base64 PNGs per side. Keep only real, non-empty PNG data.
function readSides(body) {
  const sides = {};
  for (const side of SIDES) {
    const value = body?.files?.[side];
    if (!value) continue;
    const base64 = String(value).replace(/^data:image\/png;base64,/, '');
    if (!base64.startsWith('iVBOR')) throw new HttpError(400, `${side} is not a PNG`);
    sides[side] = base64;
  }
  if (!Object.keys(sides).length) throw new HttpError(400, 'No design to send');
  return sides;
}

// --- Teemill --------------------------------------------------------------------

// Teemill's Custom Product endpoint takes one image and returns a product
// page on your Teemill store. Men's Basic T-shirt, in the demo's colours.
const TEEMILL_ITEM = 'RNA1';
const TEEMILL_COLORS = { black: 'Black', blue: 'Bright Blue', red: 'Red' };

// Teemill doesn't publish a print file size for this endpoint; it scales the
// image to the print area. Export large enough to print sharp.
const teemillPrintArea = async () => ({
  areas: { front: { width: 3510, height: 3740 } },
  fromCatalog: false,
  request: 'POST https://teemill.com/omnis/v3/product/create',
});

async function teemillProduct(body) {
  if (!env.TEEMILL_PUBLIC_KEY) throw new HttpError(503, 'TEEMILL_PUBLIC_KEY is not set');
  const sides = readSides(body);
  if (!sides.front) throw new HttpError(400, 'Teemill takes the front design; add some artwork to the front');
  const colours = TEEMILL_COLORS[body.color] || 'Black';
  const productBody = {
    image_url: `data:image/png;base64,${sides.front}`,
    item_code: TEEMILL_ITEM,
    colours,
    name: 'Polotno demo tee',
    price: 20.0,
  };
  const res = await fetch('https://teemill.com/omnis/v3/product/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TEEMILL_PUBLIC_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(productBody),
  });
  const product = await res.json().catch(() => ({}));
  if (!res.ok || !product.url) throw new HttpError(502, `Teemill product create failed (${res.status})`);
  return {
    productUrl: product.url,
    mockups: [{ side: `front, ${colours}`, url: product.colours?.[colours] || product.image }],
    requests: [
      {
        title: 'Create the product from the design',
        endpoint: 'POST https://teemill.com/omnis/v3/product/create',
        body: { ...productBody, image_url: '<base64 PNG>' },
      },
    ],
  };
}

// --- rate limit -----------------------------------------------------------------

const hits = new Map();
function rateLimit(ip, limit = 12, windowMs = 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) throw new HttpError(429, 'Too many requests, try again in a minute');
  recent.push(now);
  hits.set(ip, recent);
}

// --- server ---------------------------------------------------------------------

const routes = {
  'GET /health': async () => ({ ok: true }),
  'GET /teemill/print-area': () => teemillPrintArea(),
  'POST /teemill/product': (body) => teemillProduct(body),
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Design too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {});
      } catch {
        reject(new HttpError(400, 'Body is not JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, PUBLIC_URL);
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const route = routes[`${req.method} ${url.pathname}`];
  try {
    if (!route) throw new HttpError(404, 'Not found');
    if (req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
        .split(',')[0]
        .trim();
      rateLimit(ip);
    }
    const body = req.method === 'POST' ? await readBody(req) : null;
    const result = await route(body, url.searchParams);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(req.method, url.pathname, e.message);
    res
      .writeHead(status, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`pod-proxy listening on ${PORT}`));
