// Scene management for the apparel editor.
//
// A SINGLE Polotno page is used (no stacked pages / scrolling). Switching the
// Front/Back tab swaps the garment photo and the user's artwork for that side.
// Three locked, non-selectable garment layers sit on the page:
//   - apparel-mockup  : the photographic garment (bottom)
//   - apparel-overlay : the same photo with the print window punched out (top)
//   - apparel-guide   : the print-area boundary (not exported)
// User artwork lives between mockup and overlay, so it's clipped to the print
// area while the garment hides any overflow.

import {
  VIEW_W,
  VIEW_H,
  PRINT,
  PRINT_MM_W,
  BG,
  mockupImage,
  guideSvg,
} from './products';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const MOCKUP = 'apparel-mockup';
const OVERLAY = 'apparel-overlay';
const GUIDE = 'apparel-guide';

const TRANSPARENT =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>');

const LOCKED = {
  selectable: false,
  draggable: false,
  contentEditable: false,
  removable: false,
  resizable: false,
  custom: { garment: true },
};

const byName = (page, name) => page.children.find((c) => c.name === name);
const isGarment = (c) => c.custom && c.custom.garment;

// Per-session state for the single-page editor.
const state = {
  view: 'front',
  color: null,
  designs: { front: [], back: [] },
};

// --- overlay (punched garment) ---------------------------------------------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const overlayCache = new Map();

function makePunchedOverlay(url) {
  if (overlayCache.has(url)) return overlayCache.get(url);
  const promise = loadImage(url).then((img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || VIEW_W;
    canvas.height = img.naturalHeight || VIEW_H;
    const ctx = canvas.getContext('2d');
    // Opaque grey base so the mockup's (now transparent) background masks
    // overflow art with grey rather than letting it show through.
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    ctx.clearRect(PRINT.x, PRINT.y, PRINT.width, PRINT.height);
    return canvas.toDataURL('image/png');
  });
  overlayCache.set(url, promise);
  return promise;
}

async function applyGarment(page, view, color) {
  const url = mockupImage(color, view);
  byName(page, MOCKUP)?.set({ src: url });
  try {
    const punched = await makePunchedOverlay(url);
    byName(page, OVERLAY)?.set({ src: punched });
  } catch (e) {
    console.error('apparel: overlay generation failed', e);
  }
}

// --- layers -----------------------------------------------------------------

const solidSvg = (color) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="${color}"/></svg>`
  );

function addGarmentLayers(page, view, color) {
  page.set({ background: BG });

  // Opaque background plate covering the whole page (and beyond) so no
  // transparent surface — and therefore no checkerboard — can ever show,
  // regardless of page-background quirks.
  page.addElement({
    type: 'image',
    name: 'apparel-bg',
    src: solidSvg(BG),
    x: -VIEW_W,
    y: -VIEW_H,
    width: VIEW_W * 3,
    height: VIEW_H * 3,
    showInExport: false,
    alwaysOnTop: false,
    ...LOCKED,
  });

  page.addElement({
    type: 'image',
    name: MOCKUP,
    src: mockupImage(color, view),
    x: 0,
    y: 0,
    width: VIEW_W,
    height: VIEW_H,
    showInExport: true,
    alwaysOnTop: false,
    ...LOCKED,
  });

  page.addElement({
    type: 'image',
    name: OVERLAY,
    src: TRANSPARENT,
    x: 0,
    y: 0,
    width: VIEW_W,
    height: VIEW_H,
    showInExport: true,
    alwaysOnTop: true,
    ...LOCKED,
  });

  page.addElement({
    type: 'image',
    name: GUIDE,
    src: guideSvg(),
    x: 0,
    y: 0,
    width: VIEW_W,
    height: VIEW_H,
    showInExport: false,
    alwaysOnTop: true,
    ...LOCKED,
  });
}

const stripId = ({ id, ...rest }) => rest;

function userChildrenJSON(store) {
  const page = store.activePage;
  if (!page) return [];
  // Filter on the live nodes (which reliably carry `custom`), then pull the
  // serialized JSON for those ids.
  const userIds = new Set(page.children.filter((c) => !isGarment(c)).map((c) => c.id));
  const pageJSON = store.toJSON().pages[0];
  if (!pageJSON) return [];
  return pageJSON.children.filter((c) => userIds.has(c.id)).map(stripId);
}

function removeUserElements(store) {
  const ids = store.activePage.children.filter((c) => !isGarment(c)).map((c) => c.id);
  if (ids.length) store.deleteElements(ids);
}

// --- public API -------------------------------------------------------------

export async function setupScene(store, color) {
  state.view = 'front';
  state.color = color;
  state.designs = { front: [], back: [] };
  overlayCache.clear();

  store.setSize(VIEW_W, VIEW_H);
  while (store.pages.length < 1) store.addPage();
  store.pages.slice(1).forEach((p) => store.deletePages([p.id]));

  const page = store.pages[0];
  const ids = page.children.map((c) => c.id);
  if (ids.length) store.deleteElements(ids);
  addGarmentLayers(page, 'front', color);

  store.setSize(VIEW_W, VIEW_H);
  page.set({ background: BG });
  store.selectElements([]);
  await applyGarment(page, 'front', color);
}

export async function switchView(store, to, color) {
  if (to === state.view) return;
  state.color = color;

  // Save current side's artwork, then clear it.
  state.designs[state.view] = userChildrenJSON(store);
  removeUserElements(store);

  // Swap garment, then restore target side's artwork.
  await applyGarment(store.activePage, to, color);
  state.designs[to].forEach((child) => {
    try {
      store.activePage.addElement(child);
    } catch (e) {
      /* skip */
    }
  });
  state.view = to;
  store.selectElements([]);
}

export async function setColor(store, color) {
  state.color = color;
  await applyGarment(store.activePage, state.view, color);
}

// --- print export -----------------------------------------------------------

// Export the print file: only the artwork, clipped to the print area, on a
// transparent 249x265mm page at 300 DPI. `format` is 'pdf' (one file, front
// and back as two pages) or 'png' (one image per side that has artwork).
//
// Polotno can only export from a store that is mounted in a <Workspace>, so
// the print pages are built in a separate `printStore` rendered off-screen
// (see index.jsx). The customer's canvas is never touched.
async function buildPrintPages(store, printStore) {
  // Capture the side currently on screen so both sides are up to date.
  state.designs[state.view] = userChildrenJSON(store);

  // loadJSON needs ids on every page and element; the saved designs have
  // theirs stripped (addElement assigns fresh ones), so mint them here.
  const shift = (side, children) =>
    children.map((c, i) => ({
      ...c,
      id: `print-${side}-${i}`,
      x: (c.x || 0) - PRINT.x,
      y: (c.y || 0) - PRINT.y,
    }));

  // Page pixels -> physical size: PRINT.width px spans 249mm. The raster is
  // rendered at 300 DPI.
  const PRINT_DPI = (PRINT.width * 25.4) / PRINT_MM_W;
  const PRINT_PR = ((PRINT_MM_W / 25.4) * 300) / PRINT.width;

  printStore.loadJSON({
    width: PRINT.width,
    height: PRINT.height,
    dpi: PRINT_DPI,
    unit: 'mm',
    pages: [
      { id: 'print-front', background: 'rgba(0,0,0,0)', children: shift('front', state.designs.front) },
      { id: 'print-back', background: 'rgba(0,0,0,0)', children: shift('back', state.designs.back) },
    ],
  });
  // Let the hidden <Workspace> create the Konva stages for the new pages, and
  // let any artwork images decode.
  await wait(120);
  await printStore.waitLoading();
  return PRINT_PR;
}

/**
 * The print file for each side that has artwork, as PNG data URLs at the
 * given pixel sizes: { front: { width, height }, back: … } -> { front, back }.
 */
export async function exportPrintSides(store, printStore, sizes) {
  await buildPrintPages(store, printStore);
  const files = {};
  for (const page of printStore.pages.filter((p) => p.children.length)) {
    const side = page.id.replace('print-', '');
    const size = sizes[side];
    if (!size) continue;
    files[side] = await printStore.toDataURL({
      pageId: page.id,
      pixelRatio: size.width / PRINT.width,
      mimeType: 'image/png',
    });
  }
  if (!Object.keys(files).length) throw new Error('Add some artwork first');
  return files;
}

export async function downloadPrintAssets(store, printStore, format) {
  const PRINT_PR = await buildPrintPages(store, printStore);

  if (format === 'png') {
    const sides = printStore.pages.filter((p) => p.children.length);
    if (!sides.length) throw new Error('Add some artwork first');
    for (const page of sides) {
      await printStore.saveAsImage({
        pageId: page.id,
        fileName: `tshirt-${page.id}.png`,
        pixelRatio: PRINT_PR,
        dpi: 300,
      });
    }
    return;
  }

  await printStore.saveAsPDF({
    fileName: 'tshirt-print.pdf',
    pixelRatio: PRINT_PR,
    mimeType: 'image/png',
  });
}
