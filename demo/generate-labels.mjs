import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Tiny 5x7 glyphs for A-Z, 0-9 and a few symbols. High-contrast for OCR.
const GLYPHS = {
  " ": "00000000000000000000000000000000000",
  "-": "00000000000001111100000000000000000",
  ":": "00000100000000000000100000000000000",
  ".": "00000000000000000000000000100000000",
  ",": "00000000000000000000001000100000000",
  "/": "00001000010000100001000010000100000",
  "(": "00010001000010000100001000010000100",
  ")": "00100000100000100000100000100001000",
  "+": "00000001000011111001000000000000000",
  "0": "01110100011001110101100110100011110",
  "1": "00100011000010000100001000010001110",
  "2": "01110100010000100010001000100011111",
  "3": "01110100010000100110000011000111110",
  "4": "00010001100101010001111100010000100",
  "5": "11111100001111000001000011000111110",
  "6": "00110010001000011110100011000101110",
  "7": "11111000010001000100010000100001000",
  "8": "01110100010100001110100011000101110",
  "9": "01110100011000101111000010001001100",
  A: "01110100011000111111100011000110001",
  B: "11110100011000111110100011000111110",
  C: "01110100011000010000100001000101110",
  D: "11110100011000110001100011000111110",
  E: "11111100001000011110100001000011111",
  F: "11111100001000011110100001000010000",
  G: "01110100011000010111100011000101111",
  H: "10001100011000111111100011000110001",
  I: "01110001000010000100001000010001110",
  J: "00111000100001000010000101001001100",
  K: "10001100101010011000101001001010001",
  L: "10000100001000010000100001000011111",
  M: "10001110111010110101100011000110001",
  N: "10001110011010110011100011000110001",
  O: "01110100011000110001100011000101110",
  P: "11110100011000111110100001000010000",
  Q: "01110100011000110001101011001001101",
  R: "11110100011000111110101001001010001",
  S: "01111100001000001110000011000111110",
  T: "11111001000010000100001000010000100",
  U: "10001100011000110001100011000101110",
  V: "10001100011000110001010100010000100",
  W: "10001100011000110101101011101110001",
  X: "10001100010101000100010101000110001",
  Y: "10001100010101000100001000010000100",
  Z: "11111000010001000100010001000011111",
};

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

function drawText(lines, { scale = 8, pad = 40 } = {}) {
  const glyphW = 5;
  const glyphH = 7;
  const colGap = 2;
  const rowGap = 6;
  const maxChars = Math.max(...lines.map((l) => l.length), 1);
  const width = pad * 2 + maxChars * (glyphW + colGap) * scale;
  const height = pad * 2 + lines.length * (glyphH + rowGap) * scale;
  const rgba = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 255;
    rgba[i + 1] = 255;
    rgba[i + 2] = 255;
    rgba[i + 3] = 255;
  }

  function plot(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = (y * width + x) * 4;
    rgba[idx] = 10;
    rgba[idx + 1] = 10;
    rgba[idx + 2] = 10;
  }

  lines.forEach((line, row) => {
    [...line.toUpperCase()].forEach((ch, col) => {
      const bits = GLYPHS[ch] || GLYPHS[" "];
      for (let gy = 0; gy < glyphH; gy += 1) {
        for (let gx = 0; gx < glyphW; gx += 1) {
          if (bits[gy * glyphW + gx] !== "1") continue;
          const ox = pad + col * (glyphW + colGap) * scale;
          const oy = pad + row * (glyphH + rowGap) * scale;
          for (let sy = 0; sy < scale; sy += 1) {
            for (let sx = 0; sx < scale; sx += 1) {
              plot(ox + gx * scale + sx, oy + gy * scale + sy);
            }
          }
        }
      }
    });
  });

  return encodePng(width, height, rgba);
}

const fullLines = [
  "DEMO LABEL",
  "Product name: Demo-Kill 20 EC",
  "Dose: 2 ml per litre of water",
  "PHI pre-harvest interval: 7 days",
  "Re-entry interval: 24 hours",
  "Wear gloves and a mask.",
  "Wash hands after use.",
  "Keep away from children.",
  "Do not mix with other products.",
];

const missingLines = [
  "DEMO LABEL",
  "Product name: Demo-Clear WP",
  "PHI pre-harvest interval: 5 days",
  "Re-entry interval: 12 hours",
  "Wear protective clothing.",
  "Avoid spray drift.",
];

const targets = [
  join(root, "demo-full.png"),
  join(root, "../frontend/public/demo/demo-full.png"),
];
const missingTargets = [
  join(root, "demo-missing-rate.png"),
  join(root, "../frontend/public/demo/demo-missing-rate.png"),
];

const fullPng = drawText(fullLines);
const missingPng = drawText(missingLines);

for (const file of [...targets, ...missingTargets]) {
  mkdirSync(dirname(file), { recursive: true });
}
for (const file of targets) writeFileSync(file, fullPng);
for (const file of missingTargets) writeFileSync(file, missingPng);

console.log("Wrote DEMO label PNGs");
