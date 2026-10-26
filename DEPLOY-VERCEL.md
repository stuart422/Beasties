# Putting Beasties on Vercel

**Read this first.** Stuart's handoff says nothing goes online until he approves it. Do not run any of the "Go live" steps until Stuart has said yes in writing. Everything up to that point can be prepared without publishing anything.

The site stays private when it is online:
- Every page shows the sign-in screen first.
- Photos are stored in a **private** Vercel Blob store. They are only sent to signed-in members, through the site.
- Search engines are told not to index it.

## What you need

- A Vercel account (Stuart's or one he approves).
- A Postgres database. Neon is the easiest, and it can be added from inside Vercel (Storage > Neon).
- A private Vercel Blob store (Vercel > Storage > Blob > Create, access **Private**).
- Node.js 22 or newer on this computer.

## Step 1: Fill in the settings

1. Copy `.env.example` to `.env` (this file is never committed).
2. Fill in:
   - `DATABASE_URL`: the Neon connection string (it starts with `postgres://`).
   - `BLOB_READ_WRITE_TOKEN`: from the Blob store's settings page.
   - `SESSION_SECRET`: run this command and paste the result:
     ```
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
     ```
   - `OWNER_EMAIL` and `OWNER_PASSWORD`: Stuart's sign-in, with 12 or more characters. Give the password to Stuart privately, not by email.

## Step 2: Create the tables and the owner (from this computer)

```
npm run db:setup
```

This creates the tables and adds the nine albums, the 44 Fall 2026 photo records and the owner account. It never creates test accounts on a real database. You can safely run it again.

Afterwards, remove `OWNER_PASSWORD` from `.env`.

## Step 3: Copy the 44 approved photos into the private Blob store

First a dry run, which only lists what it would do:

```
npm run blob:upload-photos
```

If the list looks right (88 files, which is 44 photos plus their thumbnails, with no dji_beasties), upload for real:

```
npm run blob:upload-photos -- --yes
```

Files that are already there are skipped, so it is safe to run again. Any file that still has GPS data is cleaned before upload.

## Step 4: Try the online setup on this computer first

With `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` in `.env`, run:

```
npm run dev
```

Then open http://127.0.0.1:5180. The terminal should say "Database: DATABASE_URL · Photos: private Vercel Blob". Sign in as the owner and check:

- photos appear,
- an upload works,
- captions, comments and download work.

## Step 5: Go live (only after Stuart approves)

1. Put the project in a **private** GitHub repository, or use the Vercel CLI (`npx vercel`) from this folder.
   - The `.gitignore` already keeps photos, the database, `.env`, test logins and backups out.
   - Check with `git status` before the first commit that no photos or `.env` are listed.
2. In Vercel, create the project from this folder. The settings come from `vercel.json`: build `npm run build`, output `dist`, one function `api/index.js`.
3. In Vercel > Project > Settings > Environment Variables, add `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` and `SESSION_SECRET`. Do not add `OWNER_PASSWORD`.
4. Connect the Blob store and the Neon database to the project. Vercel can fill in the variables for you.
5. Deploy. Open the address Vercel gives you, sign in as the owner, and repeat the Step 4 checks.

## Adding members

There is no sign-up page on purpose. Stuart decides who gets access. To add someone from this computer (with `DATABASE_URL` in `.env`):

```
npm run add-member -- --email person@example.com --name "First name"
```

This prints a random first password to give them privately. They can change it on My profile. Add `--admin` to make them an admin straight away, or use the owner's "Members and admins" page later.

## Good to know

- **Uploads online:** each photo goes straight from the phone to the private Blob store, then the site cleans it:
  - EXIF and GPS removed,
  - resized to 1800 px,
  - a thumbnail made.

  The original is deleted right after. Large phone photos, up to 30 MB each, are fine.
- **HEIC (iPhone) photos** are converted on the server. iPhones usually send JPG from the browser anyway.
- **Sessions** are stored in the database and last 14 days. Cookies are Secure and HttpOnly online.
- **Failed sign-ins** are limited to 8 every 15 minutes, per address and per email.
- **Local development is unchanged:** with no `DATABASE_URL` and no `BLOB_READ_WRITE_TOKEN`, `npm run dev` uses a local database (data/pglite) and the photos/ folder, with test accounts.
