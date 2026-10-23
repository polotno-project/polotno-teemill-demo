// The print step talks to Teemill for real through the backend in
// ../server, which holds the API credentials:
//
//   - the print area on the shirt takes Teemill's real print file size
//   - "Send to Teemill" exports the artwork and shows what Teemill returns
//
// Nothing is ordered.

export const PROVIDER = { id: 'teemill', name: 'Teemill', send: 'product' };

const API = (import.meta.env.VITE_POD_API || 'http://localhost:8787').replace(/\/$/, '');

async function call(path, options) {
  const res = await fetch(API + path, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${PROVIDER.name} request failed`);
  return json;
}

/** The provider's print area for the demo tee: { areas: { front, back }, request }. */
export const fetchPrintArea = (colorId) =>
  call(`/${PROVIDER.id}/print-area?color=${encodeURIComponent(colorId)}`);

/**
 * Send the exported sides; returns { mockups: [{ side, url }], requests } and,
 * for Teemill, the productUrl of the page it created.
 */
export const sendDesign = (files, colorId) =>
  call(`/${PROVIDER.id}/${PROVIDER.send}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ color: colorId, files }),
  });
