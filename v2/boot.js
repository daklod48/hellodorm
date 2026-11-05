// Fast first paint: draws the onboarding or welcome screen before app.js and the Firebase SDK have loaded.
// It only paints; app.js wires the buttons a moment later and repaints the same markup, so nothing jumps.
import { TEXTS } from './texts.js';
import { ICONS } from './icons.js';
import { onboardingHtml, welcomeHtml } from './first.js';

let lang = 'en', onboarded = false, signedInBefore = false;
try {
  const g = JSON.parse(localStorage.getItem('hd_guest') || '{}');
  lang = g.lang || ((navigator.language || 'en').toLowerCase().startsWith('cs') ? 'cs' : 'en');
  onboarded = !!localStorage.getItem('hd_onboarded');
  signedInBefore = !!localStorage.getItem('hd_mode') || Object.keys(localStorage).some((k) => k.startsWith('firebase:authUser'));
} catch (e) { /* storage blocked: defaults */ }

const t = (key) => { const e = TEXTS[key]; return e ? (e[lang] || e.en) : key; };
const ic = (name) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// A returning signed-in user goes straight to their last tab; app.js decides, so only paint for new visitors.
if (!signedInBefore) {
  document.documentElement.lang = lang;
  document.body.classList.add('bare');
  const view = document.getElementById('view');
  view.innerHTML = onboarded ? welcomeHtml(t, ic) : onboardingHtml(t, ic, new Set(['o1', 'o2', 'o3']));
  view.dataset.screen = onboarded ? 'welcome' : 'onboarding';
  view.dataset.booted = view.dataset.screen;
  // A tap made before the app has loaded is kept and replayed once it is ready (slow connections).
  let pending = null;
  const early = (e) => { const el = e.target.closest('[data-act], a[href]'); if (el) { pending = el; e.preventDefault(); e.stopPropagation(); } };
  document.addEventListener('click', early, true);
  const ready = () => { document.removeEventListener('click', early, true); if (pending) { const el = pending; pending = null; el.click(); } };
  // Let the browser paint this screen first, then load the app and the Firebase SDK behind it.
  // A background tab gets no animation frames, so a timer makes sure the app still loads there.
  let started = false;
  const load = () => { if (started) return; started = true; import('./app.js').then(ready, ready); };
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(load, 150)));
  setTimeout(load, 600);
} else {
  import('./app.js');
}
