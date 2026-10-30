# Beasties Website: Owner's Manual and Technical Handoff

**Prepared for:** Stuart, owner of the Beasties website
**Date:** October 30, 2026
**Website address:** https://beasties-grp.vercel.app
**Source of truth:** the project's code, plus checks made on the live site on October 30, 2026, and the test records in the project's build journal.

> **How to read the status labels**
>
> | Label | What it means |
> |---|---|
> | **IMPLEMENTED AND LIVE** | Built, published, and checked on the real website (by a recorded test or a check made for this manual). |
> | **BUILT BUT OFF** | Built and published, but switched off. |
> | **PARTIALLY IMPLEMENTED** | Some of it exists, or it is done on the developer's computer but not yet published. |
> | **NOT BUILT** | Does not exist in the website. |
> | **NEEDS VERIFICATION** | The code exists and is published, but nobody has confirmed it works for real on the live site. |

---

## Read this first: 5 things Stuart should know

1. **Urgent: an old public copy of the site is still online.** The older Cloudflare address, `beasties.pages.dev`, opens **without any sign-in**. On October 30, 2026 it showed 7 Fall 2026 photos (including the group photo) and offered the **Foliage 2026 itinerary PDF** for anyone to download. It is marked "do not index" for search engines, but anyone with the address can open it. This is separate from the private website. **Action for Stuart or Ahmed:** in the Cloudflare dashboard, delete that Pages project or put it behind Cloudflare Access. Nothing was changed there while writing this manual.
2. **There is no daily backup.** The database is copied only when a website update changes the database structure. Photos have **no backup at all**. A deleted photo is gone for good. Restoring from a backup has **never been tested**. See [Backups](#7-backups-and-what-to-do-if-something-goes-wrong).
3. **The Beasties Assistant appears to be switched on** on the live site, even though the last written record says it was off. Which mode it uses (free FAQ, Gemini or Anthropic) needs checking. See [Beasties Assistant](#615-beasties-assistant).
4. **The new itinerary feature is published but has not been used yet.** Nobody has uploaded the itinerary to the live Fall 2026 page, so its live upload has never been tried.
5. **The countdown spacing fix ("91 days to go") is only on Ahmed's computer.** The live site still shows "91days to go" on the Events page until the next update is published.

---

# PART A: STUART'S OWNER'S MANUAL

## 1. What the website is

The Beasties website is a **private** family-of-friends website. Only people you invite can see anything. It holds:

- The **Home** page, with the welcome story and a countdown to the next gathering.
- **Events**, with the next gathering and the past ones.
- **Photo albums**, one per gathering (nine albums).
- **Random Beastie Sightings**, a separate gallery for photos taken anywhere.
- **Members**, where you and your admins add people.
- An optional **Beasties Assistant**, a small "Ask" helper.
- An **Itinerary** card on an event's album page (new).

There is **no public sign-up**. People can only get in when you or an admin adds them.

## 2. Who can do what

There are three kinds of account.

| | Owner (Stuart) | Admin | Member |
|---|---|---|---|
| See all albums, photos, sightings, comments | Yes | Yes | Yes |
| Add photos to any album | Yes | Yes | Yes |
| Share a sighting | Yes | Yes | Yes |
| Write comments | Yes | Yes | Yes |
| Edit or delete **their own** photos, captions, sightings, comments | Yes | Yes | Yes |
| Edit or delete **anyone's** photo captions, photos, sightings, comments | Yes | Yes | No |
| Edit the album caption (the line under the album name) | Yes | Yes | No |
| Set a photo's day | Yes | Yes | No |
| Close comments on a photo | Yes | Yes | No |
| Arrange photos | Yes | Yes | No |
| Add, edit, reset or remove **members** | Yes | Yes | No |
| Add **admins**, or change someone's role | Yes | No | No |
| View as member | Yes | Yes | No |
| Add, replace or remove an event itinerary | Yes | Yes | No |
| Can be removed or demoted | Never | By the owner | By owner or admin |

The website checks these rules on the server every time, so a member cannot get around them by changing the page.

## 3. Signing in and moving around

### Signing in
1. Open **https://beasties-grp.vercel.app**.
2. Type your **Email** and **Password**. Tap **Show** to see what you typed.
3. Tap **Sign in**.

Good to know:
- You stay signed in for **14 days** on that device.
- After **8 wrong tries in 15 minutes**, the site makes you wait 15 minutes. This protects against guessing.
- **There is no "Forgot password" link.** A member who forgets their password asks you or an admin for a **Reset password** (see [Members](#613-add-member-and-the-members-page)). **If you, the owner, forget your password, nobody on the site can reset it. Ahmed has to do it.**

### The top bar
On every page you will see:
- **Beasties** (top left): goes to Home.
- **Home**, **Events**, **Photos**: the three main pages.
- **Account** (top right): opens your menu.

### The Account menu
Tap **Account** to see:
- Your name and role.
- **Random Beastie Sightings**
- **My photos**: every photo you added.
- **My profile**: your name and password.
- **Members** (owner and admins only).
- **View as member** (owner and admins only).
- **Reduce motion**: turns off the moving effects. Each device remembers it.
- **Sign out**

---

## 4. Everyday tasks, step by step

### 4.1 Look at photos
1. Tap **Photos** in the top bar. You see **All albums**, newest first.
2. Tap an album, for example **Fall 2026**.
3. Use the day buttons (**All days**, then each day) to show one day only.
4. Choose how to see them with the switch above the days:
   - **Grid**: small tiles.
   - **Big photos**: one large photo at a time, with its caption, day, who shared it and the latest comments **underneath** the photo. Each device remembers your choice.
5. Tap any photo to open it full screen.

### 4.2 The full-screen photo viewer
When a photo is open full screen:
- **Next** and **previous**: tap the big round arrows, swipe left or right, or use the arrow keys.
- The counter at the top left shows where you are, for example "2 of 43".
- **Close** (top right) or the Escape key returns you to the album, at the same place.
- **Full screen**: uses the whole screen. (It is hidden on iPhone, where browsers don't allow it.)
- **Hide info** / **Show info**: hides or shows the cream bar under the photo.
- **Details**: opens a panel with:
  - **Download**: saves a copy of the photo (location data was already removed).
  - **Edit caption** and **Undo last change** (if you are allowed).
  - **Day** (owner and admins).
  - **Delete this photo** (if you are allowed). **This is permanent.**

**The info bar under every photo** shows:
- the caption (two lines, then **More** / **Less**),
- the day,
- **Comments (n)**, or **Be the first to comment**,
- **Add a caption**, when the caption is empty and you are allowed to add one.

### 4.3 Add photos
Every member can add photos to any album.
1. Open the album.
2. Tap **Add photos**.
3. Tap **Choose photos**. You can pick up to **20** at a time, up to **30 MB** each. JPG, PNG, WEBP and HEIC (iPhone) photos work.
4. Type a **Caption (optional)** for each photo if you like.
5. Tap **Upload** and wait for the progress bar.

What happens next:
- The website removes location (GPS) and camera data from every photo, makes a large copy and a small thumbnail, and puts it **at the end of the album**.
- If the photo has the date it was taken, the site sets the day for you. Otherwise it says "Day not set" and an admin can set the day in **Details**.

### 4.4 Captions
- **Photo caption:** the person who added the photo, or you and your admins, can change it. In the viewer, use **Details > Edit caption**, or **Add a caption** in the info bar. Up to **200 characters**.
- **Album caption:** the line under the album name. Only you and admins can change it.
- **Undo last change** puts the previous caption back, one step at a time. Every change is kept, so you can step back several times.

### 4.5 Comments
1. In the viewer, tap **Comments (n)** or **Be the first to comment**.
2. Type in the **Write a short comment** box (up to **280 characters**).
3. Tap **Post comment**.
4. **Back to photo** (or Escape) returns to the same photo.

- Everyone can delete their own comments. You and admins can delete any comment.
- **Close comments** (a tick box in the comments panel, owner and admins only) stops new comments on that photo. Untick it to open them again.
- When a member is removed, their comments stay and show as "Former member".

### 4.6 Arrange photos (owner and admins)
1. Open the album and tap **Arrange photos**.
2. On each photo use **Move up**, **Move down**, or type a number in **Move to position**.
3. **Every move is saved straight away** and everyone sees the new order.
4. **Undo last move** goes back one step. The last **30** moves are kept per album.
5. Tap **Done** when you finish.

Tip: while arranging, all days are shown together.

> **Open item from October 28, 2026:** a test that day accidentally undid the most recent arrangement step on Fall 2026. Please open Fall 2026, tap **Arrange photos**, check the order at the start of the album, and redo your last move if needed.

### 4.7 Random Beastie Sightings
For photos of Beasties anywhere, not tied to one gathering.
1. **Account > Random Beastie Sightings** (or the section on Home).
2. Tap **Share a sighting**.
3. Choose **one** photo, and add a **Place** (up to 80 characters) and a **Caption** (up to 200).
4. Tap **Share**.

The person who shared it, you and admins can edit the place and caption (with Undo) or delete it.

### 4.8 My photos
**Account > My photos** lists every album photo you added, newest first. If you haven't added any, it says **No photos yet**, with a **Go to the albums** button.

### 4.9 My profile and password
1. **Account > My profile**.
2. **Your name** (shown with your photos and comments): change it and tap **Save name**.
3. **Change password:**
   - Type your **Current password**.
   - Type the **New password**, and **Type the new password again**. It needs at least **12 characters**.
   - Tick **Show passwords** to check your typing.
   - Tap **Change password**.
4. After a change, **your other devices are signed out**. Sign in again there with the new password.

### 4.10 Add a member (owner and admins)
1. **Account > Members**.
2. Under **Add a member**, type their **Full name** and **Email**.
3. Choose **Member**, or (owner only) **Admin**.
4. Tap **Add member**.
5. A one-time login card appears with a temporary password like `K7MP-X9QA-RTW4`. Tap **Copy login details** and send it to them **privately** (a text or a call is best). **The site never sends email**, and the card is shown only once.
6. Tap **Done**.

When they first sign in, the site makes them **choose their own password** (12+ characters) before they can see anything. Until then the list shows "Has not chosen a password yet".

**Other buttons in the Everyone list:**
- **Reset password**: makes a new temporary password and signs them out everywhere.
- **Edit name**: fixes how their name shows.
- **Make admin** / **Make member**: owner only.
- **Remove**: then **Yes, remove (name)** to confirm. Their photos, sightings and comments stay on the site.

Limits: the same email can't be added twice; at most 30 adds or resets per hour per person.

### 4.11 View as member (owner and admins)
To see the site exactly as a normal member does:
1. **Account > View as member**.
2. A gold bar appears: "Viewing as a member". Owner and admin tools are hidden.
3. Tap **Back to owner view** in the gold bar (or the Account menu) to return.

This only changes what **your screen** shows, on that device. Nothing changes for anyone else, and you keep your owner rights.

### 4.12 Event itinerary (owner and admins add it, members read it)
On an event's album page there can be one **Itinerary** card.

**To add the Fall 2026 itinerary (not done yet on the live site):**
1. Open **Photos > Fall 2026**.
2. Tap **Add an itinerary** (next to **Add photos**).
3. Keep or change the **Title** (for example "Foliage 2026 Itinerary") and add a **Short description** if you like.
4. Choose **Upload a PDF or Word (.docx) file**, pick the file, and tap **Save**.
   - Or choose **Add a Google Docs or Microsoft Word link** and paste a sharing link.

**Members then see** a cream card with **View Itinerary**. A PDF opens in a new tab, with its clickable contents and bookmarks. A Word file downloads. A link opens in Google or Microsoft (they control who can see it there).

**To change it:** **Replace or edit** on the card. **To take it down:** **Remove**.

Notes:
- If the PDF was set to open the print window by itself, the website quietly removes **only that setting**, and tells you so on the card.
- Up to 25 MB.

### 4.13 The Beasties Assistant
If switched on, members see a round **Ask** button. It answers simple "how do I…" questions about the website.
- It has suggestion chips, **More questions**, a **Clear chat** button, a microphone (where the device supports it) and **Read aloud**.
- Members may ask 20 questions an hour and 100 a day. Questions are up to 500 characters.
- It **does not store** what anyone types, and it never sees photos, names, emails or comments.
- When it doesn't know, it says to ask Stuart.

**Switching it on or off, or changing its mode,** is done in Vercel's settings, followed by a redeploy. Ask Ahmed, or follow `ASSISTANT-SETUP.md` carefully.

---

## 5. What you can change yourself, and what needs a developer

| You can do it on the website | Needs Ahmed (or another developer) |
|---|---|
| Add, rename, reset, remove members; make admins | Reset **your own** owner password if you forget it |
| Add, caption, arrange, delete photos | Add a **new album or event**, or change event dates, places or names |
| Album captions, photo days | Change the **next gathering** and countdown on Home |
| Close or delete comments | Change the welcome story or other page text |
| Share and manage sightings | Restore anything deleted, or restore a backup |
| Add, replace, remove an event itinerary | Turn the Assistant on or off, or change its mode (Vercel settings) |
| View as member | Any design or layout change, or a new feature |
| Change your name and password | Remove the old public Cloudflare copy (needs the Cloudflare login) |

---

## 6. Feature status (as of October 30, 2026)

### Summary table

| # | Feature | Status | Evidence |
|---|---|---|---|
| 1 | Home page | IMPLEMENTED AND LIVE | Live page served; signed-in live checks recorded 10-27 and 10-28 |
| 2 | Events page | IMPLEMENTED AND LIVE | Live page served; the countdown code is live |
| 3 | Photo albums (browse, day filters, add photos) | IMPLEMENTED AND LIVE | Live owner tests recorded 10-27 (uploads, captions, comments) |
| 4 | Full-screen photo viewer | IMPLEMENTED AND LIVE | 12 live test runs on iPad, iPhone and desktop, 10-28 |
| 5 | Photo information bar | IMPLEMENTED AND LIVE | Live tests on iPad, phone and desktop, 10-28 |
| 6 | Photo comments (incl. Close comments) | IMPLEMENTED AND LIVE | Live tests 10-27 and 10-28 |
| 7 | Big Photos view | IMPLEMENTED AND LIVE | Live tests 10-28 |
| 8 | Photo and album captions, with Undo | IMPLEMENTED AND LIVE | Live owner tests 10-27 and 10-28 |
| 9 | Arrange Photos | IMPLEMENTED AND LIVE | 38 live checks, 10-27 |
| 10 | Random Beastie Sightings | IMPLEMENTED AND LIVE | 50 live owner checks, 10-27 |
| 11 | Owner / admin / member experience | IMPLEMENTED AND LIVE | Live member and owner tests, 10-28 |
| 12 | My profile and password change | IMPLEMENTED AND LIVE | Live password test (10 checks) and profile test, 10-28 |
| 13 | Add member (Members page) | IMPLEMENTED AND LIVE | A real member was added with the live form, 10-28 |
| 14 | View as member | IMPLEMENTED AND LIVE | Live tests on desktop and phone, 10-28 |
| 15 | Beasties Assistant | NEEDS VERIFICATION | Recorded as off on 10-28; on 10-30 the live site behaves as if it is **on**. Mode unknown |
| 16 | Event itinerary / documents | NEEDS VERIFICATION | Published 10-30 (the live site answers the new address), but no document uploaded or opened on the live site yet |
| 17a | My photos page | NEEDS VERIFICATION | Live page served; no recorded signed-in live test |
| 17b | Photo download | NEEDS VERIFICATION | Refuses signed-out visitors (checked); no recorded signed-in live download |
| 17c | Reduce motion switch | IMPLEMENTED AND LIVE | Part of every live page |
| 17d | Countdown spacing fix ("91 days to go") | PARTIALLY IMPLEMENTED | Fixed on Ahmed's computer only; live still shows "91days to go" on Events |
| 17e | Forgot-password link (self-service) | NOT BUILT | |
| 17f | Email notifications or invitations | NOT BUILT | The site never sends email |
| 17g | Adding or editing events and albums on the website | NOT BUILT | Developer task |
| 17h | Daily automatic backups | NOT BUILT | See section 7 |
| 17i | Backup of photo files | NOT BUILT | See section 7 |
| 17j | Video uploads | NOT BUILT | Photos only |
| 17k | Custom web address (for example beasties.com) | NOT BUILT | The site uses the free Vercel address |

### Details for each feature

#### 6.1 Home page — IMPLEMENTED AND LIVE
- **What:** the welcome page: "A Family of Friends" story, Fall 2026 in pictures, the next gathering (Winter Weekend 2027) with a countdown, the album archive, What's new, and Random Beastie Sightings.
- **Where:** **Home**, or tap **Beasties** at the top left.
- **Who:** everyone signed in.
- **Buttons:** **Browse albums**, **Explore photos**, **See the event**, **Open album**.
- **Limits:** the story text, the featured photos and the next gathering are written into the website's code. Changing them needs a developer. The countdown hides itself once the day has passed.

#### 6.2 Events page — IMPLEMENTED AND LIVE
- **What:** the next gathering (name, dates, place, "N days to go", and a button to its album), then **Past events**, each linking to its album.
- **Where:** **Events** in the top bar.
- **Who:** everyone signed in.
- **Limits:** events come from the database, which only a developer can change. The live page still shows "91days to go" until the spacing fix is published.

#### 6.3 Photo albums — IMPLEMENTED AND LIVE
See [4.1](#41-look-at-photos) and [4.3](#43-add-photos). Nine albums exist. Empty albums say "Photos coming soon".

#### 6.4 Full-screen photo viewer — IMPLEMENTED AND LIVE
See [4.2](#42-the-full-screen-photo-viewer). The photo is always shown whole, never cropped or stretched. Photos before and after the current one load early, so moving between them is quick.

#### 6.5 Photo information bar — IMPLEMENTED AND LIVE
The cream bar **under** each full-screen photo. It never covers the photo. **Hide info** hides it, and each device remembers that.

#### 6.6 Photo comments — IMPLEMENTED AND LIVE
See [4.5](#45-comments). Comments are plain text only. There are no replies, likes or notifications.

#### 6.7 Big Photos view — IMPLEMENTED AND LIVE
In an album, choose **Big photos**. Each photo has a strip underneath with the caption, day, who shared it and the latest 3 comments, plus a button to open the comments.

#### 6.8 Photo captions — IMPLEMENTED AND LIVE
See [4.4](#44-captions).

#### 6.9 Arrange Photos — IMPLEMENTED AND LIVE
See [4.6](#46-arrange-photos-owner-and-admins). Members cannot rearrange; the server refuses them.

#### 6.10 Random Beastie Sightings — IMPLEMENTED AND LIVE
See [4.7](#47-random-beastie-sightings). One photo per sighting. There are no comments on sightings.

#### 6.11 Owner and member experience — IMPLEMENTED AND LIVE
Members see everything to look at, and can add photos, sightings and comments. Owner and admin tools (Members, Arrange, album caption, day, deleting other people's things, closing comments, itinerary controls) are hidden from members **and** refused by the server.

#### 6.12 My profile and password — IMPLEMENTED AND LIVE
See [4.9](#49-my-profile-and-password). Minimum 12 characters.

#### 6.13 Add member and the Members page — IMPLEMENTED AND LIVE
See [4.10](#410-add-a-member-owner-and-admins). Note: the developer instructions file also mentions a command-line way to add members. The Members page is the normal way.

#### 6.14 View as member — IMPLEMENTED AND LIVE
See [4.11](#411-view-as-member-owner-and-admins).

#### 6.15 Beasties Assistant
**Status: NEEDS VERIFICATION.**
- **What the records say:** on October 28, 2026 the build journal says it was built and **switched off** in production.
- **What the live site shows:** on October 30, 2026, a signed-out request to the Assistant got "please sign in", not "not found". The code only answers "not found" when the Assistant is off. **So it appears to have been switched on** since the last record.
- **Modes:**
  - **FAQ** (default): free; nothing leaves the website.
  - **Gemini**: Google's free tier; questions go to Google.
  - **Anthropic**: paid, about $0.50 a month at the default cap; questions go to Anthropic.
- **To verify:** sign in on the live site and look for the round **Ask** button. Ahmed can check the `ASSISTANT_ENABLED` and `ASSISTANT_PROVIDER` settings in Vercel.

#### 6.16 Event itinerary / documents — NEEDS VERIFICATION
See [4.12](#412-event-itinerary-owner-and-admins-add-it-members-read-it).
- Published October 30, 2026 (commit `47de4ba`). Signed-out checks pass on the live site, so a member who isn't signed in can't see or download anything.
- Fully tested on Ahmed's computer with the real itinerary PDF (35 server checks, and browser checks on phone, iPad and desktop).
- **Not yet done on the live site:**
  - Uploading a document.
  - The large-file path, needed because the itinerary is 4.8 MB, over Vercel's 4.5 MB request limit.
  - Opening it as a member.
  - Tapping the contents links in a real PDF viewer.

---

## 7. Backups, and what to do if something goes wrong

### What is backed up today

| What | Backed up? | How |
|---|---|---|
| Database: members, albums, photo records, captions, comments, sightings, itinerary records | **Partly** | Only right before an update that changes the database structure. The newest 3 copies are kept, **inside the same database**. |
| Database history | **Possibly** | Neon (the database company) offers "point-in-time restore" for a limited window. How far back depends on the Neon plan. **NEEDS VERIFICATION** in the Neon dashboard. |
| Photo and sighting files | **No** | They live only in private Vercel Blob storage. The 44 original Fall 2026 photos also exist on Ahmed's computer. Photos uploaded later exist **only** online. |
| Itinerary files | **No** | Your original file stays on your own computer. |
| Sign-in sessions | No | Not needed. People simply sign in again. |

**Restore testing:** no restore has ever been tested.

### What this means for you
- **Deleting a photo or sighting is permanent.** There is no recycle bin.
- **Undo exists** for captions (every change) and photo order (last 30 moves). There is no undo for deletions.
- A big mistake in the database can probably be recovered with Neon's restore, if it is caught quickly enough. This needs Ahmed.

### What to do if something goes wrong
1. **Don't keep trying to fix it** on the site. More changes can make recovery harder.
2. **Write down** what happened, roughly when, and on which page.
3. **Contact Ahmed** with those details.
4. **If the whole site is down,** wait 10 minutes and try again, then tell Ahmed. A recent update may need to be rolled back in Vercel, which takes a minute.
5. **If someone can't sign in:** use **Members > Reset password**.
6. **If you can't sign in:** ask Ahmed.

### Recommended (not done yet)
- A scheduled **daily database backup** stored outside the main database.
- A periodic **copy of all photos** to a second place (for example, an external drive or a second cloud folder).
- **Test a restore once**, so everyone knows it works.

---

## 8. Vercel vs Cloudflare, in plain English

### What "hosting" means
A website has to live on a computer that is always on and connected to the internet. Companies rent out that service. That is **hosting**.

### How the Beasties website is hosted today

| Piece | Company | What it does |
|---|---|---|
| The website itself | **Vercel** | Shows the pages, and runs the small programs that check sign-ins, handle uploads and send photos. |
| The database | **Neon** (connected through Vercel) | Keeps members, albums, captions, comments and so on. |
| Photo and document files | **Vercel Blob** (private) | Keeps the actual photo and itinerary files. Nobody can open them directly; the website hands them only to signed-in members. |
| The code | **GitHub** (private) | Keeps every version of the code. |
| An **old copy** of the site | **Cloudflare Pages** (`beasties.pages.dev`) | Not used by the real site, but **still public**. See the warning at the top. |

All of Vercel, Neon and Blob are in the US East region (Washington, D.C. and Northern Virginia), close to Boston.

### Static and dynamic websites
- A **static** website is like a printed brochure. Everyone sees the same pages. Cloudflare Pages is great at this.
- A **dynamic** website is like a members' club with a front desk. It checks who you are, shows **your** view, lets you upload, edit, comment and delete, and remembers it all.

**The Beasties website is dynamic.** That is why it needs more than simple page hosting.

### What Vercel does here
- Serves the pages quickly.
- Runs the "front desk" programs (sign-in checks, photo uploads and resizing, captions, comments, members, itinerary).
- Connects to Neon and Blob.
- **Publishes updates automatically:** when Ahmed sends a change to GitHub, Vercel builds and publishes it in about a minute. On October 30, 2026 this took about 40 seconds.

### What Cloudflare Pages and Cloudflare Workers do
- **Cloudflare Pages:** hosts static websites very cheaply and quickly. Good for brochures, not enough on its own for a members' site.
- **Cloudflare Workers:** small programs that run on Cloudflare's network, so dynamic features are possible. However, they work differently from what the Beasties site uses today.

### Web addresses and DNS
- **DNS** is the internet's phone book. It turns a name like `beasties-grp.vercel.app` into the right computer.
- The site currently uses Vercel's free address. A custom name (for example `beasties.family`) can be bought and pointed at Vercel at any time, **without moving the site**. DNS could even be managed at Cloudflare while the site stays on Vercel.

### Could the website run on Cloudflare?
**Not as it is.** It would need real rework:
1. **Photo processing:** the site uses a tool called `sharp` to clean and resize photos, plus an iPhone (HEIC) converter. These don't run on Cloudflare Workers. They would need to be replaced, for example with Cloudflare Images (a paid add-on).
2. **The server program** is written for Node.js (Express). It would need to be rewritten or adapted for Workers.
3. **Photo storage** would move from Vercel Blob to Cloudflare R2. Every file would be copied, and the private-access code rewritten.
4. **Database connection:** Neon can stay, but the connection code would change (Cloudflare Hyperdrive or Neon's serverless driver).
5. **Uploads:** the new direct-to-storage upload path for large files would be rebuilt for R2.
6. **Build and update steps,** including the automatic database setup and backup during updates, would be rebuilt.
7. **Everything would need retesting:** sign-in, permissions, uploads, the viewer and the itinerary.

### Staying on Vercel

| Advantages | Disadvantages |
|---|---|
| Works today, fully tested, nothing to change | Vercel's limits (for example 4.5 MB per request) need workarounds, already built |
| Updates publish automatically from GitHub | The plan and costs **need checking** in the Vercel dashboard (free plans are meant for personal, non-commercial use, which fits) |
| Database, photos and site already connected | One more company to keep an account with |
| No migration risk, no rewrite cost | |

### Moving to Cloudflare

| Advantages | Disadvantages |
|---|---|
| Can be very cheap at scale | Weeks of rewriting and retesting for no new features |
| One company for DNS and hosting, if wanted | Photo processing must be replaced (likely a paid add-on) |
| | Every photo file must be copied over |
| | Risk of new bugs in sign-in, privacy or uploads |

### Recommendation
**Stay on Vercel.** There is no technical reason to move. The site is dynamic, built around tools that suit Vercel, and working well.

What Cloudflare **is** worth doing now:
- **Remove or lock the old public `beasties.pages.dev` copy**, because it exposes photos and the itinerary.
- Optionally use Cloudflare later just for a custom web address (DNS), with the site staying on Vercel.

---

## 9. How the website protects privacy

- **Everything is behind sign-in.** Without signing in, every photo, list, comment and document request is refused. Checked on the live site on October 30, 2026.
- **Page outlines are visible, data is not.** The empty page frames (layout and buttons) can load without signing in, but they contain no photos, names or comments. They send visitors to the sign-in page.
- **Photos are private files.** They are kept in private storage and handed only to signed-in members. **Location data is removed** from every uploaded photo.
- **Passwords** are stored only as scrambled one-way codes ("hashes"). Nobody, including Ahmed, can read them.
- **Sign-in cookies** are locked down: secure, not readable by page scripts, and not sent to other websites. Sessions last 14 days.
- **Guessing is limited:** 8 wrong tries per 15 minutes.
- **New members** must replace their temporary password before they see anything.
- **Search engines** are told not to list the site.
- **The Assistant** stores no questions or answers and is never given member information.
- **The itinerary** is a private file, opened only by signed-in members through a short-lived link.

**Known gaps:** the public Cloudflare copy (see the top of this manual); no daily backups; no backup of photos; and a single owner account with no self-service password reset.

---

# PART B: DEVELOPER TECHNICAL HANDOFF

## 10. Architecture overview

| Layer | Technology |
|---|---|
| Pages | Multi-page site built with **Vite 8**; plain JavaScript modules, no framework. Fonts: DM Serif Display, Figtree. Animation: GSAP (Home only, respects Reduce motion). |
| Server | **Node.js 22+**, **Express 5**. One Vercel serverless function (`api/index.js`) for `/api/*` and `/photos/*`. |
| Database | **Postgres**. Production: **Neon** via `DATABASE_URL` (`pg` pool, max 5). Local: **PGlite** in `data/pglite` (or `PGLITE_DIR`). |
| Files | **Vercel Blob, private access**. Production auth: OIDC with `BLOB_STORE_ID` (or `BLOB_READ_WRITE_TOKEN`). Local: `photos/` folder. |
| Images | `sharp` (rotate, resize to 1800 px long side, thumbnail, metadata stripped), `heic-convert` for HEIC, `exif-reader` for the day taken. |
| Uploads | `multer` (memory). The client shrinks photos to stay under Vercel's 4.5 MB request limit. Itinerary files on Blob go direct from browser to Blob (`@vercel/blob/client`, `handleUpload`). |
| AI (optional) | `@anthropic-ai/sdk`; Gemini via HTTP; FAQ mode built in (`server/assistant-faq.js`). |
| Hosting | **Vercel**, region iad1. Static output `dist/`; rewrites in `vercel.json`. Repo: private GitHub `muhammad259/Beasties`, branch `main` auto-deploys. |

### Request flow
1. The browser loads a static page from `dist/`.
2. The page calls `/api/me` (`web/src/chrome.js`). If nobody is signed in, it redirects to `signin.html`. If the person has a temporary password, it redirects to `set-password.html`.
3. API calls send `X-Beasties: 1`. Every non-GET request must have that header and the same origin (CSRF guard in `server/api.js`).
4. `/photos/<key>` is served by `server/app.js` after a session check. `incoming/` and `docs/` keys are never served there.
5. Itinerary files go through `/api/events/:id/document/file`. Locally the file is streamed. On Blob, the server redirects (303) to a **5-minute presigned GET URL** for that one file.

## 11. Important files

| Path | Purpose |
|---|---|
| `server/app.js` | Express app; security headers; private photo route |
| `server/api.js` | All JSON routes: albums, order, captions, day, uploads, delete, download, comments, sightings, members, assistant mount, documents mount |
| `server/auth.js` | Sign-in, sessions (HMAC of token with `SESSION_SECRET`), roles, failed-login limit, password rules |
| `server/db.js` | Postgres/PGlite driver, `migrate()`, `backupBeforeMigration()` |
| `server/seed.js` | Database setup: migrations, albums, Fall 2026 photo records, owner from `OWNER_EMAIL`/`OWNER_PASSWORD`; test accounts locally only |
| `server/build-setup.js` | Runs at the start of every Vercel build; calls `setup()`; prints counts and region only |
| `server/storage.js` | Private Blob or local files; `signedUrl()` for presigned reads |
| `server/images.js` | Upload validation and processing |
| `server/documents.js` | Event documents (itinerary) routes |
| `server/pdf-clean.js` | Blanks a PDF's JavaScript `/OpenAction` (print-on-open), byte length unchanged |
| `server/assistant.js`, `assistant-faq.js`, `assistant-knowledge.md` | Assistant |
| `server/migrations/001…005` | Schema |
| `web/*.html`, `web/src/*.js`, `web/src/styles/*.css` | Pages, scripts, styles |
| `web/src/data/home.js` | **Hard-coded** Home content, including `NEXT_GATHERING` |
| `scripts/add-member.js` | Command-line member add (needs `DATABASE_URL`) |
| `scripts/upload-photos-to-blob.js` | One-time upload of the approved photos |
| `DEPLOY-VERCEL.md`, `ASSISTANT-SETUP.md`, `BUILD-JOURNAL.md` | Existing docs and test history |

## 12. Database

### Tables
| Table | Purpose | Key relationships |
|---|---|---|
| `users` | Accounts: email (unique, case-insensitive), name, bcrypt hash, role (`owner`/`admin`/`member`), `must_change_password` | Referenced by most tables (`ON DELETE SET NULL`); `sessions` cascade |
| `sessions` | `token_hash` (HMAC), user, expiry (14 days) | → `users` (cascade) |
| `login_attempts` | Failed-sign-in and admin rate-limit counters | none |
| `events` | Albums/events: id slug, name, sort, dates, place, start date, `upcoming`, empty note, `days` (JSON), album caption | Referenced by `photos`, `photo_order_history`, `event_documents` |
| `photos` | Storage keys (`file`, `thumb`), size, day, caption, uploader, `comments_closed`, `sort_order` | → `events`, → `users` |
| `caption_history` | Every caption change (photo, album, sighting) for Undo; no limit | target by type + id |
| `comments` | Photo comments | → `photos` (cascade), → `users` |
| `sightings` | Sightings gallery: keys, place, caption, uploader | → `users` |
| `photo_order_history` | Order before each move; last 30 per album | → `events` |
| `assistant_usage` | Anonymous daily/monthly question counts | none |
| `assistant_limits` | Hashed per-person hourly/daily counters (expire) | none |
| `event_documents` | One document per event: `kind` (pdf/docx/link), title, description, file key/name/size or url, note | → `events` (cascade), → `users` |
| `schema_migrations` | Applied migration names | none |

### Migrations and the backup point
- `migrate()` runs on every Vercel build (`server/build-setup.js` → `seed.js setup()`).
- If any migration is pending **and** the database already has migrations, `backupBeforeMigration()` first copies every table except `sessions` and `login_attempts` into schema `backup_YYYYMMDD_HHMM`, keeping the newest 3.
- Restoring one table: `TRUNCATE x; INSERT INTO public.x SELECT * FROM backup_….x;` This has **never been tested**, and needs care with foreign keys and sequences.
- Migration `005_event_documents.sql` was deployed on 10-30-2026. The build log was **not** read (it is on Ahmed's Vercel account), so whether `005` applied and a backup point was made **needs verification** in the Vercel build log.

## 13. Storage
- Keys must match `^(incoming/)?[a-z0-9-]+/[A-Za-z0-9._-]+$`.
- Layout: `<event-id>/<time>-<rand>.jpg` with `-sm.jpg` thumbnails; `sightings/…`; `docs/<event-id>-<rand>.pdf|docx`; `incoming/` for in-progress uploads.
- Photos are served with `Cache-Control: private, max-age=3600`. Documents use `private, no-store`.
- Deleting a photo, sighting or document removes the Blob file. There is no soft delete.
- **Itinerary on Blob:**
  1. `POST /api/events/:id/document/upload-token` (admin) issues a client token restricted to `incoming/docs/<event>-<rand>.(pdf|docx)`, PDF or DOCX types only, 25 MB, 10-minute validity.
  2. `PUT /api/events/:id/document` with `incomingKey` reads the file back, checks its real type, cleans the PDF, stores it under `docs/`, and deletes the incoming copy.
  3. **This live path is untested.** `issueSignedToken` and `presignUrl` need Blob OIDC or a read-write token. Confirm on the first live upload.

## 14. Authentication and permissions
- bcrypt cost 12; password length 12–200; temporary passwords are 12 characters from an unambiguous alphabet.
- `requireUser`, `requireRole('admin'|'owner')`, and per-resource checks (uploader or admin) in `server/api.js`.
- `requireOwnPassword`: users with `must_change_password` can only call `/me`, `/logout`, `/login` and `/me/first-password`, and `/photos/*` returns 403 for them.
- Owner protection (`mayManage`): the owner can't be changed, admins can manage members only, and nobody can act on themselves.
- "View as member" is client-side only (`web/src/api.js asMember`). The server keeps the real role.
- Headers: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, HSTS, `X-Robots-Tag: noindex, nofollow` (`vercel.json` and `app.js`).

## 15. API routes (summary)
All routes are under `/api`. "User" means any signed-in member.

| Area | Routes | Access |
|---|---|---|
| Account | `POST /login`, `POST /logout`, `GET /me`, `PATCH /me`, `POST /me/password`, `POST /me/first-password`, `GET /config` | public / user |
| Albums | `GET /events`, `GET /events/:id`, `GET /events/:id/comments` | user |
| Order | `POST /events/:id/order`, `POST /events/:id/order/undo` | admin |
| Captions | `PATCH /photos/:id/caption`, `POST /photos/:id/caption/undo` | uploader or admin |
| Album caption | `PATCH /events/:id/caption`, `POST /events/:id/caption/undo` | admin |
| Day | `PATCH /photos/:id/day` | admin |
| Photos | `POST /events/:id/photos`, `DELETE /photos/:id`, `GET /photos/:id/download`, `GET /my/photos` | user / uploader or admin |
| Comments | `GET`/`POST /photos/:id/comments`, `DELETE /comments/:id`, `PATCH /photos/:id/comments-closed` | user / author or admin / admin |
| Sightings | `GET`/`POST /sightings`, `PATCH /sightings/:id`, `POST /sightings/:id/caption/undo`, `DELETE /sightings/:id` | user / sharer or admin |
| Members | `GET`/`POST /admin/members`, `POST …/:id/reset-password`, `PATCH …/:id/name`, `PATCH …/:id/role` (owner), `DELETE …/:id` | admin (role: owner) |
| Assistant | `POST /assistant` | user; 404 when off |
| Documents | `GET /events/:id/document`, `GET …/document/file`, `POST …/document/upload-token`, `PUT …/document`, `DELETE …/document` | user / admin |

Outside `/api`: `GET /photos/*` (user).

## 16. Configuration (names only, never values)
`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` (OIDC on Vercel), `SESSION_SECRET` (32+ characters), `OWNER_EMAIL`, `OWNER_PASSWORD` (first setup only, then remove), `OWNER_NAME`, `ASSISTANT_ENABLED`, `ASSISTANT_PROVIDER` (`faq`|`gemini`|`anthropic`), `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `ASSISTANT_MODEL`, `ASSISTANT_MONTHLY_MESSAGE_CAP`.
Local only: `PGLITE_DIR`, `STORAGE=local`, `HOST`, `PORT`.

Secrets live in Vercel project settings and git-ignored local `.env*` files. They are never in the repository.

## 17. Deployment
1. Commit on `main` and push to GitHub.
2. Vercel builds: `npm ci`, then `node server/build-setup.js` (migrations with a backup point first), then `npm run build`.
3. The site is live in about a minute.

- **Rollback:** Vercel dashboard > Deployments > the previous deployment > Promote / Instant Rollback. A rollback does **not** undo database migrations.
- **Local:** `npm run dev` (127.0.0.1:5180, local database and photos, test accounts); `npm run dev:home` (home-network only); `npm run build`; `npm start` (built files).
- **Note:** `package.json`'s description still says "Not for deployment". It is outdated and harmless.

## 18. Technical maintenance checklist
- [ ] **Remove or protect the Cloudflare Pages project `beasties.pages.dev`.** It serves photos and `itinerary.pdf` publicly.
- [ ] Confirm the Assistant settings (`ASSISTANT_ENABLED`, `ASSISTANT_PROVIDER`) and record them in the build journal.
- [ ] Read the 10-30-2026 Vercel build log: was `005` applied, and was a backup point made?
- [ ] First live itinerary upload on Fall 2026; open it as a member; tap the contents links on iPad.
- [ ] Publish the countdown spacing fix (`web/src/events-page.js`, `web/src/ui.js`, both uncommitted).
- [ ] Add a scheduled off-site database backup (for example a GitHub Action or Vercel Cron running `pg_dump` to separate storage), and a periodic Blob copy.
- [ ] Check the Neon plan's point-in-time restore window. Run one restore test on a Neon branch.
- [ ] Document a break-glass owner password reset (database update with a new bcrypt hash), since the site has none.
- [ ] Consider moving `NEXT_GATHERING` (Home) to the database so Home and Events can't disagree.
- [ ] Add a `BUILD-JOURNAL.md` entry for the itinerary feature.
- [ ] Keep the repository **private**. Never commit `.env*`, `photos/`, `data/` or test logins.
- [ ] Check the Vercel plan and usage (function time, Blob storage, bandwidth).

---

*End of document. This manual contains no passwords, keys, connection strings or member email addresses.*
