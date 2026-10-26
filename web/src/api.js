// Small client for the local server's JSON API.

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'X-Beasties': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/login')) {
    location.href = `/signin.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    throw new ApiError('Please sign in.', 401);
  }
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status);
  return data;
}

// Upload with real progress (fetch cannot report upload progress, XMLHttpRequest can).
export function uploadPhotos(eventId, files, captions, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    files.forEach((f, i) => { form.append('photos', f, f.name); form.append('captions', captions[i] || ''); });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/events/${encodeURIComponent(eventId)}/photos`);
    xhr.setRequestHeader('X-Beasties', '1');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data.error || 'The upload did not finish. Please try again.', xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('The upload was interrupted. Please check the connection and try again.', 0));
    xhr.send(form);
  });
}

// On Vercel: each original goes straight to a private "incoming/" blob (no 4.5 MB limit),
// then the server cleans, resizes and stores it. Results match uploadPhotos().
export async function uploadViaBlob(eventId, files, captions, onProgress) {
  const { upload } = await import('@vercel/blob/client');
  const total = files.reduce((n, f) => n + f.size, 0) || 1;
  let done = 0;
  const results = [];
  for (const [i, f] of files.entries()) {
    const ext = (f.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)?.[1] || 'jpg').toLowerCase();
    const pathname = `incoming/${eventId}/${Date.now().toString(36)}-${i}.${ext}`;
    try {
      const blob = await upload(pathname, f, {
        access: 'private',
        handleUploadUrl: '/api/blob-upload',
        contentType: f.type || undefined,
        multipart: f.size > 8 * 1024 * 1024,
        onUploadProgress: (e) => onProgress((done + e.loaded) / total),
      });
      done += f.size;
      onProgress(done / total);
      const { photo } = await api(`/events/${encodeURIComponent(eventId)}/photos/from-upload`, {
        method: 'POST', body: { key: blob.pathname, caption: captions[i] || '' },
      });
      results.push({ name: f.name, ok: true, photo });
    } catch (err) {
      done += f.size;
      results.push({ name: f.name, ok: false, error: err.message || 'This photo could not be added.' });
    }
  }
  return { results };
}

export const roleLabel =(role) => ({ owner: 'Owner', admin: 'Admin', member: 'Member' }[role] || role);
