// Email and password sign-in with bcrypt hashes. Sessions live in the database (no server
// memory), so they work across serverless instances. The cookie holds a random token; the
// database stores only an HMAC of it, keyed with SESSION_SECRET.
import { createHmac, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query, one } from './db.js';

const COOKIE = 'bsid';
const SESSION_DAYS = 14;
export const PRODUCTION = !!process.env.VERCEL || process.env.NODE_ENV === 'production';

const SECRET = process.env.SESSION_SECRET || (PRODUCTION ? null : 'local-development-only');
if (!SECRET || (PRODUCTION && SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters.');
}
const tokenHash = (token) => createHmac('sha256', SECRET).update(token).digest('hex');

export const ROLE_RANK = { member: 1, admin: 2, owner: 3 };
export const isAdmin = (user) => !!user && ROLE_RANK[user.role] >= ROLE_RANK.admin;

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setCookie(res, token, maxAgeSeconds) {
  // Secure in production (HTTPS on Vercel). Local http://127.0.0.1 cannot use Secure cookies.
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${PRODUCTION ? '; Secure' : ''}`);
}

export const MIN_PASSWORD = 12;

export function publicUser(u) {
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role, mustChangePassword: !!u.must_change_password } : null;
}

// While someone still has a temporary password, only these API calls work for them.
const FIRST_SIGN_IN_ALLOWED = new Set(['/me', '/logout', '/login', '/me/first-password']);
export function requireOwnPassword(req, res, next) {
  if (req.user?.must_change_password && !FIRST_SIGN_IN_ALLOWED.has(req.path)) {
    return res.status(403).json({ error: 'Please choose your own password first.', mustChangePassword: true });
  }
  next();
}

// Attach req.user when the session cookie is valid.
export async function loadUser(req, res, next) {
  req.user = null;
  const token = readCookie(req, COOKIE);
  if (token && token.length < 200) {
    try {
      req.user = (await one(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > now()`, [tokenHash(token)])) || null;
    } catch (err) {
      return next(err);
    }
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
    if (ROLE_RANK[req.user.role] < ROLE_RANK[role]) return res.status(403).json({ error: 'You do not have permission to do that.' });
    next();
  };
}

/* ---------- Failed sign-in limit, stored in the database ---------- */

const LIMIT = 8;
const WINDOW_MINUTES = 15;

async function tooMany(keys) {
  const rows = await query('SELECT count FROM login_attempts WHERE key = ANY($1) AND until > now()', [keys]);
  return rows.some((r) => r.count >= LIMIT);
}

async function recordFailure(keys) {
  for (const key of keys) {
    await query(`INSERT INTO login_attempts (key, count, until) VALUES ($1, 1, now() + interval '${WINDOW_MINUTES} minutes')
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN login_attempts.until > now() THEN login_attempts.count + 1 ELSE 1 END,
        until = CASE WHEN login_attempts.until > now() THEN login_attempts.until ELSE now() + interval '${WINDOW_MINUTES} minutes' END`, [key]);
  }
}

/* ---------- Routes ---------- */

export async function login(req, res) {
  const email = String(req.body?.email || '').trim().slice(0, 200);
  const password = String(req.body?.password || '').slice(0, 200);
  const keys = [`ip:${req.ip}`, `email:${email.toLowerCase()}`];
  if (await tooMany(keys)) return res.status(429).json({ error: 'Too many tries. Please wait 15 minutes and try again.' });

  const user = await one('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    await recordFailure(keys);
    return res.status(401).json({ error: 'That email and password do not match.' });
  }
  await query('DELETE FROM login_attempts WHERE key = ANY($1)', [keys]);
  await query('DELETE FROM sessions WHERE expires_at < now()');
  const token = randomBytes(32).toString('base64url');
  await query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`,
    [tokenHash(token), user.id]);
  setCookie(res, token, SESSION_DAYS * 86400);
  res.json({ user: publicUser(user) });
}

export async function logout(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash(token)]);
  setCookie(res, '', 0);
  res.json({ ok: true });
}

export async function changePassword(req, res) {
  const current = String(req.body?.current || '');
  const next = String(req.body?.next || '');
  if (!(await bcrypt.compare(current, req.user.password_hash))) return res.status(400).json({ error: 'Your current password is not right. Please type it again.', field: 'current' });
  if (next === current) return res.status(400).json({ error: 'Please choose a new password that is different from the current one.', field: 'next' });
  if (next.length < MIN_PASSWORD || next.length > 200) return res.status(400).json({ error: `Use at least ${MIN_PASSWORD} characters for the new password.`, field: 'next' });
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(next, 12), req.user.id]);
  // sign out every other session of this person
  await query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [req.user.id, tokenHash(readCookie(req, COOKIE) || '')]);
  res.json({ ok: true });
}

// First sign-in with a temporary password: the member chooses their own.
export async function setFirstPassword(req, res) {
  if (!req.user.must_change_password) return res.status(400).json({ error: 'Your password is already set. Use My profile to change it.' });
  const next = String(req.body?.next || '');
  if (next.length < MIN_PASSWORD || next.length > 200) return res.status(400).json({ error: `Use at least ${MIN_PASSWORD} characters for your new password.` });
  if (await bcrypt.compare(next, req.user.password_hash)) return res.status(400).json({ error: 'Please choose a new password, not the temporary one.' });
  await query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [await bcrypt.hash(next, 12), req.user.id]);
  await query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [req.user.id, tokenHash(readCookie(req, COOKIE) || '')]);
  res.json({ user: publicUser({ ...req.user, must_change_password: false }) });
}
