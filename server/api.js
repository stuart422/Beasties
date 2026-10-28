// JSON API. Every route needs a signed-in member unless noted.
// All text is stored as plain text and the pages insert it with textContent, never as HTML.
import express from 'express';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, one, tx } from './db.js';
import {
  loadUser, requireUser, requireRole, requireOwnPassword, isAdmin, publicUser, login, logout, changePassword, setFirstPassword,
} from './auth.js';
import { processImage, MAX_FILE_BYTES, MAX_FILES } from './images.js';
import * as storage from './storage.js';
import { assistantRoute, assistantEnabled } from './assistant.js';

export const CAPTION_MAX = 200;
export const COMMENT_MAX = 280;
const DAY_NOT_SET = 'Day not set';

export const api = express.Router();

// Express 5 passes rejected promises to the error handler; this keeps handlers short.
const fail = (res, status, error) => res.status(status).json({ error });
const text = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const tooLong = (v, max) => String(v ?? '').trim().length > max;

/* ---------- Request checks ---------- */

const sameOrigin = (req) => {
  const origin = req.get('Origin');
  return !origin || new URL(origin).host === req.get('Host');
};
api.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  if (!sameOrigin(req)) return fail(res, 403, 'Request refused.');
  if (req.get('X-Beasties') !== '1') return fail(res, 403, 'Request refused.');
  next();
});
api.use(express.json({ limit: '32kb' }));
api.use(loadUser);
api.use(requireOwnPassword);

/* =====================================================================
   Account
   ===================================================================== */

api.post('/login', login);
api.post('/logout', logout);
// assistant: true only while ASSISTANT_ENABLED is on, and only for a signed-in member.
api.get('/me', (req, res) => res.json({ user: publicUser(req.user), ...(req.user && assistantEnabled() ? { assistant: true } : {}) }));
api.get('/config', requireUser, (req, res) => res.json({ storage: storage.STORAGE, maxFiles: MAX_FILES }));
api.patch('/me', requireUser, async (req, res) => {
  const name = text(req.body?.name, 60);
  if (!name) return fail(res, 400, 'Please enter a name.');
  await query('UPDATE users SET name = $1 WHERE id = $2', [name, req.user.id]);
  res.json({ user: publicUser({ ...req.user, name }) });
});
api.post('/me/password', requireUser, changePassword);
api.post('/me/first-password', requireUser, setFirstPassword);

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
    canArrange: isAdmin(user),
    canUndoOrder: isAdmin(user) && !!(await one('SELECT 1 FROM photo_order_history WHERE event_id = $1 LIMIT 1', [e.id])),
  };
}

api.get('/events', requireUser, async (req, res) => {
  const rows = await query(`SELECT e.*, COUNT(p.id)::int AS photo_count,
      (SELECT thumb FROM photos WHERE event_id = e.id ORDER BY sort_order, id LIMIT 1) AS cover
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
    canDelete: canEdit,
  };
}
const freshPhoto = async (id, user) => photoOut(await one(`${PHOTO_SELECT} WHERE p.id = $1`, [id]), user);

api.get('/events/:id', requireUser, async (req, res) => {
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That album was not found.');
  res.json(await albumOut(e, req.user));
});

async function albumOut(e, user) {
  const photos = await query(`${PHOTO_SELECT} WHERE p.event_id = $1 ORDER BY p.sort_order, p.id`, [e.id]);
  return { event: await eventOut(e, user), photos: photos.map((p) => photoOut(p, user)), canUpload: true };
}

/* =====================================================================
   Photo order (owner and admins). Every move saves the arrangement before it,
   so "Undo last move" can put it back. Members and uploaders cannot reorder.
   ===================================================================== */

const ORDER_HISTORY_KEEP = 30;
const orderedIds = async (t, eventId) => (await t.query('SELECT id FROM photos WHERE event_id = $1 ORDER BY sort_order, id', [eventId])).map((r) => r.id);
const writeOrder = (t, ids) => t.query(`UPDATE photos AS p SET sort_order = o.ord
  FROM unnest($1::int[]) WITH ORDINALITY AS o(id, ord) WHERE p.id = o.id`, [ids]);

api.post('/events/:id/order', requireRole('admin'), async (req, res) => {
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That album was not found.');
  const photoId = Number(req.body?.photoId);
  const position = Number(req.body?.position);
  if (!Number.isInteger(position)) return fail(res, 400, 'Please type a position number.');
  const moved = await tx(async (t) => {
    const ids = await orderedIds(t, e.id);
    const from = ids.indexOf(photoId);
    if (from < 0) return 'missing';
    const to = Math.min(Math.max(position, 1), ids.length) - 1;
    if (to === from) return 'same';
    await t.query('INSERT INTO photo_order_history (event_id, photo_ids, user_id) VALUES ($1, $2, $3)', [e.id, JSON.stringify(ids), req.user.id]);
    await t.query(`DELETE FROM photo_order_history WHERE event_id = $1 AND id NOT IN
      (SELECT id FROM photo_order_history WHERE event_id = $1 ORDER BY id DESC LIMIT ${ORDER_HISTORY_KEEP})`, [e.id]);
    ids.splice(from, 1);
    ids.splice(to, 0, photoId);
    await writeOrder(t, ids);
    return to + 1;
  });
  if (moved === 'missing') return fail(res, 404, 'That photo is not in this album.');
  res.json({ ...(await albumOut(e, req.user)), position: moved === 'same' ? position : moved });
});

api.post('/events/:id/order/undo', requireRole('admin'), async (req, res) => {
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That album was not found.');
  const undone = await tx(async (t) => {
    const last = await t.one('SELECT * FROM photo_order_history WHERE event_id = $1 ORDER BY id DESC LIMIT 1', [e.id]);
    if (!last) return false;
    // Photos added since keep their place after the restored ones; deleted ones are skipped.
    const now = await orderedIds(t, e.id);
    const before = (typeof last.photo_ids === 'string' ? JSON.parse(last.photo_ids) : last.photo_ids).filter((id) => now.includes(id));
    await writeOrder(t, [...before, ...now.filter((id) => !before.includes(id))]);
    await t.query('DELETE FROM photo_order_history WHERE id = $1', [last.id]);
    return true;
  });
  if (!undone) return fail(res, 400, 'There is no earlier arrangement to go back to.');
  res.json(await albumOut(e, req.user));
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
  : type === 'sighting'
    ? t.query('UPDATE sightings SET caption = $1 WHERE id = $2', [value, Number(id)])
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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// The page shrinks photos before upload, which drops the camera date, so it sends the date
// it read from the original (YYYY-MM-DD) alongside. Only used when the file has none itself.
function weekdayFrom(taken) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(taken || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : WEEKDAYS[d.getUTCDay()];
}

async function addPhoto(e, buffer, caption, user, taken) {
  const img = await processImage(buffer);
  img.weekday = img.weekday || weekdayFrom(taken);
  const base = `${Date.now()}-${randomBytes(5).toString('hex')}`;
  const file = `${e.id}/${base}.jpg`;
  const thumb = `${e.id}/${base}-sm.jpg`;
  await storage.put(file, img.large);
  await storage.put(thumb, img.small);
  const day = img.weekday && e.days.includes(img.weekday) ? img.weekday : DAY_NOT_SET;
  // new uploads go to the end of the album
  const row = await one(`INSERT INTO photos (event_id, file, thumb, width, height, day, caption, uploader_id, source, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Uploaded', (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM photos WHERE event_id = $1)) RETURNING id`,
  [e.id, file, thumb, img.width, img.height, day, text(caption, CAPTION_MAX), user.id]);
  return freshPhoto(row.id, user);
}

// Upload: multipart form. The page sends one photo per request, shrunk in the browser
// to stay under Vercel's 4.5 MB request limit; the server still cleans and resizes it.
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
      const taken = [].concat(req.body?.taken ?? []);
      const results = [];
      for (const [i, f] of files.entries()) {
        try { results.push({ name: f.originalname, ok: true, photo: await addPhoto(e, f.buffer, captions[i], req.user, taken[i]) }); }
        catch (error) { results.push({ name: f.originalname, ok: false, error: error.message }); }
      }
      res.json({ results });
    } catch (error) { next(error); }
  });
});

/* =====================================================================
   Delete a photo: the person who added it, or the owner and admins
   ===================================================================== */

api.delete('/photos/:id', requireUser, async (req, res) => {
  const p = await one('SELECT * FROM photos WHERE id = $1', [Number(req.params.id) || 0]);
  if (!p) return fail(res, 404, 'That photo was not found.');
  if (!(isAdmin(req.user) || p.uploader_id === req.user.id)) return fail(res, 403, 'Only the person who added this photo, or an admin, can delete it.');
  await tx(async (t) => {
    await t.query("DELETE FROM caption_history WHERE target_type = 'photo' AND target_id = $1", [String(p.id)]);
    await t.query('DELETE FROM photos WHERE id = $1', [p.id]); // its comments go with it
  });
  await storage.remove(p.file);
  await storage.remove(p.thumb);
  res.json({ deleted: p.id });
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
      mine: c.user_id === user.id,
      canDelete: isAdmin(user) || c.user_id === user.id,
    }));
}

// Every comment in one album at once, grouped by photo (for the Big photos view).
api.get('/events/:id/comments', requireUser, async (req, res) => {
  const e = await eventRow(req.params.id);
  if (!e) return fail(res, 404, 'That album was not found.');
  const rows = await query(`SELECT c.id, c.photo_id, c.body, c.created_at, c.user_id, u.name FROM comments c
    JOIN photos p ON p.id = c.photo_id LEFT JOIN users u ON u.id = c.user_id
    WHERE p.event_id = $1 ORDER BY c.id`, [e.id]);
  const byPhoto = {};
  for (const c of rows) {
    (byPhoto[c.photo_id] ||= []).push({
      id: c.id, body: c.body, author: c.name || 'Former member', at: c.created_at,
      mine: c.user_id === req.user.id, canDelete: isAdmin(req.user) || c.user_id === req.user.id,
    });
  }
  res.json({ comments: byPhoto });
});

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
   Random Beastie Sightings: a gallery of its own. Same photo pipeline as the albums.
   The person who shared a sighting edits it; the owner and admins edit or delete any.
   ===================================================================== */

export const PLACE_MAX = 80;

const SIGHTING_SELECT = `SELECT s.*, u.name AS uploader_name,
  EXISTS (SELECT 1 FROM caption_history h WHERE h.target_type = 'sighting' AND h.target_id = s.id::text) AS has_history
  FROM sightings s LEFT JOIN users u ON u.id = s.uploader_id`;

function sightingOut(s, user) {
  const mine = !!user && s.uploader_id === user.id;
  const canEdit = isAdmin(user) || mine;
  return {
    id: s.id, src: `/photos/${s.file}`, thumb: `/photos/${s.thumb}`, w: s.width, h: s.height,
    place: s.place, caption: s.caption, uploader: s.uploader_name || null, at: s.created_at,
    mine, canEdit, canDelete: canEdit, canUndo: canEdit && !!s.has_history,
  };
}
const freshSighting = async (id, user) => sightingOut(await one(`${SIGHTING_SELECT} WHERE s.id = $1`, [id]), user);

async function sightingForEdit(req, res) {
  const s = await one('SELECT * FROM sightings WHERE id = $1', [Number(req.params.id) || 0]);
  if (!s) { fail(res, 404, 'That sighting was not found.'); return null; }
  if (!(isAdmin(req.user) || s.uploader_id === req.user.id)) { fail(res, 403, 'Only the person who shared this sighting, or an admin, can change it.'); return null; }
  return s;
}

api.get('/sightings', requireUser, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 500);
  const rows = await query(`${SIGHTING_SELECT} ORDER BY s.id DESC LIMIT $1`, [limit]);
  const { n } = await one('SELECT COUNT(*)::int AS n FROM sightings');
  res.json({ sightings: rows.map((s) => sightingOut(s, req.user)), total: n });
});

const sightingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 5, fieldSize: 4096 },
});

api.post('/sightings', requireUser, (req, res, next) => {
  sightingUpload.single('photo')(req, res, async (err) => {
    try {
      if (err) {
        return fail(res, 400, err.code === 'LIMIT_FILE_SIZE' ? 'The photo must be under 30 MB.'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Please add one photo per sighting.'
            : 'The upload could not be read.');
      }
      if (!req.file) return fail(res, 400, 'Please choose a photo.');
      if (tooLong(req.body?.place, PLACE_MAX)) return fail(res, 400, `The place can be up to ${PLACE_MAX} characters.`);
      if (tooLong(req.body?.caption, CAPTION_MAX)) return fail(res, 400, `Captions can be up to ${CAPTION_MAX} characters.`);
      let img;
      try { img = await processImage(req.file.buffer); }
      catch (error) { return fail(res, 400, error.message); }
      const base = `${Date.now()}-${randomBytes(5).toString('hex')}`;
      const file = `sightings/${base}.jpg`;
      const thumb = `sightings/${base}-sm.jpg`;
      await storage.put(file, img.large);
      await storage.put(thumb, img.small);
      const row = await one(`INSERT INTO sightings (file, thumb, width, height, place, caption, uploader_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [file, thumb, img.width, img.height, text(req.body?.place, PLACE_MAX), text(req.body?.caption, CAPTION_MAX), req.user.id]);
      res.json({ sighting: await freshSighting(row.id, req.user) });
    } catch (error) { next(error); }
  });
});

// Edit the place and/or the caption. Caption changes go into the history so they can be undone.
api.patch('/sightings/:id', requireUser, async (req, res) => {
  const s = await sightingForEdit(req, res);
  if (!s) return;
  const b = req.body || {};
  if ('place' in b && tooLong(b.place, PLACE_MAX)) return fail(res, 400, `The place can be up to ${PLACE_MAX} characters.`);
  if ('caption' in b && tooLong(b.caption, CAPTION_MAX)) return fail(res, 400, `Captions can be up to ${CAPTION_MAX} characters.`);
  if ('place' in b) await query('UPDATE sightings SET place = $1 WHERE id = $2', [text(b.place, PLACE_MAX), s.id]);
  if ('caption' in b) {
    const next = text(b.caption, CAPTION_MAX);
    if (next !== s.caption) await saveCaption('sighting', s.id, s.caption, next, req.user.id);
  }
  res.json({ sighting: await freshSighting(s.id, req.user) });
});

api.post('/sightings/:id/caption/undo', requireUser, async (req, res) => {
  const s = await sightingForEdit(req, res);
  if (!s) return;
  if (!(await undoCaption('sighting', s.id))) return fail(res, 400, 'There is no earlier caption to go back to.');
  res.json({ sighting: await freshSighting(s.id, req.user) });
});

api.delete('/sightings/:id', requireUser, async (req, res) => {
  const s = await one('SELECT * FROM sightings WHERE id = $1', [Number(req.params.id) || 0]);
  if (!s) return fail(res, 404, 'That sighting was not found.');
  if (!(isAdmin(req.user) || s.uploader_id === req.user.id)) return fail(res, 403, 'Only the person who shared this sighting, or an admin, can delete it.');
  await tx(async (t) => {
    await t.query("DELETE FROM caption_history WHERE target_type = 'sighting' AND target_id = $1", [String(s.id)]);
    await t.query('DELETE FROM sightings WHERE id = $1', [s.id]);
  });
  await storage.remove(s.file);
  await storage.remove(s.thumb);
  res.json({ deleted: s.id });
});

/* =====================================================================
   Members (owner and admins). The site never sends email: a new member gets a one-time
   temporary password, shown once, and must choose their own at first sign-in.
   Admins manage members; only the owner creates admins or changes roles.
   The owner can never be removed or demoted.
   ===================================================================== */

// No look-alike characters (0/O, 1/I/L), upper case only: easy to read out or type.
const TEMP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function tempPassword() {
  const bytes = randomBytes(12);
  const chars = [...bytes].map((b) => TEMP_ALPHABET[b % TEMP_ALPHABET.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[A-Za-z]{2,}$/;

// At most 30 adds or resets an hour per person, kept in the database (works on every server).
async function adminRateLimited(user) {
  const key = `admin:${user.id}`;
  const row = await one(`INSERT INTO login_attempts (key, count, until) VALUES ($1, 1, now() + interval '60 minutes')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN login_attempts.until > now() THEN login_attempts.count + 1 ELSE 1 END,
      until = CASE WHEN login_attempts.until > now() THEN login_attempts.until ELSE now() + interval '60 minutes' END
    RETURNING count`, [key]);
  return row.count > 30;
}

const memberOut = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, addedAt: u.created_at,
  waitingForFirstSignIn: !!u.must_change_password,
});

// Who may act on whom: nobody touches the owner; admins act on members only; nobody removes themself.
function mayManage(actor, target) {
  if (target.role === 'owner') return false;
  if (actor.role === 'owner') return true;
  return target.role === 'member';
}

api.get('/admin/members', requireRole('admin'), async (req, res) => {
  const rows = await query("SELECT * FROM users ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, lower(name)");
  res.json({
    members: rows.map((u) => ({ ...memberOut(u), canManage: mayManage(req.user, u) && u.id !== req.user.id, isMe: u.id === req.user.id })),
    canCreateAdmins: req.user.role === 'owner',
    canChangeRoles: req.user.role === 'owner',
  });
});

api.post('/admin/members', requireRole('admin'), async (req, res) => {
  const name = text(req.body?.name, 60);
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = req.body?.role === 'admin' ? 'admin' : 'member';
  if (!name) return fail(res, 400, 'Please enter their full name.');
  if (email.length > 200 || !EMAIL_RE.test(email)) return fail(res, 400, 'Please enter a valid email address, like name@example.com.');
  if (role === 'admin' && req.user.role !== 'owner') return fail(res, 403, 'Only the owner can add admins.');
  if (await adminRateLimited(req.user)) return fail(res, 429, 'Too many changes in a short time. Please wait an hour and try again.');
  if (await one('SELECT 1 FROM users WHERE lower(email) = $1', [email])) return fail(res, 409, 'Someone with that email is already a member.');
  const password = tempPassword();
  const u = await one(`INSERT INTO users (email, name, password_hash, role, must_change_password)
    VALUES ($1, $2, $3, $4, true) RETURNING *`, [email, name, await bcrypt.hash(password, 12), role]);
  res.json({ member: memberOut(u), tempPassword: password });
});

async function targetFor(req, res) {
  const u = await one('SELECT * FROM users WHERE id = $1', [Number(req.params.id) || 0]);
  if (!u) { fail(res, 404, 'That member was not found.'); return null; }
  if (u.id === req.user.id) { fail(res, 400, 'You cannot do that to your own account here. Use My profile instead.'); return null; }
  if (!mayManage(req.user, u)) { fail(res, 403, u.role === 'owner' ? 'The owner account cannot be changed here.' : 'Only the owner can change an admin.'); return null; }
  return u;
}

api.post('/admin/members/:id/reset-password', requireRole('admin'), async (req, res) => {
  const u = await targetFor(req, res);
  if (!u) return;
  if (await adminRateLimited(req.user)) return fail(res, 429, 'Too many changes in a short time. Please wait an hour and try again.');
  const password = tempPassword();
  await query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [await bcrypt.hash(password, 12), u.id]);
  await query('DELETE FROM sessions WHERE user_id = $1', [u.id]); // signs them out everywhere
  res.json({ member: memberOut({ ...u, must_change_password: true }), tempPassword: password });
});

api.patch('/admin/members/:id/name', requireRole('admin'), async (req, res) => {
  const u = await targetFor(req, res);
  if (!u) return;
  const name = text(req.body?.name, 60);
  if (!name) return fail(res, 400, 'Please enter their full name.');
  await query('UPDATE users SET name = $1 WHERE id = $2', [name, u.id]);
  res.json({ member: memberOut({ ...u, name }) });
});

api.patch('/admin/members/:id/role', requireRole('owner'), async (req, res) => {
  const u = await targetFor(req, res);
  if (!u) return;
  const role = req.body?.role;
  if (!['admin', 'member'].includes(role)) return fail(res, 400, 'Choose admin or member.');
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, u.id]);
  res.json({ member: memberOut({ ...u, role }) });
});

api.delete('/admin/members/:id', requireRole('admin'), async (req, res) => {
  const u = await targetFor(req, res);
  if (!u) return;
  // Their photos, sightings and comments stay on the site (shown without a name).
  await query('DELETE FROM users WHERE id = $1', [u.id]);
  res.json({ removed: u.id });
});

/* =====================================================================
   Beasties Assistant (off unless ASSISTANT_ENABLED=true; see server/assistant.js)
   ===================================================================== */

api.post('/assistant', assistantRoute);

api.use((req, res) => fail(res, 404, 'Not found.'));

// Never leak internal errors to the page.
// eslint-disable-next-line no-unused-vars
api.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) fail(res, 500, 'Something went wrong on the server. Please try again.');
});
