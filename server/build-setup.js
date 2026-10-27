// Runs at the start of every Vercel build (see vercel.json).
// The build already has the project's secret settings (DATABASE_URL, OWNER_EMAIL,
// OWNER_PASSWORD), so the database is created and kept up to date here and nobody has to
// copy secrets to a computer. Safe to run on every deploy: it only adds what is missing.
// It prints counts only, never any setting's value.
if (!process.env.DATABASE_URL) {
  console.log('[db] No DATABASE_URL in this build: skipping database setup.');
  process.exit(0);
}

const { setup } = await import('./seed.js');
const { one } = await import('./db.js');

try {
  const r = await setup({ testAccounts: false });
  console.log(`[db] Migrations applied: ${r.applied.length ? r.applied.join(', ') : 'none needed'}`);
  console.log(`[db] Albums and Fall 2026 photo records: ${r.albums ? 'added' : 'already there'}`);
  console.log(`[db] Owner from OWNER_EMAIL: ${r.owner ?? 'OWNER_EMAIL or OWNER_PASSWORD not set'}`);
} catch (err) {
  // A too-short OWNER_PASSWORD lands here. Say so without showing any value.
  console.error(`[db] Setup problem: ${err.message}`);
  process.exit(1);
}

const c = await one(`SELECT (SELECT COUNT(*)::int FROM events) AS albums,
  (SELECT COUNT(*)::int FROM photos) AS photos,
  (SELECT COUNT(*)::int FROM users WHERE role = 'owner') AS owners,
  (SELECT COUNT(*)::int FROM users) AS people`);
console.log(`[db] Now: ${c.albums} albums, ${c.photos} photo records, ${c.owners} owner(s), ${c.people} account(s).`);
process.exit(0);
