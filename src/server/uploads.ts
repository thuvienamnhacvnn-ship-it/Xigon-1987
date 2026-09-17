import 'server-only';

import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/**
 * Storing an uploaded promotion image.
 *
 * Deliberately narrow: three image types, a size cap, a generated file name and
 * a fixed directory. The uploaded bytes are never trusted to name themselves —
 * a file called `x.png` that is really a script must not be able to land
 * anywhere it could be executed or served as one.
 *
 * Dimensions are read from the file header by hand. The usual image libraries
 * ship unsigned native binaries, which this machine's Smart App Control blocks
 * outright, so parsing three well-documented headers is the reliable option.
 */

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'promo');
const MAX_BYTES = 6 * 1024 * 1024;

const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type StoredImage = { path: string; width: number | null; height: number | null };

export type UploadError = 'type' | 'size' | 'unreadable';

export async function storePromoImage(file: File): Promise<{ ok: true; image: StoredImage } | { ok: false; reason: UploadError }> {
  const extension = TYPES[file.type];
  if (!extension) return { ok: false, reason: 'type' };
  if (file.size > MAX_BYTES) return { ok: false, reason: 'size' };

  const bytes = Buffer.from(await file.arrayBuffer());

  // The declared MIME type is a claim by the browser; the magic bytes are not.
  if (!looksLike(bytes, extension)) return { ok: false, reason: 'type' };

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes);

  const size = readSize(bytes, extension);
  return { ok: true, image: { path: `/uploads/promo/${name}`, width: size?.width ?? null, height: size?.height ?? null } };
}

function looksLike(bytes: Buffer, extension: string): boolean {
  if (extension === 'png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (extension === 'jpg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === 'webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return false;
}

function readSize(bytes: Buffer, extension: string): { width: number; height: number } | null {
  try {
    if (extension === 'png') {
      // IHDR is always the first chunk: width and height at bytes 16 and 20.
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    }

    if (extension === 'jpg') {
      let offset = 2;
      while (offset < bytes.length - 9) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = bytes[offset + 1];
        // SOF0..SOF15, skipping the four that are not frame headers.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
        }
        offset += 2 + bytes.readUInt16BE(offset + 2);
      }
      return null;
    }

    if (extension === 'webp') {
      const format = bytes.subarray(12, 16).toString();
      if (format === 'VP8X') {
        return {
          width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
          height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
        };
      }
      if (format === 'VP8 ') {
        return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
      }
      if (format === 'VP8L') {
        const bits = bytes.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
    }
  } catch {
    // A header we cannot parse is not a reason to reject a valid image; the
    // page just renders it without intrinsic dimensions.
    return null;
  }
  return null;
}
