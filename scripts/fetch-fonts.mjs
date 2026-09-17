/**
 * Downloads the self-hosted webfonts.
 *
 * The two faces from the restaurant's style guide: EB Garamond for display
 * type and Montserrat for everything the guest reads as interface — labels,
 * prices, forms, the dock.
 *
 * Both ship a real Vietnamese subset, which this site needs and which most
 * old-style serifs do not have. Self-hosted rather than linked, so no request
 * leaves the page for a font.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, unlinkSync } from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const OUT = 'public/fonts';
const SUBSETS = ['latin', 'latin-ext', 'vietnamese'];

const FAMILIES = [
  { query: 'EB+Garamond:ital,wght@0,400..700;1,400..600', prefix: 'garamond' },
  { query: 'Montserrat:ital,wght@0,300..800;1,300..600', prefix: 'montserrat' },
];

for (const family of FAMILIES) {
  const tmp = `${OUT}/_tmp.css`;
  execSync(`curl -sS -A "${UA}" "https://fonts.googleapis.com/css2?family=${family.query}&display=swap" -o "${tmp}"`);
  const css = readFileSync(tmp, 'utf8');

  for (const block of css.split('/*').slice(1)) {
    const subset = block.slice(0, block.indexOf('*/')).trim();
    if (!SUBSETS.includes(subset)) continue;
    const italic = /font-style:\s*italic/.test(block);
    const url = block.match(/url\((https:[^)]+)\)/)?.[1];
    if (!url) continue;

    const file = `${OUT}/${family.prefix}${italic ? '-italic' : ''}-${subset}.woff2`;
    if (!existsSync(file)) execSync(`curl -sS -o "${file}" "${url}"`);
    console.log(`${file}  ${statSync(file).size} bytes`);
  }
  unlinkSync(tmp);
}
