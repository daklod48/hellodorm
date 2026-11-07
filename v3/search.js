// v3 (round 5): search that finds what exists.
// 1. Both sides are normalised: lower case, accents removed (rychlovarná = rychlovarna), hyphens and punctuation become spaces.
// 2. The query is split into words. An item matches when EVERY word is found in one of its fields:
//    English or Czech title, description, category name, condition name, or its keywords list (data/items.js).
// 3. Ranking: a word found in the title counts 3, in the category 2, in the description, condition or keywords 1.
// 4. If no item has every word, the caller shows "Closest matches": the items with the most words found.

export function norm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // split letters from their accents, then drop the accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')                       // hyphens, commas, dots and other signs become spaces
    .trim();
}

// Words of the query. Single letters are dropped (they would match almost anything), single digits are kept.
export function words(q) {
  return [...new Set(norm(q).split(' ').filter((w) => w.length > 1 || /\d/.test(w)))];
}

const WEIGHT = { title: 3, cat: 2, desc: 1, cond: 1, kw: 1 };

// fields: { title, cat, desc, cond, kw } as plain strings (already in both languages), built by the app.
export function prepare(fields) {
  const out = {};
  for (const k of Object.keys(WEIGHT)) out[k] = ' ' + norm(fields[k]) + ' ';
  return out;
}

// Returns { hits, score }: how many query words were found, and the weighted score used for ranking.
export function scoreFields(prepared, ws) {
  let hits = 0, score = 0;
  for (const w of ws) {
    let best = 0;
    for (const [k, wt] of Object.entries(WEIGHT)) {
      const hay = prepared[k];
      if (!hay.includes(w)) continue;
      // A whole word or the start of a word counts a little more than a match inside a word ("lamp" in "lampa" vs "clamp").
      const bonus = hay.includes(' ' + w) ? 0.5 : 0;
      best = Math.max(best, wt + bonus);
    }
    if (best) { hits += 1; score += best; }
  }
  return { hits, score };
}
