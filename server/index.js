// Local development: `npm run dev` starts everything with one command.
// Database: PGlite in data/pglite (or DATABASE_URL if set). Photos: the photos/ folder
// (or private Vercel Blob if BLOB_READ_WRITE_TOKEN is set). Pages: Vite with live reload.
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { ROOT, IS_LOCAL_DB } from './db.js';
import { setup, printLogins } from './seed.js';
import { createApp } from './app.js';
import { loadUser } from './auth.js';
import { STORAGE } from './storage.js';

// Default: this computer only. With --home: this computer's home Wi-Fi address, so a phone
// on the same Wi-Fi can open the site for testing.
function homeAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) return a.address;
    }
  }
  console.error('No home-network address found. Is this computer on Wi-Fi?');
  process.exit(1);
}
const HOST = process.argv.includes('--home') ? homeAddress() : (process.env.HOST || '127.0.0.1');
const PORT = Number(process.env.PORT || 5180);
const PROD = process.argv.includes('--prod');
const WEB = resolve(ROOT, 'web');

const seeded = await setup();

const app = express();
// Home-network only: answer this computer and private addresses (192.168.x.x, 10.x.x.x,
// 172.16-31.x.x). Anything from the wider internet is refused, even if a router forwards it.
const PRIVATE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fe80:)/i;
app.use((req, res, next) => {
  const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  if (PRIVATE.test(ip)) return next();
  res.status(403).end('This site is only available on the home network.');
});

app.use(createApp());

// Every page except the sign-in page needs a signed-in member.
app.use(loadUser, (req, res, next) => {
  if (req.method !== 'GET') return next();
  const path = req.path === '/' ? '/index.html' : decodeURIComponent(req.path);
  if (!path.endsWith('.html')) return next();
  const isSignIn = path === '/signin.html';
  if (!req.user && !isSignIn) return res.redirect(`/signin.html?next=${encodeURIComponent(req.originalUrl)}`);
  if (req.user && isSignIn) {
    const next = String(req.query.next || '/');
    return res.redirect(/^\/(?![/\\])/.test(next) ? next : '/');
  }
  next();
});

const server = createHttpServer(app);

if (PROD) {
  const dist = resolve(ROOT, 'dist');
  if (!existsSync(dist)) { console.error('Run `npm run build` first.'); process.exit(1); }
  app.use(express.static(dist, { dotfiles: 'deny' }));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    configFile: resolve(ROOT, 'vite.config.js'),
    root: WEB,
    server: { middlewareMode: true, ws: { server } },
    appType: 'mpa',
  });
  app.use(vite.middlewares);
}

server.listen(PORT, HOST, () => {
  console.log('\nBeasties local development server (this computer only)');
  console.log(`Open http://${HOST}:${PORT}/`);
  console.log(`Database: ${IS_LOCAL_DB ? 'local PGlite (data/pglite)' : 'DATABASE_URL'} · Photos: ${STORAGE === 'blob' ? 'private Vercel Blob' : 'local photos/ folder'}`);
  if (seeded.applied.length) console.log(`Migrations applied: ${seeded.applied.join(', ')}`);
  if (HOST !== '127.0.0.1') console.log('Home-network mode: phones on the same Wi-Fi can open this address. Stop with Ctrl+C when done.');
  if (seeded.tests) console.log('\nTest accounts were created for this computer:');
  printLogins();
  if (IS_LOCAL_DB) console.log('These logins are also saved in data/test-logins.txt. Press Ctrl+C to stop.\n');
});
