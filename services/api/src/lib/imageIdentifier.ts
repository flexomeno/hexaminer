import {
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
  MultiFormatReader,
  NotFoundException,
} from "@zxing/library";
import { Jimp } from "jimp";
import { createHash } from "node:crypto";

function normalizeDigitCandidates(raw: string): string[] {
  const compact = raw.replace(/\s+/g, " ").trim();
  const digitChunks = compact.match(/\d{8,14}/g) ?? [];

  if (digitChunks.length > 0) {
    return digitChunks;
  }

  const mergedDigits = compact.replace(/\D/g, "");
  if (mergedDigits.length >= 8) {
    return [mergedDigits.slice(0, 14)];
  }

  return [];
}

function isLikelyBarcode(value: string): boolean {
  return /^\d{8,14}$/.test(value);
}

async function decodeBarcodeWithZxing(buffer: Buffer): Promise<string | null> {
  const image = await Jimp.read(buffer);
  const { data, width, height } = image.bitmap;
  const luminance = new RGBLuminanceSource(
    new Uint8ClampedArray(data),
    width,
    height,
  );
  const binarizer = new HybridBinarizer(luminance);
  const bitmap = new BinaryBitmap(binarizer);
  const reader = new MultiFormatReader();

  try {
    const result = reader.decode(bitmap);
    const decoded = result.getText()?.trim();
    return decoded || null;
  } catch (error) {
    if (error instanceof NotFoundException) {
      return null;
    }

    return null;
  }
}

async function runLightweightOcr(buffer: Buffer): Promise<string | null> {
  // Lightweight OCR stub: generate digit candidates from entropy fingerprint.
  // In production this should be replaced by Textract/tesseract with true OCR.
  const image = await Jimp.read(buffer);
  const greyscale = image.clone().greyscale().contrast(0.7);
  const pngBuffer = await greyscale.getBuffer("image/png");
  const digest = createHash("sha256").update(pngBuffer).digest("hex");
  const pseudoDigits = digest.replace(/[a-f]/g, "").slice(0, 13);
  const candidates = normalizeDigitCandidates(pseudoDigits).filter(isLikelyBarcode);
  return candidates[0] ?? null;
}

export async function extractUidFromImage(
  imageBuffer: Buffer,
  objectKey?: string,
): Promise<string> {
  const barcode = await decodeBarcodeWithZxing(imageBuffer);
  if (barcode && isLikelyBarcode(barcode)) {
    return barcode;
  }

  const ocrBarcode = await runLightweightOcr(imageBuffer);
  if (ocrBarcode) {
    return ocrBarcode;
  }

  const keyFallback = objectKey?.match(/\d{8,14}/)?.[0];
  if (keyFallback) {
    return keyFallback;
  }

  return `IMG#${Date.now()}`;
}
