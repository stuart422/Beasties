# Beasties Assistant: setup

The Beasties Assistant is a small "Ask" helper on the website. It is **OFF** until you switch it on.
While it is off, nobody sees it and its web address answers "not found".

It only knows what is written in `server/assistant-knowledge.md` (the next gathering, the album
names, and how to use the site). It never sees photos, captions, comments, member names or emails.

---

## 1. Create the API key (on the owner's Anthropic account)

1. Go to **console.anthropic.com** and sign in (or sign up) with the owner's account.
2. **Billing:** open **Settings > Billing** and add a small amount of credit (for example $5).
   Prepaid credit is the simplest way to make sure it can never cost more than you put in.
3. **Spend limit:** open **Settings > Limits** and set a **monthly spend limit** (for example $5).
   If the menu names differ, look for "Limits" or "Spend limits".
4. **Key:** open **Settings > API Keys** and click **Create Key**. Name it `Beasties website`.
5. Copy the key. It is shown **only once**. Do not email it, paste it in chat or save it in the code.

**What it costs (estimate):** with Claude Haiku 5.5, one question costs about $0.0003
(a few hundredths of a cent). At the default cap of 1500 questions a month that is roughly
**$0.50 a month**. The monthly spend limit above is the hard stop.

---

## 2. Add the settings in Vercel

1. Open **vercel.com**, then the **beasties-grp** project.
2. Go to **Settings > Environment Variables**.
3. Add these, each for the **Production** environment:

| Name | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | the key from step 1 | Tick **Sensitive**. Never share it. |
| `ASSISTANT_ENABLED` | `true` | The on/off switch. Anything else means off. |
| `ASSISTANT_MODEL` | `claude-haiku-5-5` | Optional. This is already the default. |
| `ASSISTANT_MONTHLY_MESSAGE_CAP` | `1500` | Optional. Already the default. After this many questions in a month the assistant says it is resting until next month. |

4. Click **Save**.

---

## 3. Redeploy (settings only take effect after a redeploy)

1. In the beasties-grp project, open **Deployments**.
2. On the newest one, click the **three dots (...)** and choose **Redeploy**.
3. Wait for **Ready** (about one minute).

---

## 4. Test it (about 2 minutes)

1. Sign in to the website. A round **Ask** button appears at the bottom right of every page.
2. Tap **Ask**, then tap **When is the next gathering?**. The answer should say
   Winter Weekend 2027, January 29 to February 1, 2027, at The Beast.
3. Ask something it should not know, for example "What is for dinner on Saturday?".
   It should say it does not know and to ask Stuart.

Optional, for a deeper check on a computer with this project: put the key in the git-ignored
`.env` file as `ANTHROPIC_API_KEY=...` and run `node --env-file=.env scripts/assistant-check.mjs`.
It asks 8 test questions (including tricks that try to break its rules) and prints the answers.
Cost: well under one cent.

---

## 5. Switch it off again

- **Normal way:** in Vercel **Settings > Environment Variables**, change `ASSISTANT_ENABLED` to
  `false` (or delete it), then **Redeploy** (step 3). The button disappears for everyone.
- **Emergency stop (instant, no redeploy):** in **console.anthropic.com > Settings > API Keys**,
  disable or delete the `Beasties website` key. The assistant then answers that it could not
  answer just now. Switch it off in Vercel afterwards as well.

---

## Limits built in

- Only signed-in members can use it. Signed-out visitors get "not found" or "please sign in".
- Each person: 20 questions an hour and 100 a day.
- Questions up to 500 characters. Only the last 6 turns of a chat are sent with each question.
- Answers are short (about 400 tokens at most) and time out after 30 seconds.
- **Nothing is saved:** no questions or answers are stored or written to logs. The database
  keeps only anonymous counts (questions per day and per month, and hashed per-person limits).

## Voice

- **Microphone button:** uses the browser's own speech-to-text. The website never records or
  stores audio. Note: the browser may use its maker's speech service to do this
  (Apple for Safari, Google for Chrome). The button only shows where the browser supports it.
- **Read aloud:** uses the browser's own voice, a little slower than normal, with a **Stop** button.
  It only shows where the browser supports it.

| Device and browser | Microphone (speak a question) | Read answers aloud |
|---|---|---|
| iPad, Safari | Yes (Siri & Dictation must be on in Settings) | Yes |
| iPhone, Safari | Yes (Siri & Dictation must be on in Settings) | Yes |
| Android, Chrome | Yes | Yes |
| Computer, Chrome or Edge | Yes | Yes |
| Computer, Safari | Yes on recent macOS | Yes |
| Computer, Firefox | No (button hidden) | Yes |

The browser asks permission to use the microphone the first time. If it was refused, the
assistant explains how to allow it, or the member can simply type.

## Changing what it knows

Edit `server/assistant-knowledge.md` (plain words, only true facts), push, and it is live after
the next build. Do not add member names, emails, menus, rooms or schedules unless Stuart confirms
them and wants them shared.
