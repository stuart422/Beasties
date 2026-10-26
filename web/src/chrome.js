// Shared page chrome for every page: the local-version banner, header, account menu, footer,
// the Reduce motion switch and notices. One copy, so every page matches.
import { api, roleLabel } from './api.js';

const NAV = [
  { id: 'home', label: 'Home', href: 'index.html' },
  { id: 'events', label: 'Events', href: 'events.html' },
  { id: 'photos', label: 'Photos', href: 'album.html' },
];

const root = document.documentElement;
const listeners = new Set();

export const isReduced = () => root.dataset.motion === 'reduced';
export const onMotionChange = (fn) => listeners.add(fn);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Draws the chrome and resolves with the signed-in member (or redirects to sign in).
export async function initChrome(page) {
  const { user } = await api('/me');
  if (!user && page !== 'signin') {
    location.href = `/signin.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    return new Promise(() => {});
  }

  const top = document.getElementById('chrome');
  top.innerHTML = `
    <a class="skip" href="#main">Skip to main content</a>
    <div class="proto proto--local" role="note">
      <div class="wrap proto__in">
        <p><b>Local working version.</b> Not online.</p>
        <button class="motion-toggle" id="motionToggle" type="button" aria-pressed="false">
          <span class="switch" aria-hidden="true"></span>Reduce motion
        </button>
      </div>
    </div>
    <header class="site-head">
      <div class="wrap site-head__in">
        <a class="brand" href="index.html">Beasties</a>
        <span class="scroll-progress" id="scrollProgress" aria-hidden="true"></span>
        ${user ? `<nav class="nav" aria-label="Main">
          ${NAV.map((n) => `<a href="${n.href}"${n.id === page ? ' aria-current="page"' : ''}>${n.label}</a>`).join('')}
        </nav>
        <div class="acct">
          <button class="acct-btn" id="acctBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="acctMenu">
            <span class="acct-btn__icon" aria-hidden="true"></span><span class="acct-btn__label">Account</span>
          </button>
          <div class="menu" id="acctMenu" hidden>
            <p class="menu__who">${esc(user.name)} <span>${esc(roleLabel(user.role))}</span></p>
            <a class="menu__item" href="my-photos.html">My photos</a>
            <a class="menu__item" href="profile.html">My profile</a>
            ${user.role === 'owner' ? '<a class="menu__item" href="admin.html">Members and admins</a>' : ''}
            <hr>
            <button type="button" id="signOut">Sign out</button>
          </div>
        </div>` : ''}
      </div>
    </header>`;

  const foot = document.getElementById('foot');
  if (foot) {
    foot.outerHTML = `
      <footer class="site-foot">
        <div class="wrap site-foot__in">
          <p class="sign">Beasties</p>
          <p class="small">A family of friends. Private member site, local working version on this computer. Nothing here is online.</p>
        </div>
      </footer>
      <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;
  }

  if (user) initMenu();
  initScrollProgress();
  initSimulated();
  initMotionToggle();
  return user;
}

/* ---------- Scroll progress line under the header ---------- */

function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---------- Account menu ---------- */

let closeMenu = () => {};
function initMenu() {
  const btn = document.getElementById('acctBtn');
  const menu = document.getElementById('acctMenu');
  const set = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('a, button').focus();
  };
  closeMenu = () => set(false);
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(menu.hidden); });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) set(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); }
  });
  document.getElementById('signOut').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' });
    location.href = '/signin.html';
  });
}

/* ---------- Notices ---------- */

let toastTimer;
export function notify(title, body = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerHTML = '<strong></strong><span></span>';
  toast.firstChild.textContent = title;
  toast.lastChild.textContent = body;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4600);
}

// Anything not built yet still says so plainly.
function initSimulated() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-sim]');
    if (!el) return;
    e.preventDefault();
    closeMenu();
    notify(`Not built yet: ${el.dataset.sim}`, 'This part is still a preview. Nothing was sent or saved.');
  });
}

/* ---------- Reduce motion ---------- */

function initMotionToggle() {
  const toggle = document.getElementById('motionToggle');
  const apply = (on, save) => {
    root.dataset.motion = on ? 'reduced' : 'full';
    toggle.setAttribute('aria-pressed', String(on));
    if (save) { try { localStorage.setItem('beasties-motion', on ? 'reduced' : 'full'); } catch {} }
    listeners.forEach((fn) => fn(on));
  };
  toggle.addEventListener('click', () => apply(!isReduced(), true));
  toggle.setAttribute('aria-pressed', String(isReduced()));
}

/* ---------- Gentle section reveal, shared by every page ---------- */

export function revealOnScroll() {
  let observer = null;
  const start = () => {
    if (observer || isReduced() || !('IntersectionObserver' in window)) return;
    root.classList.add('js-reveal');
    const items = [...document.querySelectorAll('[data-reveal]:not(.is-in)')];
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
      else observer.observe(el);
    });
    // Safety net: content must never stay hidden if the observer does not fire.
    setTimeout(() => items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 1.5) el.classList.add('is-in');
    }), 1200);
  };
  const stop = () => {
    observer?.disconnect();
    observer = null;
    root.classList.remove('js-reveal');
  };
  onMotionChange((on) => (on ? stop() : start()));
  start();
}
