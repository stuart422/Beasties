// Event documents: one itinerary or supporting document per event (see migration 005).
//
// - A private file: PDF or Word .docx, kept in the same private storage as the photos.
//   Members open it through /api/events/:id/document/file, which checks the sign-in first.
//   PDFs open in the browser's own viewer (bookmarks and page links keep working); Word files
//   download and open in Word. A PDF's "run a script when opened" action (such as print on
//   open) is removed on upload; nothing else in the file is changed.
// - A link to a Google Docs or Microsoft Word document. It opens the original in a new tab;
//   Google or Microsoft decide who can see it.
// Only the owner and admins can add, replace or remove a document.
import express from 'express';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { one, query } from './db.js';
import { requireRole, isAdmin } from './auth.js';
import * as storage from './storage.js';
import { removeOpenScript } from './pdf-clean.js';

export const documents = express.Router();

export const DOC_MAX_BYTES = 25 * 1024 * 1024;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 300;
const TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
// Where a document link may point: Google Docs / Drive and Microsoft Word / OneDrive / SharePoint.
const LINK_HOSTS = [/^docs\.google\.com$/, /^drive\.google\.com$/, /^onedrive\.live\.com$/, /^1drv\.ms$/,
  /^[a-z0-9-]+\.sharepoint\.com$/, /^(www\.)?office\.com$/, /^[a-z0-9-]+\.office\.com$/, /^office\.live\.com$/];

const fail = (res, status, error) => res.status(status).json({ error });
const text = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const eventRow = (id) => one('SELECT id, name FROM events WHERE id = $1', [String(id)]);
const docRow = (id) => one('SELECT * FROM event_documents WHERE event_id = $1', [String(id)]);

// What the file really is, from its first bytes (never from its name).
function sniff(buf) {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    && buf.includes('word/document.xml') && buf.includes('[Content_Types].xml')) return 'docx';
  return null;
}

function checkLink(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  if (!LINK_HOSTS.some((re) => re.test(u.hostname.toLowerCase()))) return null;
  return u.href.length <= 2000 ? u.href : null;
}

const provider = (url) => (/google\.com$/.test(new URL(url).hostname) ? 'google' : 'microsoft');
const safeName = (name, kind) => {
  const base = String(name || '').replace(/\.[^.]*$/, '').replace(/[^\w .()-]/g, '').trim().slice(0, 80) || 'Beasties document';
  return `${base}.${kind}`;
};

function docOut(d, eventId) {
  if (!d) return null;
  return {
    kind: d.kind, title: d.title, description: d.description, note: d.note || '',
    fileName: d.file_name, size: d.file_size, updatedAt: d.updated_at,
    ...(d.kind === 'link'
      ? { href: d.url, provider: provider(d.url) }
      : { href: `/api/events/${encodeURIComponent(eventId)}/document/file` }),
  };
}

/* ---------- Read ---------- */

documents.get('/events/:id/document', async (req, res) => {
  if (!req.user) return fail(res, 401, 'Please sign in.');
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That event was not found.');
  res.json({ document: docOut(await docRow(e.id), e.id), canManage: isAdmin(req.user) });
});

// The file itself, for signed-in members only. Opened in a new tab, so errors are plain words.
documents.get('/events/:id/document/file', async (req, res) => {
  const say = (status, words) => res.status(status).type('text/plain; charset=utf-8').set('Cache-Control', 'no-store').send(words);
  if (!req.user) return say(401, 'Please sign in to the Beasties website first, then open the document again.');
  const d = await docRow(req.params.id);
  if (!d || d.kind === 'link' || !d.file_key) return say(404, 'This document is not available right now. Please ask Stuart.');
  // Private Blob: a link to this one file that works for 5 minutes (large files skip the 4.5 MB limit)
  const signed = await storage.signedUrl(d.file_key).catch(() => null);
  if (signed) { res.set('Cache-Control', 'no-store'); return res.redirect(303, signed); }
  const f = await storage.open(d.file_key);
  if (!f) return say(404, 'This document is not available right now. Please ask Stuart.');
  const name = safeName(d.file_name, d.kind);
  res.setHeader('Content-Type', TYPES[d.kind]);
  res.setHeader('Content-Disposition', `${d.kind === 'pdf' ? 'inline' : 'attachment'}; filename="${name}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  if (f.size) res.setHeader('Content-Length', f.size);
  f.stream.on('error', () => res.destroy()).pipe(res);
});

/* ---------- Add, replace, remove (owner and admins) ---------- */

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: DOC_MAX_BYTES, files: 1, fields: 8, fieldSize: 4096 } });

// Live site (private Blob): the browser sends large files straight to storage, under
// "incoming/docs/", with a one-time permission from here; the save below then checks them.
documents.post('/events/:id/document/upload-token', requireRole('admin'), async (req, res) => {
  if (storage.STORAGE !== 'blob') return fail(res, 404, 'Not used here.');
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That event was not found.');
  const { handleUpload } = await import('@vercel/blob/client');
  try {
    res.json(await handleUpload({
      request: req, body: req.body,
      onBeforeGenerateToken: async (pathname) => {
        if (!new RegExp(`^incoming/docs/${e.id}-[a-z0-9]+\\.(pdf|docx)$`).test(pathname)) throw new Error('Bad file name.');
        return { allowedContentTypes: Object.values(TYPES), maximumSizeInBytes: DOC_MAX_BYTES, validUntil: Date.now() + 10 * 60_000, addRandomSuffix: false, allowOverwrite: false };
      },
      onUploadCompleted: async () => {},
    }));
  } catch { fail(res, 400, 'The upload could not be started. Please try again.'); }
});

documents.put('/events/:id/document', requireRole('admin'), (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) return fail(res, 400, err.code === 'LIMIT_FILE_SIZE' ? 'The file must be under 25 MB.' : 'The upload could not be read.');
      const e = await eventRow(req.params.id);
      if (!e) return fail(res, 404, 'That event was not found.');
      const title = text(req.body?.title, TITLE_MAX + 1);
      const description = text(req.body?.description, DESCRIPTION_MAX + 1);
      if (!title) return fail(res, 400, 'Please give the document a title, for example "Foliage 2026 Itinerary".');
      if (title.length > TITLE_MAX) return fail(res, 400, `Please keep the title under ${TITLE_MAX} characters.`);
      if (description.length > DESCRIPTION_MAX) return fail(res, 400, `Please keep the description under ${DESCRIPTION_MAX} characters.`);
      const old = await docRow(e.id);
      const mode = req.body?.mode;

      // Only the title and description change
      if (mode === 'details') {
        if (!old) return fail(res, 400, 'Please choose a file or add a link first.');
        await query('UPDATE event_documents SET title = $2, description = $3, updated_by = $4, updated_at = now() WHERE event_id = $1', [e.id, title, description, req.user.id]);
        return res.json({ document: docOut(await docRow(e.id), e.id), message: 'Saved.' });
      }

      if (mode === 'link') {
        const url = checkLink(req.body?.url);
        if (!url) return fail(res, 400, 'Please paste a Google Docs or Microsoft Word sharing link (it starts with https://).');
        await saveRow(e.id, { kind: 'link', title, description, url, note: '' }, req.user.id);
        if (old?.file_key) await storage.remove(old.file_key);
        return res.json({ document: docOut(await docRow(e.id), e.id), message: 'Link saved.' });
      }

      if (mode !== 'file') return fail(res, 400, 'Please choose a file or add a link.');
      let buf;
      let original = req.file?.originalname;
      const incoming = String(req.body?.incomingKey || '');
      if (req.file) buf = req.file.buffer;
      else if (incoming) {
        if (!new RegExp(`^incoming/docs/${e.id}-[a-z0-9]+\\.(pdf|docx)$`).test(incoming)) return fail(res, 400, 'The upload could not be found.');
        buf = await storage.readAll(incoming).catch(() => null);
        original = req.body?.fileName;
      }
      if (!buf?.length) return fail(res, 400, 'Please choose a PDF or Word (.docx) file.');
      if (buf.length > DOC_MAX_BYTES) return fail(res, 400, 'The file must be under 25 MB.');
      const kind = sniff(buf);
      if (!kind) {
        if (incoming) await storage.remove(incoming);
        return fail(res, 400, 'That file is not a PDF or a Word (.docx) document. Older Word files (.doc) need to be saved as .docx first.');
      }
      let note = '';
      if (kind === 'pdf') {
        const clean = removeOpenScript(buf);
        buf = clean.buffer;
        if (clean.removed) note = 'The print-on-open setting was removed. Nothing else in the file was changed.';
        if (clean.scriptLeft) note = 'This PDF still asks to run something when it opens. If members see a print window, please save the PDF again without that setting.';
      }
      const key = `docs/${e.id}-${randomBytes(6).toString('hex')}.${kind}`;
      await storage.put(key, buf, TYPES[kind]);
      await saveRow(e.id, { kind, title, description, file_key: key, file_name: safeName(original, kind), file_size: buf.length, note }, req.user.id);
      if (incoming) await storage.remove(incoming);
      if (old?.file_key) await storage.remove(old.file_key);
      res.json({ document: docOut(await docRow(e.id), e.id), message: old ? 'Document replaced.' : 'Document added.' });
    } catch (error) { next(error); }
  });
});

async function saveRow(eventId, d, userId) {
  await query(`INSERT INTO event_documents (event_id, kind, title, description, file_key, file_name, file_size, url, note, updated_by, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    ON CONFLICT (event_id) DO UPDATE SET kind = $2, title = $3, description = $4, file_key = $5, file_name = $6,
      file_size = $7, url = $8, note = $9, updated_by = $10, updated_at = now()`,
  [eventId, d.kind, d.title, d.description, d.file_key ?? null, d.file_name ?? null, d.file_size ?? null, d.url ?? null, d.note ?? '', userId]);
}

documents.delete('/events/:id/document', requireRole('admin'), async (req, res) => {
  const d = await docRow(req.params.id);
  if (!d) return fail(res, 404, 'There is no document to remove.');
  await query('DELETE FROM event_documents WHERE event_id = $1', [d.event_id]);
  if (d.file_key) await storage.remove(d.file_key);
  res.json({ document: null, message: 'Document removed.' });
});
