import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';

import { initChrome } from './chrome.js';
import { api } from './api.js';

await initChrome('my-photos');
const { photos } = await api('/my/photos');
const intro = document.getElementById('intro');
const content = document.getElementById('content');

if (!photos.length) {
  intro.textContent = 'Photos you add will show here.';
  content.innerHTML = `<div class="album-empty"><div class="empty-frame"><div>
      <p class="album-empty__title">No photos yet</p>
      <p class="album-empty__note">Open an album and choose Add photos.</p></div></div>
      <a class="btn btn--plum" href="album.html">Go to the albums</a></div>`;
} else {
  intro.textContent = `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} you added, newest first.`;
  const wall = document.createElement('ul');
  wall.className = 'wall';
  for (const p of photos) {
    const li = document.createElement('li');
    li.className = 'tile';
    li.innerHTML = `<a class="tile__photo" href="album.html?event=${encodeURIComponent(p.event)}">
        <span class="frame"><img alt="" loading="lazy"></span></a>
      <p class="tile__album"></p><p class="tile__cap"></p>`;
    const img = li.querySelector('img');
    img.src = p.thumb;
    img.width = p.w;
    img.height = p.h;
    img.alt = p.caption || `Your photo in ${p.eventName}`;
    li.querySelector('.tile__album').textContent = `${p.eventName} · ${p.day}`;
    li.querySelector('.tile__cap').textContent = p.caption || 'No caption yet. Open the album to add one.';
    wall.append(li);
  }
  content.append(wall);
}
