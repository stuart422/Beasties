// JSON API. Every route needs a signed-in member unless noted.
// All text is stored as plain text and the pages insert it with textContent, never as HTML.
import express from 'express';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { query, one, tx } from './db.js';
import { loadUser, requireUser, requireRole, isAdmin, publicUser, login, logout, changePassword } from './auth.js';
import { processImage, MAX_FILE_BYTES, MAX_FILES, UPLOAD_TYPES } from './images.js';
import * as storage from './storage.js';

export const CAPTION_MAX = 200;
export const COMMENT_MAX = 280;
const DAY_NOT_SET = 'Day not set';

export const api = express.Router();

// Express 5 passes rejected promises to the error handler; this keeps handlers short.
const fail = (res, status, error) => res.status(status).json({ error });
const text = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const tooLong = (v, max) => String(v ?? '').trim().length > max;

/* ---------- Request checks ---------- */

// The Blob upload token route is called by the Blob client library, which sends JSON
// without our header. It is still same-origin only and needs a signed-in member.
const sameOrigin = (req) => {
  const origin = req.get('Origin');
  return !origin || new URL(origin).host === req.get('Host');
};
api.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  if (!sameOrigin(req)) return fail(res, 403, 'Request refused.');
  if (req.path === '/blob-upload') return next();
  if (req.get('X-Beasties') !== '1') return fail(res, 403, 'Request refused.');
  next();
});
api.use(express.json({ limit: '32kb' }));
api.use(loadUser);

/* =====================================================================
   Account
   ===================================================================== */

api.post('/login', login);
api.post('/logout', logout);
api.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));
api.get('/config', requireUser, (req, res) => res.json({ storage: storage.STORAGE, maxFiles: MAX_FILES }));
api.patch('/me', requireUser, async (req, res) => {
  const name = text(req.body?.name, 60);
  if (!name) return fail(res, 400, 'Please enter a name.');
  await query('UPDATE users SET name = $1 WHERE id = $2', [name, req.user.id]);
  res.json({ user: publicUser({ ...req.user, name }) });
});
api.post('/me/password', requireUser, changePassword);

/* =====================================================================
   Albums
   ===================================================================== */

const eventRow = (id) => one('SELECT * FROM events WHERE id = $1', [String(id)]);

async function hasHistory(type, id) {
  return !!(await one('SELECT 1 FROM caption_history WHERE target_type = $1 AND target_id = $2 LIMIT 1', [type, String(id)]));
}

async function eventOut(e, user) {
  return {
    id: e.id, name: e.name, eventName: e.event_name, dates: e.dates, place: e.place,
    start: e.start_date, upcoming: !!e.upcoming, emptyNote: e.empty_note,
    days: e.days, caption: e.caption,
    canEditCaption: isAdmin(user),
    canUndoCaption: isAdmin(user) && (await hasHistory('album', e.id)),
  };
}

api.get('/events', requireUser, async (req, res) => {
  const rows = await query(`SELECT e.*, COUNT(p.id)::int AS photo_count,
      (SELECT thumb FROM photos WHERE event_id = e.id ORDER BY id LIMIT 1) AS cover
    FROM events e LEFT JOIN photos p ON p.event_id = e.id GROUP BY e.id ORDER BY e.sort`);
  const events = [];
  for (const e of rows) events.push({ ...(await eventOut(e, req.user)), photoCount: e.photo_count, cover: e.cover ? `/photos/${e.cover}` : null });
  res.json({ events });
});

const PHOTO_SELECT = `SELECT p.*, u.name AS uploader_name,
  (SELECT COUNT(*)::int FROM comments c WHERE c.photo_id = p.id) AS comment_count,
  EXISTS (SELECT 1 FROM caption_history h WHERE h.target_type = 'photo' AND h.target_id = p.id::text) AS has_history
  FROM photos p LEFT JOIN users u ON u.id = p.uploader_id`;

function photoOut(p, user) {
  const mine = !!user && p.uploader_id === user.id;
  const canEdit = isAdmin(user) || mine;
  return {
    id: p.id, event: p.event_id, src: `/photos/${p.file}`, thumb: `/photos/${p.thumb}`,
    w: p.width, h: p.height, day: p.day, caption: p.caption,
    uploader: p.uploader_name || null, mine, canEdit,
    canUndo: canEdit && !!p.has_history,
    commentsClosed: !!p.comments_closed, commentCount: p.comment_count ?? 0,
    canSetDay: isAdmin(user),
  };
}
const freshPhoto = async (id, user) => photoOut(await one(`${PHOTO_SELECT} WHERE p.id = $1`, [id]), user);

api.get('/events/:id', requireUser, async (req, res) => {
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That album was not found.');
  const photos = await query(`${PHOTO_SELECT} WHERE p.event_id = $1 ORDER BY p.id`, [e.id]);
  res.json({ event: await eventOut(e, req.user), photos: photos.map((p) => photoOut(p, req.user)), canUpload: true });
});

api.get('/my/photos', requireUser, async (req, res) => {
  const photos = await query(`${PHOTO_SELECT} WHERE p.uploader_id = $1 ORDER BY p.id DESC`, [req.user.id]);
  const names = Object.fromEntries((await query('SELECT id, name FROM events')).map((e) => [e.id, e.name]));
  res.json({ photos: photos.map((p) => ({ ...photoOut(p, req.user), eventName: names[p.event_id] })) });
});

/* =====================================================================
   Captions, with history so every edit can be undone
   ===================================================================== */

const setText = (t, type, id, value) => (type === 'photo'
  ? t.query('UPDATE photos SET caption = $1 WHERE id = $2', [value, Number(id)])
  : t.query('UPDATE events SET caption = $1 WHERE id = $2', [value, String(id)]));

const saveCaption = (type, id, oldText, newText, userId) => tx(async (t) => {
  await t.query('INSERT INTO caption_history (target_type, target_id, old_text, new_text, user_id) VALUES ($1, $2, $3, $4, $5)',
    [type, String(id), oldText, newText, userId]);
  await setText(t, type, id, newText);
});

const undoCaption = (type, id) => tx(async (t) => {
  const last = await t.one('SELECT * FROM caption_history WHERE target_type = $1 AND target_id = $2 ORDER BY id DESC LIMIT 1', [type, String(id)]);
  if (!last) return false;
  await setText(t, type, id, last.old_text);
  await t.query('DELETE FROM caption_history WHERE id = $1', [last.id]);
  return true;
});

async function photoForEdit(req, res) {
  const p = await one('SELECT * FROM photos WHERE id = $1', [Number(req.params.id) || 0]);
  if (!p) { fail(res, 404, 'That photo was not found.'); return null; }
  if (!(isAdmin(req.user) || p.uploader_id === req.user.id)) { fail(res, 403, 'Only the person who added this photo, or an admin, can change its caption.'); return null; }
  return p;
}

api.patch('/photos/:id/caption', requireUser, async (req, res) => {
  const p = await photoForEdit(req, res);
  if (!p) return;
  if (tooLong(req.body?.text, CAPTION_MAX)) return fail(res, 400, `Captions can be up to ${CAPTION_MAX} characters.`);
  const next = text(req.body?.text, CAPTION_MAX);
  if (next !== p.caption) await saveCaption('photo', p.id, p.caption, next, req.user.id);
  res.json({ photo: await freshPhoto(p.id, req.user) });
});

api.post('/photos/:id/caption/undo', requireUser, async (req, res) => {
  const p = await photoForEdit(req, res);
  if (!p) return;
  if (!(await undoCaption('photo', p.id))) return fail(res, 400, 'There is no earlier caption to go back to.');
  res.json({ photo: await freshPhoto(p.id, req.user) });
});

api.patch('/events/:id/caption', requireRole('admin'), async (req, res) => {
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That album was not found.');
  if (tooLong(req.body?.text, CAPTION_MAX)) return fail(res, 400, `Captions can be up to ${CAPTION_MAX} characters.`);
  const next = text(req.body?.text, CAPTION_MAX);
  if (next !== e.caption) await saveCaption('album', e.id, e.caption, next, req.user.id);
  res.json({ event: await eventOut(await eventRow(e.id), req.user) });
});

api.post('/events/:id/caption/undo', requireRole('admin'), async (req, res) => {
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That album was not found.');
  if (!(await undoCaption('album', e.id))) return fail(res, 400, 'There is no earlier caption to go back to.');
  res.json({ event: await eventOut(await eventRow(e.id), req.user) });
});

/* =====================================================================
   Day setting (owner and admins)
   ===================================================================== */

api.patch('/photos/:id/day', requireRole('admin'), async (req, res) => {
  const p = await one('SELECT * FROM photos WHERE id = $1', [Number(req.params.id) || 0]);
  if (!p) return fail(res, 404, 'That photo was not found.');
  const allowed = [...(await eventRow(p.event_id)).days, DAY_NOT_SET];
  const day = String(req.body?.day || '');
  if (!allowed.includes(day)) return fail(res, 400, 'Please choose one of the weekend days.');
  await query('UPDATE photos SET day = $1 WHERE id = $2', [day, p.id]);
  res.json({ photo: await freshPhoto(p.id, req.user) });
});

/* =====================================================================
   Uploads. Every photo is checked, re-encoded (no EXIF or GPS), resized and given a
   thumbnail on the server, whichever way it arrives.
   ===================================================================== */

async function addPhoto(e, buffer, caption, user) {
  const img = await processImage(buffer);
  const base = `${Date.now()}-${randomBytes(5).toString('hex')}`;
  const file = `${e.id}/${base}.jpg`;
  const thumb = `${e.id}/${base}-sm.jpg`;
  await storage.put(file, img.large);
  await storage.put(thumb, img.small);
  const day = img.weekday && e.days.includes(img.weekday) ? img.weekday : DAY_NOT_SET;
  const row = await one(`INSERT INTO photos (event_id, file, thumb, width, height, day, caption, uploader_id, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Uploaded') RETURNING id`,
  [e.id, file, thumb, img.width, img.height, day, text(caption, CAPTION_MAX), user.id]);
  return freshPhoto(row.id, user);
}

// 1. Direct upload (local development, and small files anywhere): multipart form.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: MAX_FILES + 5, fieldSize: 4096 },
});

api.post('/events/:id/photos', requireUser, (req, res, next) => {
  upload.array('photos', MAX_FILES)(req, res, async (err) => {
    try {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 30 MB.'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? `You can add up to ${MAX_FILES} photos at once.`
            : 'The upload could not be read.';
        return fail(res, 400, msg);
      }
      const e = await eventRow(req.params.id);
      if (!e) return fail(res, 404, 'That album was not found.');
      const files = req.files || [];
      if (!files.length) return fail(res, 400, 'Please choose at least one photo.');
      const captions = [].concat(req.body?.captions ?? []);
      const results = [];
      for (const [i, f] of files.entries()) {
        try { results.push({ name: f.originalname, ok: true, photo: await addPhoto(e, f.buffer, captions[i], req.user) }); }
        catch (error) { results.push({ name: f.originalname, ok: false, error: error.message }); }
      }
      res.json({ results });
    } catch (error) { next(error); }
  });
});

// 2. Vercel: the browser uploads the original straight to a private "incoming/" blob with a
//    short-lived token from this route (no 4.5 MB function limit), then asks the server to
//    process it. Tokens are only issued to signed-in members, for incoming/<album>/ paths.
api.post('/blob-upload', requireUser, async (req, res) => {
  if (storage.STORAGE !== 'blob') return fail(res, 400, 'Direct uploads are only used with Vercel Blob.');
  const { handleUpload } = await import('@vercel/blob/client');
  try {
    const result = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const m = /^incoming\/([a-z0-9-]+)\/[A-Za-z0-9._-]+$/.exec(pathname);
        if (!m || !(await eventRow(m[1]))) throw new Error('That upload path is not allowed.');
        return {
          allowedContentTypes: UPLOAD_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: req.user.id }),
        };
      },
    });
    res.json(result);
  } catch (error) {
    fail(res, 400, error.message || 'The upload could not start.');
  }
});

api.post('/events/:id/photos/from-upload', requireUser, async (req, res) => {
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That album was not found.');
  const key = String(req.body?.key || '');
  if (!key.startsWith(`incoming/${e.id}/`) || !storage.validKey(key)) return fail(res, 400, 'That upload could not be found.');
  try {
    const photo = await addPhoto(e, await storage.readAll(key), req.body?.caption, req.user);
    res.json({ photo });
  } catch (error) {
    fail(res, 400, error.message);
  } finally {
    await storage.remove(key); // the original never stays in storage
  }
});

/* =====================================================================
   Download (location data was already removed)
   ===================================================================== */

api.get('/photos/:id/download', requireUser, async (req, res) => {
  const p = await one('SELECT p.*, e.name AS event_name FROM photos p JOIN events e ON e.id = p.event_id WHERE p.id = $1', [Number(req.params.id) || 0]);
  if (!p) return fail(res, 404, 'That photo was not found.');
  const f = await storage.open(p.file);
  if (!f) return fail(res, 404, 'That photo file is missing.');
  const name = `Beasties ${p.event_name} ${p.id}.jpg`.replace(/[^\w .-]/g, '');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  if (f.size) res.setHeader('Content-Length', f.size);
  f.stream.pipe(res);
});

/* =====================================================================
   Comments: short, flat, delete your own; owner and admins can delete any or close them
   ===================================================================== */

async function commentsOut(photoId, user) {
  return (await query(`SELECT c.id, c.body, c.created_at, c.user_id, u.name FROM comments c
    LEFT JOIN users u ON u.id = c.user_id WHERE c.photo_id = $1 ORDER BY c.id`, [photoId]))
    .map((c) => ({
      id: c.id, body: c.body, author: c.name || 'Former member', at: c.created_at,
      canDelete: isAdmin(user) || c.user_id === user.id,
    }));
}

api.get('/photos/:id/comments', requireUser, async (req, res) => {
  const p = await one('SELECT id, comments_closed FROM photos WHERE id = $1', [Number(req.params.id) || 0]);
  if (!p) return fail(res, 404, 'That photo was not found.');
  res.json({ comments: await commentsOut(p.id, req.user), closed: !!p.comments_closed, canClose: isAdmin(req.user) });
});

api.post('/photos/:id/comments', requireUser, async (req, res) => {
  const p = await one('SELECT id, comments_closed FROM photos WHERE id = $1', [Number(req.params.id) || 0]);
  if (!p) return fail(res, 404, 'That photo was not found.');
  if (p.comments_closed) return fail(res, 403, 'Comments are closed on this photo.');
  const raw = String(req.body?.body ?? '').trim();
  if (!raw) return fail(res, 400, 'Please write a comment first.');
  if (raw.length > COMMENT_MAX) return fail(res, 400, `Comments can be up to ${COMMENT_MAX} characters.`);
  await query('INSERT INTO comments (photo_id, user_id, body) VALUES ($1, $2, $3)', [p.id, req.user.id, text(raw, COMMENT_MAX)]);
  res.json({ comments: await commentsOut(p.id, req.user) });
});

api.delete('/comments/:id', requireUser, async (req, res) => {
  const c = await one('SELECT * FROM comments WHERE id = $1', [Number(req.params.id) || 0]);
  if (!c) return fail(res, 404, 'That comment was not found.');
  if (!(isAdmin(req.user) || c.user_id === req.user.id)) return fail(res, 403, 'You can only delete your own comments.');
  await query('DELETE FROM comments WHERE id = $1', [c.id]);
  res.json({ comments: await commentsOut(c.photo_id, req.user) });
});

api.patch('/photos/:id/comments-closed', requireRole('admin'), async (req, res) => {
  const p = await one('SELECT id FROM photos WHERE id = $1', [Number(req.params.id) || 0]);
  if (!p) return fail(res, 404, 'That photo was not found.');
  await query('UPDATE photos SET comments_closed = $1 WHERE id = $2', [!!req.body?.closed, p.id]);
  res.json({ closed: !!req.body?.closed });
});

/* =====================================================================
   Admin (owner only): members and the admin role. No contact details.
   ===================================================================== */

api.get('/admin/members', requireRole('owner'), async (req, res) => {
  res.json({ members: await query("SELECT id, name, role FROM users ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, name") });
});

api.patch('/admin/members/:id/role', requireRole('owner'), async (req, res) => {
  const u = await one('SELECT * FROM users WHERE id = $1', [Number(req.params.id) || 0]);
  if (!u) return fail(res, 404, 'That member was not found.');
  if (u.role === 'owner') return fail(res, 400, 'The owner role cannot be changed here.');
  const role = req.body?.role;
  if (!['admin', 'member'].includes(role)) return fail(res, 400, 'Choose admin or member.');
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, u.id]);
  res.json({ member: { id: u.id, name: u.name, role } });
});

api.use((req, res) => fail(res, 404, 'Not found.'));

// Never leak internal errors to the page.
// eslint-disable-next-line no-unused-vars
api.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) fail(res, 500, 'Something went wrong on the server. Please try again.');
});
