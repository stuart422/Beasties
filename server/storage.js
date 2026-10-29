// Photo storage behind one small interface.
// - Vercel Blob (PRIVATE access only) when a Blob store is connected: either a read-write
//   token (BLOB_READ_WRITE_TOKEN) or OIDC (BLOB_STORE_ID; on Vercel the OIDC token is
//   supplied automatically). Photos are never public; the site streams them to signed-in
//   members through /photos/... (see app.js).
// - Otherwise: the local photos/ folder, exactly as in local development today.
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { PHOTOS_DIR } from './db.js';

const blobConnected = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
export const STORAGE = blobConnected && process.env.STORAGE !== 'local' ? 'blob' : 'local';

// Keys look like "fall-2026/01-n013.jpg". Anything else is refused.
const KEY = /^(incoming\/)?[a-z0-9-]+\/[A-Za-z0-9._-]+$/;
export const validKey = (key) => KEY.test(key) && !key.includes('..');

function localPath(key) {
  const p = resolve(PHOTOS_DIR, key);
  if (!p.startsWith(PHOTOS_DIR + sep)) throw new Error('Bad photo path.');
  return p;
}

const blob = () => import('@vercel/blob');

// Local files: the type from the name (photos are JPEG; event documents are PDF or Word).
const LOCAL_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const localType = (key) => LOCAL_TYPES[key.slice(key.lastIndexOf('.')).toLowerCase()] || 'image/jpeg';

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
    const { get, BlobNotFoundError } = await blob();
    const r = await get(key, { access: 'private' }).catch((err) => {
      if (err instanceof BlobNotFoundError) return null;
      throw err;
    });
    if (!r || r.statusCode !== 200) return null;
    return { stream: Readable.fromWeb(r.stream), size: r.blob.size, contentType: r.blob.contentType };
  }
  const p = localPath(key);
  if (!existsSync(p)) return null;
  return { stream: createReadStream(p), size: statSync(p).size, contentType: localType(key) };
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

/**
 * Private Blob only: a link to one file that works for a few minutes, so a large file
 * (over Vercel's 4.5 MB response limit) can go straight from storage to a signed-in member.
 * Returns null for local storage.
 */
export async function signedUrl(key, seconds = 300) {
  if (STORAGE !== 'blob' || !validKey(key)) return null;
  const { issueSignedToken, presignUrl } = await blob();
  const validUntil = Date.now() + seconds * 1000;
  const token = await issueSignedToken({ pathname: key, operations: ['get'], validUntil });
  return (await presignUrl(token, { operation: 'get', pathname: key, access: 'private', validUntil })).presignedUrl;
}
