// Self-test for the upload pipeline: GPS is removed, sizes are capped, bad files are refused.
// Run with: node server/selftest-images.mjs
import sharp from 'sharp';
import exifReader from 'exif-reader';
import { processImage } from './images.js';

const make = (fmt, w, h) => sharp({ create: { width: w, height: h, channels: 3, background: '#6a8caf' } })[fmt]();
const tagged = await make('jpeg', 4000, 3000).withExif({
  IFD0: { Make: 'TestCam' },
  IFD2: { DateTimeOriginal: '2026:10:17 09:30:00' },
  IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '44/1 16/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '71/1 18/1 0/1' },
}).toBuffer();
const before = exifReader((await sharp(tagged).metadata()).exif);
console.log('input has GPS:', !!before.GPSInfo?.GPSLatitude, '| taken:', before.Photo?.DateTimeOriginal?.toISOString?.());

const out = await processImage(tagged);
const meta = await sharp(out.large).metadata();
const smallMeta = await sharp(out.small).metadata();
console.log('large:', meta.width + 'x' + meta.height, '| exif left:', !!meta.exif, '| small:', smallMeta.width + 'x' + smallMeta.height, '| exif left:', !!smallMeta.exif, '| weekday:', out.weekday);

for (const fmt of ['png', 'webp']) {
  const r = await processImage(await make(fmt, 1200, 900).toBuffer());
  console.log(fmt, 'ok ->', r.width + 'x' + r.height);
}
for (const [name, buf] of [['text file', Buffer.from('hello, not a photo at all')], ['avif', await make('avif', 400, 300).toBuffer()]]) {
  try { await processImage(buf); console.log(name, 'WRONGLY accepted'); } catch (e) { console.log(name, 'refused:', e.message); }
}
