import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/pages.css';

import { initChrome, isReduced, notify, revealOnScroll } from './chrome.js';
import { api, uploadPhotos } from './api.js';

const CAPTION_MAX = 200;
const COMMENT_MAX = 280;
const MAX_FILES = 20;
const MAX_BYTES = 30 * 1024 * 1024;
const ALL = 'All days';
const DAY_NOT_SET = 'Day not set';
const albumHref = (id) => `album.html?event=${encodeURIComponent(id)}`;

const me = await initChrome('photos');
const params = new URLSearchParams(location.search);
const eventId = params.get('event');

if (eventId) {
  try {
    await showAlbum(eventId);
  } catch (err) {
    if (err.status === 404) await showIndex(true);
    else notify('The album could not be loaded', err.message);
  }
} else {
  await showIndex(false);
}
revealOnScroll();

/* =====================================================================
   All albums
   ===================================================================== */

async function showIndex(notFound) {
  document.getElementById('indexView').hidden = false;
  document.getElementById('notFound').hidden = !notFound;
  const { events } = await api('/events');
  const rows = document.getElementById('albumRows');
  for (const ev of events) {
    const li = document.createElement('li');
    li.className = `album-row${ev.photoCount ? ' album-row--open' : ''}`;
    li.innerHTML = `<a class="album-row__link" href="${albumHref(ev.id)}">
        <span class="album-row__name"></span><span class="album-row__status"></span></a>`;
    li.querySelector('.album-row__name').textContent = ev.name;
    li.querySelector('.album-row__status').textContent = ev.photoCount ? `${ev.photoCount} photos`
      : ev.upcoming ? 'Photos after the event' : 'Photos coming soon';
    rows.append(li);
  }
  // Random Beastie Sightings: a gallery of its own, listed after the event albums.
  const { total } = await api('/sightings?limit=1');
  const li = document.createElement('li');
  li.className = `album-row${total ? ' album-row--open' : ''}`;
  li.innerHTML = `<a class="album-row__link" href="sightings.html">
      <span class="album-row__name">Random Beastie Sightings</span><span class="album-row__status"></span></a>`;
  li.querySelector('.album-row__status').textContent = total ? `${total} ${total === 1 ? 'sighting' : 'sightings'}` : 'Share the first one';
  rows.append(li);
}

/* =====================================================================
   One album
   ===================================================================== */

async function showAlbum(id) {
  let { event, photos } = await api(`/events/${encodeURIComponent(id)}`);
  document.title = `${event.name} · Beasties`;
  document.getElementById('albumView').hidden = false;
  document.getElementById('albumTitle').textContent = event.name;

  const daysEl = document.getElementById('days');
  const wall = document.getElementById('wall');
  let day = ALL;
  let list = photos;
  let arranging = false; // owner and admins: Move up / Move down / Move to position
  // "Grid" or "Big photos" (whole photos filling the width). Remembered on this device.
  const LAYOUT_KEY = 'beasties-album-layout';
  let layout = (() => { try { return localStorage.getItem(LAYOUT_KEY) === 'big' ? 'big' : 'grid'; } catch { return 'grid'; } })();
  const toggle = document.getElementById('viewToggle');
  toggle.addEventListener('click', (e) => {
    const b = e.target.closest('[data-layout]');
    if (!b || b.dataset.layout === layout) return;
    layout = b.dataset.layout;
    try { localStorage.setItem(LAYOUT_KEY, layout); } catch {}
    renderHead();
    renderWall();
  });

  async function reload() {
    ({ event, photos } = await api(`/events/${encodeURIComponent(id)}`));
    renderAll();
  }

  /* ---------- Head, empty state, filters ---------- */

  function renderHead() {
    const meta = [event.dates, event.place, photos.length ? `${photos.length} photos` : null].filter(Boolean);
    const metaEl = document.getElementById('albumMeta');
    metaEl.textContent = meta.join(' · ');
    metaEl.hidden = !meta.length;
    captionBlock(document.getElementById('albumCap'), {
      text: event.caption, canEdit: event.canEditCaption, canUndo: event.canUndoCaption,
      label: `Caption for the ${event.name} album`,
      save: async (t) => { ({ event } = await api(`/events/${encodeURIComponent(id)}/caption`, { method: 'PATCH', body: { text: t } })); },
      undo: async () => { ({ event } = await api(`/events/${encodeURIComponent(id)}/caption/undo`, { method: 'POST' })); },
      after: renderHead,
    });
    const empty = !photos.length;
    document.getElementById('empty').hidden = !empty;
    document.getElementById('emptyNote').textContent = event.emptyNote || 'Stuart or Ahmed will add them.';
    daysEl.hidden = empty;
    wall.hidden = empty;
    document.getElementById('hint').hidden = empty;
    document.getElementById('arrangeBtn').hidden = !event.canArrange || photos.length < 2 || arranging;
    toggle.hidden = empty || arranging;
    toggle.querySelectorAll('[data-layout]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === layout)));
    document.getElementById('arrangeBar').hidden = !arranging;
    document.getElementById('undoOrder').disabled = !event.canUndoOrder;
  }

  function renderDays() {
    daysEl.innerHTML = '';
    if (arranging) { daysEl.hidden = true; return; }
    if (!photos.length) return;
    const names = [ALL, ...event.days, DAY_NOT_SET].filter((d, i, a) => a.indexOf(d) === i)
      .filter((d) => d === ALL || photos.some((p) => p.day === d));
    if (!names.includes(day)) day = ALL;
    for (const d of names) {
      const n = d === ALL ? photos.length : photos.filter((p) => p.day === d).length;
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.day = d;
      b.setAttribute('aria-pressed', String(d === day));
      b.setAttribute('aria-label', `${d}, ${n} photos`);
      b.innerHTML = '<span></span><span class="days__n"></span>';
      b.firstChild.textContent = d;
      b.lastChild.textContent = n;
      b.addEventListener('click', () => { day = d; renderDays(); renderWall(); });
      daysEl.append(b);
    }
  }

  /* ---------- Photo wall ---------- */

  function renderWall() {
    list = day === ALL || arranging ? photos : photos.filter((p) => p.day === day);
    document.getElementById('hint').textContent = arranging ? '' : day === DAY_NOT_SET
      ? (me.role === 'member' ? 'These photos have no date in their files yet.' : 'These photos have no date in their files. Open one to set its day.')
      : '';
    wall.innerHTML = '';
    const big = layout === 'big' && !arranging;
    wall.classList.toggle('wall--big', big);
    list.forEach((p, k) => {
      const li = document.createElement('li');
      li.className = arranging ? 'tile tile--arrange' : 'tile';
      li.dataset.id = p.id;
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'tile__photo';
      open.setAttribute('aria-label', `Open photo ${k + 1} of ${list.length}${p.caption ? `: ${p.caption}` : ''}`);
      const frame = document.createElement('span');
      frame.className = 'frame tilt';
      const img = new Image(p.w, p.h);
      img.src = big ? p.src : p.thumb; // big view uses the large copy so it stays sharp
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      frame.append(img);
      open.append(frame);
      open.addEventListener('click', () => { if (!arranging) openViewer(k, open); });
      if (arranging) { open.tabIndex = -1; open.setAttribute('aria-hidden', 'true'); }
      li.append(open);
      if (arranging) {
        li.append(arrangeControls(p, k));
      } else if (p.caption) {
        const c = document.createElement('p');
        c.className = 'tile__cap';
        c.textContent = p.caption;
        li.append(c);
      } else if (p.canEdit) {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'cap-add';
        add.innerHTML = '<span class="plus" aria-hidden="true"></span>Add a caption';
        add.addEventListener('click', () => openViewer(k, open, true));
        li.append(add);
      }
      if (big) li.append(storyFor(p, k, open));
      wall.append(li);
    });
    if (big) fillStories();
  }

  /* ---------- Big photos: the story under each photo (day, who shared it, comments) ---------- */

  const SHOW_COMMENTS = 3;
  let albumComments = null; // { photoId: [comments] }, loaded once and refreshed after the viewer closes
  const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

  function storyFor(p, k, open) {
    const box = document.createElement('div');
    box.className = 'tile__story';
    box.dataset.photo = p.id;
    const meta = document.createElement('p');
    meta.className = 'tile__meta';
    meta.textContent = [p.day !== DAY_NOT_SET ? p.day : null, p.uploader ? `Shared by ${p.uploader}` : null].filter(Boolean).join(' · ');
    if (meta.textContent) box.append(meta);
    const talk = document.createElement('ul');
    talk.className = 'tile__talk';
    talk.setAttribute('aria-label', 'Comments on this photo');
    box.append(talk);
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'tile__comment';
    more.addEventListener('click', () => openViewer(k, open, false, true));
    box.append(more);
    return box;
  }

  async function fillStories(reload = false) {
    if (!albumComments || reload) {
      try { albumComments = (await api(`/events/${encodeURIComponent(id)}/comments`)).comments; } catch { return; }
    }
    for (const box of wall.querySelectorAll('.tile__story')) {
      const all = albumComments[box.dataset.photo] || [];
      const talk = box.querySelector('.tile__talk');
      talk.innerHTML = '';
      for (const c of all.slice(-SHOW_COMMENTS)) {
        const li = document.createElement('li');
        li.innerHTML = '<p class="tile__said"><b></b> <span></span></p><p class="tile__when"></p>';
        li.querySelector('b').textContent = c.author;
        li.querySelector('span').textContent = c.body;
        li.querySelector('.tile__when').textContent = shortDate.format(new Date(c.at));
        talk.append(li);
      }
      talk.hidden = !all.length;
      const btn = box.querySelector('.tile__comment');
      btn.textContent = all.length > SHOW_COMMENTS ? `See all ${all.length} comments` : all.length ? 'Add a comment' : 'Be the first to comment';
    }
  }

  function renderAll() {
    renderHead();
    renderDays();
    renderWall();
  }

  /* ---------- Arrange photos (owner and admins) ---------- */

  const status = document.getElementById('arrangeStatus');

  function arrangeControls(p, k) {
    const n = photos.length;
    const box = document.createElement('div');
    box.className = 'arrange';
    box.innerHTML = `
      <p class="arrange__pos">Photo <b>${k + 1}</b> of ${n}</p>
      <div class="arrange__row">
        <button class="arrange__btn" type="button" data-move="up"${k === 0 ? ' disabled' : ''}><span aria-hidden="true">&uarr;</span> Move up</button>
        <button class="arrange__btn" type="button" data-move="down"${k === n - 1 ? ' disabled' : ''}><span aria-hidden="true">&darr;</span> Move down</button>
      </div>
      <form class="arrange__to">
        <label class="arrange__label" for="to-${p.id}">Move to position</label>
        <div class="arrange__row">
          <input class="arrange__num" id="to-${p.id}" type="number" inputmode="numeric" min="1" max="${n}" placeholder="1 to ${n}">
          <button class="arrange__btn arrange__btn--go" type="submit" data-move="to">Move</button>
        </div>
      </form>`;
    box.querySelector('[data-move="up"]').addEventListener('click', () => move(p, k, 'up'));
    box.querySelector('[data-move="down"]').addEventListener('click', () => move(p, k + 2, 'down'));
    box.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const to = Number(box.querySelector('input').value);
      if (!Number.isInteger(to) || to < 1 || to > n) { notify('Type a position', `Please type a number from 1 to ${n}.`); return; }
      move(p, to, 'to');
    });
    return box;
  }

  let moving = false;
  async function move(p, position, control) {
    if (moving) return;
    moving = true;
    try {
      const data = await api(`/events/${encodeURIComponent(id)}/order`, { method: 'POST', body: { photoId: p.id, position } });
      ({ event, photos } = data);
      renderAll();
      // keep the photo in view and the focus on the same kind of button
      const li = wall.querySelector(`[data-id="${p.id}"]`);
      li?.scrollIntoView({ block: 'center', behavior: isReduced() ? 'auto' : 'smooth' });
      const again = li?.querySelector(`[data-move="${control}"]:not([disabled])`) || li?.querySelector('[data-move]:not([disabled])');
      again?.focus({ preventScroll: true });
      li?.classList.add('is-moved');
      status.textContent = `Moved to position ${data.position} of ${photos.length}.`;
    } catch (err) {
      notify('Not moved', err.message);
    } finally {
      moving = false;
    }
  }

  document.getElementById('arrangeBtn').addEventListener('click', () => {
    arranging = true;
    renderAll();
    document.getElementById('arrangeBar').scrollIntoView({ block: 'start', behavior: isReduced() ? 'auto' : 'smooth' });
    document.getElementById('arrangeDone').focus({ preventScroll: true });
  });
  document.getElementById('arrangeDone').addEventListener('click', () => {
    arranging = false;
    renderAll();
    notify('Order saved', 'Everyone now sees the photos in this order.');
    document.getElementById('arrangeBtn').focus();
  });
  document.getElementById('undoOrder').addEventListener('click', async () => {
    try {
      ({ event, photos } = await api(`/events/${encodeURIComponent(id)}/order/undo`, { method: 'POST' }));
      renderAll();
      status.textContent = 'The last move was undone.';
      notify('Move undone', 'The photos are back in the order before your last move.');
    } catch (err) { notify('Nothing to undo', err.message); }
  });

  /* ---------- Full-screen viewer ---------- */

  // The photo fills the screen. "Details" opens caption, day, Download and Comments in a solid
  // panel; this device remembers whether it was open (closed by default).
  const viewer = document.getElementById('viewer');
  const vimg = document.getElementById('vimg');
  const vside = document.getElementById('vside');
  const detailsBtn = document.getElementById('vdetails');
  let at = 0;
  let opener = null;
  let savedScroll = 0;
  const current = () => list[at];
  const DETAILS_KEY = 'beasties-viewer-details';
  const detailsWanted = () => { try { return localStorage.getItem(DETAILS_KEY) === 'open'; } catch { return false; } };

  function setDetails(open, remember = true) {
    vside.hidden = !open;
    viewer.classList.toggle('has-details', open);
    detailsBtn.setAttribute('aria-expanded', String(open));
    detailsBtn.querySelector('.vbtn__text').textContent = open ? 'Hide details' : 'Details';
    if (remember) { try { localStorage.setItem(DETAILS_KEY, open ? 'open' : 'closed'); } catch {} }
  }
  detailsBtn.addEventListener('click', () => {
    const open = vside.hidden;
    setDetails(open);
    if (open) document.getElementById('vsideClose').focus();
  });
  document.getElementById('vsideClose').addEventListener('click', () => { setDetails(false); detailsBtn.focus(); });

  function replacePhoto(updated) {
    photos = photos.map((p) => (p.id === updated.id ? updated : p));
    list = list.map((p) => (p.id === updated.id ? updated : p));
  }

  function renderViewerCaption(startEditing = false) {
    const p = current();
    captionBlock(document.getElementById('vcap'), {
      text: p.caption, canEdit: p.canEdit, canUndo: p.canUndo, label: 'Caption for this photo', startEditing,
      save: async (t) => { replacePhoto((await api(`/photos/${p.id}/caption`, { method: 'PATCH', body: { text: t } })).photo); },
      undo: async () => { replacePhoto((await api(`/photos/${p.id}/caption/undo`, { method: 'POST' })).photo); },
      after: () => { renderViewerCaption(); renderWall(); },
    });
  }

  function renderViewerMeta() {
    const p = current();
    document.getElementById('vmeta').textContent = `${p.day} · ${event.name} · Shared by: ${p.uploader || 'not recorded'}`;
    const wrap = document.getElementById('vdayWrap');
    wrap.hidden = !p.canSetDay;
    if (p.canSetDay) {
      const sel = document.getElementById('vday');
      sel.innerHTML = '';
      for (const d of [...event.days, DAY_NOT_SET]) {
        const o = document.createElement('option');
        o.value = d;
        o.textContent = d;
        o.selected = d === p.day;
        sel.append(o);
      }
    }
  }

  document.getElementById('vday').addEventListener('change', async (e) => {
    const p = current();
    try {
      replacePhoto((await api(`/photos/${p.id}/day`, { method: 'PATCH', body: { day: e.target.value } })).photo);
      notify('Day saved', `This photo is now under ${e.target.value}.`);
      renderViewerMeta();
      renderDays();
      renderWall();
    } catch (err) { notify('Day not saved', err.message); }
  });

  function show(k, startEditing = false) {
    at = (k + list.length) % list.length;
    const p = current();
    // a gentle fade while the next photo arrives (no fade with Reduce motion)
    vimg.classList.add('is-changing');
    vimg.onload = vimg.onerror = () => vimg.classList.remove('is-changing');
    vimg.src = p.src;
    vimg.width = p.w;
    vimg.height = p.h;
    vimg.alt = p.caption || `A photo from ${event.name}, ${p.day}.`;
    if (vimg.complete && vimg.naturalWidth) vimg.classList.remove('is-changing');
    document.getElementById('vcount').textContent = `${at + 1} of ${list.length}`;
    for (const id of ['vprev', 'vnext']) document.getElementById(id).hidden = list.length < 2;
    document.getElementById('vdownload').href = `/api/photos/${p.id}/download`;
    document.getElementById('vdelete').hidden = !p.canDelete;
    renderViewerCaption(startEditing);
    renderViewerMeta();
    loadComments();
    if (startEditing) setDetails(true, false);
    // fetch the neighbours ahead of time so Next and Previous feel instant
    [at + 1, at - 1].forEach((j) => { const n = new Image(); n.decoding = 'async'; n.src = list[(j + list.length) % list.length].src; });
  }

  function openViewer(k, from, startEditing = false, toComments = false) {
    opener = from;
    savedScroll = window.scrollY;
    setDetails(startEditing || toComments || detailsWanted(), false);
    show(k, startEditing);
    viewer.hidden = false;
    document.documentElement.classList.add('is-locked');
    if (toComments) {
      // straight to the comment box (or the comments, when they are closed)
      const box = document.getElementById('cBody');
      document.getElementById('cTitle').scrollIntoView({ block: 'start' });
      if (!document.getElementById('cForm').hidden) box.focus({ preventScroll: true });
    } else if (!startEditing) document.getElementById('vclose').focus();
  }

  function closeViewer() {
    if (inFull()) exitFull();
    viewer.hidden = true;
    document.documentElement.classList.remove('is-locked');
    window.scrollTo({ top: savedScroll, behavior: 'instant' }); // keep the gallery where it was
    opener?.focus({ preventScroll: true });
    if (wall.classList.contains('wall--big')) {
      // captions or comments may have changed in the viewer
      renderWall();
      window.scrollTo({ top: savedScroll, behavior: 'instant' });
      fillStories(true);
    }
  }

  document.getElementById('vclose').addEventListener('click', closeViewer);

  /* Full screen: the browser's own full screen where it is allowed (iPad Safari uses the
     webkit version). Phones that do not allow it (iPhone) never see the button. */
  const fullBtn = document.getElementById('vfull');
  const inFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const exitFull = () => { try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); } catch {} };
  fullBtn.hidden = !(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  fullBtn.addEventListener('click', async () => {
    try {
      if (inFull()) await exitFull();
      else await (viewer.requestFullscreen || viewer.webkitRequestFullscreen).call(viewer);
    } catch { notify('Full screen is not available', 'This browser does not allow it here.'); }
  });
  const onFullChange = () => {
    const on = inFull();
    document.getElementById('vfullText').textContent = on ? 'Exit full screen' : 'Full screen';
    viewer.classList.toggle('is-full', on);
  };
  document.addEventListener('fullscreenchange', onFullChange);
  document.addEventListener('webkitfullscreenchange', onFullChange);

  // Delete: the person who added the photo, or the owner and admins. Asks first.
  document.getElementById('vdelete').addEventListener('click', async () => {
    const p = current();
    if (!confirm('Delete this photo for everyone? This cannot be undone.')) return;
    try {
      await api(`/photos/${p.id}`, { method: 'DELETE' });
      photos = photos.filter((x) => x.id !== p.id);
      closeViewer();
      renderAll();
      notify('Photo deleted', `It has been removed from ${event.name}.`);
    } catch (err) { notify('Photo not deleted', err.message); }
  });
  for (const [btn, step] of [['vprev', -1], ['vnext', 1]]) {
    document.getElementById(btn).addEventListener('click', () => show(at + step));
  }
  document.addEventListener('keydown', (e) => {
    if (viewer.hidden || e.target.closest?.('textarea, select, input')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
    if (e.key === 'Tab') trapFocus(e, viewer);
  });
  // Swipe left or right on phones and tablets.
  let sx = null;
  let sy = 0;
  const vphoto = document.getElementById('vphoto');
  vphoto.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('button')) return;
    sx = e.clientX;
    sy = e.clientY;
  });
  vphoto.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(at + (dx < 0 ? 1 : -1));
  });
  vphoto.addEventListener('pointercancel', () => { sx = null; });

  /* ---------- Comments ---------- */

  const cList = document.getElementById('cList');
  const cForm = document.getElementById('cForm');
  const cBody = document.getElementById('cBody');
  const cCount = document.getElementById('cCount');
  const cClose = document.getElementById('cClose');
  let commentsFor = null;

  function renderComments({ comments, closed, canClose }) {
    cList.innerHTML = '';
    if (!comments.length) {
      const li = document.createElement('li');
      li.className = 'comments__none';
      li.textContent = 'No comments yet.';
      cList.append(li);
    }
    for (const c of comments) {
      const li = document.createElement('li');
      li.className = 'comment';
      li.innerHTML = '<p class="comment__who"></p><p class="comment__body"></p>';
      li.querySelector('.comment__who').textContent = c.author;
      li.querySelector('.comment__body').textContent = c.body;
      if (c.canDelete) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'cap-link';
        del.textContent = 'Delete';
        del.setAttribute('aria-label', `Delete comment by ${c.author}`);
        del.addEventListener('click', async () => {
          if (!confirm('Delete this comment?')) return;
          try { renderComments({ ...(await api(`/comments/${c.id}`, { method: 'DELETE' })), closed, canClose }); }
          catch (err) { notify('Comment not deleted', err.message); }
        });
        li.append(del);
      }
      cList.append(li);
    }
    document.getElementById('cCloseWrap').hidden = !canClose;
    cClose.checked = closed;
    document.getElementById('cClosed').hidden = !closed;
    cForm.hidden = closed;
  }

  async function loadComments() {
    const p = current();
    commentsFor = p.id;
    cBody.value = '';
    cCount.textContent = `0 / ${COMMENT_MAX}`;
    try {
      const data = await api(`/photos/${p.id}/comments`);
      if (commentsFor === p.id) renderComments(data);
    } catch (err) { notify('Comments could not be loaded', err.message); }
  }

  cBody.addEventListener('input', () => { cCount.textContent = `${cBody.value.length} / ${COMMENT_MAX}`; });
  cForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = cBody.value.trim();
    if (!body) return;
    try {
      const data = await api(`/photos/${current().id}/comments`, { method: 'POST', body: { body } });
      renderComments({ ...data, closed: false, canClose: !document.getElementById('cCloseWrap').hidden });
      cBody.value = '';
      cCount.textContent = `0 / ${COMMENT_MAX}`;
    } catch (err) { notify('Comment not posted', err.message); }
  });
  cClose.addEventListener('change', async () => {
    try {
      await api(`/photos/${current().id}/comments-closed`, { method: 'PATCH', body: { closed: cClose.checked } });
      notify(cClose.checked ? 'Comments closed' : 'Comments open', cClose.checked ? 'No one can add comments to this photo now.' : 'Members can comment on this photo again.');
      loadComments();
    } catch (err) { notify('Not changed', err.message); cClose.checked = !cClose.checked; }
  });

  /* ---------- Add photos ---------- */

  initUploader(event, async (count) => {
    await reload();
    notify(`${count} ${count === 1 ? 'photo' : 'photos'} added`, `They are in ${event.name} now.`);
  });

  initTilt(wall);
  renderAll();
}

/* =====================================================================
   Upload sheet: choose, caption, upload with real progress
   ===================================================================== */

function initUploader(event, onDone) {
  const sheet = document.getElementById('uploader');
  const input = document.getElementById('upFiles');
  const listEl = document.getElementById('upList');
  const errorEl = document.getElementById('upError');
  const send = document.getElementById('upSend');
  const progress = document.getElementById('upProgress');
  const bar = document.getElementById('upBar');
  const pct = document.getElementById('upPct');
  let files = [];
  let busy = false;
  const previews = [];

  document.getElementById('upTitle').textContent = `Add photos to ${event.name}`;
  const open = () => { reset(); sheet.hidden = false; document.documentElement.classList.add('is-locked'); input.focus(); };
  const close = () => { if (busy) return; sheet.hidden = true; document.documentElement.classList.remove('is-locked'); reset(); };
  document.getElementById('albumAdd').addEventListener('click', open);
  document.getElementById('emptyAdd').addEventListener('click', open);
  document.getElementById('upClose').addEventListener('click', close);
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = !msg; }

  function reset() {
    previews.splice(0).forEach((u) => URL.revokeObjectURL(u));
    files = [];
    input.value = '';
    listEl.innerHTML = '';
    showError('');
    progress.hidden = true;
    send.disabled = true;
    send.textContent = 'Upload';
  }

  const okType = (f) => /^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);

  input.addEventListener('change', () => {
    const chosen = [...input.files];
    showError('');
    if (chosen.length > MAX_FILES) showError(`You chose ${chosen.length} photos. Up to ${MAX_FILES} can be added at once, so only the first ${MAX_FILES} are listed.`);
    const usable = [];
    const skipped = [];
    for (const f of chosen.slice(0, MAX_FILES)) {
      if (!okType(f)) skipped.push(`${f.name} is not a JPG, PNG, WEBP or HEIC photo.`);
      else if (f.size > MAX_BYTES) skipped.push(`${f.name} is over 30 MB.`);
      else usable.push(f);
    }
    if (skipped.length) showError([errorEl.textContent, ...skipped].filter(Boolean).join(' '));
    files = usable;
    renderList();
  });

  function renderList() {
    listEl.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.className = 'up-item';
      const thumb = document.createElement('span');
      thumb.className = 'up-item__thumb';
      if (/heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name)) {
        thumb.textContent = 'HEIC';
      } else {
        const url = URL.createObjectURL(f);
        previews.push(url);
        const img = new Image();
        img.src = url;
        img.alt = '';
        thumb.append(img);
      }
      const body = document.createElement('div');
      body.className = 'up-item__body';
      const id = `upcap-${i}`;
      body.innerHTML = `<p class="up-item__name"></p>
        <label class="cap-label" for="${id}">Caption (optional)</label>
        <textarea class="cap-input" id="${id}" rows="2" maxlength="${CAPTION_MAX}" aria-describedby="${id}-n"></textarea>
        <p class="cap-count" id="${id}-n">0 / ${CAPTION_MAX}</p>`;
      const size = f.size < 104858 ? `${Math.max(1, Math.round(f.size / 1024))} KB` : `${(f.size / 1048576).toFixed(1)} MB`;
      body.querySelector('.up-item__name').textContent = `${f.name} · ${size}`;
      const ta = body.querySelector('textarea');
      ta.addEventListener('input', () => { body.querySelector('.cap-count').textContent = `${ta.value.length} / ${CAPTION_MAX}`; });
      li.append(thumb, body);
      listEl.append(li);
    });
    send.disabled = !files.length;
    send.textContent = files.length ? `Upload ${files.length} ${files.length === 1 ? 'photo' : 'photos'}` : 'Upload';
  }

  send.addEventListener('click', async () => {
    if (!files.length || busy) return;
    busy = true;
    send.disabled = true;
    progress.hidden = false;
    const captions = [...listEl.querySelectorAll('textarea')].map((t) => t.value);
    const setPct = (r) => {
      const n = Math.round(r * 100);
      bar.style.width = `${n}%`;
      pct.textContent = n < 100 ? `Uploading… ${n}%` : 'Preparing photos… this can take a moment.';
    };
    setPct(0);
    try {


      const { results } = await uploadPhotos(event.id, files, captions, setPct);
      const ok = results.filter((r) => r.ok).length;
      const bad = results.filter((r) => !r.ok);
      busy = false;
      if (bad.length) {
        pct.textContent = `${ok} added. ${bad.length} could not be added.`;
        showError(bad.map((r) => `${r.name}: ${r.error}`).join(' '));
        files = [];
        listEl.innerHTML = '';
        send.textContent = 'Upload';
      } else {
        close();
      }
      if (ok) await onDone(ok);
    } catch (err) {
      busy = false;
      send.disabled = false;
      progress.hidden = true;
      showError(err.message);
    }
  });
}

/* =====================================================================
   Caption block: shows the caption, or lets an allowed person edit it
   ===================================================================== */

let editorCount = 0;
function captionBlock(box, opts) {
  const { text, canEdit, canUndo, startEditing, save, undo, after } = opts;
  box.innerHTML = '';
  if (startEditing && canEdit) return editCaption(box, opts);
  if (text) {
    const p = document.createElement('p');
    p.className = 'cap-text';
    p.textContent = text;
    box.append(p);
  }
  if (!canEdit) return;
  const row = document.createElement('div');
  row.className = 'cap-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = text ? 'cap-link' : 'cap-add';
  edit.innerHTML = text ? 'Edit caption' : '<span class="plus" aria-hidden="true"></span>Add a caption';
  edit.addEventListener('click', () => editCaption(box, opts));
  row.append(edit);
  if (canUndo) {
    const u = document.createElement('button');
    u.type = 'button';
    u.className = 'cap-link';
    u.textContent = 'Undo last change';
    u.addEventListener('click', async () => {
      try { await undo(); notify('Caption restored', 'The previous caption is back.'); after(); }
      catch (err) { notify('Not undone', err.message); }
    });
    row.append(u);
  }
  box.append(row);
}

function editCaption(box, { text, label, save, after }) {
  const id = `cap-${++editorCount}`;
  box.innerHTML = `
    <label class="cap-label" for="${id}"></label>
    <textarea class="cap-input" id="${id}" rows="3" maxlength="${CAPTION_MAX}" aria-describedby="${id}-count"></textarea>
    <div class="cap-foot"><p class="cap-count" id="${id}-count"></p></div>
    <div class="cap-actions">
      <button class="btn btn--forest btn--small" type="button" data-save>Save caption</button>
      <button class="btn btn--quiet btn--small" type="button" data-cancel>Cancel</button>
    </div>`;
  box.querySelector('label').textContent = label;
  const input = box.querySelector('textarea');
  const count = box.querySelector('.cap-count');
  input.value = text || '';
  const update = () => { count.textContent = `${input.value.length} / ${CAPTION_MAX}`; };
  input.addEventListener('input', update);
  update();
  const saveBtn = box.querySelector('[data-save]');
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try { await save(input.value); notify('Caption saved', 'Use Undo last change to go back.'); after(); }
    catch (err) { saveBtn.disabled = false; notify('Caption not saved', err.message); }
  });
  box.querySelector('[data-cancel]').addEventListener('click', after);
  input.focus();
}

/* =====================================================================
   Small helpers
   ===================================================================== */

// A gentle 3D lean toward the pointer on each photo, like the Home page print.
function initTilt(container) {
  container.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || isReduced()) return;
    const frame = e.target.closest('.tilt');
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    frame.style.setProperty('--ry', `${((((e.clientX - r.left) / r.width) * 2 - 1) * 4).toFixed(2)}deg`);
    frame.style.setProperty('--rx', `${(-(((e.clientY - r.top) / r.height) * 2 - 1) * 3).toFixed(2)}deg`);
  });
  container.addEventListener('pointerout', (e) => {
    const frame = e.target.closest('.tilt');
    if (frame && !frame.contains(e.relatedTarget)) {
      frame.style.removeProperty('--ry');
      frame.style.removeProperty('--rx');
    }
  });
}

function trapFocus(e, box) {
  const items = [...box.querySelectorAll('button, textarea, select, input, [href]')].filter((el) => el.offsetParent !== null && !el.disabled);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
