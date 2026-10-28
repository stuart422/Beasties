# Beasties Assistant: setup

The Beasties Assistant is a small "Ask" helper on the website. It is **OFF** until you switch it on.
While it is off, nobody sees it and its web address answers "not found".

It only knows what is written in `server/assistant-knowledge.md` (the next gathering, the album
names, and how to use the site). It never sees photos, captions, comments, member names or emails.

There are three ways it can answer. You pick one with the setting `ASSISTANT_PROVIDER`.

| `ASSISTANT_PROVIDER` | Cost | Key needed | Where questions go |
|---|---|---|---|
| `faq` (the default) | Free | None | **Nowhere.** The website answers by itself from the knowledge file. |
| `gemini` | Free tier | Google AI Studio key | Google's Gemini service. If it fails or the free limit is used up, the website answers in FAQ mode instead. |
| `anthropic` | Paid (about $0.50 a month) | Anthropic key | Anthropic's Claude service. |

All Vercel settings below are in **vercel.com > beasties-grp > Settings > Environment Variables**,
for the **Production** environment. **Settings only take effect after a redeploy** (see "Redeploy").

---

## 1. Turn on FAQ mode (free, 2 steps)

1. Add `ASSISTANT_ENABLED` with the value `true`. (Nothing else is needed: FAQ is the default.)
2. Redeploy.

**How FAQ mode works:** it matches the question to the closest entry in the knowledge file,
allowing for typos and other wording. If nothing matches well, it says "I do not know that one.
Please ask Stuart." It never makes anything up. Members can tap **More questions** to see
everything it can answer, or ask "What can I ask?".

**Privacy:** nothing leaves the website. No outside service is used.

---

## 2. Optional: use Gemini (Google, free tier)

1. Go to **aistudio.google.com** and sign in with the owner's Google account.
2. Click **Get API key**, then **Create API key**. Name it `Beasties website` if asked.
3. Copy the key. Do not email it, paste it in chat or save it in the code.
4. Leave billing **off** on that Google project. Without billing it stays on the free tier and
   cannot cost anything. AI Studio shows the free limits for your account.
5. In Vercel add:

| Name | Value | Notes |
|---|---|---|
| `GEMINI_API_KEY` | the key from step 3 | Tick **Sensitive**. Never share it. |
| `ASSISTANT_PROVIDER` | `gemini` | |
| `ASSISTANT_ENABLED` | `true` | |
| `ASSISTANT_MODEL` | `gemini-3.5-flash-lite` | Optional. This is already the default for Gemini. |

6. Redeploy.

**Privacy:** the question, the last few turns of the chat and the knowledge file are sent to
Google. Google says it **may use free-tier requests to improve its products**, and people at
Google may read them. That is why the panel shows "Do not type personal details." in this mode.
Photos, captions, comments, names and emails are never sent.

If Gemini fails, times out, or the free limit for the day is used up, members still get an
answer from FAQ mode. They do not see an error.

---

## 3. Optional: use Anthropic (Claude, paid)

1. Go to **console.anthropic.com** and sign in (or sign up) with the owner's account.
2. **Billing:** open **Settings > Billing** and add a small amount of prepaid credit (for example $5).
3. **Spend limit:** open **Settings > Limits** and set a **monthly spend limit** (for example $5).
4. **Key:** open **Settings > API Keys** and click **Create Key**. Name it `Beasties website`.
   Copy it. It is shown **only once**.
5. In Vercel add:

| Name | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | the key from step 4 | Tick **Sensitive**. Never share it. |
| `ASSISTANT_PROVIDER` | `anthropic` | |
| `ASSISTANT_ENABLED` | `true` | |
| `ASSISTANT_MODEL` | `claude-haiku-5-5` | Optional. This is already the default for Anthropic. |

6. Redeploy.

**What it costs (estimate):** one question costs about $0.0003. At the default cap of 1500
questions a month that is roughly **$0.50 a month**. The spend limit above is the hard stop.

**Privacy:** the question, the last few turns of the chat and the knowledge file are sent to
Anthropic. Anthropic does not use API requests to train its models by default.

Optional deeper check on a computer with this project: put the key in the git-ignored `.env`
file as `ANTHROPIC_API_KEY=...` and run `node --env-file=.env scripts/assistant-check.mjs`.

---

## Switch between modes

Change `ASSISTANT_PROVIDER` to `faq`, `gemini` or `anthropic`, then redeploy.
If you delete `ASSISTANT_PROVIDER`, it goes back to `faq`.
Change `ASSISTANT_MODEL` too (or delete it) when you switch between Gemini and Anthropic.

---

## Redeploy (settings only take effect after a redeploy)

1. In the beasties-grp project, open **Deployments**.
2. On the newest one, click the **three dots (...)** and choose **Redeploy**.
3. Wait for **Ready** (about one minute).

---

## Test it (about 2 minutes)

1. Sign in to the website. A round **Ask** button appears at the bottom right of every page.
2. Tap **Ask**, then tap **When is the next gathering?**. The answer should say
   Winter Weekend 2027, January 29 to February 1, 2027, at The Beast.
3. Ask something it should not know, for example "What is for dinner on Saturday?".
   It should say it does not know and to ask Stuart.

To check FAQ mode on a computer with this project (free, nothing leaves the computer):
`node scripts/assistant-faq-check.mjs`. It asks over 100 test questions, including typos,
off-topic questions and tricks that try to break its rules, and prints how many passed.

---

## Switch it off again

- **Normal way:** change `ASSISTANT_ENABLED` to `false` (or delete it), then **Redeploy**.
  The button disappears for everyone.
- **Emergency stop for Gemini or Anthropic (instant, no redeploy):** delete or disable the
  `Beasties website` key in AI Studio or the Anthropic console. With Gemini, members then get
  FAQ answers. With Anthropic, they get "could not answer just now". Switch it off in Vercel
  afterwards as well.

---

## Limits built in (all modes)

- Only signed-in members can use it. Signed-out visitors get "not found" or "please sign in".
- Each person: 20 questions an hour and 100 a day.
- Questions up to 500 characters. Only the last 6 turns of a chat are sent with each question.
- Site-wide: `ASSISTANT_MONTHLY_MESSAGE_CAP` questions a month (default 1500). After that it says
  it is resting until next month.
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
the next build. Each `## ` heading is one FAQ answer. If you add a new heading, also add its
keywords in `server/assistant-faq.js` (the `TOPICS` list) and run
`node scripts/assistant-faq-check.mjs`. Do not add member names, emails, menus, rooms or
schedules unless Stuart confirms them and wants them shared.
