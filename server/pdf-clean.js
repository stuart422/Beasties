// Removes a PDF's "run a script when opened" action (for example the print-on-open setting some
// exports add), and nothing else. The action reference is overwritten with spaces of the same
// length, so every page, link, bookmark and byte position stays exactly where it was.
import { inflateSync } from 'node:zlib';

// The dictionary of object "n g obj ... endobj", or null.
function objectText(s, n, g) {
  const m = new RegExp(`(^|[^0-9])${n}\\s+${g}\\s+obj\\b`).exec(s);
  if (!m) return null;
  const end = s.indexOf('endobj', m.index);
  return end < 0 ? null : s.slice(m.index, end);
}

// Text of the compressed streams too, to tell whether a script action is hidden in one.
function inflatedText(buf, s) {
  let out = '';
  let at = 0;
  for (;;) {
    const i = s.indexOf('stream', at);
    if (i < 0) break;
    let start = i + 6;
    if (s[start] === '\r') start++;
    if (s[start] === '\n') start++;
    const end = s.indexOf('endstream', start);
    if (end < 0) break;
    if (/FlateDecode/.test(s.slice(Math.max(0, i - 300), i)) && !/\/Subtype\s*\/Image/.test(s.slice(Math.max(0, i - 300), i))) {
      try { out += inflateSync(buf.subarray(start, end)).toString('latin1'); } catch {}
    }
    at = end + 9;
  }
  return out;
}

const isScript = (dict) => /\/S\s*\/JavaScript\b/.test(dict || '');

/** Returns { buffer, removed, scriptLeft }. The input buffer is not changed. */
export function removeOpenScript(input) {
  const buf = Buffer.from(input);
  const s = buf.toString('latin1');
  let removed = false;

  // "/OpenAction 7 0 R" pointing at a JavaScript action
  for (const m of s.matchAll(/\/OpenAction\s+(\d+)\s+(\d+)\s+R/g)) {
    if (!isScript(objectText(s, m[1], m[2]))) continue;
    buf.fill(0x20, m.index, m.index + m[0].length);
    removed = true;
  }
  // "/OpenAction << /S /JavaScript ... >>" written in place
  for (const m of s.matchAll(/\/OpenAction\s*<</g)) {
    let depth = 0;
    let k = m.index + m[0].length - 2;
    for (; k < s.length - 1; k++) {
      if (s[k] === '<' && s[k + 1] === '<') { depth++; k++; } else if (s[k] === '>' && s[k + 1] === '>') { depth--; k++; if (!depth) break; }
    }
    if (depth || !isScript(s.slice(m.index, k + 1))) continue;
    buf.fill(0x20, m.index, k + 1);
    removed = true;
  }

  // Anything still able to run on opening: a script action we could not reach (inside a
  // compressed object stream). The upload is kept, and the admin is told.
  const after = buf.toString('latin1');
  const hidden = inflatedText(buf, after);
  const scriptLeft = [...after.matchAll(/\/OpenAction\s+(\d+)\s+(\d+)\s+R/g)].some((m) => isScript(objectText(after, m[1], m[2])))
    || (/\/OpenAction\b/.test(hidden) && /\/S\s*\/JavaScript\b/.test(hidden));
  return { buffer: buf, removed, scriptLeft };
}
