/**
 * Reads geometry off a mockup instead of guessing it by eye.
 *
 * Judging proportions from a picture is exactly the thing that keeps coming out
 * wrong: a panel that looks like "about three quarters" is 75.4% one time and
 * 68% the next, and the difference is the whole reason a screen reads as
 * oversized. So the numbers are measured.
 *
 * The panels in these drawings are outlined with a one-pixel warm gold hairline
 * on a dark ground, which is easy to find: a pixel is on the line when it is
 * appreciably warmer than it is blue and not dark. Scanning a row gives the
 * left and right edges, scanning a column gives the top and bottom.
 *
 *   node scripts/measure-mockup.mjs "E:\\…\\2.png"
 */
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/measure-mockup.mjs <image>');
  process.exit(1);
}

const probe = JSON.parse(
  execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height',
    '-of', 'json', file,
  ]).toString(),
);
const { width, height } = probe.streams[0];

const raw = execFileSync(
  'ffmpeg',
  ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
  { maxBuffer: 1 << 30 },
);

const at = (x, y) => {
  const i = (y * width + x) * 3;
  return [raw[i], raw[i + 1], raw[i + 2]];
};

/** Warm, light, and clearly not blue — the hairline the panels are drawn with. */
const isGoldLine = ([r, g, b]) => r > 110 && r - b > 45 && g > 80 && r > g && g > b;

function scanRow(y) {
  const hits = [];
  for (let x = 0; x < width; x += 1) if (isGoldLine(at(x, y))) hits.push(x);
  return hits;
}

function scanColumn(x) {
  const hits = [];
  for (let y = 0; y < height; y += 1) if (isGoldLine(at(x, y))) hits.push(y);
  return hits;
}

/** Runs of adjacent hits collapse to one edge each. */
const edges = (hits) => {
  const out = [];
  for (const hit of hits) {
    if (!out.length || hit - out[out.length - 1] > 3) out.push(hit);
  }
  return out;
};

const pct = (value, total) => `${((value / total) * 100).toFixed(1)}%`;

console.log(`${basename(file)} — ${width}×${height}`);

for (const fraction of [0.3, 0.5, 0.7]) {
  const y = Math.round(height * fraction);
  const found = edges(scanRow(y));
  console.log(
    `  row y=${y} (${pct(y, height)}) → x edges:`,
    found.slice(0, 8).map((x) => `${x} (${pct(x, width)})`).join('  '),
  );
}

for (const fraction of [0.2, 0.5, 0.8]) {
  const x = Math.round(width * fraction);
  const found = edges(scanColumn(x));
  console.log(
    `  col x=${x} (${pct(x, width)}) → y edges:`,
    found.slice(0, 8).map((y) => `${y} (${pct(y, height)})`).join('  '),
  );
}

/*
 * The hairline is easy to confuse with a candle. The panel's other signature is
 * harder to fake: it darkens everything behind it, so its edges are a step in
 * brightness that holds across the whole side. Averaging a band of rows or
 * columns cancels out the lamps in the photograph and leaves the step.
 */
function bandBrightness(axis, index, from, to) {
  let total = 0;
  let count = 0;
  for (let k = from; k < to; k += 1) {
    // 'down' walks the page: average a band of x at each y. 'across' is its
    // transpose. Getting these two the wrong way round reads the image sideways
    // and reports edges that are not there.
    const [r, g, b] = axis === 'down' ? at(k, index) : at(index, k);
    total += 0.299 * r + 0.587 * g + 0.114 * b;
    count += 1;
  }
  return total / count;
}

function step(axis, length, sampleFrom, sampleTo) {
  const profile = [];
  for (let i = 0; i < length; i += 1) profile.push(bandBrightness(axis, i, sampleFrom, sampleTo));
  const smooth = profile.map((_, i) => {
    const lo = Math.max(0, i - 3);
    const hi = Math.min(profile.length, i + 4);
    return profile.slice(lo, hi).reduce((a, b) => a + b, 0) / (hi - lo);
  });
  const jumps = [];
  for (let i = 6; i < smooth.length - 6; i += 1) {
    const delta = smooth[i + 5] - smooth[i - 5];
    jumps.push({ i, delta });
  }
  jumps.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const kept = [];
  for (const jump of jumps) {
    if (kept.every((k) => Math.abs(k.i - jump.i) > 20)) kept.push(jump);
    if (kept.length === 6) break;
  }
  return kept.sort((a, b) => a.i - b.i);
}

console.log('  brightness steps down the page (panel top/bottom):');
for (const s of step('down', height, Math.round(width * 0.3), Math.round(width * 0.7))) {
  console.log(`    y=${s.i} (${pct(s.i, height)})  Δ${s.delta.toFixed(1)}`);
}
console.log('  brightness steps across the page (panel left/right):');
for (const s of step('across', width, Math.round(height * 0.12), Math.round(height * 0.8))) {
  console.log(`    x=${s.i} (${pct(s.i, width)})  Δ${s.delta.toFixed(1)}`);
}
