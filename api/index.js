// Vercel serverless entry. vercel.json sends /api/* and /photos/* here; everything else
// is served as static files from dist/. The database must already be migrated and seeded
// (see DEPLOY-VERCEL.md): this function never creates tables or accounts by itself.
import { createApp } from '../server/app.js';

export default createApp();
