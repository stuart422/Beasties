import { albumHref, NEXT_GATHERING, ARCHIVE_IDS, NEW_IDS, STACK_IDS, byId } from './data/home.js';

// Home page behaviour: hero prints, the photo reel, the invitation, the archive,
// What's new and the latest sightings.

function printImg(p, alt, { lazy = true } = {}) {
  const img = new Image(p.w, p.h);
  img.src = p.s;
  img.alt = alt;
  if (lazy) img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

const large = (p) => p.s.replace('-sm.jpg', '.jpg');

/* ---------- A. Hero: two prints behind the hero photo ---------- */

export function renderHeroStack(photos) {
  [['heroBack', STACK_IDS[0]], ['heroMid', STACK_IDS[1]]].forEach(([el, id]) => {
    const p = byId(photos, id);
    if (p) document.getElementById(el).src = p.s;
  });
}

export function daysToGathering() {
  const [y, m, d] = NEXT_GATHERING.start.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

export function renderFacts(events) {
  document.getElementById('factAlbums').textContent = events.length;
  const days = daysToGathering();
  document.getElementById('factDays').textContent = days > 0 ? days : 'Now';
}

/* ---------- B. The reel: one photo at a time, moved only by the viewer ---------- */

export function initReel(photos, { animate }) {
  const stage = document.getElementById('spreadStage');
  const frame = stage.querySelector('.reel__frame');
  let [front, back] = [document.getElementById('reelA'), document.getElementById('reelB')];
  const cap = document.getElementById('spreadCap');
  const count = document.getElementById('spreadCount');
  const now = document.getElementById('reelNow');
  const progress = document.getElementById('reelProgress');
  const strip = document.getElementById('spreadStrip');
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('reelAll').textContent = pad(photos.length);
  let i = 0;
  let busy = false;

  const thumbs = photos.map((p, n) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Photo ${n + 1}: ${p.cap}`);
    const t = printImg(p, '');
    b.append(t);
    b.addEventListener('click', () => show(n));
    li.append(b);
    strip.append(li);
    return b;
  });

  // Fetch the neighbours' large copies ahead of time, so the next photo appears at once.
  const warm = new Set();
  const preload = (n) => {
    const p = photos[(n + photos.length) % photos.length];
    if (warm.has(p)) return;
    warm.add(p);
    const img = new Image();
    img.decoding = 'async';
    img.src = large(p);
  };

  function text() {
    const p = photos[i];
    cap.textContent = p.cap;
    count.textContent = `Photo ${i + 1} of ${photos.length}`;
    now.textContent = pad(i + 1);
    progress.style.setProperty('--p', (i + 1) / photos.length);
    thumbs.forEach((b, n) => b.setAttribute('aria-current', String(n === i)));
  }

  function load(img, p) {
    img.src = large(p);
    img.width = p.w;
    img.height = p.h;
    img.alt = p.cap;
    return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
  }

  async function show(n, dir = n > i ? 1 : -1) {
    if (busy) return;
    const next = (n + photos.length) % photos.length;
    if (next === i) return;
    busy = true;
    i = next;
    text();
    thumbs[i].parentElement.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    await load(back, photos[i]);
    const p = photos[i];
    animate({ frame, from: front, to: back, dir, swap: () => frame.style.setProperty('--ar', `${p.w} / ${p.h}`) });
    back.removeAttribute('aria-hidden');
    front.setAttribute('aria-hidden', 'true');
    [front, back] = [back, front];
    busy = false;
    preload(i + 1);
    preload(i - 1);
  }

  document.getElementById('spreadPrev').addEventListener('click', () => show(i - 1, -1));
  document.getElementById('spreadNext').addEventListener('click', () => show(i + 1, 1));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1, -1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1, 1); }
  });

  // Swipe or drag sideways to move between photos.
  let startX = null;
  let startY = 0;
  stage.addEventListener('pointerdown', (e) => { startX = e.clientX; startY = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { startX = null; });
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  const p = photos[0];
  frame.style.setProperty('--ar', `${p.w} / ${p.h}`);
  load(front, p);
  text();
  // only warm the next photos once the reel is near the screen
  new IntersectionObserver((entries, io) => {
    if (entries.some((en) => en.isIntersecting)) { preload(1); preload(-1); io.disconnect(); }
  }, { rootMargin: '600px 0px' }).observe(stage);
}

/* ---------- C. Next gathering ---------- */

export function renderGathering() {
  document.getElementById('nextDates').textContent = NEXT_GATHERING.dates;
  document.getElementById('nextDays').textContent = NEXT_GATHERING.days;
  const days = daysToGathering();
  if (days < 1) return;
  const el = document.getElementById('countdown');
  el.innerHTML = `<b>${days}</b>${days === 1 ? 'day to go' : 'days to go'}`;
  el.hidden = false;
}

/* ---------- D. Album archive ---------- */

export function renderArchive(photos, events) {
  const sheet = document.getElementById('archiveSheet');
  for (const id of ARCHIVE_IDS) {
    const p = byId(photos, id);
    if (!p) continue;
    const li = document.createElement('li');
    li.append(printImg(p, ''));
    sheet.append(li);
  }

  const next = events.find((e) => e.upcoming);
  const link = document.getElementById('upcomingLink');
  if (next) {
    link.href = albumHref(next.id);
    document.getElementById('upcomingName').textContent = next.name;
    document.getElementById('upcomingNote').textContent = next.photoCount
      ? `${next.dates}. ${next.photoCount} photos.` : `${next.dates}. ${next.emptyNote}`;
  } else {
    link.hidden = true;
  }

  const list = document.getElementById('albumIndex');
  events.filter((e) => e !== next && e.id !== 'fall-2026').forEach((ev, n) => {
    const li = document.createElement('li');
    li.innerHTML = `<a class="shelf__card" href="${albumHref(ev.id)}">
        <span class="shelf__no"></span>
        <span class="shelf__name"></span>
        <span class="shelf__foot"><span class="shelf__status"></span><span class="shelf__arrow" aria-hidden="true"></span></span>
      </a>`;
    li.querySelector('.shelf__no').textContent = String(n + 1).padStart(2, '0');
    li.querySelector('.shelf__name').textContent = ev.name;
    li.querySelector('.shelf__status').textContent = ev.photoCount ? `${ev.photoCount} photos` : 'Photos coming soon';
    list.append(li);
  });
}

/* ---------- E. What's new ---------- */

export function renderNew(photos) {
  const list = document.getElementById('newGrid');
  for (const id of NEW_IDS) {
    const p = byId(photos, id);
    if (!p) continue;
    const li = document.createElement('li');
    li.append(printImg(p, ''));
    list.append(li);
  }
}

/* ---------- F. Random Beastie Sightings: the latest few ---------- */

export function renderSightings(sightings, total) {
  if (!sightings.length) return;
  document.getElementById('sightEmpty').hidden = true;
  const grid = document.getElementById('sightGrid');
  for (const s of sightings) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = 'sightings.html';
    const img = new Image(s.w, s.h);
    img.src = s.thumb;
    img.alt = s.caption || (s.place ? `A sighting at ${s.place}` : 'A Beastie sighting');
    img.loading = 'lazy';
    img.decoding = 'async';
    const place = document.createElement('p');
    place.textContent = s.place || 'Place not given';
    a.append(img, place);
    li.append(a);
    grid.append(li);
  }
  grid.hidden = false;
  const all = document.getElementById('sightAll');
  all.firstElementChild.textContent = total === 1 ? 'See the sighting' : `See all ${total} sightings`;
  all.hidden = false;
}
