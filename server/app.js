// The Express app shared by local development (server/index.js) and Vercel (api/index.js).
// It serves the API and the private photos. Pages are served by Vite locally and as static
// files from dist/ on Vercel.
import express from 'express';
import { api } from './api.js';
import { loadUser, PRODUCTION } from './auth.js';
import * as storage from './storage.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // On Vercel the client address comes from Vercel's proxy header; locally there is no proxy.
  app.set('trust proxy', !!process.env.VERCEL);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    if (PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    next();
  });

  app.use('/api', api);

  // Photos are private: streamed only to signed-in members, from local files or private Blob.
  app.get('/photos/*path', loadUser, async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).end();
      const key = [].concat(req.params.path).join('/');
      if (key.startsWith('incoming/')) return res.status(404).end();
      const f = await storage.open(key);
      if (!f) return res.status(404).end();
      res.setHeader('Content-Type', f.contentType || 'image/jpeg');
      if (f.size) res.setHeader('Content-Length', f.size);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      f.stream.on('error', next).pipe(res);
    } catch (err) { next(err); }
  });

  return app;
}
