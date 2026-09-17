/**
 * Builds every web image from the originals in assets/.
 *
 * ffmpeg rather than sharp: this workstation blocks unsigned native node
 * bindings, and ffmpeg is installed system-wide.
 *
 * Five kinds of output:
 *  - `scene/`  wide photographs (hero backdrop, room, gallery)
 *  - `plate/`  food photographs cut to a soft ellipse with real transparency,
 *              so a dish can float over the banner and be swapped for another
 *  - `dish/`   the restaurant's own food photography, cropped to the card
 *              shapes the menu uses
 *  - `layer/`  the banner's own furniture on transparency — the table the
 *              dishes stand on, the botanical for the rail
 *  - `video/`  the ambience clip, trimmed
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets');
const OUT = join(root, 'public', 'img');

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

/**
 * The bounding box of everything that is not transparent, after `chain` has
 * been applied. Used to trim a keyed cut-out to its own edges rather than to a
 * crop somebody typed in.
 */
function opaqueBounds(file, chain) {
  const { w, h } = size(file);
  const alpha = execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-i', file, '-vf', `${chain},alphaextract,format=gray`,
     '-f', 'rawvideo', '-pix_fmt', 'gray', '-frames:v', '1', '-'],
    { maxBuffer: 1 << 28 },
  );

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      // a threshold, not zero: the key leaves a little noise in the background
      if (alpha[y * w + x] <= 12) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;

  // a few pixels of air, so nothing sits flush against the edge
  const pad = 8;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  return {
    x,
    y,
    w: Math.min(w - x, maxX - minX + 1 + pad * 2),
    h: Math.min(h - y, maxY - minY + 1 + pad * 2),
  };
}

function size(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file],
    { encoding: 'utf8' },
  ).trim();
  const [w, h] = out.split('x').map(Number);
  return { w, h };
}

// ---------------------------------------------------------------------------
// scenes — wide photography
// ---------------------------------------------------------------------------

const SCENE_WIDTHS = [640, 960, 1280, 1600, 2000];

/**
 * `crop` is an ffmpeg crop expression applied before scaling. The interior
 * shot carries the restaurant's logo watermark in the bottom right corner,
 * which would collide with the site's own logo — so it is cropped away rather
 * than covered.
 */
const SCENES = [
  { id: 'interior-hero', file: 'photos/named/xigon-interior.png', crop: 'crop=iw-160:ih-14:0:0' },
  { id: 'hall-wide', file: 'photos/named/hall-wide.png' },
  { id: 'hall-square', file: 'photos/named/hall-square.webp' },
  { id: 'dining-room', file: 'photos/named/hero-dining-room.jpg' },
  { id: 'neon-logo-wall', file: 'photos/named/neon-logo-wall.jpg' },
  { id: 'lanterns-bar', file: 'photos/named/lanterns-bar.jpg' },
  { id: 'cabinet-detail', file: 'photos/named/cabinet-detail.jpg' },
  { id: 'sushi-bench', file: 'photos/named/sushi-bench.jpg' },
  { id: 'interior-colour', file: 'photos/named/interior-colour.jpg' },
];

// ---------------------------------------------------------------------------
// plates — food cut to a soft ellipse, on transparency
// ---------------------------------------------------------------------------

/**
 * `box` is a square crop around the food (x, y, size in source pixels).
 * `feather` controls how hard the edge is: higher = tighter cut.
 *
 * The cut is an ellipse with a smooth falloff rather than a traced outline.
 * Every one of these photographs sits on a dark table, and the banner behind
 * is dark too, so the last few percent of the fade reads as shadow under the
 * plate instead of as a halo — and it stays swappable without hand-masking.
 */
const PLATES = [
  // [x, y, w, h] — the ellipse fills this box, so a wide dish gets a wide cut.
  { id: 'sushi-roll', file: 'photos/named/sushi-roll.jpg', box: [0, 250, 760, 640], feather: 4.2 },
  { id: 'sushi-platter', file: 'photos/named/sushi-platter.jpg', box: [330, 55, 1250, 990], feather: 4.6 },
  { id: 'oysters', file: 'photos/named/oysters.jpg', box: [5, 170, 660, 740], feather: 4.2 },
  { id: 'drink', file: 'photos/named/drink.jpg', box: [170, 230, 560, 680], feather: 4.0 },
  { id: 'dessert', file: 'photos/named/dessert.jpg', box: [600, 120, 800, 800], feather: 4.4 },
];

const PLATE_WIDTHS = [420, 700, 1000];

// ---------------------------------------------------------------------------
// dishes — the restaurant's own photographs, as rectangular cards
// ---------------------------------------------------------------------------

/*
 * 27-megapixel originals, one per dish, chosen by eye from the shoot. They are
 * cropped to 4:3 rather than cut out: these are plated dishes photographed on
 * dark stone, and the plate and its shadow are part of the picture.
 */
const DISH_WIDTHS = [480, 720, 1080];
const DISH_RATIO = '4/3';

// ---------------------------------------------------------------------------
// layers — the banner's furniture, cut to transparency
// ---------------------------------------------------------------------------

/**
 * The banner is built from separate layers rather than one flat picture: the
 * room behind, the table, then the dish on top. Only the dish changes, so it
 * has to be a layer of its own — and the table has to be a layer too, or there
 * is nothing for the dish to stand on.
 *
 * `key` says how to make the background transparent:
 *  - `chroma` for the table, shot against a flat green
 *  - `luma` for the line art, drawn in gold on black — its own brightness is
 *    the mask, which keeps every hairline of the engraving
 */
const LAYERS = [
  {
    /*
     * A dish shot against the same flat green as the table, so it keys the same
     * way. It is written into `plate/` rather than `layer/` because as far as
     * the banner is concerned it is simply another swappable dish — the cut is
     * cleaner than the ellipse used for the older photographs, but nothing
     * downstream needs to know that.
     */
    id: 'xigon-platter',
    file: 'dishes/xigon-platter-green.png',
    out: 'plate',
    key: 'chroma',
    color: '0x01792d',
    similarity: 0.1,
    blend: 0.04,
    /*
     * No despill. It removes green from every pixel, not just the fringe, and
     * this platter is full of things that are meant to be green — the herbs,
     * the cucumber, the sprouts. With despill on they all turn brown. The key
     * is clean enough without it.
     */
    despill: 0,
    /*
     * Measured, not guessed. A hand-written crop cut the top off the blossom
     * branch, which is exactly the kind of mistake nobody sees until the thing
     * is on the page — so the build finds the edges of what survived the key
     * and trims to those.
     */
    trim: true,
    widths: [700, 1100, 1600],
  },
  {
    id: 'table',
    file: 'template/table-green.png',
    key: 'chroma',
    color: '0x027a25',
    /*
     * The threshold has to stay low. That green is a dark green, and colour
     * distance does not care about hue: at the usual 0.3 the black marble of
     * the tabletop is "close enough" to the key and the table comes out as a
     * gold outline with a hole in it. 0.10 keys the flat background and leaves
     * everything else alone; despill then takes the green off the brass rim.
     */
    similarity: 0.1,
    blend: 0.04,
    crop: 'crop=1370:730:60:275',
    widths: [900, 1400],
  },
  {
    id: 'botanical',
    file: 'template/botanical-gold.png',
    key: 'luma',
    gain: 1.25,
    widths: [420, 800],
  },
];

mkdirSync(join(OUT, 'scene'), { recursive: true });
mkdirSync(join(OUT, 'plate'), { recursive: true });
mkdirSync(join(OUT, 'layer'), { recursive: true });
mkdirSync(join(OUT, 'dish'), { recursive: true });
mkdirSync(join(OUT, 'video'), { recursive: true });

const manifest = { scene: {}, plate: {}, layer: {}, dish: {} };

for (const scene of SCENES) {
  const src = join(SRC, scene.file);
  if (!existsSync(src)) {
    console.warn(`! missing ${scene.file}`);
    continue;
  }
  const { w: srcW, h: srcH } = size(src);
  const pre = scene.crop ? `${scene.crop},` : '';
  const widths = SCENE_WIDTHS.filter((w) => w <= srcW);
  if (!widths.length) widths.push(srcW);

  for (const w of widths) {
    ff(['-i', src, '-vf', `${pre}scale=${w}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '84', '-frames:v', '1',
        join(OUT, 'scene', `${scene.id}-${w}.webp`)]);
    ff(['-i', src, '-vf', `${pre}scale=${w}:-2:flags=lanczos`, '-c:v', 'libaom-av1', '-crf', '32', '-cpu-used', '6',
        '-still-picture', '1', '-frames:v', '1', join(OUT, 'scene', `${scene.id}-${w}.avif`)]);
  }

  const lqipPath = join(OUT, 'scene', `${scene.id}-lqip.webp`);
  ff(['-i', src, '-vf', `${pre}scale=24:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '40', '-frames:v', '1', lqipPath]);

  manifest.scene[scene.id] = {
    widths,
    ratio: Number((srcW / srcH).toFixed(4)),
    lqip: `data:image/webp;base64,${readFileSync(lqipPath).toString('base64')}`,
  };
  console.log(`✓ scene ${scene.id} ${srcW}x${srcH} → ${widths.length} widths`);
}

for (const plate of PLATES) {
  const src = join(SRC, plate.file);
  if (!existsSync(src)) {
    console.warn(`! missing ${plate.file}`);
    continue;
  }
  const [x, y, bw, bh] = plate.box;
  const k = plate.feather;

  // alpha = 1 inside the ellipse, falling to 0 across a soft rim
  const alpha = `255*clip((1-hypot((X-W/2)/(W*0.5),(Y-H/2)/(H*0.5)))*${k},0,1)`;
  const chain = `crop=${bw}:${bh}:${x}:${y},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alpha}'`;

  for (const w of PLATE_WIDTHS) {
    ff(['-i', src, '-vf', `${chain},scale=${w}:-2:flags=lanczos`, '-c:v', 'libwebp',
        '-lossless', '0', '-quality', '88', '-frames:v', '1',
        join(OUT, 'plate', `${plate.id}-${w}.webp`)]);
  }
  ff(['-i', src, '-vf', `${chain},scale=1000:-2:flags=lanczos`, '-frames:v', '1',
      join(OUT, 'plate', `${plate.id}.png`)]);

  manifest.plate[plate.id] = { widths: PLATE_WIDTHS, ratio: Number((bw / bh).toFixed(4)) };
  console.log(`✓ plate ${plate.id}`);
}

for (const layer of LAYERS) {
  const src = join(SRC, layer.file);
  if (!existsSync(src)) {
    console.warn(`! missing ${layer.file}`);
    continue;
  }

  let pre = layer.crop ? `${layer.crop},` : '';
  const key = (before) =>
    layer.key === 'chroma'
      ? `${before}format=rgba,colorkey=${layer.color}:${layer.similarity}:${layer.blend}` +
        (layer.despill === 0 ? '' : `,despill=type=green:mix=0.5:expand=0.3`)
      : // the drawing's own brightness becomes its opacity
        `${before}format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':` +
        `a='clip(${layer.gain}*max(max(r(X,Y),g(X,Y)),b(X,Y)),0,255)'`;

  if (layer.trim) {
    const box = opaqueBounds(src, key(pre));
    if (box) {
      pre = `${pre}crop=${box.w}:${box.h}:${box.x}:${box.y},`;
      console.log(`  trimmed ${layer.id} to ${box.w}x${box.h} at ${box.x},${box.y}`);
    }
  }

  const chain = key(pre);

  const dir = layer.out ?? 'layer';

  for (const w of layer.widths) {
    ff(['-i', src, '-vf', `${chain},scale=${w}:-2:flags=lanczos`, '-c:v', 'libwebp',
        '-lossless', '0', '-quality', '90', '-frames:v', '1',
        join(OUT, dir, `${layer.id}-${w}.webp`)]);
  }
  const widest = layer.widths[layer.widths.length - 1];
  ff(['-i', src, '-vf', `${chain},scale=${widest}:-2:flags=lanczos`, '-frames:v', '1',
      join(OUT, dir, `${layer.id}.png`)]);

  const { w: outW, h: outH } = size(join(OUT, dir, `${layer.id}.png`));
  manifest[dir][layer.id] = { widths: layer.widths, ratio: Number((outW / outH).toFixed(4)) };
  console.log(`✓ ${dir} ${layer.id} → ${outW}x${outH}`);
}

/* ---------------------------------------------------------------- dishes -- */
for (const file of readdirSync(join(SRC, 'dishes')).filter((f) => f.endsWith('.jpg'))) {
  const id = file.replace(/\.jpg$/, '');
  const src = join(SRC, 'dishes', file);
  const { w: srcW, h: srcH } = size(src);

  // centre crop to the card ratio, then scale — never squash
  const crop = `crop='min(iw,ih*4/3)':'min(ih,iw*3/4)'`;

  for (const w of DISH_WIDTHS) {
    ff(['-i', src, '-vf', `${crop},scale=${w}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '82',
        '-frames:v', '1', join(OUT, 'dish', `${id}-${w}.webp`)]);
  }

  const lqipPath = join(OUT, 'dish', `${id}-lqip.webp`);
  ff(['-i', src, '-vf', `${crop},scale=20:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '40',
      '-frames:v', '1', lqipPath]);

  manifest.dish[id] = {
    widths: DISH_WIDTHS,
    ratio: 4 / 3,
    lqip: `data:image/webp;base64,${readFileSync(lqipPath).toString('base64')}`,
  };
  console.log(`✓ dish ${id} (from ${srcW}x${srcH})`);
}

/* ----------------------------------------------------------------- video -- */
/*
 * The restaurant's own showreel, cut into the three scenes the banner offers.
 *
 * Encoded at the source's own 848x478 rather than upscaled: stretching it to
 * 1080p would triple the file size and add no detail, and the browser scales it
 * to the viewport anyway. It is soft on a large screen — that is the footage,
 * not the encode, and a 1920x1080 master would fix it.
 *
 * Sound is kept in the file. The player starts muted, as browsers require, and
 * the guest can turn it on.
 */
const SCENES_VIDEO = [
  { id: 'atmosphaere', start: 4, length: 11 },
  { id: 'kueche', start: 15, length: 14 },
  { id: 'bar', start: 30, length: 14 },
];

const showreel = join(SRC, 'video', 'xigon-banner.mp4');
if (existsSync(showreel)) {
  manifest.video = {};
  for (const scene of SCENES_VIDEO) {
    const common = ['-ss', String(scene.start), '-t', String(scene.length), '-i', showreel];

    ff([...common, '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
        join(OUT, 'video', `${scene.id}.mp4`)]);

    ff([...common, '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1',
        '-c:a', 'libopus', '-b:a', '96k', join(OUT, 'video', `${scene.id}.webm`)]);

    // a poster for the first frame, so the screen is never blank while loading
    ff(['-ss', String(scene.start + 1), '-i', showreel, '-frames:v', '1',
        '-c:v', 'libwebp', '-quality', '80', join(OUT, 'video', `${scene.id}-poster.webp`)]);

    manifest.video[scene.id] = { seconds: scene.length };
    console.log(`✓ video ${scene.id} (${scene.length}s)`);
  }
}

// ---------------------------------------------------------------------------
const vid = join(SRC, 'video', 'ambience.mov');
if (existsSync(vid)) {
  // The later part of the clip shows identifiable guests; it is cut out until
  // the restaurant confirms consent. See RESTAURANT-INFO.md.
  ff(['-ss', '5', '-t', '9', '-i', vid, '-an', '-c:v', 'libx264', '-crf', '26', '-preset', 'slow',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, 'video', 'ambience.mp4')]);
  ff(['-ss', '5', '-t', '9', '-i', vid, '-an', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1',
      join(OUT, 'video', 'ambience.webm')]);
  ff(['-ss', '9', '-i', vid, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80',
      join(OUT, 'video', 'ambience-poster.webp')]);
  console.log('✓ ambience video');
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nwrote public/img/manifest.json`);
