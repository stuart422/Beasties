import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';

import { initChrome, revealOnScroll } from './chrome.js';
import { api } from './api.js';

await initChrome('events');
const { events } = await api('/events');
const next = events.find((e) => e.upcoming);
const albumHref = (id) => `album.html?event=${encodeURIComponent(id)}`;

// Only what the handoff confirms: the event name, its dates and The Beast. No schedule.
document.getElementById('nextH').textContent = next.eventName;
document.getElementById('nextWhen').textContent = next.dates;
document.getElementById('nextPlace').textContent = next.place;
const albumLink = document.getElementById('nextAlbum');
albumLink.href = albumHref(next.id);
albumLink.textContent = `${next.name} album`;

const [y, m, d] = next.start.split('-').map(Number);
const now = new Date();
const days = Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
if (days >= 1) {
  const el = document.getElementById('countdown');
  el.innerHTML = `<b>${days}</b>${days === 1 ? 'day' : 'days'} to go`;
  el.hidden = false;
}

const rows = document.getElementById('pastRows');
for (const ev of events.filter((e) => !e.upcoming)) {
  const li = document.createElement('li');
  li.className = `album-row${ev.photoCount ? ' album-row--open' : ''}`;
  li.setAttribute('data-reveal', '');
  li.innerHTML = `<a class="album-row__link" href="${albumHref(ev.id)}">
      <span class="album-row__name"></span><span class="album-row__status"></span></a>`;
  li.querySelector('.album-row__name').textContent = ev.name;
  li.querySelector('.album-row__status').textContent = ev.photoCount ? `${ev.photoCount} photos` : 'Photos coming soon';
  rows.append(li);
}
revealOnScroll();
