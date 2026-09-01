#!/usr/bin/env node
/**
 * Bundle‑size budget for the production build.
 *
 * The main bundle is dominated by MUI (~500 kB minified); the app's own
 * code is a small fraction of it. This check is a guardrail, not a
 * target: it fails only when the total JavaScript in `dist/assets`
 * exceeds the budget – e.g. a dependency bump or a new heavy library
 * bloated the app silently. Bump BUDGET_KB deliberately (and keep
 * build.chunkSizeWarningLimit in vite.config.js in sync).
 *
 * Run after `npm run build` (it reads the built app in `dist/`).
 */
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// Maximum total size of the JavaScript in dist/assets, in decimal kB
// (1000 bytes per kB – the same unit Vite's chunkSizeWarningLimit uses,
// so the two thresholds stay aligned).
const BUDGET_KB = 600;

const assetsDir = path.join(process.cwd(), 'dist', 'assets');

let entries;
try {
  entries = readdirSync(assetsDir);
} catch {
  console.error(`No dist/assets found – run \`npm run build\` first.`);
  process.exit(1);
}

const sizes = entries
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, size: statSync(path.join(assetsDir, name)).size }));

if (sizes.length === 0) {
  console.error(`No JavaScript files in ${assetsDir} – did the build succeed?`);
  process.exit(1);
}

for (const { name, size } of sizes) {
  console.log(`  ${name}  ${(size / 1000).toFixed(1)} kB`);
}
const totalKB = sizes.reduce((sum, { size }) => sum + size, 0) / 1000;
console.log(
  `Bundle size: ${totalKB.toFixed(1)} kB of JavaScript (budget ${BUDGET_KB} kB)`,
);

if (totalKB > BUDGET_KB) {
  console.error(
    `The bundle exceeds the ${BUDGET_KB} kB budget: find out what grew ` +
      '(check the Vite build output and `npm ls`) – and only if the new ' +
      'size is justified, raise BUDGET_KB here and ' +
      'build.chunkSizeWarningLimit in vite.config.js.',
  );
  process.exit(1);
}
