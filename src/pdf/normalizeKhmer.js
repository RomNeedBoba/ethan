/**
 * normalizeKhmer.js
 *
 * Repairs Khmer (and mixed Khmer/Latin) text that comes out of a PDF text
 * layer in a broken state. Two problems are handled:
 *
 *   1. Invisible junk: zero-width spaces, BOMs, soft hyphens, replacement
 *      characters and dotted-circle placeholders that pdf.js / the selection
 *      serializer leave behind. These make text *look* fine but break the TTS
 *      backend and corrupt rendering.
 *
 *   2. Mis-ordered Khmer clusters: many PDFs store glyphs in *visual* order,
 *      so a pre-base vowel (េ ែ ៃ ោ ៅ) ends up BEFORE its consonant, and
 *      subscripts (COENG ្ + consonant) get split by stray spaces. Rendered as
 *      logical Unicode this shows up as "broken" Khmer with dotted circles.
 *      We re-assemble each orthographic syllable into canonical storage order.
 *
 * What this CANNOT fix: PDFs built with legacy, non-Unicode Khmer fonts
 * (Limon, ABC, Kh-System, ...). Those map Khmer glyphs onto Latin code points
 * and have no usable ToUnicode map, so extraction yields Latin gibberish.
 * Use `looksLikeBrokenKhmer()` to detect and warn the user in that case.
 */

// ---- Khmer code-point predicates (Khmer block U+1780–U+17FF) ----
const isBase = (c) =>
  (c >= 0x1780 && c <= 0x17a2) || // consonants ក..អ
  (c >= 0x17a3 && c <= 0x17b3); // independent vowels
const isDepVowel = (c) => c >= 0x17b6 && c <= 0x17c5; // dependent vowels
const isPreVowel = (c) => c >= 0x17c1 && c <= 0x17c5; // render before/around base
const isShifter = (c) => c === 0x17c9 || c === 0x17ca; // ៉ ៊
const COENG = 0x17d2; // ្
const ROBAT = 0x17cc; // ៌
const isSign = (c) =>
  c === 0x17c6 || // ំ
  c === 0x17c7 || // ះ
  c === 0x17c8 || // ៈ
  c === 0x17cb || // ់
  (c >= 0x17cd && c <= 0x17d1) || // ៍ ៎ ៏ ័ ៑
  c === 0x17d3 || // ៓
  c === 0x17dd; // ៝

// Invisible / junk characters to drop outright.
const JUNK = new RegExp(
  '[' +
    '\\u200B\\u200C\\u200D' + // ZWSP, ZWNJ, ZWJ
    '\\uFEFF' + // BOM / ZWNBSP
    '\\u00AD' + // soft hyphen
    '\\u25CC' + // dotted circle placeholder
    '\\uFFFC\\uFFFD' + // object-replacement, replacement char
    '\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F' + // control chars
    ']',
  'g'
);

// Various Unicode spaces -> normal space.
const WEIRD_SPACE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

function emitCluster(cl) {
  // Canonical storage order: base, robat, coeng-groups, shifter, vowel(s), signs.
  return (
    cl.base +
    cl.robat +
    cl.coengs.join('') +
    cl.shifter +
    cl.vowels.join('') +
    cl.signs.join('')
  );
}

/**
 * Re-assemble Khmer syllables into canonical order. Non-Khmer characters
 * (Latin, digits, punctuation, spaces) pass through untouched.
 */
function reorderKhmer(str) {
  const cp = Array.from(str);
  let out = '';
  let cur = null; // open cluster
  let pendingPreVowel = ''; // pre-base vowel(s) seen before their base (visual order)

  const flush = () => {
    if (cur) {
      out += emitCluster(cur);
      cur = null;
    }
    if (pendingPreVowel) {
      out += pendingPreVowel; // orphan pre-vowel, no base ever arrived
      pendingPreVowel = '';
    }
  };

  const startBase = (ch) => {
    cur = { base: ch, robat: '', coengs: [], shifter: '', vowels: [], signs: [] };
    if (pendingPreVowel) {
      cur.vowels.push(...Array.from(pendingPreVowel));
      pendingPreVowel = '';
    }
  };

  for (let i = 0; i < cp.length; i++) {
    const ch = cp[i];
    const c = ch.codePointAt(0);

    if (isBase(c)) {
      if (cur) {
        out += emitCluster(cur);
        cur = null;
      }
      startBase(ch);
      continue;
    }

    if (c === COENG) {
      const next = cp[i + 1];
      const nc = next ? next.codePointAt(0) : -1;
      if (cur && isBase(nc)) {
        cur.coengs.push(ch + next);
        i += 1;
      } else if (cur) {
        cur.coengs.push(ch + (next || ''));
        if (next) i += 1;
      } else {
        out += ch;
      }
      continue;
    }

    if (c === ROBAT) {
      if (cur) cur.robat = ch;
      else out += ch;
      continue;
    }

    if (isShifter(c)) {
      if (cur) cur.shifter += ch;
      else out += ch;
      continue;
    }

    if (isDepVowel(c)) {
      if (isPreVowel(c)) {
        // A pre-base vowel belongs to the base it RENDERS in front of. In
        // correct logical order it sits right after a vowel-less base, so we
        // attach it. Otherwise (no open base, or the base already has a vowel)
        // it was floated here by visual-order extraction -> hand it to the
        // next base.
        if (cur && cur.vowels.length === 0) cur.vowels.push(ch);
        else pendingPreVowel += ch;
      } else if (cur) {
        cur.vowels.push(ch);
      } else {
        out += ch; // orphan non-pre vowel
      }
      continue;
    }

    if (isSign(c)) {
      if (cur) cur.signs.push(ch);
      else out += ch;
      continue;
    }

    // Anything else terminates the current cluster.
    flush();
    out += ch;
  }

  flush();
  return out;
}

/**
 * Clean + repair text selected from a PDF before display / TTS.
 * @param {string} input
 * @returns {string}
 */
export function normalizeKhmer(input) {
  if (!input || typeof input !== 'string') return '';

  let s = input.normalize('NFC'); // canonical composition
  s = s.replace(JUNK, ''); // drop invisible junk
  s = s.replace(WEIRD_SPACE, ' '); // unify spaces
  s = s.replace(/[\r\n\t]+/g, ' '); // newlines/tabs -> space (one utterance)

  // Stray space sitting before a combining mark (U+17B6–U+17D3, U+17DD) is a
  // text-layer artifact: the mark belongs to the preceding base.
  s = s.replace(/[ ]+([\u17B6-\u17D3\u17DD])/g, '$1');
  // COENG must hug its following subscript consonant.
  s = s.replace(/\u17D2[ ]+/g, '\u17D2');

  s = reorderKhmer(s);

  s = s.replace(/[ ]{2,}/g, ' ').trim(); // collapse runs of spaces
  return s;
}

/**
 * Heuristic: does this selection look like Khmer that came out mangled as
 * Latin (legacy non-Unicode font)? Use to warn the user that this PDF can't
 * be repaired client-side.
 * @param {string} input
 * @returns {boolean}
 */
export function looksLikeBrokenKhmer(input) {
  if (!input || typeof input !== 'string') return false;
  const hasKhmer = /[\u1780-\u17FF]/.test(input);
  if (hasKhmer) return false; // real Khmer code points are present
  // No Khmer code points but lots of odd Latin-with-diacritics / symbol soup
  // is the tell-tale sign of a legacy Khmer font dump.
  const odd = (input.match(/[À-ÿŒœŠšŽžµ¬†‡ˆ˜]/g) || []).length;
  return odd >= 3;
}