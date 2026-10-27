// Home page content. Every fact here comes from Stuart's handoff (10-26-2026)
// or from photos.js. Captions are only the ones already published. Do not add
// dates, places, people or activities that are not confirmed.

export const GALLERY_HREF = 'album.html?event=fall-2026';
export const HERO_ID = '01'; // N013, the approved Friday group photo

export const NEXT_GATHERING = {
  name: 'Winter Weekend 2027',
  start: '2027-01-29',
  dates: 'January 29 to February 1, 2027', // keeps "February 1, 2027" on one line
  days: 'Friday to Monday',
};

// The photo spread uses every captioned photo except the hero, with its caption.
export const spreadPhotos = (photos) => photos.filter((p) => p.cap && !idOf(p).startsWith(HERO_ID));

// Contact sheet beside the Fall 2026 album (all 4:3, so nothing is cropped).
export const ARCHIVE_IDS = ['04', '07', '21', '38'];

// Two prints fanned behind the hero photo (both 4:3): autumn mountains, the summit.
export const STACK_IDS = ['08', '05'];

// What's new: three of the 29 newly added photos (Sunday breakfast, per photos.js).
export const NEW_IDS = ['25', '24', '26'];

export const albumHref = (id) => (id ? `album.html?event=${encodeURIComponent(id)}` : 'album.html');

export const idOf = (p) => p.f.split('/').pop();
export const byId = (photos, id) => photos.find((p) => idOf(p).startsWith(`${id}-`));
