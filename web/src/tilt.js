import { isReduced } from './chrome.js';

// A gentle 3D lean toward the mouse on any photo marked .tilt inside the container.
// Mouse only, and never with Reduce motion. Touch screens get a CSS press response instead.
export function initTilt(container) {
  if (!container) return;
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
