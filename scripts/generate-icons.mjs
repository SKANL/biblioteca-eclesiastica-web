// Generates the PWA / app icon PNGs without any external dependency.
// Renders a restrained mark (a book with a spine) on the deep-teal brand color,
// with 4x supersampling for smooth edges, using Node's built-in zlib.
//
// Run with: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TEAL = [13, 92, 83];
const SPINE = [10, 69, 62];
const CREAM = [242, 241, 236];

// ---- PNG encoding -------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Mark geometry (normalized 0..1) ------------------------------------

function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const nx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0;
  const ny = y < y0 + r ? y0 + r - y : y > y1 - r ? y - (y1 - r) : 0;
  return nx * nx + ny * ny <= r * r;
}

const COVER = { x0: 0.24, y0: 0.17, x1: 0.76, y1: 0.83, r: 0.05 };
const SPINE_X0 = 0.3;
const SPINE_X1 = 0.352;

function sampleColor(x, y) {
  const onCover = inRoundedRect(
    x,
    y,
    COVER.x0,
    COVER.y0,
    COVER.x1,
    COVER.y1,
    COVER.r,
  );
  if (!onCover) return TEAL;
  if (x >= SPINE_X0 && x <= SPINE_X1 && y >= COVER.y0 && y <= COVER.y1) {
    return SPINE;
  }
  return CREAM;
}

function renderIcon(size, supersample = 4) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = supersample * supersample;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const x = (px + (sx + 0.5) / supersample) / size;
          const y = (py + (sy + 0.5) / supersample) / size;
          const [cr, cg, cb] = sampleColor(x, y);
          r += cr;
          g += cg;
          b += cb;
        }
      }
      const offset = (py * size + px) * 4;
      rgba[offset] = Math.round(r / samples);
      rgba[offset + 1] = Math.round(g / samples);
      rgba[offset + 2] = Math.round(b / samples);
      rgba[offset + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

const targets = [
  ["app/icon.png", 512],
  ["app/apple-icon.png", 180],
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/icon-maskable-512.png", 512],
];

for (const [relPath, size] of targets) {
  const file = resolve(ROOT, relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderIcon(size));
  console.log(`wrote ${relPath} (${size}x${size})`);
}
