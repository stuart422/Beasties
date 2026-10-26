// Adds one member (or admin) and prints a random first password to give them privately.
//   npm run add-member -- --email person@example.com --name "First name"
//   npm run add-member -- --email person@example.com --name "First name" --admin
// Uses DATABASE_URL from .env if set, otherwise the local database.
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { one, query, migrate } from '../server/db.js';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const email = (arg('email') || '').trim();
const name = (arg('name') || '').trim().slice(0, 60);
const role = process.argv.includes('--admin') ? 'admin' : 'member';

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
  console.error('Usage: npm run add-member -- --email person@example.com --name "First name" [--admin]');
  process.exit(1);
}
await migrate();
if (await one('SELECT id FROM users WHERE lower(email) = lower($1)', [email])) {
  console.error('Someone with that email already exists.');
  process.exit(1);
}
const password = randomBytes(12).toString('base64url');
await query('INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4)', [email, name, bcrypt.hashSync(password, 12), role]);
console.log(`Added ${name} as ${role}.`);
console.log(`First password: ${password}`);
console.log('Give it to them privately. They can change it on the My profile page.');
process.exit(0);
