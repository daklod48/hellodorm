// Pip the seal: HelloDorm's own mascot (an original character, not based on any brand).
// The pose images were generated with Google Gemini; every prompt is in IMAGE-PROMPTS.md.
// Pip idles in the top bar (breathing, occasional blink), opens the FAQ when tapped,
// and appears in other poses on empty states and success screens.

export const PIP_POSES = {
  wave: 'img/pip/pip-wave.webp',
  blink: 'img/pip/pip-blink.webp',
  cheer: 'img/pip/pip-cheer.webp',
  curious: 'img/pip/pip-curious.webp',
  sorry: 'img/pip/pip-sorry.webp',
};

// Small idle Pip for the top bar and side rail. The word "Pip" is visible next to the picture.
export function pipButton(label, word = 'Help') {
  return `<button class="pip-btn" data-act="pip" aria-label="${label}" title="${label}">
    <span class="pip-wrap pip-idle"><img src="${PIP_POSES.wave}" width="40" height="40" alt="" decoding="async"><img class="pip-eyes pip-blink" src="${PIP_POSES.blink}" width="40" height="40" alt="" decoding="async"></span>
    <span>${word}</span></button>`;
}

// A larger Pip pose for empty states and success screens (decorative; the text next to it carries the meaning).
export function pipPose(name, cls = '', size = 120) {
  const src = PIP_POSES[name] || PIP_POSES.wave;
  return `<img class="pip-pose ${cls}" src="${src}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;
}

// FAQ panel content. t() and ic() come from the app so the texts stay in texts.js.
export function faqHtml(t, ic) {
  const items = [];
  for (let i = 1; i <= 12; i++) {
    items.push(`<details ${i === 1 ? 'open' : ''}><summary>${t('faq' + i + '_q')}${ic('chevron-down')}</summary><p>${t('faq' + i + '_a')}</p></details>`);
  }
  return `<div class="faq-head">${pipPose('wave', 'bob', 72)}<div><h2>${t('pip_title')}</h2><p>${t('pip_sub')}</p></div></div>
    <div class="faq">${items.join('')}</div>`;
}
