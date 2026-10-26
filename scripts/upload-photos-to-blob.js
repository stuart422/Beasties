// Copies the approved Fall 2026 photos (large copies and thumbnails, 88 files) from the local
// photos/fall-2026/ folder into the PRIVATE Vercel Blob store, using the same paths the
// database uses (fall-2026/<file>.jpg).
//
//   node --env-file=.env scripts/upload-photos-to-blob.js           dry run: lists what would happen
//   node --env-file=.env scripts/upload-photos-to-blob.js --yes     really uploads
//
// Safe to run again: files already in the store are skipped. Never uploads dji_beasties-1.
// Before uploading, each file is checked for GPS data; if any is found it is re-encoded
// without metadata first.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import { put, head } from '@vercel/blob';
import { approvedPhotos } from '../server/seed.js';

const ROOT = resolve(import.meta.dirname, '..');
const REALLY = process.argv.includes('--yes');

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set. Put it in .env (see .env.example) and run with --env-file=.env');
  process.exit(1);
}

async function cleanBytes(path) {
  const buf = readFileSync(path);
  const meta = await sharp(buf).metadata();
  let gps = false;
  try { gps = !!(meta.exif && exifReader(meta.exif).GPSInfo); } catch { gps = !!meta.exif; }
  if (!gps) return { buf, rewritten: false };
  return { buf: await sharp(buf).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer(), rewritten: true };
}

async function exists(key) {
  try { await head(key); return true; } catch (err) {
    if (err?.name === 'BlobNotFoundError') return false;
    throw err;
  }
}

const keys = approvedPhotos().flatMap((p) => [p.file, p.thumb]);
console.log(`${REALLY ? 'Uploading' : 'Dry run for'} ${keys.length} files to private Vercel Blob.\n`);
let uploaded = 0, skipped = 0, missing = 0, cleaned = 0;

for (const key of keys) {
  const path = resolve(ROOT, 'photos', key);
  if (!existsSync(path)) { console.log(`MISSING  ${key}`); missing++; continue; }
  if (await exists(key)) { console.log(`exists   ${key}`); skipped++; continue; }
  const { buf, rewritten } = await cleanBytes(path);
  if (rewritten) cleaned++;
  if (REALLY) {
    await put(key, buf, { access: 'private', contentType: 'image/jpeg', addRandomSuffix: false });
    console.log(`uploaded ${key}${rewritten ? '  (GPS removed first)' : ''}`);
  } else {
    console.log(`would upload ${key}${rewritten ? '  (GPS would be removed first)' : ''}`);
  }
  uploaded++;
}

console.log(`\n${REALLY ? 'Uploaded' : 'Would upload'}: ${uploaded}. Already there: ${skipped}. Missing locally: ${missing}. GPS removed: ${cleaned}.`);
if (!REALLY) console.log('Nothing was uploaded. Run again with --yes to upload.');
