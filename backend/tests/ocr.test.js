import { describe, it } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { preprocessLabelImage } from "../src/services/ocr.js";

describe("preprocessLabelImage", () => {
  it("auto-rotates EXIF camera orientation and emits normalized PNG pixels", async () => {
    const cameraPhoto = await sharp({
      create: { width: 400, height: 200, channels: 3, background: "#cc3322" },
    }).jpeg().withMetadata({ orientation: 6 }).toBuffer();

    const processed = await preprocessLabelImage(cameraPhoto);
    const metadata = await sharp(processed).metadata();
    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, 200);
    assert.equal(metadata.height, 400);
    const { data, info } = await sharp(processed).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 3);
    assert.equal(data[0], data[1]);
    assert.equal(data[1], data[2]);
  });

  it("rejects bytes that are not a decodable image", async () => {
    await assert.rejects(() => preprocessLabelImage(Buffer.from("not an image")));
  });

  it("normalizes real WebP uploads into the PNG format consumed by OCR", async () => {
    const webpPhoto = await sharp({
      create: { width: 240, height: 120, channels: 3, background: "#ffffff" },
    }).webp().toBuffer();
    const processed = await preprocessLabelImage(webpPhoto);
    assert.equal((await sharp(processed).metadata()).format, "png");
  });
});
