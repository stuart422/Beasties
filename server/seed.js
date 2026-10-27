// Seed data and the first owner.
//   node server/seed.js            migrate, add the nine albums and the 44 Fall 2026 photos
//                                  (if missing) and the owner from OWNER_EMAIL / OWNER_PASSWORD.
//   node server/seed.js --reset    LOCAL ONLY: wipe the local database and start over with
//                                  three fresh test accounts (data/test-logins.txt).
// Production never gets test accounts or test passwords.
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import bcrypt from 'bcryptjs';
import { query, one, tx, migrate, DATA_DIR, IS_LOCAL_DB } from './db.js';

const EVENTS = [
  {
    id: 'winter-2027', name: 'Winter 2027', event_name: 'Winter Weekend 2027',
    dates: 'Friday, January 29 to Monday, February 1, 2027', place: 'At The Beast',
    start_date: '2027-01-29', upcoming: true, empty_note: 'Photos after the event.',
    days: ['Friday', 'Saturday', 'Sunday', 'Monday'],
  },
  { id: 'fall-2026', name: 'Fall 2026', days: ['Friday', 'Saturday', 'Sunday', 'Monday'] },
  { id: 'summer-2026', name: 'Summer 2026' },
  { id: 'old-orchard-beach-2026', name: 'Old Orchard Beach 2026' },
  { id: 'marthas-vineyard-2026', name: "Martha's Vineyard 2026" },
  { id: 'winter-2026', name: 'Winter 2026' },
  { id: 'fall-2025', name: 'Fall 2025' },
  { id: 'winter-2025', name: 'Winter 2025' },
  { id: 'fall-2024', name: 'Fall 2024' },
];

const TEST_ACCOUNTS = [
  { email: 'owner@beasties.test', name: 'Stuart (test owner)', role: 'owner' },
  { email: 'admin@beasties.test', name: 'Test Admin', role: 'admin' },
  { email: 'member@beasties.test', name: 'Test Member', role: 'member' },
];

const LOGINS_FILE = resolve(DATA_DIR, 'test-logins.txt');

// The approved photo list (from the design prototype) (photos-fall-2026.js sets window.ALBUM).
export function approvedPhotos() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(resolve(import.meta.dirname, 'seed/photos-fall-2026.js'), 'utf8'), sandbox);
  return sandbox.window.ALBUM.filter((p) => !/dji_beasties/i.test(p.f)).map((p) => ({
    file: p.f.replace('photos/2026-foliage/', 'fall-2026/'),
    thumb: p.s.replace('photos/2026-foliage/', 'fall-2026/'),
    w: p.w, h: p.h, day: p.day, caption: p.cap || '',
    source: p.pub ? 'Published site copy' : 'Original camera file',
  }));
}

async function seedAlbums() {
  if ((await one('SELECT COUNT(*)::int AS n FROM events')).n) return false;
  await tx(async (t) => {
    for (const [i, e] of EVENTS.entries()) {
      await t.query(`INSERT INTO events (id, name, sort, event_name, dates, place, start_date, upcoming, empty_note, days)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [e.id, e.name, i, e.event_name ?? null, e.dates ?? null, e.place ?? null, e.start_date ?? null,
        !!e.upcoming, e.empty_note ?? null, JSON.stringify(e.days || [])]);
    }
    for (const p of approvedPhotos()) {
      await t.query(`INSERT INTO photos (event_id, file, thumb, width, height, day, caption, source, sort_order)
        VALUES ('fall-2026', $1, $2, $3, $4, $5, $6, $7,
          (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM photos WHERE event_id = 'fall-2026'))`, [p.file, p.thumb, p.w, p.h, p.day, p.caption, p.source]);
    }
  });
  return true;
}

// The first owner comes from environment variables, never from a file in the code.
async function seedOwnerFromEnv() {
  const email = (process.env.OWNER_EMAIL || '').trim();
  const password = process.env.OWNER_PASSWORD || '';
  if (!email || !password) return null;
  if (password.length < 12) throw new Error('OWNER_PASSWORD must be at least 12 characters.');
  if (await one('SELECT id FROM users WHERE lower(email) = lower($1)', [email])) return 'exists';
  await query('INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, \'owner\')',
    [email, (process.env.OWNER_NAME || 'Stuart').trim().slice(0, 60), bcrypt.hashSync(password, 12)]);
  return 'created';
}

// Local development only: three test accounts with random passwords.
async function seedLocalTestAccounts() {
  if (!IS_LOCAL_DB) return false;
  if ((await one('SELECT COUNT(*)::int AS n FROM users')).n) return false;
  const lines = [
    'Beasties: local test accounts (this computer only).',
    `Created ${new Date().toISOString().slice(0, 10)}. Run \`npm run reset-test-data\` for new passwords.`,
    '',
  ];
  for (const a of TEST_ACCOUNTS) {
    const password = randomBytes(9).toString('base64url');
    await query('INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4)',
      [a.email, a.name, bcrypt.hashSync(password, 12), a.role]);
    lines.push(`${a.role.padEnd(6)}  ${a.email.padEnd(22)}  ${password}`);
  }
  writeFileSync(LOGINS_FILE, lines.join('\n') + '\n');
  return true;
}

/** Bring the database up to date. Safe to run any number of times. */
export async function setup({ testAccounts = IS_LOCAL_DB } = {}) {
  const applied = await migrate();
  const albums = await seedAlbums();
  const owner = await seedOwnerFromEnv();
  const tests = testAccounts ? await seedLocalTestAccounts() : false;
  return { applied, albums, owner, tests };
}

export function printLogins() {
  if (IS_LOCAL_DB && existsSync(LOGINS_FILE)) console.log('\n' + readFileSync(LOGINS_FILE, 'utf8'));
}

/* ---------- command line ---------- */

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--reset')) {
    if (!IS_LOCAL_DB) {
      console.error('Refusing to reset: DATABASE_URL is set. --reset only works on the local database.');
      process.exit(1);
    }
    const { PHOTOS_DIR } = await import('./db.js');
    for (const p of await query("SELECT file, thumb FROM photos WHERE source = 'Uploaded'").catch(() => [])) {
      rmSync(resolve(PHOTOS_DIR, p.file), { force: true });
      rmSync(resolve(PHOTOS_DIR, p.thumb), { force: true });
    }
    await query('DROP SCHEMA public CASCADE').catch(() => {});
    await query('CREATE SCHEMA public');
    console.log('Local database emptied.');
  }
  const r = await setup();
  console.log(`Migrations applied: ${r.applied.length ? r.applied.join(', ') : 'none needed'}`);
  console.log(`Albums and Fall 2026 photos: ${r.albums ? 'added' : 'already there'}`);
  console.log(`Owner from OWNER_EMAIL: ${r.owner ?? 'not set (skipped)'}`);
  if (r.tests) console.log('Local test accounts created.');
  printLogins();
  process.exit(0);
}
