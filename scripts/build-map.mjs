/**
 * The map on the contact screen, baked into the repository.
 *
 * It exists so the map can simply be there. The alternative — an OpenStreetMap
 * frame that loads when the guest agrees to it — meant either an empty grey box
 * with a button in the middle of the screen, or every guest's address handed to
 * a third party before they had asked for a map at all. Neither is acceptable
 * for a restaurant in Germany.
 *
 * So the tiles are fetched once, here, by us, and composited into a single
 * image that is served from our own domain. The guest's browser never speaks to
 * anybody else, there is nothing to consent to, and the map is on the screen the
 * moment the screen is. The interactive map is still one click away for the
 * guest who wants to pan around it.
 *
 * Tiles are © OpenStreetMap contributors, ODbL. The attribution is rendered on
 * the screen, not optional — that is the licence, and it is also just correct.
 *
 * Run with `npm run map`. The output is committed.
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'img', 'map');
const TMP = join(process.cwd(), '.map-tiles');
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

/* Nürnberger Str. 46, 10789 Berlin. */
const LAT = 52.5017;
const LON = 13.3336;
const ZOOM = 16;
/* Three by two tiles is about 800 m across — enough to recognise the corner. */
const ACROSS = 3;
const DOWN = 2;

const lonToX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const latToY = (lat, z) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
};

const centreX = lonToX(LON, ZOOM);
const centreY = latToY(LAT, ZOOM);
const firstX = Math.floor(centreX - (ACROSS - 1) / 2);
const firstY = Math.floor(centreY - (DOWN - 1) / 2);

/*
 * A real User-Agent is required by the tile usage policy, and it is the polite
 * thing regardless: whoever runs those servers should be able to see who asked
 * and why. This fetches eighteen tiles, once, per build.
 */
const AGENT = 'xigon1987-site-build/1.0 (static map for 1987xigon.de; contact xigon1987@gmail.com)';

const files = [];
for (let row = 0; row < DOWN; row += 1) {
  for (let column = 0; column < ACROSS; column += 1) {
    const x = firstX + column;
    const y = firstY + row;
    const url = `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`;
    const file = join(TMP, `${row}-${column}.png`);
    const response = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (!response.ok) throw new Error(`tile ${x}/${y}: ${response.status}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    files.push(file);
  }
}

const width = ACROSS * 256;
const height = DOWN * 256;

/*
 * The pin goes where the restaurant is, which is not the middle of the image —
 * the grid starts at a whole tile, so the offset has to be worked out from the
 * fractional part of the centre tile.
 */
const pinX = Math.round((centreX - firstX) * 256);
const pinY = Math.round((centreY - firstY) * 256);

const inputs = files.flatMap((file) => ['-i', file]);
const layout = [];
for (let row = 0; row < DOWN; row += 1) {
  for (let column = 0; column < ACROSS; column += 1) {
    layout.push(`${column * 256}_${row * 256}`);
  }
}

/*
 * No grading. The map is left exactly as it comes off the tile server.
 *
 * It was graded to gold-on-black, then to terracotta-on-black to follow the
 * palette. Both were wrong for the same reason: a map is read, not looked at.
 * A guest checking which corner the restaurant is on wants the street map they
 * already know — the one in their phone — not an ornament in the house colours
 * where the streets and the park and the water are all the same hue. Matching
 * the palette cost them the only thing a map has to do.
 *
 * So the tiles are stacked and written out, and nothing else happens to them.
 */
execFileSync(
  'ffmpeg',
  [
    '-v', 'error', '-y',
    ...inputs,
    '-filter_complex',
    `xstack=inputs=${files.length}:layout=${layout.join('|')}[out]`,
    '-map', '[out]',
    '-frames:v', '1',
    join(OUT, 'contact.png'),
  ],
  { stdio: 'inherit' },
);

execFileSync(
  'ffmpeg',
  ['-v', 'error', '-y', '-i', join(OUT, 'contact.png'), '-c:v', 'libwebp', '-quality', '86', join(OUT, 'contact.webp')],
  { stdio: 'inherit' },
);

rmSync(TMP, { recursive: true, force: true });
rmSync(join(OUT, 'contact.png'), { force: true });

writeFileSync(
  join(OUT, 'contact.json'),
  `${JSON.stringify({ width, height, pinX, pinY, zoom: ZOOM, lat: LAT, lon: LON }, null, 2)}\n`,
);

console.log(`✓ map ${width}x${height}, pin at ${pinX},${pinY}`);
