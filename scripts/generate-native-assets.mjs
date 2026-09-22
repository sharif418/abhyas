/**
 * Generates the branded native assets for the অভ্যাস Android shell:
 *   • launcher icons (legacy square + round, all densities)
 *   • adaptive-icon foregrounds (white mark, all densities)
 *   • splash screens (every drawable variant, sized to the template files)
 *
 * Run from the repo root:  bun scripts/generate-native-assets.mjs
 * (Re-runnable — always regenerates from the brand definition below.)
 */

import sharp from "sharp";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

const RES = path.resolve("android/app/src/main/res");

const BRAND = {
  start: "#059669", // emerald-600 (web primary)
  end: "#0D9488", // teal-600
  deepStart: "#047857",
};

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// ── SVG fragments ─────────────────────────────────────────────────────────

const GRADIENT = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND.start}"/>
      <stop offset="1" stop-color="${BRAND.end}"/>
    </linearGradient>
  </defs>`;

/** Progress-ring + checkmark mark, centered in a 512×512 viewBox. */
const MARK = (scale = 1, opacityRing = 0.25) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff"
      stroke-width="26" stroke-opacity="${opacityRing}" stroke-linecap="round"
      stroke-dasharray="708" stroke-dashoffset="200" transform="rotate(-90 256 256)"/>
    <path d="M196 256 L236 296 L324 208" fill="none" stroke="#ffffff"
      stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const svgDoc = (inner, size = 512) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${inner}</svg>`;

// ── Renderers ─────────────────────────────────────────────────────────────

async function renderLauncherPNG(dir, density, round) {
  const size = Math.round(48 * density);
  const shape = round
    ? `<circle cx="256" cy="256" r="256" fill="url(#g)"/>`
    : `<rect width="512" height="512" rx="115" fill="url(#g)"/>`;
  const svg = svgDoc(`${GRADIENT}${shape}${MARK(1)}`, size);
  const file = path.join(RES, dir, round ? "ic_launcher_round.png" : "ic_launcher.png");
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`✓ ${path.relative(process.cwd(), file)} (${size}×${size})`);
}

async function renderForegroundPNG(dir, density) {
  const size = Math.round(108 * density);
  // White mark at ~46% of the canvas → safely inside the 66% adaptive safe zone.
  const svg = svgDoc(MARK(0.94), size);
  const file = path.join(RES, dir, "ic_launcher_foreground.png");
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`✓ ${path.relative(process.cwd(), file)} (${size}×${size})`);
}

async function renderSplash(file) {
  const meta = await sharp(file).metadata();
  const W = meta.width;
  const H = meta.height;
  const m = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  const markScale = (m * 0.17) / 512; // mark occupies ~17% of the short edge
  const titleSize = Math.round(m * 0.062);
  const tagSize = Math.round(m * 0.03);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BRAND.deepStart}"/>
      <stop offset="1" stop-color="${BRAND.end}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g transform="translate(${cx} ${cy - m * 0.045}) scale(${markScale / 1}) translate(-256 -256)">
    <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff"
      stroke-width="26" stroke-opacity="0.25" stroke-linecap="round"
      stroke-dasharray="708" stroke-dashoffset="200" transform="rotate(-90 256 256)"/>
    <path d="M196 256 L236 296 L324 208" fill="none" stroke="#ffffff"
      stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="${cx}" y="${cy + m * 0.155}" text-anchor="middle"
    font-family="FreeSerif, 'Noto Sans Bengali', serif" font-weight="700"
    font-size="${titleSize}" fill="#ffffff">অভ্যাস</text>
  <text x="${cx}" y="${cy + m * 0.155 + tagSize * 1.7}" text-anchor="middle"
    font-family="FreeSerif, 'Noto Sans Bengali', serif"
    font-size="${tagSize}" fill="#ffffff" opacity="0.72">অভ্যাস গড়ার সঙ্গী</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(`✓ ${path.relative(process.cwd(), file)} (${W}×${H})`);
}

// ── Run ───────────────────────────────────────────────────────────────────

for (const [density, factor] of Object.entries(DENSITIES)) {
  const dir = `mipmap-${density}`;
  await renderLauncherPNG(dir, factor, false);
  await renderLauncherPNG(dir, factor, true);
  await renderForegroundPNG(dir, factor);
}

for (const rel of [
  "drawable/splash.png",
  ...Object.keys(DENSITIES).map((d) => `drawable-land-${d}/splash.png`),
  ...Object.keys(DENSITIES).map((d) => `drawable-port-${d}/splash.png`),
]) {
  await renderSplash(path.join(RES, rel));
}

// Template leftovers that nothing references after re-branding.
for (const orphan of [
  "drawable-v24/ic_launcher_foreground.xml",
  "drawable/splash.png.tmp",
]) {
  await rm(path.join(RES, orphan), { force: true }).catch(() => {});
}

console.log("\nসব নেটিভ অ্যাসেট তৈরি হয়েছে ✓");
