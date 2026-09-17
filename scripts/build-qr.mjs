/**
 * The QR code on the contact screen and in the footer.
 *
 * It is generated here, into the repository, rather than fetched from one of
 * the free QR services at render time. Those services see every scan and every
 * page view that renders the image, and a restaurant's guests are not theirs to
 * count. Generating it also means the code is real: it encodes the route to
 * Nürnberger Str. 46, so a phone pointed at it opens directions, which is the
 * one thing a QR on a restaurant page is for.
 *
 * Run with `npm run qr`. The output is committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';

const OUT = join(process.cwd(), 'public', 'img', 'qr');
mkdirSync(OUT, { recursive: true });

/*
 * A geo: URI would be more correct and is understood by fewer phones than one
 * would like. The maps URL opens on every handset we can test, and the address
 * is written out in full so a human reading the decoded text still gets the
 * answer.
 */
const ADDRESS = 'XIGON 1987, Nürnberger Str. 46, 10789 Berlin';
const ROUTE = `https://www.openstreetmap.org/directions?to=${encodeURIComponent(ADDRESS)}`;

const svg = await QRCode.toString(ROUTE, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 1,
  color: { dark: '#17110a', light: '#ffffff' },
});

writeFileSync(join(OUT, 'route.svg'), svg);

await QRCode.toFile(join(OUT, 'route.png'), ROUTE, {
  errorCorrectionLevel: 'M',
  margin: 1,
  width: 512,
  color: { dark: '#17110a', light: '#ffffff' },
});

console.log(`✓ qr route → ${ROUTE}`);
