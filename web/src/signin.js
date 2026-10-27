// Sign in: the cover of the memory book. No private photos are shown on this page.
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/signin.css';

import gsap from 'gsap';
import { api } from './api.js';

const root = document.documentElement;
const reduced = () => root.dataset.motion === 'reduced';

// Only go back to a page on this site after signing in.
function nextPage() {
  const next = new URLSearchParams(location.search).get('next') || '/';
  return /^\/(?![/\\])/.test(next) ? next : '/';
}

// Already signed in: skip the cover.
try {
  const { user } = await api('/me');
  if (user) { location.replace(nextPage()); await new Promise(() => {}); }
} catch { /* the form below shows any problem when it is used */ }

/* ---------- Entrance: the title rises, the prints are dealt, the card lands ---------- */

if (reduced()) {
  root.classList.remove('is-loading');
} else {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onStart: () => root.classList.remove('is-loading') });
  tl.from('.cover__line', { yPercent: 110, duration: 1.3, stagger: 0.12 })
    .from('.cover__lead', { y: 24, autoAlpha: 0, duration: 1 }, 0.45)
    .from('.stack__print--back', { y: 140, rotation: -24, autoAlpha: 0, duration: 1.4, clearProps: 'transform' }, 0.15)
    .from('.stack__print--mid', { y: 160, rotation: 22, autoAlpha: 0, duration: 1.4, clearProps: 'transform' }, 0.27)
    .from('.card', { y: 120, rotationX: 18, autoAlpha: 0, duration: 1.5, clearProps: 'transform' }, 0.4);
}

/* ---------- The stack leans toward the mouse (desktop, full motion) ---------- */

// CSS variables only, so this never fights the entrance animation.
const stack = document.getElementById('stack');
const card = document.getElementById('card');
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || reduced()) return;
  const nx = (e.clientX / innerWidth) * 2 - 1;
  const ny = (e.clientY / innerHeight) * 2 - 1;
  card.style.setProperty('--ry', `${(nx * 4).toFixed(2)}deg`);
  card.style.setProperty('--rx', `${(-ny * 3).toFixed(2)}deg`);
  stack.style.setProperty('--px', `${(-nx * 7).toFixed(1)}px`);
  stack.style.setProperty('--py', `${(-ny * 7).toFixed(1)}px`);
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => {
  ['--rx', '--ry'].forEach((v) => card.style.removeProperty(v));
  ['--px', '--py'].forEach((v) => stack.style.removeProperty(v));
});

/* ---------- The form ---------- */

const form = document.getElementById('form');
const error = document.getElementById('error');
const submit = document.getElementById('submit');
const label = submit.querySelector('.card__submit-text');
const pw = form.password;

// Show or hide the password.
const show = document.getElementById('showPw');
show.addEventListener('click', () => {
  const on = pw.type === 'password';
  pw.type = on ? 'text' : 'password';
  show.textContent = on ? 'Hide' : 'Show';
  show.setAttribute('aria-pressed', String(on));
  show.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
  pw.focus();
});
show.setAttribute('aria-label', 'Show password');

// A gentle warning when Caps Lock is on while typing the password.
const caps = document.getElementById('caps');
const checkCaps = (e) => { if (e.getModifierState) caps.hidden = !e.getModifierState('CapsLock'); };
pw.addEventListener('keydown', checkCaps);
pw.addEventListener('keyup', checkCaps);
pw.addEventListener('blur', () => { caps.hidden = true; });

function showError(message, field) {
  error.textContent = message;
  error.hidden = false;
  form.email.setAttribute('aria-invalid', String(field === 'email' || field === 'both'));
  pw.setAttribute('aria-invalid', String(field === 'password' || field === 'both'));
  card.classList.remove('is-wrong');
  void card.offsetWidth; // restart the shake
  card.classList.add('is-wrong');
}
[form.email, pw].forEach((el) => el.addEventListener('input', () => el.removeAttribute('aria-invalid')));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const password = pw.value;
  if (!email || !password) {
    showError('Please enter your email and password.', !email && !password ? 'both' : !email ? 'email' : 'password');
    (!email ? form.email : pw).focus();
    return;
  }
  error.hidden = true;
  submit.disabled = true;
  submit.classList.add('is-busy');
  label.textContent = 'Signing in…';
  try {
    await api('/login', { method: 'POST', body: { email, password } });
    label.textContent = 'Welcome back';
    location.href = nextPage();
  } catch (err) {
    // Wrong password (401) and too many tries (429) come with their own clear message.
    // Anything else is a problem on the site, not with the password.
    showError(err.status === 401 || err.status === 429 || err.status === 0 ? err.message
      : 'We could not check your password because of a problem on the site. Your password may be fine. Please try again in a few minutes.',
    err.status === 401 ? 'both' : null);
    submit.disabled = false;
    submit.classList.remove('is-busy');
    label.textContent = 'Sign in';
    pw.select();
  }
});
