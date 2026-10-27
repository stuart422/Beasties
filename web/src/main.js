import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/figtree/wght.css';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initChrome, isReduced, onMotionChange } from './chrome.js';
import { startHomeMotion, stopHomeMotion } from './home-motion.js';
import { initTilt } from './tilt.js';
import { spreadPhotos } from './data/home.js';
import { api } from './api.js';
import { initSpread, renderArchive, renderNew, renderGathering, renderSightings } from './ui.js';

gsap.registerPlugin(ScrollTrigger);
await initChrome('home');

// Home reads the Fall 2026 album, the album list and the latest sightings from the server.
const [{ events }, { photos: fall }, { sightings, total: sightingTotal }] = await Promise.all([
  api('/events'), api('/events/fall-2026'), api('/sightings?limit=4'),
]);
const photos = fall.map((p) => ({ f: p.src, s: p.thumb, w: p.w, h: p.h, cap: p.caption, day: p.day }));
document.querySelectorAll('.js-total').forEach((el) => { el.textContent = photos.length; });
renderArchive(photos, events);
renderNew(photos);
renderGathering();
renderSightings(sightings, sightingTotal);


const root = document.documentElement;
const canUse3D = () => {
  if (root.classList.contains('no-webgl')) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};

/* ---------- Fall 2026 spread: photos change with a soft wipe, or instantly ---------- */

initSpread(spreadPhotos(photos), {
  animate(el, swap) {
    if (isReduced()) { swap(); return; }
    gsap.timeline()
      .to(el, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.32, ease: 'power2.in' })
      .add(swap)
      .fromTo(el, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expo.out', clearProps: 'clipPath' });
  },
});

/* ---------- Hero: the photograph as a print in 3D (full motion and WebGL only) ---------- */

const stage = document.getElementById('heroStage');
let print = null;
let heroMotion = [];

async function startPrint() {
  if (print || isReduced() || !canUse3D()) return;
  try {
    const { HeroPrint } = await import('./hero-print.js');
    if (isReduced()) return;
    print = new HeroPrint({
      canvas: document.getElementById('heroCanvas'),
      frame: stage.querySelector('.frame--hero'),
      img: document.getElementById('heroImg'),
      onLost: stopPrint,
      onReady() {
        stage.classList.add('is-3d');
        print.layout();
        // the print settles back into the page as the headline arrives
        heroMotion.push(gsap.to(print, { intro: 1, duration: 1.8, delay: 0.25, ease: 'power3.out', onUpdate: () => print?.markDirty() }));
        heroMotion.push(ScrollTrigger.create({
          trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
          onUpdate: (st) => { if (print) { print.scroll = st.progress; print.markDirty(); } },
        }));
      },
    });
    if (import.meta.env.DEV) window.__print = print;
  } catch (err) {
    console.warn('3D print unavailable, showing the flat photo.', err);
    stopPrint();
  }
}
function stopPrint() {
  heroMotion.forEach((m) => m.kill());
  heroMotion = [];
  print?.dispose();
  print = null;
  stage.classList.remove('is-3d');
}

// Desktop: the print leans toward the mouse. Phone: it leans gently toward your finger
// while you touch it and settles back when you let go. No motion sensors are used.
const hero = document.querySelector('.hero');
const lean = (e, strength) => {
  const r = stage.getBoundingClientRect();
  const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
  const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  print.setPointer(nx * strength, ny * strength);
};
hero.addEventListener('pointermove', (e) => {
  if (!print) return;
  if (e.pointerType === 'mouse') lean(e, 1);
  else if (e.pressure > 0 && stage.contains(e.target)) lean(e, 0.6);
});
stage.addEventListener('pointerdown', (e) => { if (print && e.pointerType !== 'mouse') lean(e, 0.6); });
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => hero.addEventListener(t, () => print?.setPointer(0, 0)));
gsap.ticker.add((t, deltaMs) => print?.tick(deltaMs / 1000));
window.addEventListener('pagehide', () => print?.dispose());

/* ---------- Motion system ---------- */

initTilt(document.querySelector('.spread'));
initTilt(document.querySelector('.archive'));
initTilt(document.querySelector('.news'));

if (!isReduced()) startHomeMotion({ hasPrint: canUse3D() });
startPrint();
onMotionChange((reduced) => {
  if (reduced) { stopHomeMotion(); stopPrint(); } else { startPrint(); }
});

if (import.meta.env.DEV) {
  // test hook: the hidden preview tab gets no animation frames, so step everything by hand
  window.__step = () => {
    ScrollTrigger.update();
    gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + 20);
    for (let n = 0; n < 60; n++) { print?.markDirty(); print?.tick(0.05); }
  };
}
