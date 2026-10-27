// Small client for the site's JSON API.

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export const SERVER_PROBLEM = 'The site is having a problem right now. Please try again in a few minutes.';
const OFFLINE = 'The site could not be reached. Please check your internet connection and try again.';

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'X-Beasties': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(OFFLINE, 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/login')) {
    location.href = `/signin.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    throw new ApiError('Please sign in.', 401);
  }
  if (res.status === 403 && data.mustChangePassword) {
    location.href = '/set-password.html';
    throw new ApiError(data.error, 403);
  }
  if (res.status >= 500) throw new ApiError(SERVER_PROBLEM, res.status);
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status);
  return data;
}

/* ---------- Uploads ---------- */

const MAX_REQUEST = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB request limit
const LONG_SIDE = 2400; // the server makes the final 1800px copy from this

// The camera date as YYYY-MM-DD, read from the original file before it is shrunk
// (shrinking drops the EXIF block). Reads only the first 256 KB.
async function takenDate(file) {
  try {
    const head = new TextDecoder('latin1').decode(await file.slice(0, 262144).arrayBuffer());
    const m = /(\d{4}):(\d{2}):(\d{2}) \d{2}:\d{2}:\d{2}/.exec(head);
    return m && m[1] > '1990' ? `${m[1]}-${m[2]}-${m[3]}` : '';
  } catch {
    return '';
  }
}

// Shrink a photo in the browser to a JPEG under the request limit. The server still strips
// all metadata and makes the final copies. Photos the browser cannot open (for example HEIC
// in some desktop browsers) are sent as they are if small enough.
async function prepare(file) {
  const taken = await takenDate(file);
  let bitmap = null;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
  if (!bitmap) {
    if (file.size <= MAX_REQUEST) return { blob: file, name: file.name, taken };
    throw new Error('This browser cannot prepare this photo and it is too large to send. Please try it from a phone, or as a JPG.');
  }
  for (const [side, quality] of [[LONG_SIDE, 0.9], [2000, 0.85], [1800, 0.8]]) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_REQUEST) {
      bitmap.close?.();
      return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', taken };
    }
  }
  bitmap.close?.();
  throw new Error('This photo could not be made small enough to send.');
}

// Send one multipart form with real progress (XMLHttpRequest reports upload progress).
function send(url, form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('X-Beasties', '1');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else if (xhr.status === 413) reject(new ApiError('This photo is too large to send.', 413));
      else if (xhr.status >= 500) reject(new ApiError(SERVER_PROBLEM, xhr.status));
      else reject(new ApiError(data.error || 'The upload did not finish. Please try again.', xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('The upload was interrupted. Please check the connection and try again.', 0));
    xhr.send(form);
  });
}

// Upload several photos, one request each, with overall progress from 0 to 1.
export async function uploadPhotos(eventId, files, captions, onProgress) {
  const results = [];
  for (const [i, f] of files.entries()) {
    const step = (r) => onProgress((i + r) / files.length);
    step(0);
    try {
      const prepared = await prepare(f);
      const form = new FormData();
      form.append('photos', prepared.blob, prepared.name);
      form.append('captions', captions[i] || '');
      form.append('taken', prepared.taken || '');
      const data = await send(`/api/events/${encodeURIComponent(eventId)}/photos`, form, (p) => step(p * 0.9));
      results.push({ ...(data.results?.[0] || { ok: false, error: 'No answer from the site.' }), name: f.name });
    } catch (err) {
      results.push({ name: f.name, ok: false, error: err.message || 'This photo could not be added.' });
    }
    step(1);
  }
  return { results };
}

// Share one sighting: the photo (shrunk like album photos), a place and a caption.
export async function uploadSighting(file, place, caption, onProgress) {
  const prepared = await prepare(file);
  const form = new FormData();
  form.append('photo', prepared.blob, prepared.name);
  form.append('place', place || '');
  form.append('caption', caption || '');
  const data = await send('/api/sightings', form, onProgress);
  return data.sighting;
}

export const roleLabel = (role) => ({ owner: 'Owner', admin: 'Admin', member: 'Member' }[role] || role);
