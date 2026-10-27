import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';
import './styles/home.css';

import gsap from 'gsap';
import { initChrome, isReduced, onMotionChange } from './chrome.js';
import { startHomeMotion, stopHomeMotion } from './home-motion.js';
import { spreadPhotos } from './data/home.js';
import { api } from './api.js';
import {
  renderHeroStack, renderFacts, initReel, renderArchive, renderNew, renderGathering, renderSightings,
} from './ui.js';

const root = document.documentElement;
root.classList.add('is-intro');
await initChrome('home');

// Home reads the Fall 2026 album, the album list and the latest sightings from the server.
const [{ events }, { photos: fall }, { sightings, total: sightingTotal }] = await Promise.all([
  api('/events'), api('/events/fall-2026'), api('/sightings?limit=4'),
]);
const photos = fall.map((p) => ({ f: p.src, s: p.thumb, w: p.w, h: p.h, cap: p.caption, day: p.day }));
document.querySelectorAll('.js-total').forEach((el) => { el.textContent = photos.length; });
renderHeroStack(photos);
renderFacts(events);
renderGathering();
renderArchive(photos, events);
renderNew(photos);
renderSightings(sightings, sightingTotal);

/* ---------- The reel: a soft crossfade with a little drift, or an instant swap ---------- */

initReel(spreadPhotos(photos), {
  animate({ frame, from, to, dir, swap }) {
    if (isReduced()) {
      swap();
      from.classList.remove('is-on');
      to.classList.add('is-on');
      return;
    }
    gsap.killTweensOf([from, to, frame]);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(from, { autoAlpha: 0, xPercent: -6 * dir, scale: 0.98, duration: 0.45, ease: 'power2.in' }, 0)
      .to(frame, { scale: 0.985, duration: 0.3, ease: 'power2.in' }, 0)
      .add(swap, 0.3)
      .fromTo(to, { autoAlpha: 0, xPercent: 6 * dir, scale: 1.04 }, { autoAlpha: 1, xPercent: 0, scale: 1, duration: 0.8 }, 0.28)
      .to(frame, { scale: 1, duration: 0.7 }, 0.3)
      .add(() => {
        from.classList.remove('is-on');
        to.classList.add('is-on');
        gsap.set(from, { clearProps: 'all' });
        gsap.set(to, { clearProps: 'transform' });
      });
  },
});

/* ---------- The header is forest green while it sits on the cover, ivory below it ---------- */

const hero = document.getElementById('hero');
new IntersectionObserver(([e]) => root.classList.toggle('on-cover', e.isIntersecting), {
  rootMargin: '-72px 0px 0px 0px', threshold: 0,
}).observe(hero.querySelector('.hx__in'));

/* ---------- The hero prints lean toward the mouse (CSS variables only, one write per frame) ---------- */

const stack = document.getElementById('heroStack');
const front = stack.querySelector('.hx__print--front');
let pending = null;
hero.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || isReduced()) return;
  if (!pending) requestAnimationFrame(() => {
    const { x, y } = pending;
    pending = null;
    stack.style.setProperty('--px', `${(-x * 6).toFixed(1)}px`);
    stack.style.setProperty('--py', `${(-y * 6).toFixed(1)}px`);
    front.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`);
    front.style.setProperty('--rx', `${(-y * 4).toFixed(2)}deg`);
  });
  pending = { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / hero.offsetHeight) * 2 - 1 };
}, { passive: true });
hero.addEventListener('pointerleave', () => {
  ['--px', '--py'].forEach((v) => stack.style.removeProperty(v));
  ['--rx', '--ry'].forEach((v) => front.style.removeProperty(v));
});

/* ---------- Motion system ---------- */

if (isReduced()) root.classList.remove('is-intro');
else startHomeMotion();
onMotionChange((reduced) => { if (reduced) { stopHomeMotion(); root.classList.remove('is-intro'); } });

if (import.meta.env.DEV) {
  // test hook: a hidden preview tab gets no animation frames, so step everything by hand
  window.__step = async () => {
    const { ScrollTrigger } = await import('gsap/ScrollTrigger');
    ScrollTrigger.update();
    gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + 20);
  };
}
