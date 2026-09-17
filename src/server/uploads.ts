import 'server-only';

import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from '@/lib/media-limits';
import type { PromoMedia } from '@/db/schema';

/**
 * Storing a file an offer will show.
 *
 * Deliberately narrow: five formats, two size caps, a generated file name and a
 * fixed directory. The uploaded bytes are never trusted to name themselves — a
 * file called `x.png` that is really a script must not be able to land anywhere
 * it could be executed or served as one.
 *
 * Dimensions are read from the file's own headers by hand. The usual media
 * libraries ship unsigned native binaries, which this machine's Smart App
 * Control blocks outright, so parsing a few well-documented headers is the
 * reliable option — and it is the only one that reports what is actually in the
 * file rather than what something told us about it.
 */

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'promo');

type FormatName = 'png' | 'jpg' | 'webp' | 'mp4' | 'mov' | 'webm';

type Format = { name: FormatName; kind: 'image' | 'video'; extension: string };

const FORMATS: Record<FormatName, Format> = {
  png: { name: 'png', kind: 'image', extension: 'png' },
  jpg: { name: 'jpg', kind: 'image', extension: 'jpg' },
  webp: { name: 'webp', kind: 'image', extension: 'webp' },
  mp4: { name: 'mp4', kind: 'video', extension: 'mp4' },
  mov: { name: 'mov', kind: 'video', extension: 'mov' },
  webm: { name: 'webm', kind: 'video', extension: 'webm' },
};

/**
 * What the browser claimed the file was, where we recognise the claim.
 *
 * Used only to catch a contradiction, never to decide anything. An unfamiliar
 * or empty type is no claim at all: browsers send `application/octet-stream`
 * for perfectly ordinary files.
 */
const CLAIMED: Record<string, FormatName> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

export type UploadError = 'type' | 'mismatch' | 'image-size' | 'video-size' | 'unreadable';

/**
 * @param mustBe narrows what is acceptable — a poster frame has to be a still,
 * whatever the rest of the list holds.
 */
export async function storePromoMedia(
  file: File,
  mustBe?: 'image',
): Promise<{ ok: true; item: PromoMedia } | { ok: false; reason: UploadError }> {
  /*
   * The head is enough to identify every format here, so an oversized file is
   * turned away before its bytes are pulled into memory — and the refusal can
   * name the cap that applies to what it actually is.
   */
  const head = Buffer.from(await file.slice(0, 4096).arrayBuffer());
  const format = identify(head);
  if (!format) return { ok: false, reason: 'type' };
  if (mustBe && format.kind !== mustBe) return { ok: false, reason: 'type' };

  const claimed = CLAIMED[file.type];
  if (claimed && disagrees(claimed, format)) return { ok: false, reason: 'mismatch' };

  const limit = format.kind === 'video' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > limit) return { ok: false, reason: format.kind === 'video' ? 'video-size' : 'image-size' };

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) return { ok: false, reason: 'unreadable' };

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${format.extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes);

  const size = format.kind === 'video' ? videoSize(bytes, format) : imageSize(bytes, format);

  return {
    ok: true,
    item: {
      path: `/uploads/promo/${name}`,
      kind: format.kind,
      width: size?.width ?? null,
      height: size?.height ?? null,
      poster: null,
    },
  };
}

/**
 * Whether a recognised claim contradicts the bytes.
 *
 * Across the two families the answer is always yes: a file offered as a picture
 * that turns out to be a video is refused, and so is the reverse. Within
 * pictures the exact format has to agree too, because an operating system that
 * says `image/png` about a JPEG is a sign something has been renamed by hand.
 *
 * Within video it deliberately does not: a `.mov` straight off a phone is very
 * often an ordinary MP4 in its bytes, and refusing it would be refusing a
 * perfectly good file over a naming convention Apple chose.
 */
function disagrees(claimed: FormatName, format: Format): boolean {
  if (FORMATS[claimed].kind !== format.kind) return true;
  return format.kind === 'image' && claimed !== format.name;
}

/** What the file is, according to the file. */
function identify(head: Buffer): Format | null {
  if (head.length < 12) return null;

  if (head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return FORMATS.png;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return FORMATS.jpg;
  if (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') {
    return FORMATS.webp;
  }

  // ISO base media: `ftyp` sits at byte four, whatever the extension says.
  if (head.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brands = isoBrands(head);
    if (brands.some((brand) => MP4_BRANDS.has(brand))) return FORMATS.mp4;
    // QuickTime is the same box structure under a different name, and is what
    // an older camera or a screen recording produces. Stored as `.mov` rather
    // than relabelled `.mp4`: the extension should say what the file is.
    return brands.includes('qt  ') ? FORMATS.mov : null;
  }

  // Matroska, of which WebM is the subset browsers play. `.mkv` is refused:
  // it would upload happily and then show a guest a blank frame.
  if (head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return head.subarray(0, 64).toString('latin1').includes('webm') ? FORMATS.webm : null;
  }

  return null;
}

/**
 * The brands an ISO file declares: the major one, then the compatible list.
 *
 * A phone writes `qt  ` or `mp42` where a camera writes `isom`; what matters is
 * that one of them is a profile the browsers can play.
 */
const MP4_BRANDS = new Set(['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'mp4v']);

function isoBrands(head: Buffer): string[] {
  const size = head.readUInt32BE(0);
  const end = Math.min(size > 8 ? size : head.length, head.length);
  const brands: string[] = [head.subarray(8, 12).toString('latin1')];
  // Bytes 12..16 are the minor version, then four-character brands to the end.
  for (let at = 16; at + 4 <= end; at += 4) brands.push(head.subarray(at, at + 4).toString('latin1'));
  return brands;
}

function imageSize(bytes: Buffer, format: Format): { width: number; height: number } | null {
  try {
    if (format.name === 'png') {
      // IHDR is always the first chunk: width and height at bytes 16 and 20.
      return sane(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    }

    if (format.name === 'jpg') {
      let offset = 2;
      while (offset < bytes.length - 9) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = bytes[offset + 1];
        // SOF0..SOF15, skipping the four that are not frame headers.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return sane(bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5));
        }
        offset += 2 + bytes.readUInt16BE(offset + 2);
      }
      return null;
    }

    if (format.name === 'webp') {
      const chunk = bytes.subarray(12, 16).toString('latin1');
      if (chunk === 'VP8X') {
        return sane(
          1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
          1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
        );
      }
      if (chunk === 'VP8 ') return sane(bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff);
      if (chunk === 'VP8L') {
        const bits = bytes.readUInt32LE(21);
        return sane((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
      }
    }
  } catch {
    // A header we cannot parse is not a reason to reject a valid file; the page
    // just renders it without intrinsic dimensions.
    return null;
  }
  return null;
}

/**
 * A clip's frame size, from its track header.
 *
 * Only the ISO family, MP4 and QuickTime alike — they share these boxes.
 * Reading it out of Matroska means walking a variable-length element tree for a
 * number the offers card does not currently use, so WebM clips are stored with
 * no dimensions rather than with guessed ones.
 */
function videoSize(bytes: Buffer, format: Format): { width: number; height: number } | null {
  if (format.name !== 'mp4' && format.name !== 'mov') return null;
  try {
    const moov = findBox(bytes, 0, bytes.length, 'moov');
    if (!moov) return null;

    let best: { width: number; height: number } | null = null;
    let cursor = moov.start;
    while (cursor < moov.end) {
      const box = readBox(bytes, cursor, moov.end);
      if (!box) break;
      if (box.type === 'trak') {
        const header = findBox(bytes, box.start, box.end, 'tkhd');
        const size = header ? trackSize(bytes, header.start, header.end) : null;
        // An audio track carries a 0x0 header; the picture is the largest one.
        if (size && (!best || size.width * size.height > best.width * best.height)) best = size;
      }
      cursor = box.next;
    }
    return best;
  } catch {
    return null;
  }
}

type Box = { type: string; start: number; end: number; next: number };

function readBox(bytes: Buffer, at: number, limit: number): Box | null {
  if (at + 8 > limit) return null;
  let size = bytes.readUInt32BE(at);
  const type = bytes.subarray(at + 4, at + 8).toString('latin1');
  let start = at + 8;

  if (size === 1) {
    // A box larger than 4 GiB states its length in the next eight bytes.
    if (at + 16 > limit) return null;
    const large = bytes.readBigUInt64BE(at + 8);
    if (large > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    size = Number(large);
    start = at + 16;
  } else if (size === 0) {
    size = limit - at;
  }

  if (size < start - at) return null;
  return { type, start, end: Math.min(at + size, limit), next: at + size };
}

function findBox(bytes: Buffer, from: number, limit: number, type: string): Box | null {
  let cursor = from;
  while (cursor < limit) {
    const box = readBox(bytes, cursor, limit);
    if (!box) return null;
    if (box.type === type) return box;
    cursor = box.next;
  }
  return null;
}

function trackSize(bytes: Buffer, start: number, end: number): { width: number; height: number } | null {
  if (start + 4 > end) return null;
  const version = bytes[start];
  // Version 1 keeps the four timestamps in 64 bits each rather than 32.
  const matrix = start + 4 + (version === 1 ? 32 : 20) + 16;
  const at = matrix + 36;
  if (at + 8 > end) return null;

  // Both are 16.16 fixed point, and are the *display* size, which is what the
  // browser lays out.
  const width = bytes.readUInt32BE(at) / 65536;
  const height = bytes.readUInt32BE(at + 4) / 65536;

  /*
   * A phone films sideways and records the quarter turn in the display matrix,
   * so the frame a guest sees is the other way round from the numbers above.
   */
  const turned = bytes.readInt32BE(matrix) === 0 && bytes.readInt32BE(matrix + 20) === 0;
  return turned ? sane(height, width) : sane(width, height);
}

/** A dimension outside this is a misread header, not a photograph. */
function sane(width: number, height: number): { width: number; height: number } | null {
  const w = Math.round(width);
  const h = Math.round(height);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  if (w < 1 || h < 1 || w > 20000 || h > 20000) return null;
  return { width: w, height: h };
}
