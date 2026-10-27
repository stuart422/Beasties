// Random Beastie Sightings: a gallery of its own. Any member can share one (photo, place,
// caption). The person who shared it can edit it; the owner and admins can edit or delete any.
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';
import { api, uploadSighting } from './api.js';
import { initChrome, notify } from './chrome.js';

const CAPTION_MAX = 200;
const PLACE_MAX = 80;
const MAX_BYTES = 30 * 1024 * 1024;

await initChrome('sightings');

const wall = document.getElementById('wall');
const empty = document.getElementById('empty');
let sightings = [];

async function load() {
  ({ sightings } = await api('/sightings'));
  render();
}

function render() {
  empty.hidden = sightings.length > 0;
  wall.hidden = !sightings.length;
  wall.innerHTML = '';
  sightings.forEach((s) => wall.append(card(s)));
}

/* ---------- One sighting ---------- */

function card(s) {
  const li = document.createElement('li');
  li.className = 'tile sight';
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'tile__photo';
  open.setAttribute('aria-label', `Open the sighting${s.place ? ` at ${s.place}` : ''}`);
  const frame = document.createElement('span');
  frame.className = 'frame tilt';
  const img = new Image(s.w, s.h);
  img.src = s.thumb;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  frame.append(img);
  open.append(frame);
  open.addEventListener('click', () => openViewer(s, open));
  li.append(open);

  const body = document.createElement('div');
  body.className = 'sight__body';
  li.append(body);
  showText(body, s);
  return li;
}

function showText(body, s) {
  body.innerHTML = `<p class="sight__place"></p><p class="tile__cap sight__cap"></p><p class="sight__by"></p>`;
  body.querySelector('.sight__place').textContent = s.place || 'Place not given';
  const cap = body.querySelector('.sight__cap');
  if (s.caption) cap.textContent = s.caption; else cap.remove();
  body.querySelector('.sight__by').textContent = s.uploader ? `Shared by ${s.uploader}` : 'Shared by a former member';
  if (!s.canEdit) return;

  const row = document.createElement('div');
  row.className = 'cap-actions';
  const edit = button('cap-link', 'Edit', () => editSighting(body, s));
  row.append(edit);
  if (s.canUndo) {
    row.append(button('cap-link', 'Undo last caption change', async () => {
      try {
        replace((await api(`/sightings/${s.id}/caption/undo`, { method: 'POST' })).sighting);
        notify('Caption restored', 'The previous caption is back.');
      } catch (err) { notify('Not undone', err.message); }
    }));
  }
  if (s.canDelete) {
    row.append(button('cap-link viewer__delete', 'Delete', async () => {
      if (!confirm('Delete this sighting? The photo is removed for everyone. This cannot be undone.')) return;
      try {
        await api(`/sightings/${s.id}`, { method: 'DELETE' });
        sightings = sightings.filter((x) => x.id !== s.id);
        render();
        notify('Sighting deleted', 'The photo has been removed.');
      } catch (err) { notify('Not deleted', err.message); }
    }));
  }
  body.append(row);
}

function editSighting(body, s) {
  body.innerHTML = `
    <label class="field"><span class="field__label">Place</span>
      <input class="field__input" data-place maxlength="${PLACE_MAX}" autocomplete="off"></label>
    <div class="field"><label class="field__label" for="cap-${s.id}">Caption</label>
      <textarea class="cap-input" id="cap-${s.id}" rows="3" maxlength="${CAPTION_MAX}" aria-describedby="cap-${s.id}-count"></textarea>
      <div class="cap-foot"><p class="cap-count" id="cap-${s.id}-count"></p></div></div>
    <div class="cap-actions">
      <button class="btn btn--plum btn--small" type="button" data-save>Save</button>
      <button class="btn btn--quiet btn--small" type="button" data-cancel>Cancel</button>
    </div>`;
  const place = body.querySelector('[data-place]');
  const cap = body.querySelector('textarea');
  const count = body.querySelector('.cap-count');
  place.value = s.place;
  cap.value = s.caption;
  const update = () => { count.textContent = `${cap.value.length} / ${CAPTION_MAX}`; };
  cap.addEventListener('input', update);
  update();
  const save = body.querySelector('[data-save]');
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const { sighting } = await api(`/sightings/${s.id}`, { method: 'PATCH', body: { place: place.value, caption: cap.value } });
      replace(sighting);
      notify('Sighting saved', sighting.canUndo ? 'Use Undo last caption change to go back.' : '');
    } catch (err) { save.disabled = false; notify('Not saved', err.message); }
  });
  body.querySelector('[data-cancel]').addEventListener('click', () => showText(body, s));
  place.focus();
}

function replace(s) {
  sightings = sightings.map((x) => (x.id === s.id ? s : x));
  render();
}

function button(cls, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/* ---------- Large photo ---------- */

const viewer = document.getElementById('viewer');
const vimg = document.getElementById('vimg');
let returnFocus = null;
function openViewer(s, from) {
  returnFocus = from;
  vimg.src = s.src;
  vimg.width = s.w;
  vimg.height = s.h;
  vimg.alt = s.caption || (s.place ? `A sighting at ${s.place}` : 'A sighting');
  document.getElementById('vplace').textContent = s.place || 'Random Beastie Sighting';
  viewer.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('vclose').focus();
}
function closeViewer() {
  viewer.hidden = true;
  vimg.removeAttribute('src');
  document.body.style.overflow = '';
  returnFocus?.focus();
}
document.getElementById('vclose').addEventListener('click', closeViewer);
viewer.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });

/* ---------- Share a sighting ---------- */

const sharer = document.getElementById('sharer');
const form = document.getElementById('shForm');
const fileIn = document.getElementById('shFile');
const placeIn = document.getElementById('shPlace');
const capIn = document.getElementById('shCap');
const sendBtn = document.getElementById('shSend');
const errorBox = document.getElementById('shError');
let chosen = null;
let previewUrl = null;
let busy = false;

const showError = (msg) => { errorBox.textContent = msg; errorBox.hidden = !msg; };
const capCount = () => { document.getElementById('shCount').textContent = `${capIn.value.length} / ${CAPTION_MAX}`; };
capIn.addEventListener('input', capCount);

function openSharer() {
  form.reset();
  chosen = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  document.getElementById('shChosen').hidden = true;
  document.getElementById('shProgress').hidden = true;
  showError('');
  capCount();
  sendBtn.disabled = true;
  sharer.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('shClose').focus();
}
function closeSharer() {
  if (busy) return;
  sharer.hidden = true;
  document.body.style.overflow = '';
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
}

fileIn.addEventListener('change', () => {
  const f = fileIn.files[0];
  showError('');
  chosen = null;
  if (!f) return;
  if (f.size > MAX_BYTES) { showError('This photo is over 30 MB. Please choose a smaller one.'); return; }
  chosen = f;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(f);
  const thumb = document.getElementById('shThumb');
  thumb.innerHTML = '';
  const img = new Image();
  img.alt = '';
  img.onerror = () => { thumb.textContent = 'Photo'; };
  img.src = previewUrl;
  thumb.append(img);
  document.getElementById('shName').textContent = f.name;
  document.getElementById('shChosen').hidden = false;
  sendBtn.disabled = false;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!chosen || busy) return;
  busy = true;
  sendBtn.disabled = true;
  showError('');
  const bar = document.getElementById('shBar');
  const pct = document.getElementById('shPct');
  document.getElementById('shProgress').hidden = false;
  const progress = (p) => { bar.style.width = `${Math.round(p * 100)}%`; pct.textContent = `Sending… ${Math.round(p * 100)}%`; };
  progress(0);
  try {
    const s = await uploadSighting(chosen, placeIn.value, capIn.value, progress);
    sightings = [s, ...sightings];
    render();
    busy = false;
    closeSharer();
    notify('Sighting shared', 'Everyone who is signed in can see it now.');
  } catch (err) {
    busy = false;
    sendBtn.disabled = false;
    document.getElementById('shProgress').hidden = true;
    showError(err.message || 'The sighting could not be shared. Please try again.');
  }
});

document.getElementById('shClose').addEventListener('click', closeSharer);
sharer.addEventListener('click', (e) => { if (e.target === sharer) closeSharer(); });
document.getElementById('addBtn').addEventListener('click', openSharer);
document.getElementById('emptyAdd').addEventListener('click', openSharer);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!viewer.hidden) closeViewer();
  else if (!sharer.hidden) closeSharer();
});

await load();
if (new URLSearchParams(location.search).has('add')) openSharer();
