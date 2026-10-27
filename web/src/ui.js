import { albumHref, NEXT_GATHERING, ARCHIVE_IDS, NEW_IDS, byId } from './data/home.js';

// Home page behaviour: photo spread, archive, What's new and the next gathering.

function framedImg(p, alt, { lazy = true, small = true } = {}) {
  const frame = document.createElement('span');
  frame.className = 'frame tilt';
  const img = new Image(p.w, p.h);
  img.src = small ? p.s : p.f;
  img.alt = alt;
  if (lazy) img.loading = 'lazy';
  img.decoding = 'async';
  frame.append(img);
  return frame;
}

/* ---------- B. Photo spread: one photo at a time, moved only by the viewer ---------- */

export function initSpread(photos, { animate }) {
  const img = document.getElementById('spreadImg');
  const cap = document.getElementById('spreadCap');
  const count = document.getElementById('spreadCount');
  const strip = document.getElementById('spreadStrip');
  const stage = document.getElementById('spreadStage');
  let i = 0;

  const thumbs = photos.map((p, n) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Photo ${n + 1}: ${p.cap}`);
    const t = new Image(p.w, p.h);
    t.src = p.s;
    t.alt = '';
    t.loading = 'lazy';
    b.append(t);
    b.addEventListener('click', () => show(n));
    li.append(b);
    strip.append(li);
    return b;
  });

  function apply() {
    const p = photos[i];
    img.src = p.s.replace('-sm.jpg', '.jpg');
    img.width = p.w;
    img.height = p.h;
    img.alt = p.cap;
    cap.textContent = p.cap;
    count.textContent = `${i + 1} of ${photos.length}`;
    thumbs.forEach((b, n) => b.setAttribute('aria-current', String(n === i)));
  }

  function show(n) {
    i = (n + photos.length) % photos.length;
    thumbs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    animate(img.closest('.frame'), apply);
  }

  document.getElementById('spreadPrev').addEventListener('click', () => show(i - 1));
  document.getElementById('spreadNext').addEventListener('click', () => show(i + 1));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
  });
  apply();
}

/* ---------- D. Album archive ---------- */

export function renderArchive(photos, events) {
  const sheet = document.getElementById('archiveSheet');
  for (const id of ARCHIVE_IDS) {
    const p = byId(photos, id);
    if (!p) continue;
    const li = document.createElement('li');
    li.append(framedImg(p, p.cap || `A photo from Fall 2026, ${p.day}.`));
    sheet.append(li);
  }
  const next = events.find((e) => e.upcoming);
  const upcoming = document.getElementById('upcomingName');
  upcoming.innerHTML = `<a href="${albumHref(next.id)}"></a>`;
  upcoming.firstChild.textContent = next.name;
  document.getElementById('upcomingNote').textContent = next.photoCount
    ? `${next.dates}. ${next.photoCount} photos.` : `${next.dates}. ${next.emptyNote}`;
  const list = document.getElementById('albumIndex');
  for (const ev of events.filter((e) => e !== next && e.id !== 'fall-2026')) {
    const li = document.createElement('li');
    li.innerHTML = `<a class="album-index__name" href="${albumHref(ev.id)}"></a><span class="album-index__status"></span>`;
    li.firstElementChild.textContent = ev.name;
    li.lastElementChild.textContent = ev.photoCount ? `${ev.photoCount} photos` : 'Photos coming soon';
    list.append(li);
  }
}

/* ---------- E. What's new ---------- */

export function renderNew(photos) {
  const list = document.getElementById('newGrid');
  for (const id of NEW_IDS) {
    const p = byId(photos, id);
    if (!p) continue;
    const li = document.createElement('li');
    li.append(framedImg(p, `A newly added ${p.day} photo from Fall 2026.`));
    list.append(li);
  }
}

/* ---------- C. Next gathering ---------- */

export function renderGathering() {
  document.getElementById('nextDates').textContent = NEXT_GATHERING.dates;
  document.getElementById('nextDays').textContent = NEXT_GATHERING.days;
  const el = document.getElementById('countdown');
  const [y, m, d] = NEXT_GATHERING.start.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((new Date(y, m - 1, d) - today) / 86400000);
  if (days < 1) return;
  el.innerHTML = `<b>${days}</b>${days === 1 ? 'day' : 'days'} to go`;
  el.hidden = false;
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
    const frame = document.createElement('span');
    frame.className = 'frame';
    const img = new Image(s.w, s.h);
    img.src = s.thumb;
    img.alt = s.caption || (s.place ? `A sighting at ${s.place}` : 'A Beastie sighting');
    img.loading = 'lazy';
    img.decoding = 'async';
    frame.append(img);
    const place = document.createElement('p');
    place.textContent = s.place || 'Place not given';
    a.append(frame, place);
    li.append(a);
    grid.append(li);
  }
  grid.hidden = false;
  const all = document.getElementById('sightAll');
  all.firstElementChild.textContent = total === 1 ? 'See the sighting' : `See all ${total} sightings`;
  all.hidden = false;
}
