# Build Journal: Beasties Working Version

Owner: Ahmed Malik. Final design approval: Stuart.
Last updated: 10-27-2026 (Add member + Arrange photos).

## Add member + Arrange photos (10-27-2026)

### 1. Members page (Account menu > Members), owner and admins
- **Add a member:** full name, email, and role (only the owner sees "Admin").
- **One-time login card:** the site makes a temporary password (like `K7MP-X9QA-RTW4`, no look-alike characters). It's shown once, with a **Copy login details** button and 3 plain steps. **The site never sends email.**
- **First sign-in:** the member must choose their own password, at least 10 characters, and not the temporary one. Until then every page, the API and the photos are blocked for them.
- **Everyone list:** name, email, role, date added, and "Has not chosen a password yet".
  - **Reset password:** a new temporary password, and the person is signed out everywhere.
  - **Make admin / Make member:** owner only.
  - **Remove:** a red second step, "Yes, remove Pat". Their photos and comments stay.
- **Rules:**
  - The owner can never be removed or demoted, and nobody can remove themself.
  - Admins can manage members only, not admins.
  - Email is checked and duplicates are blocked (any upper or lower case).
  - At most 30 adds or resets per hour per person.
- Big text, 52px+ buttons, and one column on phones.

### 2. Arrange photos (inside every album), owner and admins
- **Arrange photos** button, then each photo shows **Move up**, **Move down**, and **Move to position** (type a number).
- **Saving:** every move is saved straight away. Everyone sees the new order, the photo viewer and Home follow it, and day filters still work.
- **Undo last move:** the last 30 arrangements are kept per album.
- Members and uploaders can't reorder (the server refuses with 403).
- **New uploads go to the end.**

### Database (migration `003_members_and_order.sql`)
- `users.must_change_password` (default false).
- `photos.sort_order` is set to `id`, so **every existing photo keeps its exact order**. There's a safe default for the minute before the new code is live.
- New table `photo_order_history` for Undo.

### Backup before the migration
- No Neon API key is available here, and a Neon branch needs your Neon login.
- So the build now **copies every table into a dated backup schema** (`backup_YYYYMMDD_HHMM`) right before any new migration. It keeps the newest 3.
- The build log prints the exact time, which can also be used with Neon's own point-in-time restore.
- **To restore one table:** `TRUNCATE x; INSERT INTO public.x SELECT * FROM backup_….x;`

### 43 vs 44 photos (checked, nothing changed)
- **The 44 in the handoff are all approved.** The DO NOT PUBLISH DJI photo was never one of them.
- **Live has 43 because of edits on the site:**
  - Photos **31 and 32** (untitled, "Day not set") were deleted. Their files are gone from storage, but local copies still exist.
  - Stuart **uploaded 1 new photo** (Saturday, now position 43).
  - That makes 44 − 2 + 1 = 43.

### Tested locally (all pass)
- **Feature test, 48 checks:** permissions, adding, duplicates, bad email, forced password change, the block before it, reset, roles, removal, the rate limit, every kind of move, Undo back to the exact original, new upload at the end, signed-out 401s.
- **Click-through in a real browser, 26 checks, phone 390 and desktop 1440:**
  - Owner adds Pat, sees the login card. Pat signs in, is sent to choose a password, a short one is refused, then Home.
  - Pat sees no Arrange or Members.
  - Owner: Move down, Move to 1, Undo ×2 back to the original, Done; day filter and viewer work.
- **Full regression test:** all pass (captions and Undo, comments, uploads, sightings, cookies, 401s).

## Green palette + welcome story (10-27-2026): LIVE

Stuart asked for two things: a colour-only change, and the "A Family of Friends" welcome story on Home. Stuart approved. `preview/green-story` was merged into `main` (commit `930599c`), and the build is green.

### 1. Colours only (whole site)
- Measured from Stuart's preview image: forest green `#113C2B`, autumn gold `#E8AC2E`, warm cream text `#FCF4E4`.
- **Plum family to green:**
  - Brand `#3A1A4F` becomes `#174A34`, deep `#0F3324`, the cover `#113C2B`.
  - Lilac becomes pale sage `#DCE8DA`.
  - On the sign-in prints, the dusk and dawn light become moss and sage.
- **Gold:** `#FFC53D` becomes autumn gold `#E8AC2E`. Hover `#F2BF4F`.
- **Cream:** the page is `#FBF6EC`, cream text `#FCF4E4`, sand `#F3EBDA`.
- **Names follow:** `--plum` is now `--forest`, `--lilac` is `--sage`, `btn--plum` is `btn--forest`.
- One scripted swap over every stylesheet, page and script. No layout, type, photo or behaviour changes.

### 2. Welcome story (Home)
- Placed right under the "A Family of Friends" heading.
- **Heading:** smaller, prominent but not oversized (was up to 150px, now up to 96px).
- **Text:** all 8 paragraphs, Stuart's wording and order exactly (checked by script), no "Read more". Plain green behind the text, never over a photo.
- **Photo:** the group photo stays beside the story on desktop and follows you as you read. Whole photo, not cropped.
- The last line, "That's what it means to be a Beastie.", is in gold italic.
- The old one-line intro stays below, smaller, above the buttons.

### Checked
- Desktop 1440 and phone 390, every section and every page.
- Full regression test: all pass.
- Stuart's example HTML file ("Beasties_Homepage_featured-story.html") was not on this computer. I worked from his screenshot.

### Live check (after the merge)
- Live pages are green (`#113C2B`), and the story is on Home. Signed out: photos and the API return 401.
- Owner test: sign-in, Secure + HttpOnly cookie, uploads, captions with Undo, comments, sightings, admin, sign-out all pass.
- **Note: the live album has 43 photos, not 44.** These are real changes made on the site, not a bug:
  - Photos 31 and 32 (untitled, "Day not set") were deleted.
  - One new photo was uploaded by a member.
  - Photo 40 was set to Saturday.

## Home redesign: the memory book, opened (10-27-2026)

The approved sign-in look (plum cloth, warm light, ivory prints, gold hairlines) now runs through Home. The sign-in page is unchanged.

### Sections
- **Hero:** a plum cover with a gold-foil "Friends". The Friday group photo sits on a print, caption written on the mount, with two Fall 2026 prints fanned behind. Stats row underneath: albums, photos, days to Winter Weekend (all from real data).
- **Header:** plum while it sits on the cover, ivory once you scroll past.
- **Fall 2026, in pictures:** a reel.
  - Big 01 / 14 counter, crossfade with a slight drift between photos.
  - Swipe or drag, arrow keys, a gold progress line, a thumbnail rail with no scrollbar.
  - Whole photos, never cropped. The next photos are loaded ahead so they appear at once.
- **Next gathering:** an invitation card with a tear-off stub, a perforation and the countdown in gold.
- **Album archive:**
  - The Fall 2026 feature card with four fanned prints (they spread on hover).
  - A dashed "Next page" card for Winter 2027.
  - Earlier albums as numbered cards with a gold spine.
- **What's new:** a big +29 and three fanned prints.
- **Sightings:** the empty state is now a blank instant photo with a camera. It shows real sightings when there are some.

### Speed (no lag)
- **Three.js is removed** (hero-print.js, tilt.js and the `three` package). The Home script is now 54 KB, 21 KB gzipped, and the big-chunk build warning is gone.
- **Animation is cheap:**
  - Only transforms and opacity animate. No layout changes or filters.
  - Native scrolling (no scroll-jacking), and section reveals play once.
  - The mouse lean writes once per frame, through CSS variables.
- Small images (640px) everywhere except the hero and the reel.
- Reduce motion turns everything off and shows the page complete.

### Fixed on the way
- `.sr` (screen-reader-only) was used but never defined, so the hidden "Write a comment" label showed on the album page. Now defined.

### Checked (headless Edge, signed in locally)
- Desktop 1440 and phone 390: every section, no sideways scroll, no broken images.
- Full motion: every section reveals.
- Reel tests: next, previous, thumbnail, arrow key, swipe, progress bar. Header switches colour. Reduce motion mid-page leaves nothing hidden. No console errors.
- Full regression API test: all pass. Album, Events, Sightings and My photos pages unchanged.

## New sign-in page (10-27-2026)

### Look: "the cover of the memory book"
- Deep plum background with warm gold and lilac light, soft film grain and a thin gold frame.
- Big "A Family of Friends" title. A gold shimmer passes once across "Friends".
- The form sits on an ivory print card, fanned over two blank prints.
- **No photos:** the prints show abstract light only (handoff rule: no private photos on sign-in).
- A giant faint "Beasties" wordmark along the bottom edge (desktop only).

### Motion (off with Reduce motion or the phone setting)
- The title rises, the prints are dealt in, then the card lands.
- On desktop, the stack leans gently toward the mouse.
- A wrong password gives a small shake.

### Easier to use
- A **Show / Hide** password button.
- A **Caps Lock is on** warning.
- No pale-blue autofill boxes.
- Empty or wrong fields turn red, with a clear message.
- **Already signed in?** The page skips straight to where you were going.
- The help line is honest: "Contact the person who gave you your login." There is no reset feature yet.

### Safety
- After sign-in, the site only returns you to its own pages. `//other-site` and `/\other-site` are refused, both in the page and in the local server.

### Checked
- Desktop 1440 and phone 375: the whole form fits on the first phone screen, with no sideways scroll.
- Empty submit, wrong password, Show/Hide, reduced motion, redirect when already signed in.

## Clean-up and Sightings (10-27-2026), commit `2ab9f6e`, live

### Removed (prototype leftovers)
- **Top banner** "Local working version. Not online." is gone.
- **Footer** now says "A family of friends. A private site for members only."
- **"Not built yet"** click handler is deleted. Nothing on the site uses it any more.
- **Events tab title** no longer says "(prototype)".
- **Local server messages** say "local development server" instead of "working version".
- **Kept:** the Reduce motion switch, now in the footer (every page) and in the Account menu. Both stay in step.

### New: Random Beastie Sightings (real)
- **Share:** any member adds one photo, a place (80 characters) and a caption (200 characters, live counter).
- **Same photo pipeline:** EXIF and GPS removed, 1800px copy, thumbnail, private Blob (`sightings/` folder).
- **Edit:** the person who shared it changes the place and caption. **Undo last caption change** uses the same history as album captions.
- **Owner and admins:** can edit or delete any sighting. Delete asks to confirm.
- **Where:** its own page `sightings.html`, the newest 4 on Home, a row after the albums on the Photos page, and the Account menu.
- **Empty state:** "No sightings have been shared yet." plus a Share button.
- **Database:** migration `002_sightings.sql` (new table; caption history now allows `sighting`). The Vercel build applied it.
- **Privacy:** photos still load only when signed in (401 otherwise).

### Bug fixed on the way
- **Account menu on Home:** the menu links ran together as plain text. Their styles lived in `pages.css`, which Home doesn't load. Moved to `main.css`.

### Tested locally (all pass, 59 checks)
- Sign-in, wrong password, 9 albums, 44 photos in Fall 2026.
- Day filters (Friday 1, Saturday 22, Sunday 3, Monday 1, Day not set 17 = 44), download.
- Upload, caption edit and Undo, comments, delete.
- Sightings: share, edit, Undo, 201 characters refused.
  - A member can't edit, undo or delete someone else's sighting (403) but can edit their own.
  - An admin can edit and delete any.
- Admin role change and back. A member can't open the admin API (403).
- In the browser: share form, live counter, Edit, Undo, Delete, empty state, Home strip, the Account menu switch, sign out.
- Every page's text scanned for the leftover words: none found.

### Tested on the live site (owner, all pass, 50 checks)
- **Signed out:** every API returns 401, photo files return 401, and pages show only sign-in.
- **Cookie:** HttpOnly, Secure, SameSite=Strict.
- **Same feature tests as locally**, owner only (the live site has one account).
- **Clean-up:** everything the test made was deleted. The Blob store is back to 88 files, with no dji file.
- **Live pages and scripts:** contain none of the leftover words.

### Security check
- Repo is private (anonymous GitHub API and page both 404).
- No keys, tokens, connection strings or passwords in tracked files or anywhere in git history. Pattern scan, plus an exact-value check of every real secret: 0 found.
- `.gitignore` covers `.env*`, `photos/`, `/data/`, `*.db` and `.vercel/`. Only `.env.example` was ever committed.

### Still needs a person
- Member and admin permissions were tested locally only, because the live site has just the owner account. Add a real member to try it live.
- Sign in once on a phone and on a computer to see it with your own eyes.

---

## Live site fix (10-27-2026)

### What was wrong
- **Sign-in error:** the live database was empty. The logs said `relation "login_attempts" does not exist`, so every sign-in crashed with "Something went wrong".
- **No photos:** the code only used Blob when `BLOB_READ_WRITE_TOKEN` existed. This store uses OIDC (`BLOB_STORE_ID`), so the live site looked in a local folder that doesn't exist on Vercel.
- **The Blob store is empty:** 0 files. The 44 photos were never uploaded.
- **Uploads would break:** the browser-token upload route needs a read-write token, which OIDC stores don't have.

### Fixed (commit `48ba43c`, now live)
- **Database setup runs inside every Vercel build** (`server/build-setup.js`). The build has the secret settings, so nobody copies secrets. It only adds what's missing and prints counts only.
- **Blob on:** with `BLOB_STORE_ID` (OIDC) or a token.
- **Uploads:** the browser shrinks each photo to under 4 MB and sends one at a time. The server still removes EXIF and GPS, resizes and makes thumbnails. The camera date is sent along for the day filter.
- **Delete photo:** new, for the uploader, owner and admins, with a confirm step.
- **Sign-in messages:** a wrong password says so. A site problem says "problem on the site, your password may be fine".
- **Upload script:** works with OIDC too.

### Tested locally
- Wrong password: 401 with a clear message.
- A 9.1 MB phone-size photo was sent as 2.1 MB and saved as 1800x1350.
- Camera date 2026-10-17 was filed under Saturday. A bad date became "Day not set".
- Delete: the owner deleted from the viewer, and the album went back to empty. A member gets 403 on others' photos and can delete their own, and the files are gone.
- Signed out: photos return 401.
- The build passes.

### Live checks (read-only)
- `/api/login` returned 500 before the fix (cause above).
- A signed-out photo request returned 401, which is correct.

### Blocked: needs Ahmed
1. **GitHub repo is PUBLIC.** Make it private first (GitHub > Settings > Danger Zone > Change visibility). It has no photos or secrets, but it does have the member names in captions.
2. **Push:** the safety check blocked `git push`. After the repo is private, allow it, or run `git push origin main` yourself.
3. **Photo upload:** the store only accepts OIDC from Production and Preview, and this computer's token is "development". Fix: Vercel > Storage > beasties-photos > Projects > beasties-grp > also tick **Development**. Then I re-run `vercel env pull` and the upload script.
4. **Owner login for the live test:** OWNER_EMAIL and OWNER_PASSWORD are "Sensitive" in Vercel, so they can't be pulled. Put them in a new file `Beasties-Working/.env.owner.local` (two lines, already git-ignored). Don't paste them in chat.

### Re-check (10-27-2026, after Ahmed's reply)
- **Repo:** still public. The GitHub API says `visibility=public` and the page loads for anyone. Not pushed.
- **Blob store:** the development environment is still not allowed. The development env pull has no `BLOB_STORE_ID`, and the dry run is refused.
- **Owner file:** `.env.owner.local` was not found anywhere under `E:\Beasti Project`.

### Re-check 2 (10-27-2026)
- **Repo:** still public.
- **Blob:** `vercel env ls` shows BLOB_STORE_ID only on Preview and Production (unchanged in 9 hours), so the Development connection wasn't saved.
- **Owner file:** still not found on E: or in Desktop, Documents, Downloads or OneDrive.
- Nothing pushed, nothing uploaded.

### Re-check 3 (10-27-2026): all three pass
- **Repo:** private. Anonymous GitHub API and page both return 404.
- **Blob:** BLOB_STORE_ID is on Production, Preview and Development.
- **Owner file:** both lines are present, and the file is git-ignored.
- **Photos uploaded:** 88 files (44 photos + 44 thumbnails) are in the private store, with no dji file. Anonymous fetch of a file returns 403. A second dry run finds all 88 already there.
- **Bug found and fixed (commit `7229f87`):** Blob's "not found" error is named `Error`, so a name check never matched. A missing photo would give a 500 instead of a 404, and the upload script stopped on the first new file. Now uses `instanceof`.
- **Push still blocked:** the safety check refused `git push` again. Local main is 2 commits ahead (`48ba43c`, `7229f87`).

### Pushed and live (10-27-2026)
- **Push:** `7229f87` is on main. The Vercel build is green. Build log: migrations applied; albums, photo records and owner created; "9 albums, 44 photo records, 1 owner, 1 account".
- **Live test as owner (scripted, all pass):**
  - Signed out: `/api/me` returns no user; album API, photos and thumbnails return 401; every page shows only the sign-in screen.
  - Wrong password: 401, "That email and password do not match."
  - Owner sign-in: 200, role owner; 9 albums; Fall 2026 has 44 photos; no dji photo.
  - Photo and thumbnail files load from private Blob (200, image/jpeg).
  - Upload: a 2000px test photo was saved at 1800x1350 with no EXIF, filed under Saturday from its camera date, and its thumbnail loads.
  - Caption edit and undo both work. Adding and deleting a comment works.
  - Deleting the test photo gives 200, its file then returns 404, and the album is back to 44. Nothing from the test is left on the live site.
- **Note:** the owner password has a `#`. That's fine on the site. Only Node's `--env-file` reader cuts it off there, so the test read the file directly.
- **Not tested:** clicking through in a real browser while signed in (I don't type real passwords into the live site). Ahmed or Stuart should sign in once on a phone and on a computer.

---


## Vercel preparation (10-27-2026)

Nothing was deployed, pushed or published. No Vercel, Neon, Blob or GitHub account was touched, and no photos left this computer. The backup from before this work is in `_backup-2026-10-27-before-vercel/`. Read `DEPLOY-VERCEL.md` for the steps, and go live only after Stuart approves.

### Done

**Database: Postgres everywhere** (`server/db.js`, `server/migrations/001_init.sql`)
- With `DATABASE_URL` set (Neon or any Postgres), the site uses the `pg` driver with a small pool.
- Without it (local), it uses PGlite: a real Postgres engine stored in `data/pglite`, with nothing to install. The SQLite database is gone.
- Migrations live in `server/migrations/`. Each runs once, in a transaction, and is tracked in `schema_migrations`.
- `npm run db:setup` migrates and adds the nine albums and the 44 Fall 2026 photo records. It creates the first owner from `OWNER_EMAIL` and `OWNER_PASSWORD` (12+ characters). It never creates test accounts on a real database. It is safe to run again.
- `npm run reset-test-data` works on the local database only, and refuses when `DATABASE_URL` is set.
- `npm run add-member -- --email ... --name ...` adds a member and prints a random first password. Add `--admin` for an admin.

**Photos: private Blob or local folder** (`server/storage.js`)
- With `BLOB_READ_WRITE_TOKEN` set, photos use Vercel Blob with `access: 'private'` for every write and read. They are streamed only to signed-in members through `/photos/...`, using `get()`.
- Without it, photos use the local `photos/` folder, as before.
- Storage keys are checked against a strict pattern, so file paths can't escape the folder.

**Uploads on Vercel**
- The browser uploads each original straight to a private `incoming/<album>/` blob. It uses a short-lived token from `/api/blob-upload`, which is issued only to signed-in members, only for real album paths, for JPG/PNG/WEBP/HEIC up to 30 MB. This avoids Vercel's 4.5 MB request limit.
- The page then calls `/api/events/:id/photos/from-upload`. The server reads the original, re-encodes it (no EXIF or GPS), resizes it to 1800px, makes a thumbnail, stores both privately and deletes the original.
- HEIC is still converted on the server with heic-convert, which is pure JavaScript and runs on Vercel.
- Locally, the direct multipart upload is unchanged.

**Server on Vercel**
- `server/app.js` is the shared Express app for the API and private photos.
- `api/index.js` is the Vercel function.
- `vercel.json` sends `/api/*` and `/photos/*` to the function and serves the built pages from `dist/`. It sets security headers and tells search engines not to index.
- Locally, `server/index.js` adds Vite, the sign-in page guard and the home-network filter.

**Sessions without server memory**
- Sessions live in the database. The cookie holds a random token, and the database stores only an HMAC of it keyed with `SESSION_SECRET`.
- Production refuses to start without a secret of at least 32 characters.
- Cookies are `HttpOnly; SameSite=Strict`, plus `Secure` on Vercel.
- HSTS is on in production.
- Changing your password signs out your other sessions.
- The failed sign-in limit (8 per 15 minutes, per address and per email) now lives in the database too.

**Files**
- New:
  - `api/index.js`, `server/app.js`, `server/storage.js`
  - `server/migrations/001_init.sql`
  - `scripts/upload-photos-to-blob.js`, `scripts/add-member.js`
  - `vercel.json`, `.gitignore`, `.env.example`, `DEPLOY-VERCEL.md`
- Rewritten for Postgres: `server/db.js`, `server/seed.js`, `server/auth.js`, `server/api.js`, `server/index.js`
- Changed:
  - `server/images.js`: upload types list
  - `web/src/api.js`: Blob client upload
  - `web/src/album.js`: chooses Blob or direct upload
  - `package.json`: scripts, Node 22+, `pg`, `@vercel/blob`, PGlite; better-sqlite3 removed

**Photo upload script:** `npm run blob:upload-photos` is a dry run that lists the 88 files (44 photos plus thumbnails). Adding `-- --yes` really uploads, as private blobs at the same paths the database uses.
- It skips files already uploaded and never includes dji_beasties.
- It re-encodes any file that still has GPS data.
- Not run.

### Test results (10-27-2026)

- **Local mode (PGlite and the photos folder), through the page:**
  - Signed out, the API returns 401, and photos, incoming paths and path-traversal attempts are refused.
  - A missing security header returns 403. A wrong password returns 401.
  - **Owner:**
    - The album list shows 9 albums with Fall 2026 at 44.
    - Photos stream as private and cached.
    - Caption edit, edit, undo, undo back to empty, then "nothing to undo" (400). 201 characters are refused.
    - Album caption and undo work.
    - Day set to Saturday, Tuesday refused (400), set back.
    - Comments: posted, 281 characters refused, closed (posting then refused), reopened.
    - Download is 200 with the full file.
  - **Member:**
    - Refused (403) for others' captions, the album caption, the day, closing comments, deleting others' comments and the admin page.
    - Uploaded 1 good image (2400x1600 became 1800x1200, caption kept) plus 1 fake file (refused by name). The empty album became real.
    - Edited and undid their own caption.
  - **Admin:** edited and undid a member's caption, deleted a member's comment, refused the admin page.
  - **Login limit:** the 9th wrong try returns 429, from the database.
  - **Pages:** Home (spread, archive, hero) and the Fall 2026 album (44 photos, day filters, viewer, comments) render with no failed requests or console errors.
- **Production path:** the `pg` driver against a real Postgres server (PGlite socket server in memory), with the Vercel entry `api/index.js`, `VERCEL=1` and `SESSION_SECRET` set:
  - The owner is created from environment variables, with no test accounts. Running setup twice changes nothing. Sign-in ignores email letter case.
  - The cookie is `HttpOnly; SameSite=Strict; Secure`.
  - A cross-site request is refused (403).
  - Photos need sign-in, and HSTS is sent.
  - Captions and undo run in pg transactions.
  - Comment add and delete work. Day setting works.
  - A bad incoming key is refused. The Blob token route answers 400 when Blob isn't configured.
  - Sign-out removes the session from the database.
  - The 9th wrong login returns 429.
  - Production without `SESSION_SECRET` refuses to start.
  - `add-member` works and refuses duplicate emails in any letter case.
  - `--reset` refuses on a real database.
  - The upload script stops cleanly with no token.
- **Build:** succeeds for all 7 pages. The Blob client code is a separate 28 KB (gzip) chunk, loaded only in Blob mode.
- **Clean state:** the local data was reset afterwards (44 photos, 0 comments, 0 caption history), and the test uploads were deleted.

### Doing now

- Waiting for Stuart's approval before anything goes online.

### Next

- When Stuart approves: follow `DEPLOY-VERCEL.md` (Neon database, private Blob store, environment variables, `db:setup`, photo upload script, then deploy).
- First online check: sign in, view photos, upload a phone photo (including a real iPhone HEIC), captions, comments, download.

### Problems (not yet tested)

- **Vercel Blob itself:** I had no Blob store or token, so the private `put` / `get` / `del`, the client upload token flow and the photo upload script were checked only against the `@vercel/blob` 2.8.2 type definitions and documentation comments, not against a live store. The DEPLOY guide's Step 4 (run locally with the real `DATABASE_URL` and Blob token) is there to catch any problem before going live.
- **Neon:** not tested against Neon itself. The same `pg` driver was tested against a real Postgres wire-protocol server, and Neon's connection string includes `sslmode=require`, which `pg` honours.
- **Vercel runtime:** not run on Vercel, so the function bundle size, sharp and heic-convert on Vercel's Linux, and the rewrites are unverified there.
- **Cached photos:** photos are cached in the member's own browser for up to an hour (`private`). After signing out on a shared device, recently viewed photos may still be in that browser's cache. The server itself always refuses signed-out requests.
- **Page shells:** on Vercel the HTML pages are static files. A signed-out visitor sees the sign-in page through the page script, and no private data or photos load without a session, but the empty page shell itself is not behind the server guard.

### Assumptions

- Neon (Postgres) is the database. Any Postgres works through `DATABASE_URL`.
- Member accounts are created by Stuart or Ahmed with `npm run add-member`. There is no public sign-up.
- Locally, test accounts are still created automatically (data/test-logins.txt). On a real database, only the owner from environment variables is created.

---


## Home motion design (10-27-2026)

This was done in `Beasties-Working`, the local working site. The approved prototype folder was not touched, by Ahmed's earlier rule. The same changes can be copied to the prototype if wanted. Backup of the Home files before this work: `_backup-2026-10-27-before-motion/`.

### Done

**Motion system** (`web/src/home-motion.js`, new)
- One GSAP context, so every animation can be undone in a single call.
- Each section reveals once with ScrollTrigger.
- No pinning, no scroll takeover, no Lenis.
- It never starts twice.
- A safety net plays any section that is already on screen after 2.5 seconds, so nothing can stay hidden.

**Entrance**, about 1.6 seconds, with the page usable at once:
1. The header drops in.
2. The headline rises line by line out of masks.
3. The gold line under "Friends" draws in.
4. The supporting line and both buttons follow, staggered.
5. The plum ground sweeps in from the right.
6. The photo settles into place: the 3D print eases back into the page, or without 3D the flat photo opens upward through a mask with a gentle settle.

**Hero photo**
- On desktop the print leans up to 4 degrees toward the mouse.
- On phones it leans gently toward your finger while touching and settles back on release. No motion sensors or permissions are used.
- On scroll the print leans back slightly, and the plum ground rises a little faster than the page. It moves upward, so it never slides under the caption.

**Sections**
- **Fall 2026 spread:** the heading rises, the photo stage opens through a mask, the caption and controls follow, and the thumbnails stagger in. Changing photos is now a soft wipe instead of a slide.
- **Next gathering:** the plum band opens from an inset, rounded shape to full width. The title rises, the dividing line draws across, and "94 days to go" counts up to the real number.
- **Album archive:**
  - The heading reveals.
  - The Fall 2026 text staggers in.
  - Each contact-sheet photo opens through a mask with a slight settle, and on desktop the staggered photos move at slightly different speeds as you scroll.
  - Winter 2027 and the earlier albums stagger in.
- **What's new:** "29" counts up, the text follows, and the photos open through masks.
- **Sightings:** the text rises and the empty frame settles in.
- **Footer:** the wordmark rises.

**Interactions**
- **Buttons:** lift on hover and press in on click.
- **Round arrows:** press in.
- **Thumbnails:** lift on hover and have a clear focus ring.
- **Album archive names:** step forward on hover or keyboard focus, with a gold arrow. Winter 2027 gets a drawn gold underline.
- **Photos:** the spread, contact sheet and new photos lean gently toward the mouse on desktop, and press in slightly on touch screens.
- **Header:** a thin gold line under it shows how far down the page you are, on every page.

**Reduce motion** (the switch or the system setting)
- No entrance, no reveals, no 3D, no tilt, no scroll line.
- Photos change instantly.
- Switching it on mid-page undoes every animation and leaves the counters on their real numbers.

**Files changed:**
- `web/index.html`: headline masks, old reveal hooks removed
- `web/src/main.js`: wired to the new system, touch lean, wipe
- `web/src/home-motion.js`: new
- `web/src/tilt.js`: new
- `web/src/ui.js`: archive and new photos can tilt
- `web/src/chrome.js`: header progress line
- `web/src/styles/main.css`: masks, drawn lines, tilt, hover and press states

### Test results (built-in browser, 10-27-2026)

- **Desktop 1440px:**
  - The entrance ends with the headline, underline, buttons and 3D print in place.
  - Every section reveals: the spread, the gathering band (countdown 94, line drawn, mask cleared) and the rest.
  - A sweep from top to footer found nothing left hidden, half-faded or masked. The only flagged items were intentional: the flat hero photo hidden behind the 3D print, and dimmed unselected thumbnails.
- **Phone 390px:** the same sweep found nothing stuck and nothing wider than the screen.
- **Touch lean:** a touch on the print leans it (0.039 / -0.029 radians) and releasing returns it to 0.
- **Spread wipe:** Next shows "2 of 14" with the right caption, and the mask clears after the wipe.
- **Reduce motion, switched on mid-page:**
  - No animation styles are left behind and nothing is hidden.
  - The numbers read 29 and 94.
  - The 3D and the scroll line are off.
  - Photos change instantly.
- **`?static` (no WebGL):** the flat photo reveal ends fully visible, with no mask or zoom left.
- **Images and links:** all 23 images and 11 links on Home return 200, and all 8 album archive links are present.
- **Build:** the production build succeeds.

**Problems found and fixed during testing**
1. The masked headline clipped the new gold underline. The mask now has more room.
2. The plum ground's scroll movement slid it under the caption. It now moves upward.
3. The underline sat too low. It was repositioned.

### Doing now

- Waiting for Stuart's approval of the Home page and its motion.

### Next

- If Ahmed wants it, copy the same Home motion into `Beasties-Home-Prototype` for Stuart's review copy.
- Check the live feel of the animations in a normal, visible browser window and on a real phone.

### Problems

- The preview pane often runs in the background, where animation frames pause. The final states were checked by stepping time by hand (dev-only `__step()` hook) and by DOM checks. The smoothness itself has not been judged by eye.
- Not tested on a physical phone.

### Assumptions

- "Active-section feedback" is a thin scroll-progress line under the header, because the header links point to pages, not sections.
- No pinned scene, because none of the sections needs one and the brief warns against pin gaps.
- Lenis is left out so normal scrolling is never taken over.

---

## Working version build (10-27-2026)

This folder, `Beasties-Working`, is a separate working copy that runs on this computer only. The approved design prototype stays untouched in `Beasties-Home-Prototype`; I checked that no file there changed after the copy was made. Nothing is deployed, online, on GitHub, Cloudflare or DNS. The photos stay in this folder.

## How to start

From `E:\Beasti Project\Beasties-Working`:

```
npm run dev
```

If `npm` gives a "Cannot find module E:\node_modules\npm" error (the npm shim at `E:\npm` is broken), use this instead:

```
E:\node.exe server\index.js
```

Then open http://127.0.0.1:5180/ . The terminal prints the three test logins, and they are also saved in `data/test-logins.txt`. For a fresh start (new passwords, uploads and comments removed), run `npm run reset-test-data`, or `E:\node.exe server\seed.js --reset`.

The server listens on 127.0.0.1, which is this computer only.

**Phone test on the home Wi-Fi:** run `npm run dev:home` (or `E:\node.exe server\index.js --home`).
- The server finds this computer's home address (10-27-2026: 192.168.18.62) and prints it. Open `http://<that address>:5180` on a phone on the same Wi-Fi.
- It refuses any request that doesn't come from a home-network (private) address, even if a router forwards it.
- If Windows asks about Node.js, allow Private networks only.
- The connection is plain HTTP inside the home network, so use only the test accounts. Stop the server with Ctrl+C after testing, and go back to `npm run dev` for computer-only use.

## Done (10-27-2026)

**Structure**
- `web/`: the same premium pages (Home, album, Events) plus Sign in, My photos, My profile and the Members page. Vite builds the frontend.
- `server/`: Node.js, Express 5 and SQLite (better-sqlite3), all in one process. Vite runs inside it in dev, so one command starts everything.
- `photos/<event-slug>/`: the photos. The 44 approved Fall 2026 photos sit in `photos/fall-2026/`, and new uploads go to `photos/<event>/`.
- `data/beasties.db`: the database. `data/test-logins.txt` holds the local test logins.

**Database**
- Tables: users, sessions, events, photos, caption_history, comments.
- The nine albums are seeded from the handoff, newest first.
- The 44 photos are seeded from the prototype's approved list, with their published captions and days. dji_beasties is filtered out.

**Sign-in**
- Email and password, with passwords hashed by bcrypt (bcryptjs, cost 12).
- Sessions are random 256-bit tokens stored hashed. The cookie is HttpOnly and SameSite=Strict and lasts 14 days.
- Every page except Sign in redirects to Sign in when signed out, and the photos and API refuse access.
- Login is limited to 8 failed tries per 15 minutes per address and per email.
- Sign out ends the session on the server.
- Roles are owner, admin and member. The three test accounts are owner@, admin@ and member@beasties.test, with random passwords.

**Real uploads**
- Add photos works on phone and desktop: up to 20 at once, with an optional caption on each (live 200 counter) and a real progress bar.
- The server checks each file's real type from its first bytes. JPG, PNG, WEBP and HEIC are accepted. HEIC is converted with heic-convert.
- Every photo is re-encoded with sharp into an 1800px large copy and a 640px thumbnail. Re-encoding drops all metadata, so GPS and EXIF never survive.
- The camera date sets the day when it falls on one of the event's days.
- One bad file does not stop the others, and each refused file is named.
- Adding photos to an empty album makes it a real album (filters, count, archive) with no new page code.

**Captions**
- 200 characters, with a live counter, enforced on the server too.
- The uploader edits their own photo captions. The owner and admins edit any caption and the album captions.
- Every change is saved in caption_history, and "Undo last change" steps back one edit at a time.

**Comments**
- 280 characters, with a live counter, in the large viewer.
- Delete your own. The owner and admins can delete any, and close or reopen comments on each photo.

**Days**
- The owner and admins can set the day of a photo from the event's days or "Day not set". Filters update straight away.

**Download**
- Download is a real file download with a clean file name. Location data is already removed.

**Account and admin**
- **My photos:** what you added, across albums.
- **My profile:** change your name or password.
- **Members and admins** (owner only): names and roles only, no contact details, with Make admin and Remove admin. The owner role can't be changed.

**Banners**
- The "Preview as" switch and the "Simulated" banners are gone.
- A slim "Local working version. Not online." banner stays, with Reduce motion.
- Share a sighting is the only part not built. It says "Not built yet" plainly.

**Safety**
- Every change needs a custom header plus a same-origin request, and the session cookie is SameSite=Strict.
- All text is inserted with textContent, never as HTML. I tested a caption containing HTML and it showed as plain text and nothing ran.
- Upload size is capped at 30 MB a file, and JSON bodies at 32 KB.
- Pages send nosniff, X-Frame-Options DENY and a same-origin referrer policy.
- Vite cannot serve the database, the server code or the photos. I checked: requests for them return 403 or 404.
- No email or message is ever sent.

## Test results (built-in browser and Node, 10-27-2026)

- **Signed-out protection:** pages redirect to Sign in, and the photos and API return 401. The database through Vite returns 403, directly 404, and the server code 403.
- **Sign-in:** a wrong password shows a clear error. The right one returns to the page you asked for. The cookie cannot be read by page scripts.
- **Rate limit:** repeated wrong logins return 429, "Too many tries. Please wait 15 minutes".
- **Upload pipeline** (`node server/selftest-images.mjs`):
  - A 4000x3000 JPEG with GPS comes out at 1800x1350 and 640x480 with no EXIF left.
  - The date became Saturday (correct for 10-17-2026).
  - PNG and WEBP are accepted. A text file and AVIF are refused.
- **Upload in the page, desktop 1440px:**
  - 3 good images plus 1 fake ".jpg" went into the empty Summer 2026 album. Progress went from 0 to 100%, 3 were added with their caption, and the fake was refused by name.
  - The album became real with filters and a count.
  - A second run with one good and one bad file kept the panel open, with the error.
- **Upload in the page, phone 390px:** the panel is full width with previews and per-photo captions. 2 uploaded. No sideways scroll.
- **Owner:**
  - Caption: edit twice, undo twice back to empty, then "nothing to undo" (400).
  - 201 characters refused.
  - Album caption and undo work.
  - Day set to Saturday and back; Tuesday refused for that album.
  - Comment posted. 281 characters refused. Close comments works, and posting while closed is refused (403).
  - Download returns 200 as an attachment.
  - Make admin and Remove admin work. The owner role can't be changed.
- **Admin:**
  - Edits a member's caption and undoes it.
  - Deletes a member's comment.
  - Edits the album caption.
  - The Members page is refused (owner only).
- **Member:**
  - Sees no edit prompts on others' photos.
  - Is refused (403) for others' captions, the album caption, the day, closing comments, deleting the owner's comment and the Members page.
  - Can upload, edit and undo their own caption, and delete their own comment.
- **Requests without the security header** are refused (403).
- **Phone viewer:** the comment counter, posting, Delete, the day picker and the close switch all work, with no sideways scroll.
- **Pages at phone size:** My photos, Members (no emails shown), Profile, Home (album archive counts update after uploads) and Events, all without sideways scroll.
- **Production build:** succeeds for all 7 pages. The test output was deleted.
- **Clean state:** after testing, `reset-test-data` returned the data to 44 photos, 9 albums, 3 accounts, 0 comments and 0 caption history, and deleted all test uploads.

## Known issues

- **HEIC:** conversion is wired up, but I had no real iPhone HEIC file to upload here. Please try one from a phone.
- **Real phones:** not tested on a physical phone. The phone checks used a 390px browser view.
- **Animation:** the preview pane runs in the background, so live animation smoothness was not judged here.
- **Home "What's new":** still shows the verified "29 photos were added" line. It does not yet list new uploads.
- **Sightings:** the gallery is not built yet and says so.
- **Forgotten passwords:** no reset by email, because no email is sent. The owner can run `reset-test-data` for test accounts. Real members will need a plan.
- **Accounts:** only the three test accounts exist. Adding real members needs Stuart's member list, which stays his to give.

## Assumptions

- Test account names are "Stuart (test owner)", "Test Admin" and "Test Member", so they cannot be mistaken for real members.
- The 44 seeded photos have no recorded uploader, so only the owner and admins can edit their captions.
- Members can upload to any album, including Winter 2027 before the event, because the handoff says members add photos.

---

# Earlier journal (copied from the prototype)

Owner: Ahmed Malik. Final design approval: Stuart.
Last updated: 10-27-2026 (live site fixed and tested).

## Done

### Rest of the site (10-27-2026)

Ahmed confirmed the Home page and asked for the rest of the site in the same style. Stuart has not reviewed any of this yet.

**One reusable album page**
- `album.html?event=<id>` serves every event. `album.html` on its own lists all nine albums.
- `src/data/events.js` holds the nine albums, newest first, with their exact handoff names.
- `src/data/photos/<id>.js` is one photo list per event:
  - Fall 2026 reads the existing 44 photos from photos.js.
  - The other eight files are empty lists.
- Adding an event means adding one row to events.js and one photos file. No new page code.
- Empty albums show "Photos coming soon" with a simulated Add photos button. Winter 2027 says "Photos after the event."
- Day filters are built per event from that event's own day list, with photo counts.
- The large photo viewer:
  - Shows the whole photo on plum.
  - Has Previous and Next, arrow keys, phone swipe and Escape to close.
  - Keeps focus inside while open.
  - Puts you back at the same scroll position and photo when it closes.
- Photos are shown whole on white mounts and never cropped. They lean up to 4 degrees toward the mouse, like the Home print. This is off with Reduce motion and on touch screens.

**Captions**
- Every photo and every album has a caption space.
- The editor has a 200-character limit (input stops at 200) and a live counter, for example "142 / 200".
- The grid shows 2 lines and the viewer shows the full caption.
- An empty caption shows "Add a caption" only to people allowed to edit, and nothing to anyone else.
- Each edit keeps the previous caption, and "Undo last change" restores it. Up to 20 steps are kept.
- Captions save in this browser only (localStorage).

**Prototype switch, "Preview as: Uploader / Admin / Member"** (on every album page, clearly labelled)
- **Admin** edits every photo caption and the album caption.
- **Uploader** edits only their own photos. No uploader is recorded yet, so the switch says that the 29 newer Fall 2026 photos stand in for "yours".
- **Member** edits nothing.

**Events page** (`events.html`)
- Winter Weekend 2027, Friday, January 29 to Monday, February 1, 2027, at The Beast, with a countdown and a link to its album.
- Past events as links to their albums. No schedules, menus or assignments.

**Navigation and shared chrome** (`src/chrome.js`)
- Every page gets the same banner, Reduce motion switch, header, account menu, footer and notices from one file.
- Home goes to index.html, Events to events.html and Photos to album.html.
- The account menu items show a "Simulated" notice.

**Link fixes**
- Every Home link now goes to `album.html` or `album.html?event=...`: Browse albums, Explore photos, Open album, See all, Open Fall 2026, all nine archive names, and See the event (now events.html).
- The old `2026 Foliage Album.html` is now a redirect to `album.html?event=fall-2026`, so index-v2 and old bookmarks still work. The original is in `_backup-2026-10-27/`.

**Problems found while testing, and fixed**
1. The sticky header stopped sticking inside the shared wrapper (`#chrome { display: contents }`).
2. On phones, the viewer photo covered the Close button and caption editor. The phone viewer is now a stacked column.
3. The viewer arrows overlapped the photo edges. There is now more side room.
4. Empty albums had a large blank gap from the empty photo grid. The grid is now hidden when there are no photos.
5. On empty albums, the role switch pushed "Photos coming soon" below the first screen. It now sits below the empty state.
6. The "Photos coming soon" heading lost its plum colour to a more specific rule. Fixed.
7. The Escape handler could fail on events without an element target. Fixed.

**Files**
- New: `album.html`, `events.html`, `src/album.js`, `src/events-page.js`, `src/chrome.js`, `src/captions.js`, `src/data/events.js`, `src/data/photos/*.js` (9 files), `src/styles/pages.css`
- Changed:
  - `index.html`: shared chrome and new links
  - `src/main.js`: uses the shared chrome
  - `src/ui.js`: archive links
  - `src/data/home.js`
  - `src/styles/main.css`: header fix
  - `vite.config.js`: new pages
  - `2026 Foliage Album.html`: now a redirect
- Backup of v5 before this work: `_backup-2026-10-27/v5-memory-book/`

### Test results (built-in browser, 10-27-2026)

- **Desktop 1440x900:** Fall 2026 album, an empty album (Martha's Vineyard 2026), Winter 2027, All albums, the viewer and the Events page.
- **Phone 390x844:** an empty album, the Fall 2026 album, the viewer with the caption editor open, Home and Events. No horizontal scroll on any of them (page width equals viewport width).
- **Album data:**
  - All 44 tiles appear.
  - The day filters are All days 44, Friday 1, Saturday 22, Sunday 3, Monday 1, Day not set 17.
  - All 44 image paths return 200.
- **Captions:**
  - The counter showed "0 / 200" and "142 / 200", with maxlength 200.
  - Save updated both the viewer and the grid.
  - A second edit, then Undo, restored the first version.
  - The test caption was deleted from localStorage afterwards.
- **Roles:**
  - Member: 0 edit prompts and no album edit.
  - Uploader: edit prompts only on the 29 stand-in photos, none on published photos, no album edit.
  - Admin: edits everything.
- **Viewer:**
  - Next works.
  - Escape closes it.
  - Focus returns to the same photo and the scroll position stays at 1400.
- **Tilt:** about 3.9 and 2.9 degrees with full motion, none with Reduce motion.
- **Account menu:** opens, and Sign out shows the Simulated notice.
- **Redirect:** the old album URL redirects to `album.html?event=fall-2026`.
- **Links:** every Home link checked, nav links on all pages, the nine album rows and the eight past events.
- **Build:** the production build succeeds with all four HTML pages. The test output was deleted.

### Known issues

- The prototype banner text is 15px on phones, kept small on purpose so the banner stays unobtrusive. Everything else is 16px or larger.
- The preview pane runs as a background page, so lazy photos and live animation weren't visible in its screenshots. Image paths and behaviour were checked directly. Please scroll the pages once in a normal browser window.
- No real iPhone, Android phone or iPad tested yet.
- Captions and the role choice live in one browser only. Real shared captions need the later server phase.

### Assumptions

- "At The Beast" for Winter Weekend 2027 comes from Ahmed's instruction for the Events page.
- The empty-album note "Stuart or Ahmed will add them." comes from the handoff ("Photos come from: Stuart or Ahmed").
- The viewer line "Shared by: not recorded" is kept from the earlier album page, because no uploader is recorded.
- The Preview switch defaults to Admin, since Stuart is the owner and admin.

---

## Earlier work

### v5: creative reset (10-27-2026)

Why v4 was still weak:
- The hero was a standard text-left, photo-right split with no visual identity.
- The photo feature was a uniform three-card grid, and the albums were a plain list.
- Each section was a separate block divided by rules, so nothing tied the page together.

Concept: a memory book. Ivory paper pages, big editorial type, real prints on white mounts, plum as the ground the photographs rest on, and gold as a thin accent line (headline underline, links, the current thumbnail).

Sections:
- **A. Hero:** an asymmetric composition. "A Family / of Friends" in DM Serif Display on two deliberate lines ("Friends" in italic with a gold underline), the supporting line, and Browse albums and Explore photos buttons. N013 sits on a white mount over a plum ground that runs off the right edge of the page.
  - With 3D on, the photo becomes a real print in a small Three.js scene. It tilts up to 4 degrees toward the mouse, leans back gently as the hero scrolls away, and has a soft plum shadow and faint sheen.
  - At rest the print sits pixel-for-pixel where the flat photo sits. The whole photo is always visible.
- **B. Photographic interlude ("Fall 2026, in pictures"):** an editorial spread showing one photo at a time on a sand panel, with its published caption in large serif type. It has a counter, Previous and Next buttons, arrow keys and a thumbnail strip.
  - It uses all 14 published photos except the hero. Nothing moves on its own, so no Pause control is needed.
- **C. Next gathering:** a full plum band with "Winter Weekend 2027" in large type, then January 29 to February 1, 2027, Friday to Monday, a live countdown and a simulated "See the event" button.
- **D. Album archive:**
  - Fall 2026 as a feature: an "Open now" tag, a large title, 44 photos, an Open album button, and a staggered contact sheet of four different real photos.
  - Winter 2027 as its own row, with dates and "Photos after the event".
  - Seven earlier albums in a two-column index, newest first, reading down each column, each marked "Photos coming soon".
- **E. What's new:** a large "29" beside "29 photos were added to Fall 2026, including Sunday breakfast. The album now holds 44 photos." and three of the new photos.
- **F. Random Beastie Sightings:** the question in italic serif and a note that this is a separate gallery. An empty white frame with a gold border says "No sightings have been shared yet." The Share button is simulated.
- **G. Footer:** plum, with a large "Beasties" wordmark and the prototype note.

Motion (all off with Reduce motion or the system setting):
- The hero lines rise in, the plum ground draws in from the right, and the print settles into place.
- Sections fade up as they come into view.
- The spread cross-fades between photos.
- No pinning, no camera flights, no Lenis.

Weaknesses found in the first v5 render, and fixed:
1. The plum ground showed as a stray strip beside the photo. It now sits under the print as its ground.
2. The Fall 2026 contact sheet repeated two nearly identical summit shots. It now shows four different photos (04, 07, 21, 38).
3. "Photos coming soon" was said twice, in the label and on every row. The label is now just "Earlier albums".
4. The earlier-albums grid read across the columns, which muddled newest-first. It now reads down each column.
5. In What's new, the heading broke into "What's / new", and the numeral showed 44 instead of the news (29). Both fixed.
6. The empty Sightings frame left "yet." alone on its own line. Balanced wrapping fixed it.
7. On phones, the thumbnail strip collapsed into thin slivers (global `img { max-width: 100% }`). Fixed.
8. On phones, there was too large a gap above the hero caption. Tightened.

### Earlier

- v4 (calm editorial, no 3D) is backed up in `_backup-2026-10-27/v4-editorial/`.
- v3 (full 3D scene) is backed up in `_backup-2026-10-27/v3-3d/`.
- The original files are backed up in `_backup-2026-10-27/`.
- Fixed the broken `album.html` links in `index-v2.html` and the album page.
- Confirmed all 88 photo files are present. No dji_beasties-1 file exists, and the page also filters that name.

### Files changed in v5

- `index.html`: rewritten
- `src/styles/main.css`: rewritten
- `src/main.js`: rewritten (GSAP intro, reveals, spread transitions, hero 3D wiring, Reduce motion)
- `src/ui.js`: rewritten (spread, archive, What's new, gathering, menu, simulated actions)
- `src/data/home.js`: verified content and photo choices
- `src/hero-print.js`: new (the Three.js hero print)
- `package.json`: added three and gsap back

## Test results (built-in browser, 10-27-2026)

- **Desktop 1440x900:** inspected every section from hero to footer, before and after the fixes above.
- **Phone 390x844:** inspected every section. No horizontal scroll: page width equals viewport width, and no element extends past the edge apart from the intended plum ground.
- **3D print:**
  - It loads and lines up with the flat photo.
  - A pointer tilt shows a gentle lean.
- **Reduce motion:**
  - Turns the 3D off and shows the flat photo.
  - Shows all text with nothing left hidden.
  - Turns the 3D back on when switched off.
- **`?static` (no WebGL):** the flat photo shows, the canvas is hidden, and there are no console errors.
- **Spread:** the Next button, the left arrow key and a thumbnail click all change the photo, counter and caption. The 14 caption-to-photo pairs match photos.js.
- **Links:** the album page and index-v2 return 200, with no failed requests on page load.
- **Copy:** none of "third annual", "Six weekends", "Welcome back" or "dji" appear. No visible text is smaller than 17px.
- **Contrast:** the palette is the same as v4 (all pairs WCAG AA, lowest 7.17:1).
- **Build:** the production build succeeds, with Three.js in its own chunk loaded only for the 3D hero. The test output was deleted.

## Known issues

- The preview pane runs as a background page, so animation frames don't run there. Motion was checked by stepping the animation by hand (`__step()` test hook, dev only). Real-time smoothness still needs a look in a normal browser window.
- No real iPhone, Android phone or iPad tested yet.
- The npm shim at `E:\npm` is broken. Use:
  `E:\node.exe C:\Users\AHMED\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js <command>`

## Assumptions

- The supporting line paraphrases the Master Brief purpose ("A private home for the Beasties' photos, events and plans").
- "Friday to Monday" comes from the handoff. "Including Sunday breakfast" comes from photos.js file names and days.
- The hero caption and all spread captions are the published captions in photos.js.
- Album order, newest first, follows the handoff table read bottom to top.
- "Explore photos" opens the Fall 2026 gallery, the only photo page that exists today.

## Next

- Stuart reviews the whole site (Home, album page, captions, role switch, Events).
- Real device testing on iPhone, Android phone and iPad.
- Later phase, after a platform is chosen: real sign-in, uploads, and captions shared between members.

## How to run

From `E:\Beasti Project\Beasties-Home-Prototype`:

```
E:\node.exe node_modules\vite\bin\vite.js
```

Then open http://127.0.0.1:5173/ (this computer only). Add `?static` to preview the no-3D fallback.
