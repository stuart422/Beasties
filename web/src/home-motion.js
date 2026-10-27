// Home page motion. One choreographed system: a short entrance, then each section reveals
// as it enters the view, once. Photos are revealed through masks (clip-path) that end fully
// open, so nothing is ever left cropped. No pinning and no scroll takeover.
// Everything runs inside one gsap.context, so Reduce motion can undo it in a single call.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const OPEN = 'inset(0% 0% 0% 0%)';
const FROM_BELOW = 'inset(100% 0% 0% 0%)';
const FROM_TOP = 'inset(0% 0% 100% 0%)';

let ctx = null;
const counters = [];

// Count a number up from zero, always ending on the real value.
function countUp(el, to, tl, at) {
  if (!el) return;
  counters.push([el, to]);
  const n = { v: 0 };
  tl.to(n, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(n.v); } }, at);
}

// A section timeline that plays once when its trigger reaches the lower part of the view.
function onEnter(trigger, start = 'top 78%') {
  return gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, scrollTrigger: { trigger, start, once: true } });
}

export function startHomeMotion({ hasPrint }) {
  if (ctx) return; // never initialise twice
  const small = matchMedia('(max-width: 860px)').matches;

  ctx = gsap.context(() => {
    /* ---------- Entrance: navigation, headline, words, buttons, then the photo ---------- */
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .from('.site-head', { y: -18, autoAlpha: 0, duration: 0.6 }, 0)
      .from('[data-hero-line]', { yPercent: 110, duration: 1.15, ease: 'power4.out', stagger: 0.12 }, 0.1)
      .from('.hero__title em', { '--underline': 0, duration: 0.9, ease: 'power2.inOut' }, 0.75)
      .from('.hero__lead', { y: 22, autoAlpha: 0, duration: 0.8 }, 0.45)
      .from('.hero .actions .btn', { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, 0.6)
      .from('.hero__ground', { scaleX: 0, transformOrigin: 'right center', duration: 1.3, ease: 'power4.inOut' }, 0.05)
      .from('.hero__photo .caption', { y: 12, autoAlpha: 0, duration: 0.7 }, 1.05);
    if (!hasPrint) {
      // the flat photo opens upward through a mask; the 3D print has its own settle
      intro.fromTo('.hero__stage', { clipPath: FROM_BELOW }, { clipPath: OPEN, duration: 1.3, ease: 'expo.out', clearProps: 'clipPath' }, 0.3)
        .from('.frame--hero img', { scale: 1.08, duration: 1.6, ease: 'expo.out' }, 0.3);
    }

    // The plum ground rises a little faster than the page as the hero scrolls away
    // (upward, so it never slides under the caption).
    gsap.to('.hero__ground', { yPercent: small ? -6 : -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* ---------- Fall 2026, in pictures ---------- */
    onEnter('.spread')
      .from('.spread__head > *', { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.1 })
      .fromTo('.spread__stage', { clipPath: FROM_BELOW }, { clipPath: OPEN, duration: 1.2, ease: 'expo.out', clearProps: 'clipPath' }, 0.15)
      .from('.spread__figure', { scale: 1.05, autoAlpha: 0, duration: 1.2, ease: 'expo.out' }, 0.3)
      .from('.spread__side > *', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.45)
      .from('.spread__strip li', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.035 }, 0.6);

    /* ---------- Next gathering: the plum band opens, the numbers count down to now ---------- */
    const gather = onEnter('.gathering', 'top 82%')
      .fromTo('.gathering', { clipPath: 'inset(6% 3% 6% 3% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.2, ease: 'expo.out', clearProps: 'clipPath' })
      .from('.gathering__kicker', { y: 16, autoAlpha: 0, duration: 0.7 }, 0.25)
      .from('.gathering__title', { yPercent: 40, autoAlpha: 0, duration: 1.1, ease: 'power4.out' }, 0.3)
      .from('.gathering__row > *', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.1 }, 0.55)
      .from('.gathering__row', { '--draw': 0, duration: 1, ease: 'power2.inOut' }, 0.4);
    const days = document.querySelector('#countdown b');
    if (days) countUp(days, Number(days.textContent), gather, 0.7);

    /* ---------- Album archive ---------- */
    onEnter('.archive')
      .from('.archive__head > *', { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.1 });
    onEnter('.album-open')
      .from('.album-open__text > *', { y: 26, autoAlpha: 0, duration: 0.8, stagger: 0.08 })
      .fromTo('.album-open__sheet .frame', { clipPath: FROM_BELOW }, { clipPath: OPEN, duration: 1.1, ease: 'expo.out', stagger: 0.12, clearProps: 'clipPath' }, 0.1)
      .from('.album-open__sheet img', { scale: 1.08, duration: 1.4, ease: 'expo.out', stagger: 0.12 }, 0.1);
    onEnter('.album-next', 'top 88%').from('.album-next > *', { y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.08 });
    onEnter('.album-index', 'top 85%')
      .from('.album-index__label', { autoAlpha: 0, duration: 0.6 })
      .from('.album-index__list li', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.05 }, 0.1);
    if (!small) {
      // the staggered contact sheet settles at slightly different speeds
      gsap.to('.album-open__sheet li:nth-child(even)', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.album-open', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    /* ---------- What's new ---------- */
    const news = onEnter('.news')
      .from('.news__num', { yPercent: 30, autoAlpha: 0, duration: 1, ease: 'power4.out' })
      .from('.news__text > *', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.15)
      .fromTo('.news__photos .frame', { clipPath: FROM_TOP }, { clipPath: OPEN, duration: 1.1, ease: 'expo.out', stagger: 0.12, clearProps: 'clipPath' }, 0.25);
    const num = document.querySelector('.news__num');
    if (num) countUp(num, Number(num.textContent), news, 0.1);

    /* ---------- Random Beastie Sightings ---------- */
    onEnter('.sightings')
      .from('.sightings__text > *', { y: 26, autoAlpha: 0, duration: 0.8, stagger: 0.08 })
      .from('#sightEmpty:not([hidden]), #sightGrid:not([hidden])', { scale: 0.94, autoAlpha: 0, duration: 1, ease: 'expo.out' }, 0.15)
      .from('.sightings__empty .btn', { y: 16, autoAlpha: 0, duration: 0.6 }, 0.5);

    /* ---------- Footer ---------- */
    onEnter('.site-foot', 'top 92%')
      .from('.site-foot .sign', { yPercent: 50, autoAlpha: 0, duration: 1, ease: 'power4.out' })
      .from('.site-foot .small', { autoAlpha: 0, duration: 0.8 }, 0.2);
  });

  // Fonts and images change heights after load; measure triggers again then.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

  // Safety net: anything already on screen must never stay hidden.
  setTimeout(() => {
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
