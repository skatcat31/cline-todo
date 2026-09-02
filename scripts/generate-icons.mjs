// Generate the PWA install icons from the favicon design:
//   public/icons/icon-192.png          (192x192, "any")
//   public/icons/icon-512.png          (512x512, "any")
//   public/icons/icon-512-maskable.png (512x512, "maskable" – full-bleed
//                                      background, artwork inside the safe zone)
//   public/icons/apple-touch-icon.png  (180x180, the iOS home‑screen icon)
//
// The maskable variant keeps the check mark scaled to 70% (inside the 80%
// safe zone) on a solid brand-color square, so browsers that crop maskable
// icons to circles/squircles still show the mark.
//
// Run with: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const PRIMARY = '#1565c0';
const CHECK = 'M9 17l5 5 9-10';

// The favicon artwork, authored on a 32x32 grid (transparent outside the
// rounded rectangle – suitable for the "any" icon purpose).
const anyIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${PRIMARY}" />
  <path
    d="${CHECK}"
    fill="none"
    stroke="#fff"
    stroke-width="3.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>`;

// Maskable variant: full-bleed background plus the check mark scaled to 70%
// around the center (inside the 80% maskable safe zone).
const maskableIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${PRIMARY}" />
  <g transform="translate(16 16) scale(0.7) translate(-16 -16)">
    <path
      d="${CHECK}"
      fill="none"
      stroke="#fff"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>`;

// Apple touch icon: 180x180 with a full‑bleed background (iOS applies its
// own corner mask and shadow, so no rounded corners here) and the check
// mark at 80% – between the "any" 100% and the maskable 70%.
const appleTouchIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${PRIMARY}" />
  <g transform="translate(16 16) scale(0.8) translate(-16 -16)">
    <path
      d="${CHECK}"
      fill="none"
      stroke="#fff"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>`;

function renderPng(svg, width) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return Buffer.from(resvg.render().asPng());
}

const outputs = [
  ['icon-192.png', renderPng(anyIcon, 192)],
  ['icon-512.png', renderPng(anyIcon, 512)],
  ['icon-512-maskable.png', renderPng(maskableIcon, 512)],
  ['apple-touch-icon.png', renderPng(appleTouchIcon, 180)],
];
for (const [name, png] of outputs) {
  writeFileSync(join(outDir, name), png);
  console.log(`wrote public/icons/${name} (${png.length} bytes)`);
}
