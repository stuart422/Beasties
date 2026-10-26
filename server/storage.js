// Photo storage behind one small interface.
// - BLOB_READ_WRITE_TOKEN set: Vercel Blob, PRIVATE access only. Photos are never public;
//   the site streams them to signed-in members through /photos/... (see app.js).
// - Otherwise: the local photos/ folder, exactly as in local development today.
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { PHOTOS_DIR } from './db.js';

export const STORAGE = process.env.BLOB_READ_WRITE_TOKEN && process.env.STORAGE !== 'local' ? 'blob' : 'local';

// Keys look like "fall-2026/01-n013.jpg". Anything else is refused.
const KEY = /^(incoming\/)?[a-z0-9-]+\/[A-Za-z0-9._-]+$/;
export const validKey = (key) => KEY.test(key) && !key.includes('..');

function localPath(key) {
  const p = resolve(PHOTOS_DIR, key);
  if (!p.startsWith(PHOTOS_DIR + sep)) throw new Error('Bad photo path.');
  return p;
}

const blob = () => import('@vercel/blob');

/** Save a file. */
export async function put(key, data, contentType = 'image/jpeg') {
  if (!validKey(key)) throw new Error('Bad photo path.');
  if (STORAGE === 'blob') {
    const { put: blobPut } = await blob();
    await blobPut(key, data, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  const p = localPath(key);
  mkdirSync(dirname(p), { recursive: true });
  await writeFile(p, data);
}

/** Open a file for streaming: { stream (Node Readable), size, contentType } or null. */
export async function open(key) {
  if (!validKey(key)) return null;
  if (STORAGE === 'blob') {
    const { get } = await blob();
    const r = await get(key, { access: 'private' }).catch((err) => {
      if (err?.name === 'BlobNotFoundError') return null;
      throw err;
    });
    if (!r || r.statusCode !== 200) return null;
    return { stream: Readable.fromWeb(r.stream), size: r.blob.size, contentType: r.blob.contentType };
  }
  const p = localPath(key);
  if (!existsSync(p)) return null;
  return { stream: createReadStream(p), size: statSync(p).size, contentType: 'image/jpeg' };
}

/** Read a whole file into memory (used to process an upload). */
export async function readAll(key) {
  if (STORAGE === 'local') return readFile(localPath(key));
  const f = await open(key);
  if (!f) throw new Error('That upload could not be found.');
  const chunks = [];
  for await (const c of f.stream) chunks.push(c);
  return Buffer.concat(chunks);
}

/** Delete a file. Missing files are fine. */
export async function remove(key) {
  if (!validKey(key)) return;
  if (STORAGE === 'blob') {
    const { del } = await blob();
    await del(key).catch(() => {});
    return;
  }
  await rm(localPath(key), { force: true });
}
