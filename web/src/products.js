// Single-product apparel config: a cotton t-shirt, front & back views, using
// photographic mockups in three colours.

import blackFront from './mockups/black-front.webp';
import blackBack from './mockups/black-back.webp';
import blueFront from './mockups/blue-front.webp';
import blueBack from './mockups/blue-back.webp';
import redFront from './mockups/red-front.webp';
import redBack from './mockups/red-back.webp';

// Mockups are square 1254x1254; the page space matches them 1:1.
export const VIEW_W = 1254;
export const VIEW_H = 1254;

// Printable region on the chest (in mockup pixels). Kept at the real print
// aspect ratio (249 : 265 mm).
export const PRINT_MM_W = 249;
export const PRINT_MM_H = 265;
export const PRINT = { x: 451, y: 418, width: 351, height: 374 };

/**
 * Match the print box to a provider's print file, keeping its width and top
 * edge on the chest. Call before the scene is set up.
 */
export function setPrintAspect(width, height) {
  PRINT.height = Math.round((PRINT.width * height) / width);
}

// Studio / page background. One light grey everywhere (page, workspace, and
// Polotno's transparency fill) so the area around the shirt is uniform.
export const BG = '#f4f4f4';

export const PRODUCT = {
  name: 'Cotton T-shirt',
  priceFrom: 19.99,
  printMethod: 'Digital Printing',
};

export const VIEWS = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
];

export const COLORS = [
  { id: 'black', name: 'Black', value: '#23262b', front: blackFront, back: blackBack },
  { id: 'blue', name: 'Blue', value: '#2153d6', front: blueFront, back: blueBack },
  { id: 'red', name: 'Red', value: '#e23b2e', front: redFront, back: redBack },
];

export const mockupImage = (color, view) =>
  view === 'back' ? color.back : color.front;

// Thin dashed print-area boundary, excluded from export.
export function guideSvg() {
  const { x, y, width: w, height: h } = PRINT;
  return (
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#9a9da3" stroke-width="2.5" stroke-dasharray="9 7"/></svg>`
    )
  );
}
