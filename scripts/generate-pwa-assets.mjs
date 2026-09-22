// অভ্যাস — PWA asset generator (run: bun scripts/generate-pwa-assets.mjs)
// Renders PNG icons + rich-install screenshots from inline SVG sources with
// sharp. Committing the output keeps deploys hermetic (no build-time step).
//
// Outputs into public/:
//   icon-192.png, icon-512.png, icon-maskable-512.png
//   screenshot-narrow.png (720×1280), screenshot-wide.png (1280×720)

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public");
await mkdir(outDir, { recursive: true });

// ── Brand tile (same design language as public/icon.svg) ──────────────────
const TILE = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#059669"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff" stroke-width="26" stroke-opacity="0.25" stroke-linecap="round" stroke-dasharray="708" stroke-dashoffset="200" transform="rotate(-90 256 256)"/>
  <path d="M196 256 L236 296 L324 208" fill="none" stroke="#ffffff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="256" y="430" font-family="Noto Sans Bengali, sans-serif" font-size="64" font-weight="700" fill="#ffffff" text-anchor="middle" opacity="0.95">অভ্যাস</text>
</svg>`;

// Maskable: brand mark shrunk into the 80% safe zone over a solid background
// so adaptive-icon launchers never crop the checkmark.
const MASKABLE = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#059669"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(51.2 51.2) scale(0.8)">
    <circle cx="256" cy="246" r="140" fill="none" stroke="#ffffff" stroke-width="24" stroke-opacity="0.22" stroke-linecap="round" stroke-dasharray="708" stroke-dashoffset="200" transform="rotate(-90 256 246)"/>
    <path d="M196 246 L236 286 L324 198" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="256" y="416" font-family="Noto Sans Bengali, sans-serif" font-size="60" font-weight="700" fill="#ffffff" text-anchor="middle" opacity="0.95">অভ্যাস</text>
  </g>
</svg>`;

// ── Install-dialog screenshots (Chrome shows these in the native install sheet) ──
// Simple branded promo tiles — no device chrome, honest feature bullets.
const bullets = [
  "নামাজ ও ইবাদতের হিসাব",
  "কুরআন পড়ার ট্র্যাকার",
  "প্রতিদিনের অভ্যাস ও স্ট্রিক",
  "ফোকাস মোড — নোটিফিকেশন বন্ধ",
];

const shot = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#04241c"/>
      <stop offset="1" stop-color="#064e3b"/>
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#059669"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.1" r="1">
      <stop offset="0" stop-color="#34d399" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#34d399" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>

  <g transform="translate(${w / 2 - 64} ${h * 0.16})">
    <rect width="128" height="128" rx="28" fill="url(#tile)"/>
    <path d="M40 64 L56 80 L88 48" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <text x="${w / 2}" y="${h * 0.16 + 185}" font-family="Noto Sans Bengali, sans-serif" font-size="${w > h ? 44 : 52}" font-weight="800" fill="#ffffff" text-anchor="middle">অভ্যাস</text>
  <text x="${w / 2}" y="${h * 0.16 + 232}" font-family="Noto Sans Bengali, sans-serif" font-size="${w > h ? 22 : 26}" fill="#a7f3d0" text-anchor="middle">স্বশাসন ও অভ্যাস ট্র্যাকার</text>

  ${bullets
    .map((b, i) => {
      const y = h * (w > h ? 0.62 : 0.55) + i * (w > h ? 56 : 84);
      const bx = w > h ? w * 0.18 : w / 2;
      return `
  <g>
    <circle cx="${w > h ? bx : bx - 0}" cy="${y - 8}" r="7" fill="#34d399"/>
    <text x="${w > h ? bx + 26 : bx + 26}" y="${y}" font-family="Noto Sans Bengali, sans-serif" font-size="${w > h ? 22 : 27}" fill="#d1fae5">${b}</text>
  </g>`;
    })
    .join("\n")}
</svg>`;

// ── Render ──────────────────────────────────────────────────────────────────
await sharp(Buffer.from(TILE(512))).png().toFile(path.join(outDir, "icon-512.png"));
await sharp(Buffer.from(TILE(192))).png().toFile(path.join(outDir, "icon-192.png"));
await sharp(Buffer.from(MASKABLE(512))).png().toFile(path.join(outDir, "icon-maskable-512.png"));
await sharp(Buffer.from(shot(720, 1280))).png({ compressionLevel: 9 }).toFile(path.join(outDir, "screenshot-narrow.png"));
await sharp(Buffer.from(shot(1280, 720))).png({ compressionLevel: 9 }).toFile(path.join(outDir, "screenshot-wide.png"));

console.log("✓ PWA assets generated in public/");
