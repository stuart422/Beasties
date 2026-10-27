// Home page motion. One choreographed system: a short entrance, then each section reveals
// once as it enters the view. Only transforms and opacity animate (no layout, no filters),
// so it stays smooth on phones. No pinning, no scroll takeover, native scrolling.
// Everything runs inside one gsap.context, so Reduce motion can undo it in a single call.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
gsap.config({ force3D: true });

let ctx = null;
const counters = [];

// Count a number up from zero, always ending on the real value.
function countUp(el, tl, at) {
  const to = Number(el?.textContent);
  if (!el || !Number.isFinite(to)) return;
  counters.push([el, to]);
  const n = { v: 0 };
  tl.to(n, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(n.v); } }, at);
}

// A section timeline that plays once when its trigger reaches the lower part of the view.
function onEnter(trigger, start = 'top 80%') {
  return gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, scrollTrigger: { trigger, start, once: true } });
}

export function startHomeMotion() {
  if (ctx) return; // never initialise twice
  const root = document.documentElement;
  const small = matchMedia('(max-width: 900px)').matches;

  ctx = gsap.context(() => {
    /* ---------- Entrance: the title rises, the prints are dealt, the photo lands ---------- */
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, onStart: () => root.classList.remove('is-intro') });
    intro
      .from('.site-head', { yPercent: -100, duration: 0.9 }, 0)
      .from('.hx__eyebrow', { y: 16, autoAlpha: 0, duration: 0.8 }, 0.1)
      .from('[data-hero-line]', { yPercent: 115, duration: 1.3, stagger: 0.12 }, 0.12)
      .from('.hx__lead', { y: 22, autoAlpha: 0, duration: 1 }, 0.5)
      .from('.hx .actions .btn', { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.62)
      .from('.hx__print--back', { y: 120, rotation: -22, autoAlpha: 0, duration: 1.4, clearProps: 'transform' }, 0.2)
      .from('.hx__print--mid', { y: 140, rotation: 20, autoAlpha: 0, duration: 1.4, clearProps: 'transform' }, 0.32)
      .from('.hx__print--front', { y: 110, rotationX: 14, autoAlpha: 0, duration: 1.5, clearProps: 'transform' }, 0.45)
      .from('.hx__facts > div', { y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.8);
    document.querySelectorAll('.hx__facts dd').forEach((dd) => countUp(dd, intro, 0.9));

    // The prints rise a little faster than the page as the cover scrolls away.
    gsap.to('.hx__stack', { yPercent: small ? -4 : -8, ease: 'none', scrollTrigger: { trigger: '.hx', start: 'top top', end: 'bottom top', scrub: 0.6 } });

    /* ---------- Fall 2026, in pictures ---------- */
    onEnter('.reel')
      .from('.reel .sec-head > *', { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.1 })
      .from('.reel__stage', { y: 40, autoAlpha: 0, duration: 1.1 }, 0.1)
      .from('.reel__frame', { scale: 0.94, rotation: -1.5, duration: 1.4, ease: 'expo.out' }, 0.15)
      .from('.reel__bar > *, .reel__progress', { y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.4)
      .from('.reel__rail li', { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.03 }, 0.5);

    /* ---------- Next gathering: the invitation slides out of its envelope ---------- */
    const invite = onEnter('.invite')
      .from('.invite__card', { y: 80, rotation: -1.5, autoAlpha: 0, duration: 1.3, ease: 'expo.out' })
      .from('.invite__main > *', { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.3)
      .from('.invite__stub > *', { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.1 }, 0.5);
    countUp(document.querySelector('#countdown b'), invite, 0.55);

    /* ---------- Album archive ---------- */
    onEnter('.shelf').from('.shelf .sec-head > *', { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.1 });
    onEnter('.feature')
      .from('.feature', { y: 40, autoAlpha: 0, duration: 1.1 })
      .from('.feature__text > *', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.2)
      .from('.feature__sheet li', { y: 90, rotation: (n) => (n % 2 ? 14 : -14), autoAlpha: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', clearProps: 'transform' }, 0.25);
    onEnter('.next-page', 'top 88%').from('.next-page', { y: 28, autoAlpha: 0, duration: 0.9 });
    onEnter('.shelf__grid', 'top 88%')
      .from('.shelf__label', { autoAlpha: 0, duration: 0.6 })
      .from('.shelf__grid li', { y: 36, autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.1);

    /* ---------- What's new ---------- */
    const fresh = onEnter('.fresh')
      .from('.fresh__num', { yPercent: 25, autoAlpha: 0, duration: 1.1, ease: 'expo.out' })
      .from('.fresh__text > *', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.15)
      .from('.fresh__photos li', { y: 80, rotation: (n) => (n % 2 ? 12 : -12), autoAlpha: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', clearProps: 'transform' }, 0.25);
    countUp(document.querySelector('.fresh__num b'), fresh, 0.1);

    /* ---------- Random Beastie Sightings ---------- */
    onEnter('.sightings')
      .from('.sightings__text > *', { y: 26, autoAlpha: 0, duration: 0.8, stagger: 0.08 })
      .from('#sightEmpty:not([hidden]), #sightGrid:not([hidden]) li', { y: 60, rotation: -6, autoAlpha: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out', clearProps: 'transform' }, 0.15)
      .from('.sightings__more > *', { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.06 }, 0.5);

    /* ---------- Footer ---------- */
    onEnter('.site-foot', 'top 92%')
      .from('.site-foot .sign', { yPercent: 40, autoAlpha: 0, duration: 1, ease: 'power4.out' })
      .from('.site-foot .small, .site-foot .motion-toggle', { autoAlpha: 0, duration: 0.8 }, 0.2);
  });

  // Fonts and images change heights after load; measure triggers again then.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

  // Safety net: anything already on screen must never stay hidden.
  setTimeout(() => {
    root.classList.remove('is-intro');
    for (const st of ScrollTrigger.getAll()) {
      const tl = st.animation;
      if (tl && tl.paused() && tl.progress() === 0 && st.trigger.getBoundingClientRect().top < innerHeight) tl.play();
    }
  }, 2500);
}

// Reduce motion: undo every animation and leave the page plain and complete.
export function stopHomeMotion() {
  if (!ctx) return;
  ctx.revert();
  ctx = null;
  counters.forEach(([el, to]) => { el.textContent = to; });
  counters.length = 0;
}
