// FAQ mode for the Beasties Assistant: free, local, nothing leaves our server.
//
// Every answer is text from server/assistant-knowledge.md: each "## " section of that file is
// one answer. This file only adds the words people might use to ask for it (keywords and a
// few alternate phrasings), a small synonym list, and friendly small talk. A question is
// matched with simple local scoring; if nothing matches well, the answer is UNKNOWN.
import { readFileSync } from 'node:fs';

export const UNKNOWN = 'I do not know that one. Please ask Stuart.';
export const RULES = 'I can only help with the Beasties website and gatherings. For anything else, please ask Stuart.';

// Read once. new URL(..., import.meta.url) lets Vercel's bundler find and ship the file.
const KNOWLEDGE = readFileSync(new URL('./assistant-knowledge.md', import.meta.url), 'utf8');

/* ---------- 1. The answers: one per section of the knowledge file ---------- */

function sections(md) {
  const out = {};
  let title = null;
  for (const line of md.split(/\r?\n/)) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) { title = h[1].trim(); out[title] = []; continue; }
    if (title && line.trim()) out[title].push(line.trim());
  }
  return out;
}
const SECTION = sections(KNOWLEDGE);
// A short lead line from the section title ("How to add photos:"), then the section itself.
// Bullets become plain lines; numbered steps stay as they are.
const leadOf = (title) => `${title.replace(/^How to: /, 'How to ').replace(/\s*\(.*\)$/, '')}:`;
const answerOf = (title) => [leadOf(title), ...(SECTION[title] || []).map((l) => l.replace(/^-\s+/, ''))].join('\n');

/* ---------- 2. How people might ask for each answer ---------- */
// key: words that point clearly at this answer; ask: whole questions people might type.
const TOPICS = [
  { id: 'about', section: 'About the site',
    key: ['beasties', 'about', 'meetup', 'began', 'start', 'started', 'history', 'first', 'foliage'],
    ask: ['what is this website', 'what is the beasties', 'who are the beasties', 'how did the beasties start', 'tell me about the site', 'when was the first foliage weekend', 'what is this site for'] },
  { id: 'next', section: 'Next gathering',
    key: ['next', 'gathering', 'winter', '2027', 'upcoming', 'when', 'date', 'january', 'february'],
    ask: ['when is the next gathering', 'what is the next gathering', 'when is winter weekend 2027', 'where is the next gathering', 'when do we meet next', 'what are the dates of the next weekend', 'when is the next weekend'] },
  { id: 'albums', section: 'The albums (9, newest first)',
    key: ['albums', 'album', 'list', 'names', 'how many'],
    ask: ['what albums are there', 'list the albums', 'how many albums are there', 'which albums have photos', 'what are the album names'] },
  { id: 'signin', section: 'How to: sign in',
    key: ['signin', 'temporary', 'forgot', 'first time', 'cannot get in', 'locked'],
    ask: ['how do i sign in', 'how do i log in', 'i forgot my password', 'what is my password', 'how do i get in', 'i cannot sign in', 'first time signing in'] },
  { id: 'password', section: 'How to: change your password',
    key: ['password', 'change', 'new password', 'reset'],
    ask: ['how do i change my password', 'change password', 'how can i make a new password', 'update my password'] },
  { id: 'browse', section: 'How to: browse the albums',
    key: ['browse', 'open', 'find', 'look', 'view'],
    ask: ['how do i browse the albums', 'how do i open an album', 'where are the photos', 'how do i find the photos', 'how do i look at the albums', 'where do i see the pictures'] },
  { id: 'fullscreen', section: 'How to: see just the photos (full screen)',
    key: ['fullscreen', 'just', 'only', 'whole screen', 'next photo', 'swipe', 'arrow', 'slideshow', 'close'],
    ask: ['how do i see just the photos', 'how do i make the photo full screen', 'how do i see the photo bigger', 'how do i go to the next photo', 'slideshow', 'only the pictures', 'how do i fill the screen with the photo', 'how do i swipe through the photos'] },
  { id: 'big', section: 'How to: see big photos with their captions and comments',
    key: ['bigphoto', 'grid', 'large', 'scroll', 'underneath', 'with captions'],
    ask: ['how do i see big photos', 'how do i see the photos with their captions', 'how do i see the comments with each photo', 'big photos view', 'large photos', 'how do i switch to big photos'] },
  { id: 'day', section: 'How to: show photos from one day',
    key: ['day', 'friday', 'saturday', 'sunday', 'monday', 'filter', 'one day'],
    ask: ['how do i show photos from one day', 'how do i see only saturday photos', 'filter by day', 'how do i see the friday pictures', 'photos from sunday'] },
  { id: 'add', section: 'How to: add photos',
    key: ['add', 'upload', 'new photo', 'heic', 'jpg'],
    ask: ['how do i add a photo', 'how do i add photos', 'how do i upload pictures', 'can i put my photos on the site', 'how do i add pictures from my phone', 'upload a photo'] },
  { id: 'caption', section: 'How to: write or edit a caption',
    key: ['caption', 'edit', 'write', 'undo', 'characters', 'who can edit'],
    ask: ['how do i write a caption', 'how do i edit a caption', 'how do i add a caption', 'how do i change a caption', 'undo a caption', 'who can edit captions', 'how long can a caption be'] },
  { id: 'comment', section: 'How to: comment on a photo',
    key: ['comment', 'post', 'delete comment'],
    ask: ['how do i comment on a photo', 'how do i leave a comment', 'how do i add a comment', 'how do i delete my comment', 'can i reply to a photo'] },
  { id: 'download', section: 'How to: download a photo',
    key: ['download', 'save', 'keep', 'copy'],
    ask: ['how do i download a photo', 'how do i save a picture', 'can i save a photo to my phone', 'download a picture'] },
  { id: 'sightings', section: 'Random Beastie Sightings',
    key: ['sighting', 'sightings', 'random', 'chance', 'meetup between'],
    ask: ['what are random beastie sightings', 'how do i share a sighting', 'what is a sighting', 'where are the sightings', 'random beastie sightings'] },
  { id: 'myphotos', section: 'My photos and My profile',
    key: ['my photos', 'my profile', 'profile', 'name', 'my name'],
    ask: ['where are my photos', 'how do i see the photos i added', 'how do i change my name', 'what is my profile', 'my photos'] },
  { id: 'signout', section: 'Sign out',
    key: ['signout'],
    ask: ['how do i sign out', 'how do i log out', 'sign out', 'log out'] },
  { id: 'members', section: 'The Members page (Stuart and admins only)',
    key: ['member', 'members', 'admin', 'admins', 'add member', 'remove', 'invite', 'arrange', 'order'],
    ask: ['what is the members page', 'how do i add a new member', 'what is the admin page for', 'how do i invite someone', 'who can make an admin', 'how do i arrange the photos', 'how do i change the order of photos'] },
  { id: 'easier', section: 'Easier viewing',
    key: ['motion', 'reduce', 'moving', 'animation', 'dizzy', 'text size', 'easier', 'bigger text'],
    ask: ['how do i turn off moving effects', 'reduce motion', 'the page moves too much', 'can i make it easier to see', 'how do i stop the animations'] },
];

/* ---------- 3. Small talk and the "what can I ask?" list ---------- */
export const HELP_LIST = [
  'You can ask me about:',
  '1. The next gathering (Winter Weekend 2027)',
  '2. The albums',
  '3. Signing in and changing your password',
  '4. Seeing just the photos, full screen',
  '5. Big photos with their captions and comments',
  '6. Showing photos from one day',
  '7. Adding photos, captions and comments',
  '8. Downloading a photo',
  '9. Random Beastie Sightings',
  '10. Signing out',
  'For anything else, please ask Stuart.',
].join('\n');

const SMALL_TALK = [
  { re: /^(hi|hello|hey|hiya|howdy|good (morning|afternoon|evening)|greetings)\b[\s!.,]*(there|everyone|beasties?)?[\s!.,]*$/, reply: 'Hello! I can help with the Beasties website and the next gathering. Ask me a question, or ask "What can I ask?".' },
  { re: /^(thanks?|thank you|thank you so much|many thanks|thx|ty|cheers|great|perfect|ok thanks?|okay thanks?|that helps?|got it)\b[\s!.,]*(a lot|very much|so much)?[\s!.,]*$/, reply: "You're welcome! Ask me anything else about the website." },
  { re: /^(bye|goodbye|see you|see ya|good night)\b/, reply: 'Goodbye! See you at the next gathering.' },
  { re: /^(who are you|what are you|are you a robot|are you real|are you human)\b/, reply: 'I am the Beasties Assistant, a simple helper for this website. I answer from a short list of facts about the site and the next gathering. For anything else, please ask Stuart.' },
  { re: /\b(what can i ask|what can you do|what do you know|how can you help|help me|^help$|^help\b|what questions|menu of questions|list of questions)\b/, reply: HELP_LIST },
];

/* ---------- 4. Guards: rule-breaking and topics the site does not cover ---------- */
const RULE_BREAKING = /\b(ignore|disregard|forget) (all |any |the |your |previous |prior |earlier |above )*(instructions|rules|prompt|directions)\b|\bsystem prompt\b|\byour (instructions|rules|prompt)\b|\b(you are|you're) now\b|\bact as\b|\bpretend\b|\bjailbreak\b|\bdeveloper mode\b|\bnew rule\b|\breveal\b|\broleplay\b|\brepeat (everything|the text|your)\b|\bprint (your|the) (instructions|prompt|rules)\b/;
// Asking for more rights is a rule-breaking try too.
const POWER_GRAB = /\b(give|grant|make|let) me (an? )?(admin|owner|administrator|access|permission|rights|control)\b|\bmake me (the )?(admin|owner)\b/;
// A question that starts with "who" and is not about who may do something on the site.
const WHO_QUESTION = /^who\b(?!.*\b(can|could|may|allowed|able|is able)\b)/;
const NOT_ON_SITE = /\b(wifi|wi fi|internet|wireless|door code|lock|key code|keys)\b|\b(dinner|lunch|supper|menu|meal|meals|food|eat|eating|drinks?|wine|beer|room|rooms|bedroom|bed|beds|sleep|sleeping|bring|pack|packing|price|prices|cost|costs|pay|paying|payment|money|dollars?|fee|fees|invest|investing|stocks?|shares|bitcoin|crypto|tax|taxes|weather|forecast|directions|drive|driving|address|parking|phone number|doctor|medicine|medication|pills?|aspirin|ibuprofen|pain|hurts?|sick|ill|covid|lawyer|legal|lawsuit|politics|election|president|recipe|joke|poem|story|song|lyrics|homework|capital of|translate)\b|\bwho (was|were|is|are|will be|came|went|attended|is coming|are coming)\b(?!.*\b(edit|add|delete|remove|see|make|change|can)\b)|\b(guest list|attendees|everyone who|list everyone|who's coming|who is coming)\b|\bhow many (people|members|beasties|friends|of us)\b|\b(email|phone) (address|number) (of|for)\b/;

/* ---------- 5. Text matching ---------- */
const PHRASES = [ // whole phrases first, so "log in" becomes one word
  [/\blog(ging)? ?in\b|\bsign(ing)? ?in\b|\bsignin\b|\blogin\b/g, 'signin'],
  [/\blog(ging)? ?out\b|\bsign(ing)? ?out\b|\blogout\b|\bsignout\b/g, 'signout'],
  [/\bfull[ -]?screen\b|\bwhole screen\b|\bentire screen\b|\bfill(s)? the screen\b|\bslide ?show\b/g, 'fullscreen'],
  [/\bbig(ger)? (photos?|pictures?|pics?|images?)\b|\blarge (photos?|pictures?)\b/g, 'bigphoto'],
  [/\bpass ?word\b|\bpasscode\b|\bpw\b|\bpin\b/g, 'password'],
  [/\bget[- ]together\b|\bmeet[- ]?up\b|\breunion\b|\bparty\b|\bget ?away\b|\bretreat\b/g, 'gathering'],
  [/\bbeastie sightings?\b/g, 'sighting'],
  [/\bcoming up\b|\bupcoming\b|\bsoon\b/g, 'next'],
  [/\bone (at a|by) time\b|\bone by one\b|\bflip through\b/g, 'fullscreen'],
  [/\bget (in|into)\b|\baccess\b|\blet me in\b/g, 'signin'],
  [/\b(quit|exit|leave) (the )?(website|site|beasties)\b/g, 'signout'],
  [/\bsay something\b|\bwrite something about\b/g, 'comment'],
  [/\bwrite something under\b|\bwords under\b|\btext under\b|\b(what it )?says under\b/g, 'write caption'],
];
const SYNONYMS = {
  pic: 'photo', pics: 'photo', picture: 'photo', pictures: 'photo', image: 'photo', images: 'photo', photograph: 'photo', photographs: 'photo', photos: 'photo', snapshot: 'photo', foto: 'photo', fotos: 'photo',
  upload: 'add', uploading: 'add', put: 'add', post: 'add', adding: 'add',
  description: 'caption', label: 'caption', captions: 'caption', captioning: 'caption', title: 'caption',
  comments: 'comment', reply: 'comment', replies: 'comment', commenting: 'comment', remark: 'comment',
  erase: 'delete', remove: 'delete', removing: 'delete', deleting: 'delete',
  albums: 'album', gallery: 'album', galleries: 'album', folder: 'album',
  weekend: 'gathering', event: 'gathering', events: 'gathering', trip: 'gathering', gatherings: 'gathering',
  modify: 'edit', fix: 'edit', change: 'edit', update: 'edit', editing: 'edit', changing: 'edit',
  sightings: 'sighting', spotted: 'sighting', spot: 'sighting',
  members: 'member', admins: 'admin', administrator: 'admin',
  save: 'download', downloading: 'download', keep: 'download',
  forgotten: 'forgot', forget: 'forgot', lost: 'forgot',
  filter: 'day', days: 'day',
  enlarge: 'bigphoto', zoom: 'fullscreen', bigger: 'bigphoto',
};
const STOP = new Set('a an the i me my mine we our us you your yours they them their each to of in on at for by with from and or but is are am was were be been being do does did can could would should will shall may might must it its this that these those there here what how please just also some any so then than too very really thing things get got have has had want wanted like know tell show let lets need help'.split(' '));
const KEEP_EVEN_IF_STOP = new Set(['just', 'help']); // meaningful in "just the photos"

function normalize(text) {
  let t = ` ${String(text).toLowerCase()} `
    .replace(/[’‘`]/g, "'")
    .replace(/\bcan'?t\b/g, 'cannot').replace(/\bdon'?t\b/g, 'do not').replace(/\bwont\b/g, 'will not').replace(/\bim\b/g, 'i am').replace(/\bwon't\b/g, 'will not').replace(/n't\b/g, ' not')
    .replace(/'s\b/g, '').replace(/'re\b/g, ' are').replace(/'m\b/g, ' am').replace(/'ll\b/g, ' will').replace(/'ve\b/g, ' have')
    .replace(/[^a-z0-9\s]/g, ' ');
  for (const [re, word] of PHRASES) t = t.replace(re, ` ${word} `);
  return t.replace(/\s+/g, ' ').trim();
}
const stem = (w) => (w.length > 5 && w.endsWith('ing') ? w.slice(0, -3) : w.length > 4 && w.endsWith('ed') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
// fix: an optional typo fixer, used on the member's words before synonyms are applied.
function tokens(text, fix = (w) => w) {
  return normalize(text).split(' ').filter(Boolean)
    .filter((w) => !STOP.has(w) || KEEP_EVEN_IF_STOP.has(w))
    .map(fix)
    .map((w) => SYNONYMS[w] || w)
    .map((w) => SYNONYMS[stem(w)] || stem(w));
}

// Small typo help: "pasword" -> "password", "captoin" -> "caption".
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // swapped letters
    }
  }
  return d[a.length][b.length];
}

// How many answers each word appears in: a word in 5 or more (like "photo") is too common to
// count as a strong signal for any one answer.
const DF = new Map();
for (const t of TOPICS) {
  for (const w of new Set([...t.key, ...t.ask, t.section].flatMap((x) => tokens(x)))) DF.set(w, (DF.get(w) || 0) + 1);
}
const COMMON = 5;
const ENTRIES = TOPICS.map((t) => {
  const key = new Set(t.key.flatMap((k) => tokens(k)).filter((w) => (DF.get(w) || 0) < COMMON));
  const asks = t.ask.map((a) => ({ text: normalize(a), toks: new Set(tokens(a)) }));
  const all = new Set([...key, ...asks.flatMap((a) => [...a.toks]), ...tokens(t.section)]);
  return { ...t, answer: answerOf(t.section), keySet: key, asks, all };
});
// Words a typo can be corrected to: everything the answers know, plus the everyday synonyms.
const VOCAB = new Set([...ENTRIES.flatMap((e) => [...e.all]), ...Object.keys(SYNONYMS)]);
const fixTypo = (w) => {
  if (VOCAB.has(w) || w.length < 4 || /\d/.test(w)) return w;
  const maxD = w.length >= 7 ? 2 : 1;
  let best = w;
  let bestD = maxD + 1;
  for (const v of VOCAB) {
    const d = distance(w, v);
    if (d <= maxD && d < bestD) { best = v; bestD = d; }
  }
  return best;
};

function score(entry, qToks, qText) {
  if (!qToks.length) return 0;
  let phrase = 0;
  for (const a of entry.asks) {
    if (a.text === qText) return 1; // exact (chips use these)
    const inter = [...a.toks].filter((w) => qToks.includes(w)).length;
    const union = new Set([...a.toks, ...qToks]).size;
    phrase = Math.max(phrase, union ? inter / union : 0);
  }
  const covered = qToks.filter((w) => entry.all.has(w)).length / qToks.length;
  const keyHits = qToks.filter((w) => entry.keySet.has(w)).length;
  return 0.5 * phrase + 0.25 * covered + 0.25 * Math.min(1, keyHits / 1.5);
}

export const MATCH_THRESHOLD = 0.34;

// The whole FAQ answer: { answer, id, score } — id is null for UNKNOWN, small talk and refusals.
export function faqAnswer(question) {
  const raw = String(question || '').trim();
  const text = normalize(raw);
  if (!text) return { answer: UNKNOWN, id: null, score: 0 };
  if (RULE_BREAKING.test(text) || POWER_GRAB.test(text)) return { answer: RULES, id: 'rules', score: 1 };
  for (const s of SMALL_TALK) if (s.re.test(text)) return { answer: s.reply, id: 'smalltalk', score: 1 };
  if (NOT_ON_SITE.test(text) || WHO_QUESTION.test(text)) return { answer: UNKNOWN, id: null, score: 0 };

  const qToks = tokens(raw, fixTypo);
  const qText = text;
  let best = null;
  let bestScore = 0;
  let second = 0;
  for (const e of ENTRIES) {
    const s = score(e, qToks, qText);
    if (s > bestScore) { second = bestScore; bestScore = s; best = e; } else if (s > second) second = s;
  }
  // Weak, or nothing about this site in the question: do not guess.
  const anyKey = best && qToks.some((w) => best.keySet.has(w) || best.asks.some((a) => a.toks.has(w)));
  if (!best || bestScore < MATCH_THRESHOLD || !anyKey) return { answer: UNKNOWN, id: null, score: bestScore };
  return { answer: best.answer, id: best.id, score: bestScore };
}

// The questions shown as chips in the panel (each one is an exact phrasing above).
export const CHIPS = {
  main: ['When is the next gathering?', 'How do I add a photo?', 'How do I write a caption?', 'How do I see just the photos?'],
  more: [
    'What can I ask?', 'How do I sign in?', 'How do I change my password?', 'How do I browse the albums?',
    'How do I see big photos?', 'How do I show photos from one day?', 'How do I comment on a photo?',
    'How do I download a photo?', 'What are Random Beastie Sightings?', 'Where are my photos?',
    'How do I sign out?', 'What albums are there?', 'How do I turn off moving effects?',
  ],
};
