// HelloDorm v2 (copy of v1 plus the 2026-11-05 mobile and accessibility pass). Plain JavaScript, no build step.
// Firebase JS SDK 12.19.0 (modular), loaded from Google's CDN.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInAnonymously, signOut, sendPasswordResetEmail, updateProfile,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, collectionGroup, getDocs,
  onSnapshot, runTransaction, writeBatch, increment,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

import { FIREBASE_CONFIG, MANAGER_EMAILS, NTFY_TOPIC, STRIPE_PAYMENT_LINK } from './config.js';
import { TEXTS } from './texts.js';
import { ICONS } from './icons.js';
import { DORMS, STAND_HOURS, dormById, distanceM } from './data/dorms.js';
import { ITEMS, itemById } from './data/items.js';
import { CATEGORIES, SHOP_CATEGORIES, CONDITIONS, AUTO_OFFER_MINUTES, catById, standardOffer } from './data/prices.js';
import './fx.js';
import { pipButton, pipPose, faqHtml } from './pip.js';
import { onboardingHtml, welcomeHtml } from './first.js';

// ---------- Firebase ----------
const fbApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(fbApp);
const db = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });

// ---------- Constants ----------
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const HOLD_H = 48, ANSWER_DAYS = 14, COLLECT_DAYS = 30;
const PAGE_OPENED = Date.now();
const TOP_TABS = ['home', 'browse', 'sell', 'myitems', 'saved', 'profile', 'orders', 'notes', 'manager'];
const FORM_SCREENS = ['sell', 'signup', 'signin', 'bank', 'checkout', 'waitlist', 'profile', 'manager'];

// ---------- State ----------
const S = {
  ready: false,
  mode: 'none',            // none | guest | user | demo
  user: null,
  isManager: false,
  prof: blankProf(),
  prevSeen: 0,
  myItems: [], orders: [], notes: [],
  shop: {},
  offsetDays: 0,
  pos: null,
  credits: [],
  photoIds: new Set(),
  dormCredits: [],
  unsub: [],
  mgr: { tab: 'queue', items: [], stats: {}, waitlist: [], loaded: false },
  after: null,
};

function blankProf() {
  return { name: '', email: '', dorm: '', lang: guessLang(), hearts: [], cart: [], lastTab: 'home', search: '',
    filters: { cat: '', cond: '', max: 0, dorm: '' }, bank: { holder: '', iban: '', bankName: '' }, draft: null, lastSeen: 0 };
}
function guessLang() {
  try { const g = JSON.parse(localStorage.getItem('hd_guest') || '{}'); if (g.lang) return g.lang; } catch (e) { /* storage blocked */ }
  return (navigator.language || 'en').toLowerCase().startsWith('cs') ? 'cs' : 'en';
}
const now = () => Date.now() + S.offsetDays * DAY;
const uid = () => S.user && S.user.uid;
const signedIn = () => S.mode === 'user' || S.mode === 'demo';

// ---------- Small helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const L = (obj) => (obj && (obj[S.prof.lang] || obj.en)) || '';
// Placeholders: {name}; plurals: {n|one|more} or {n|one|two to four|five or more} (Czech needs three forms).
function t(key, p = {}) {
  const e = TEXTS[key];
  let s = e ? (e[S.prof.lang] || e.en) : key;
  return s.replace(/\{(\w+)(?:\|([^}]*))?\}/g, (_, k, forms) => {
    const v = p[k] ?? '';
    if (!forms) return v;
    const f = forms.split('|'); const num = Math.abs(Number(v));
    const word = num === 1 ? f[0] : (f.length === 3 ? (num >= 2 && num <= 4 ? f[1] : f[2]) : f[1]);
    return `${v} ${word}`;
  });
}
const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const locale = () => (S.prof.lang === 'cs' ? 'cs-CZ' : 'en-GB');
const fmtDate = (ms) => new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(ms));
const fmtDateLong = (ms) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms));
const fmtNum = (n) => new Intl.NumberFormat(locale()).format(n);
const czk = (n) => `${fmtNum(n)} CZK`;
function fmtDist(m) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(m / 1000)} km`;
}
function fmtLeft(ms) {
  if (ms <= 0) return t('time_up');
  const h = Math.floor(ms / HOUR), m = Math.floor((ms % HOUR) / MIN);
  if (h >= 24) return t('left_dh', { d: Math.floor(h / 24), h: h % 24 });
  return t('left_hm', { h, m });
}
function fmtAgo(ms) {
  const m = Math.max(1, Math.round(ms / MIN));
  if (m < 60) return t('ago_m', { n: m });
  if (m < 1440) return t('ago_h', { n: Math.round(m / 60) });
  return t('ago_d', { n: Math.round(m / 1440) });
}
const code = (prefix) => prefix + Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const firstName = () => (S.prof.name || '').trim().split(/\s+/)[0] || t('student');
const myDorm = () => dormById(S.prof.dorm);

// Distance from the user to a dorm stand: real position if shared this session, else from the user's own dorm.
function distTo(dormId) {
  const d = dormById(dormId);
  const from = S.pos || myDorm();
  return from ? distanceM(from, d) : null;
}
const distTxt = (dormId) => { const m = distTo(dormId); return m == null ? '' : t('away', { d: fmtDist(m) }); };
// Short distance label for cards: "in your dorm" instead of "0 m" when measured from the user's own dorm.
const distShort = (dormId) => { const m = distTo(dormId); if (m == null) return ''; return !S.pos && dormId === S.prof.dorm ? t('in_your_dorm') : fmtDist(m); };

// Next opening window of a stand, from now(), e.g. Mon 16:00 to 19:00.
function nextWindow(from = now()) {
  for (let i = 0; i < 8; i++) {
    const day = new Date(from + i * DAY);
    const h = STAND_HOURS[day.getDay()];
    if (!h) continue;
    const start = new Date(day); start.setHours(h[0], 0, 0, 0);
    const end = new Date(day); end.setHours(h[1], 0, 0, 0);
    if (end.getTime() > from) return { start: start.getTime(), end: end.getTime(), open: start.getTime() <= from };
  }
  return null;
}
const hoursTxt = () => t('hours_txt');
const winTxt = (w) => `${fmtDate(w.start)}, ${String(new Date(w.start).getHours()).padStart(2, '0')}:00 ${t('to')} ${String(new Date(w.end).getHours()).padStart(2, '0')}:00`;
// v2: one block that says exactly where and when an item is picked up (item page, checkout, pickup code).
// A dorm may carry its own 'spot' (en and cs) in data/dorms.js; otherwise a generic, clearly planned location is shown.
function pickupPlace(d, { title = true, items = '' } = {}) {
  const w = nextWindow(), me = myDorm();
  const dist = me && me.id !== d.id ? t('away', { d: fmtDist(distanceM(me, d)) }) : me ? t('in_your_dorm') : '';
  return `<div class="stand-box pickup-place">
    ${title ? `<p class="eyebrow">${t('pickup_at')}</p>` : ''}
    <h3>${ic('store')}<span>${esc(d.name)}</span></h3>
    <p class="meta">${ic('flag')}<span>${d.spot ? esc(L(d.spot)) : t('stand_spot_default')}</span></p>
    <p class="meta">${ic('map-pin')}<span>${esc(d.address)}${dist ? ` · <b>${dist}</b>` : ''}</span></p>
    <p class="meta">${ic('clock')}<span>${hoursTxt()}</span></p>
    ${w ? `<p class="meta">${ic('calendar')}<span>${t('next_pickup', { w: winTxt(w) })}</span></p>` : ''}
    ${items}
  </div>`;
}
const tick = (on) => (on ? `<span class="tick" aria-hidden="true">${ic('check')}</span>` : '');
// Category label; "Other" items carry the student's own words.
const catName = (it) => (it.cat === 'other' && it.other ? `${t('cat_other')}: ${it.other}` : t('cat_' + it.cat));

// ---------- Toast, modal, network ----------
let toastTimer;
function toast(msg, kind = '') {
  const el = $('#toast');
  el.className = `toast show ${kind}`;
  el.innerHTML = `${ic(kind === 'err' ? 'triangle-alert' : 'circle-check')}<span>${esc(msg)}</span>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), 2400);
}
function hideToast() { const el = $('#toast'); if (el) el.className = 'toast'; clearTimeout(toastTimer); }
let lockY = 0;
function openModal(html, cls = '') {
  const m = $('#modal');
  if (!m.classList.contains('show')) {
    lockY = window.scrollY;
    document.body.style.top = `-${lockY}px`;
    document.body.classList.add('modal-open');
  }
  m.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true"><button class="sheet-x" data-act="close">${ic('x')}<span>${t('close')}</span></button><div class="sheet-body">${html}</div></div>`;
  m.classList.add('show');
  const f = m.querySelector('.sheet-body input, .sheet-body button'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
}
function closeModal() {
  const m = $('#modal');
  if (!m.classList.contains('show')) return;
  m.classList.remove('show'); m.innerHTML = '';
  document.body.classList.remove('modal-open'); document.body.style.top = '';
  window.scrollTo(0, lockY);
}

function errMsg(e) {
  const c = (e && e.code) || '';
  if (c.includes('resource-exhausted') || c.includes('quota')) return t('err_quota');
  if (c.includes('permission-denied')) return t('err_perm');
  if (c.includes('unavailable') || c.includes('network')) return t('err_net');
  if (c.includes('email-already-in-use')) return t('err_email_used');
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return t('err_login');
  if (c.includes('weak-password')) return t('err_weak');
  if (c.includes('invalid-email')) return t('err_email');
  if (c.includes('too-many-requests')) return t('err_many');
  if (c.includes('operation-not-allowed') || c.includes('admin-restricted')) return t('err_provider');
  console.warn(e);
  return t('err_generic');
}
const fail = (e) => toast(errMsg(e), 'err');

function setNet() {
  const off = !navigator.onLine;
  $('#netbar').hidden = !off;
  $('#netbar').innerHTML = `${ic('wifi-off')}<span>${t('offline')}</span>`;
}
window.addEventListener('online', setNet);
window.addEventListener('offline', setNet);

// ---------- Counters (no personal data) ----------
function bump(name) {
  setDoc(doc(db, 'stats', name), { n: increment(1) }, { merge: true }).catch(() => {});
}

// ---------- ntfy phone alert (no personal data) ----------
function ntfy(message) {
  return fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: 'POST', body: message }).catch(() => {});
}

// ---------- Saving preferences ----------
let saveTimer, pendingPatch = {};
function savePrefs(patch, delay = 0) {
  Object.assign(S.prof, patch);
  if (S.mode === 'guest' || S.mode === 'none') {
    try { localStorage.setItem('hd_guest', JSON.stringify(S.prof)); } catch (e) { /* storage blocked */ }
    return;
  }
  if (!signedIn()) return;
  Object.assign(pendingPatch, patch);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const p = pendingPatch; pendingPatch = {};
    if (!signedIn() || !uid()) return; // signed out while the save was waiting
    setDoc(doc(db, 'users', uid()), p, { merge: true }).catch(fail);
  }, delay);
}

// ---------- Auth and loading ----------
onAuthStateChanged(auth, async (user) => {
  S.unsub.forEach((u) => u()); S.unsub = [];
  S.user = user;
  if (user) {
    S.mode = user.isAnonymous ? 'demo' : 'user';
    S.isManager = !!user.email && MANAGER_EMAILS.map((e) => e.toLowerCase()).includes(user.email.toLowerCase());
    await loadUser();
  } else {
    S.isManager = false;
    S.myItems = []; S.orders = []; S.notes = [];
    S.prof = blankProf();
    let guest = null;
    try { guest = JSON.parse(localStorage.getItem('hd_guest') || 'null'); } catch (e) { /* storage blocked */ }
    if (guest) Object.assign(S.prof, guest);
    // v2: anyone not signed in browses as a guest at once (the professor's rule: the link lands on Home, no account).
    S.mode = 'guest';
    S.orders = guestOrders();
  }
  S.ready = true;
  // Round 4: back from Stripe's payment page (?paid=1). Finished once the orders have loaded (see listenMine).
  if (new URLSearchParams(location.search).get('paid') === '1' && signedIn()) { S.payReturn = true; history.replaceState(null, '', location.pathname + '#/orders'); }
  // v2: someone opened a dorm mate's invite link (?dorm=thaler): choose that dorm for them unless they already have one.
  const inv = new URLSearchParams(location.search).get('dorm');
  if (inv && dormById(inv) && !S._invDone) {
    S._invDone = true;
    if (!S.prof.dorm) { savePrefs({ dorm: inv }); setTimeout(() => toast(t('invite_arrived', { d: dormById(inv).short })), 700); }
    if (new URLSearchParams(location.search).get('ref') === 'invite') bump('invite_visit');
    history.replaceState(null, '', location.pathname + location.hash);
  }
  const r = parseHash();
  if (signedIn() && (!r.name || ['welcome', 'signup', 'signin', 'onboarding', 'loading'].includes(r.name))) {
    go(S.after || S.prof.lastTab || 'home', true);
    S.after = null;
  } else render();
  if (signedIn() && !S.prof.dorm && !S.seeding) askDorm();
});

async function loadUser() {
  const ref = doc(db, 'users', uid());
  let snap;
  try { snap = await getDoc(ref); } catch (e) { fail(e); }
  const base = blankProf();
  if (snap && snap.exists()) {
    S.prof = Object.assign(base, snap.data());
    S.prof.filters = Object.assign(blankProf().filters, S.prof.filters || {});
    S.prof.bank = Object.assign(blankProf().bank, S.prof.bank || {});
    S.prof.hearts = Array.isArray(S.prof.hearts) ? S.prof.hearts : [];
    S.prof.cart = Array.isArray(S.prof.cart) ? S.prof.cart : [];
  } else {
    S.prof = base;
    if (S.user.email) { S.prof.email = S.user.email; S.prof.name = S.user.displayName || ''; }
  }
  S.prevSeen = S.prof.lastSeen || 0;
  // A guest who signs in to an existing account keeps what they picked as a guest (cart, hearts, dorm if none yet).
  const g = S.mergeGuest; S.mergeGuest = null;
  if (g && ((g.cart || []).length || (g.hearts || []).length || (g.dorm && !S.prof.dorm))) {
    const cart = [...S.prof.cart, ...(g.cart || []).filter((c) => !S.prof.cart.some((x) => x.id === c.id))];
    const hearts = [...new Set([...S.prof.hearts, ...(g.hearts || [])])];
    Object.assign(S.prof, { cart, hearts, dorm: S.prof.dorm || g.dorm || '' });
    setDoc(ref, { cart, hearts, dorm: S.prof.dorm }, { merge: true }).catch(() => {});
    try { localStorage.removeItem('hd_guest'); } catch (x) { /* ignore */ }
  }
  setDoc(ref, { lastSeen: now(), email: S.user.email || '' }, { merge: true }).catch(() => {});
  listenMine();
}

function listenMine() {
  S.unsub.forEach((u) => u()); S.unsub = [];
  const u = uid();
  const sort = (arr, k) => arr.sort((a, b) => (b[k] || 0) - (a[k] || 0));
  S.unsub.push(onSnapshot(collection(db, 'users', u, 'items'), (qs) => {
    S.myItems = sort(qs.docs.map((d) => ({ id: d.id, ...d.data() })), 'createdAt');
    syncSoon(); softRender();
  }, () => {}));
  S.unsub.push(onSnapshot(collection(db, 'users', u, 'orders'), (qs) => {
    S.orders = sort(qs.docs.map((d) => ({ id: d.id, ...d.data() })), 'reservedAt');
    if (S.payReturn) finishCardReturn();
    syncSoon(); softRender();
  }, () => {}));
  S.unsub.push(onSnapshot(collection(db, 'users', u, 'notes'), (qs) => {
    S.notes = sort(qs.docs.map((d) => ({ id: d.id, ...d.data() })), 'at');
    softRender();
  }, () => {}));
}

// Shared data everyone can read: which sample items are reserved or sold, and the prototype clock.
onSnapshot(collection(db, 'shop'), (qs) => {
  S.shop = {}; qs.docs.forEach((d) => (S.shop[d.id] = d.data()));
  softRender();
}, () => {});
onSnapshot(doc(db, 'config', 'clock'), (d) => {
  const o = (d.exists() && d.data().offsetDays) || 0;
  if (o !== S.offsetDays) { S.offsetDays = o; syncSoon(); softRender(); }
}, () => {});

// ---------- Rules that run in the app (no server) ----------
// Automatic offer after 10 minutes, 14-day answer window, 30-day collection window, 48-hour hold.
let syncTimer;
function syncSoon() { clearTimeout(syncTimer); syncTimer = setTimeout(syncMine, 400); }
setInterval(() => { if (signedIn()) syncMine(); refreshTimers(); }, 30000);

function note(type, p = {}) {
  return addDoc(collection(db, 'users', uid(), 'notes'), { type, p, read: false, at: now() }).catch(() => {});
}

async function syncMine() {
  if (!signedIn()) return;
  const u = uid(), n = now();
  for (const it of S.myItems) {
    const ref = doc(db, 'users', u, 'items', it.id);
    const p = { title: it.title, stand: it.stand };
    try {
      if (it.status === 'examining' && !it.hold && it.droppedAt && n - it.droppedAt > AUTO_OFFER_MINUTES * MIN) {
        await updateDoc(ref, { status: 'offer', offer: standardOffer(it.cat, it.cond), offerBy: 'auto', offerAt: n, answerBy: n + ANSWER_DAYS * DAY });
        continue;
      }
      if (it.status === 'offer' && it.answerBy && n > it.answerBy) {
        await updateDoc(ref, { status: 'donated', donatedReason: 'noanswer', n_donated: true });
        note('noanswer', p); continue;
      }
      if ((it.status === 'declined' || it.status === 'rejected') && it.collectBy && n > it.collectBy) {
        await updateDoc(ref, { status: 'disposed' });
        note('disposed', p); continue;
      }
      if (it.status === 'offer' && !it.n_offer) { await updateDoc(ref, { n_offer: true }); note('offer', { ...p, price: it.offer }); }
      if (it.status === 'rejected' && !it.n_rejected) { await updateDoc(ref, { n_rejected: true }); note('rejected', { ...p, date: it.collectBy }); }
      if (it.status === 'donated' && !it.n_donated) { await updateDoc(ref, { n_donated: true }); note('thanks', p); }
    } catch (e) { /* offline: try again later */ }
  }
  for (const o of S.orders) {
    if (o.status !== 'reserved') continue;
    const ref = doc(db, 'users', u, 'orders', o.id);
    try {
      if (n > o.expiresAt) {
        await updateDoc(ref, { status: 'expired' });
        for (const x of orderItems(o)) { const sh = S.shop[x.id]; if (sh && sh.by === u && sh.status === 'reserved') await deleteDoc(doc(db, 'shop', x.id)).catch(() => {}); }
        note('expired', { title: orderTitle(o) }); continue;
      }
      if (o.expiresAt - n < 12 * HOUR && !o.n_soon) { await updateDoc(ref, { n_soon: true }); note('soon', { title: orderTitle(o), date: o.expiresAt }); }
    } catch (e) { /* offline */ }
  }
}

// ---------- Router ----------
function parseHash() {
  const parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || '', arg: parts[1] ? decodeURIComponent(parts[1]) : '' };
}
function go(path, replace = false) {
  const h = '#/' + path;
  if (replace) history.replaceState(null, '', h); else if (location.hash !== h) { location.hash = h; return; }
  render();
}
window.addEventListener('hashchange', () => { closeModal(); render(); });

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }

const SCREENS = {};
let currentName = '', lastPainted = '';
// A screen change animates (View Transitions where supported); a re-render of the same screen paints at once.
function render() {
  const { name } = parseHash();
  const changed = S.ready && name !== lastPainted;
  if (changed) hideToast();
  if (changed && window.HD_FX) window.HD_FX.transition(paint); else paint();
}
function paint() {
  document.documentElement.lang = S.prof.lang === 'cs' ? 'cs' : 'en';
  if (!S.ready) { if (!$('#view').dataset.booted) $('#view').innerHTML = `<div class="splash">${pipPose('wave', 'bob', 140)}<p>HelloDorm</p></div>`; return; }
  let { name, arg } = parseHash();
  const open = ['onboarding', 'welcome', 'signup', 'signin', 'about'];
  if (S.mode === 'none' && !open.includes(name)) name = lsGet('hd_onboarded') ? 'welcome' : 'onboarding';
  if (signedIn() && ['welcome', 'onboarding'].includes(name)) name = 'home';
  if (!name) name = 'home';
  if (!SCREENS[name]) name = 'home';
  if (name === 'manager' && !S.isManager) name = 'home';
  currentName = name;
  const scr = SCREENS[name](arg);
  const bare = ['onboarding', 'welcome', 'signup', 'signin'].includes(name);
  document.body.classList.toggle('bare', bare);
  // boot.js may already have painted this exact screen: keep that DOM (no flash, no second largest paint).
  const booted = !lastPainted && $('#view').dataset.booted === name && $('#view').innerHTML.length > 100;
  if (!booted) $('#view').innerHTML = scr.html + (bare ? '' : `<p class="proto-foot">${t('proto_note')}</p>`);
  $('#view').dataset.screen = name;
  $('#view').dataset.booted = '';
  renderChrome(name, scr);
  document.title = scr.title ? `${scr.title} · HelloDorm` : 'HelloDorm';
  if (scr.after) scr.after();
  if (window.HD_FX && !booted && name !== lastPainted) window.HD_FX.reveal();
  lastPainted = name;
  if (TOP_TABS.includes(name) && signedIn() && S.prof.lastTab !== name) savePrefs({ lastTab: name }, 800);
  refreshTimers();
  setNet();
}
// Re-render on live data, except while the user is typing in a form.
function softRender() {
  if (!S.ready) return;
  if (FORM_SCREENS.includes(currentName) && document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { renderChrome(currentName, {}); return; }
  if ($('#modal').classList.contains('show')) { renderChrome(currentName, {}); return; }
  const y = window.scrollY; render(); window.scrollTo(0, y);
}

function unreadCount() { return S.notes.filter((n) => !n.read).length; }

function renderChrome(name, scr) {
  const tabs = [
    ['home', 'house', 'tab_home'], ['sell', 'circle-plus', 'tab_sell'], ['myitems', 'package', 'tab_myitems'],
    ['saved', 'heart', 'tab_saved'], ['profile', 'user', 'tab_profile'],
  ];
  const active = (n) => (n === name || (n === 'home' && ['browse', 'item', 'stands'].includes(name)) || (n === 'myitems' && ['myitem', 'sold'].includes(name)) || (n === 'profile' && ['bank', 'about', 'waitlist'].includes(name)) ? 'active' : '');
  const SIDE_OF = { item: 'browse', checkout: 'cart', placed: 'orders', order: 'orders', myitem: 'myitems', sold: 'myitems', bank: 'profile', about: 'profile', waitlist: 'profile' };
  const activeSide = (n) => n === name || SIDE_OF[name] === n;
  $('#tabbar').innerHTML = tabs.map(([n, i, k]) => `<a href="#/${n}" class="${active(n)}" ${active(n) ? 'aria-current="page"' : ''}>${ic(i)}<span>${t(k)}</span></a>`).join('');
  const side = [
    ['home', 'house', 'tab_home'], ['browse', 'search', 'nav_browse'], ['sell', 'circle-plus', 'tab_sell'],
    ['myitems', 'package', 'tab_myitems'], ['saved', 'heart', 'tab_saved'], ['orders', 'shopping-bag', 'nav_orders'],
    ['cart', 'shopping-cart', 'cart_t'], ['notes', 'bell', 'nav_inbox'], ['stands', 'map', 'nav_stands'], ['profile', 'user', 'tab_profile'],
  ];
  if (S.isManager) side.push(['manager', 'shield-check', 'nav_manager']);
  const un = unreadCount(), cc = cartCount();
  $('#langwrap').innerHTML = `<button class="langbtn" data-act="lang-menu" aria-haspopup="menu" aria-expanded="false" aria-label="${t('lang_btn')}">${ic('globe')}<span>${S.prof.lang === 'cs' ? 'CZ' : 'EN'}</span></button>
    <div class="lang-menu" id="langMenu" role="menu" hidden><p class="eyebrow">${t('menu_lang')}</p>
      <button role="menuitemradio" aria-checked="${S.prof.lang === 'en'}" class="${S.prof.lang === 'en' ? 'on' : ''}" data-act="set-lang" data-v="en">${tick(S.prof.lang === 'en')}${t('lang_en')}</button>
      <button role="menuitemradio" aria-checked="${S.prof.lang === 'cs'}" class="${S.prof.lang === 'cs' ? 'on' : ''}" data-act="set-lang" data-v="cs">${tick(S.prof.lang === 'cs')}${t('lang_cs')}</button></div>`;
  $('#sidenav').innerHTML = `
    <div class="brand-row"><a href="#/home" class="brand">${ic('recycle')}<span>HelloDorm</span></a>${pipButton(t('pip_btn'), t('help_word'))}</div>
    <p class="tagline">${t('tagline')}</p>
    <nav>${side.map(([n, i, k]) => `<a href="#/${n}" class="${activeSide(n) ? 'active' : ''}">${ic(i)}<span>${t(k)}</span>${n === 'notes' && un ? `<b class="count">${un}</b>` : ''}${n === 'cart' && cc ? `<b class="count">${cc}</b>` : ''}</a>`).join('')}</nav>
    <div class="side-foot">${modeBadge()}</div>`;
  const deep = !TOP_TABS.includes(name) && !['stands'].includes(name);
  const title = scr.title !== undefined ? scr.title : ($('#topbar h1') ? $('#topbar h1').textContent : '');
  $('#topbar').classList.toggle('deep', deep);
  $('#topbar').innerHTML = `
    ${deep ? `<button class="iconbtn" data-act="back" data-word="${t('back')}">${ic('arrow-left')}<span>${t('back')}</span></button>` : `<a href="#/home" class="brand sm">${ic('recycle')}<span>HelloDorm</span></a>`}
    ${pipButton(t('pip_btn'), t('help_word'))}
    <h1>${esc(title)}</h1>
    <a href="#/cart" class="iconbtn inbox cart-link" id="cartLink">${ic('shopping-cart')}<span>${t('cart_t')}</span>${cc ? `<b class="count" id="cartCount">${cc}</b>` : ''}</a>
    <a href="#/notes" class="iconbtn inbox">${ic('bell')}<span>${t('nav_inbox')}</span>${un ? `<b class="count">${un}</b>` : ''}</a>`;
}
function modeBadge() {
  if (S.mode === 'demo') return `<span class="pill sun">${ic('sparkles')}${t('demo_badge')}</span>`;
  if (S.mode === 'guest') return `<span class="pill grey">${ic('eye')}${t('guest_badge')}</span>`;
  if (S.isManager) return `<span class="pill green">${ic('shield-check')}${t('manager_badge')}</span>`;
  return '';
}

// ---------- Orders: one order per stand, several items each (older demo orders had one item) ----------
const orderItems = (o) => o.items || [{ id: o.itemId, title: o.title, cat: o.cat, price: o.price, photoId: o.photoId || o.itemId }];
const orderTitle = (o) => { const its = orderItems(o); return its.length === 1 ? L(its[0].title) : t('n_items', { n: its.length }); };
const orderTotal = (o) => o.total ?? orderItems(o).reduce((s, x) => s + x.price, 0);
const orderThumb = (o) => { const x = orderItems(o)[0]; return { ...x, photoId: x.photoId || x.id }; };

// ---------- Cart (saved in the account; guests keep it on the device until sign up) ----------
const inCart = (id) => S.prof.cart.some((c) => c.id === id);
function cartBtn(id, big = false) {
  const on = inCart(id);
  return on ? `<a class="cartbtn on ${big ? 'big' : ''}" href="#/cart" data-id="${id}">${ic('check')}<span>${t('in_cart')}${big ? `<small>${t('in_cart_sub')}</small>` : ''}</span></a>`
    : `<button class="cartbtn ${big ? 'big' : ''}" data-act="cart-add" data-id="${id}">${ic('shopping-cart')}<span>${t('add_cart')}${big ? `<small>${t('add_cart_sub')}</small>` : ''}</span></button>`;
}
const cartCount = () => S.prof.cart.filter((c) => itemById(c.id)).length;

// Dorm backdrop for the home header: a Commons photo per dorm, or a generated illustration per area.
const DORM_AREA = { palach: 'jarov', eisler: 'jarov', thaler: 'jarov', jarov2: 'jarov' };
function dormPhoto(dormId) {
  const key = DORM_AREA[dormId] || dormId;
  return S.dormCredits.find((c) => c.dorm === key) || null;
}

// ---------- Pieces ----------
function photo(it, cls = '') {
  if (it.photo) return `<img class="${cls}" src="${it.photo}" alt="${esc(L(it.title) || it.title)}" width="400" height="400">`;
  const pid = it.photoId || it.id;
  if (S.photoIds.has(pid)) return `<img class="${cls}" src="img/${pid}.webp" alt="${esc(L(it.title) || it.title)}" width="600" height="600" ${cls.includes('big') ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
  const c = catById(it.cat) || CATEGORIES[0];
  return `<div class="tile ${cls}" style="background:${c.color}">${ic(c.icon)}<span>${t('cat_' + c.id)}</span></div>`;
}
function shopState(id) {
  if (!signedIn() && S.orders.some((o) => o.status === 'reserved' && orderItems(o).some((x) => x.id === id))) return 'mine';
  const s = S.shop[id];
  if (!s) return 'free';
  if (s.status === 'sold') return s.by === uid() ? 'mine-sold' : 'sold';
  if (s.status === 'reserved' && s.until > now()) return s.by === uid() ? 'mine' : 'reserved';
  return 'free';
}
// ---------- Guest orders (v2): kept in this browser only, so a visitor can try checkout with no account ----------
// Nothing is written to the database and no shop item is held for other people; the pickup code is a demo code.
const GUEST_ORDERS = 'hd_guest_orders';
function guestOrders() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(GUEST_ORDERS) || '[]'); } catch (e) { /* storage blocked */ }
  const n = now();
  return list.map((o) => (o.status === 'reserved' && n > o.expiresAt ? { ...o, status: 'expired' } : o)).sort((a, b) => b.reservedAt - a.reservedAt);
}
function saveGuestOrders(list) {
  try { localStorage.setItem(GUEST_ORDERS, JSON.stringify(list)); } catch (e) { /* storage blocked: the order still shows until the page closes */ }
  S.orders = list.slice().sort((a, b) => b.reservedAt - a.reservedAt);
}
const isHeart = (id) => S.prof.hearts.includes(id);
function heartBtn(id, big = false) {
  const on = isHeart(id);
  return `<button class="heart ${on ? 'on' : ''} ${big ? 'big' : ''}" data-act="heart" data-id="${id}" aria-pressed="${on}">${ic('heart')}<span>${on ? t('saved') : t('save')}</span></button>`;
}
// v2: on cards the heart is a round icon button on the photo. Its visible word moved into aria-label, so screen readers still say "Save" or "Saved".
function heartIcon(id) {
  const on = isHeart(id);
  return `<button class="heart-ic ${on ? 'on' : ''}" data-act="heart" data-id="${id}" aria-pressed="${on}" aria-label="${on ? t('saved') : t('save')}">${ic('heart')}</button>`;
}
function card(it) {
  const st = shopState(it.id);
  const d = dormById(it.dorm);
  const flag = st === 'free' ? '' : `<span class="chip over">${ic(st === 'sold' || st === 'mine-sold' ? 'ban' : 'clock')}${t(st === 'mine' ? 'reserved_you' : st.includes('sold') ? 'sold' : 'reserved')}</span>`;
  return `<article class="card ${st !== 'free' && st !== 'mine' ? 'dim' : ''}">
    <a href="#/item/${it.id}" class="ph">${photo(it)}<span class="chip price">${czk(it.price)}</span>${flag}</a>${heartIcon(it.id)}
    <div class="cb">
      <div class="badges"><span class="badge cond">${ic('star')}${t('cond_' + it.cond)}</span><span class="badge clean">${ic('sparkles')}<span class="long">${t('cleaned')}</span><span class="short">${t('cleaned_short')}</span></span></div>
      <h3><a href="#/item/${it.id}">${esc(L(it.title))}</a></h3>
      <p class="meta pickup-line">${ic('map-pin')}<span><b>${t('pickup_card', { d: d.short })}</b>${distShort(it.dorm) ? ' · ' + distShort(it.dorm) : ''}</span></p>
      <p class="meta small"><span>${t('new_was', { p: czk(it.newPrice) })} · ${fmtAgo(it.listedMin * MIN + (Date.now() - PAGE_OPENED))}</span></p>
      ${st === 'free' ? `<div class="card-actions">${cartBtn(it.id)}</div>` : ''}
    </div>
  </article>`;
}
const grid = (items) => `<div class="grid">${items.map(card).join('')}</div>`;
function empty(icon, title, body, cta = '') {
  return `<div class="empty">${pipPose('curious')}<h3>${title}</h3><p>${body}</p>${cta}</div>`;
}
function statusPill(st) {
  const map = { waiting: ['clock', 'grey'], examining: ['search', 'blue'], offer: ['banknote', 'sun'], accepted: ['circle-check', 'green'],
    declined: ['rotate-ccw', 'grey'], rejected: ['ban', 'red'], donated: ['hand-heart', 'green'], disposed: ['recycle', 'grey'], collected: ['check', 'grey'],
    reserved: ['ticket', 'sun'], picked: ['circle-check', 'green'], expired: ['clock', 'grey'] };
  const [i, c] = map[st] || ['info', 'grey'];
  return `<span class="pill ${c}">${ic(i)}${t('st_' + st)}</span>`;
}

// ---------- Screens: onboarding and welcome ----------
SCREENS.onboarding = () => {
  return {
    title: t('ob_title'),
    html: onboardingHtml(t, ic, S.photoIds),
    after() {
      const tr = $('#onbTrack');
      if (!tr) return;
      tr.addEventListener('scroll', () => {
        const n = Math.round(tr.scrollLeft / tr.clientWidth);
        [...$('#onbDots').children].forEach((d, i) => d.classList.toggle('on', i === n));
        $('#obNext').innerHTML = n === 2 ? `${t('get_started')}${ic('chevron-right')}` : `${t('next')}${ic('chevron-right')}`;
      });
    },
  };
};

SCREENS.welcome = () => ({
  title: t('welcome_title'),
  html: welcomeHtml(t, ic),
});

SCREENS.signup = () => ({
  title: t('sign_up'),
  html: `<section class="auth">
    <button class="iconbtn" data-act="back">${ic('arrow-left')}<span>${t('back')}</span></button>
    <h1>${t('signup_title')}</h1>
    <p class="muted">${t('signup_sub')}</p>
    <form id="fSignup" class="form" novalidate>
      <label>${t('f_name')}<input name="name" autocomplete="given-name" required maxlength="40" value="${esc(S.prof.name)}"></label>
      <label>${t('f_email')}<input name="email" type="email" autocomplete="email" required></label>
      <label>${t('f_password')}<input name="password" type="password" autocomplete="new-password" required minlength="6">
        <small class="note">${ic('info')}${t('pw_note')}</small></label>
      <p class="form-err" id="fErr" role="alert"></p>
      <button class="btn primary wide big" type="submit">${t('create_account')}</button>
    </form>
    <p class="center">${t('have_account')} <a href="#/signin">${t('sign_in')}</a></p>
    <p class="center"><button class="linkbtn" data-act="demo">${ic('sparkles')}<span>${t('or_demo')}</span></button></p>
  </section>`,
  after() { $('#fSignup').addEventListener('submit', doSignup); },
});

SCREENS.signin = () => ({
  title: t('sign_in'),
  html: `<section class="auth">
    <button class="iconbtn" data-act="back">${ic('arrow-left')}<span>${t('back')}</span></button>
    <h1>${t('signin_title')}</h1>
    <form id="fSignin" class="form" novalidate>
      <label>${t('f_email')}<input name="email" type="email" autocomplete="email" required></label>
      <label>${t('f_password')}<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="form-err" id="fErr" role="alert"></p>
      <button class="btn primary wide big" type="submit">${t('sign_in')}</button>
    </form>
    <p class="center"><button class="linkbtn" data-act="forgot">${ic('mail')}<span>${t('forgot')}</span></button></p>
    <p class="center">${t('no_account')} <a href="#/signup">${t('sign_up')}</a></p>
  </section>`,
  after() { $('#fSignin').addEventListener('submit', doSignin); },
});

async function doSignup(e) {
  e.preventDefault();
  const f = new FormData(e.target), err = $('#fErr');
  const name = f.get('name').trim(), email = f.get('email').trim(), pw = f.get('password');
  if (!name) return (err.textContent = t('err_name'));
  if (!/^\S+@\S+\.\S+$/.test(email)) return (err.textContent = t('err_email'));
  if (pw.length < 6) return (err.textContent = t('err_weak'));
  const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = t('working');
  const guest = { ...S.prof };
  const after = S.after; S.after = null;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(cred.user, { displayName: name });
    // Move what the guest chose into the new account.
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, dorm: guest.dorm || '', lang: guest.lang, hearts: guest.hearts || [], cart: guest.cart || [], lastTab: 'home',
      search: guest.search || '', filters: guest.filters || blankProf().filters, bank: blankProf().bank, draft: null,
      createdAt: now(), lastSeen: 0,
    }, { merge: true });
    lsSet('hd_mode', ''); try { localStorage.removeItem('hd_guest'); } catch (x) { /* ignore */ }
    bump('signup'); bump('users');
    S.prof.name = name;
    await loadUser();
    toast(t('welcome_new', { name }));
    go(after || 'home', true);
    if (!S.prof.dorm) askDorm();
  } catch (x) { err.textContent = errMsg(x); btn.disabled = false; btn.textContent = t('create_account'); }
}
async function doSignin(e) {
  e.preventDefault();
  const f = new FormData(e.target), err = $('#fErr');
  const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = t('working');
  try {
    S.mergeGuest = { ...S.prof };
    await signInWithEmailAndPassword(auth, f.get('email').trim(), f.get('password'));
    lsSet('hd_mode', '');
  } catch (x) { err.textContent = errMsg(x); btn.disabled = false; btn.textContent = t('sign_in'); }
}

// ---------- Home ----------
// ---------- Account choices (round 4): shown on Home, never a wall ----------
function accountChoices() {
  return `<div class="acct">
    <div class="acct-h">${ic('user')}<div><b>${t('acct_t')}</b><p>${t('acct_b')}</p></div></div>
    <div class="acct-btns"><a class="btn primary" href="#/signin">${ic('lock')}${t('sign_in')}</a><a class="btn outline" href="#/signup">${ic('user-plus')}${t('sign_up')}</a>
    <button class="btn sun" data-act="demo">${ic('sparkles')}<span>${t('demo_try')}<small>${t('demo_try_sub')}</small></span></button></div>
  </div>`;
}

// ---------- Community and sign ups (v2, professor feedback 5 Nov 2026) ----------
// Dorm board: stands ranked by the sample items waiting there. Social proof and a little dorm pride; honest about its source.
function dormBoard() {
  const me = S.prof.dorm;
  const rows = DORMS.map((d) => ({ d, n: availableItems().filter((i) => i.dorm === d.id).length })).filter((r) => r.n).sort((a, b) => b.n - a.n || a.d.short.localeCompare(b.d.short));
  if (!rows.length) return '';
  const top = rows.slice(0, 5), mine = rows.findIndex((r) => r.d.id === me);
  const show = mine >= 5 ? [...top, rows[mine]] : top, max = rows[0].n;
  return `<div class="board">
    <div class="board-h">${ic('trophy')}<div><h2>${t('board_t')}</h2><p class="muted small">${t('board_b')}</p></div></div>
    <ol>${show.map((r) => `<li class="${r.d.id === me ? 'me' : ''}"><span class="rank">${rows.indexOf(r) + 1}</span><span class="who">${esc(r.d.short)}${r.d.id === me ? ` <span class="pill green">${t('your_dorm_short')}</span>` : ''}</span><span class="barwrap" aria-hidden="true"><span style="width:${Math.round((r.n / max) * 100)}%"></span></span><b>${t('n_items', { n: r.n })}</b></li>`).join('')}</ol>
    <p class="meta small">${ic('info')}<span>${t('board_note')}</span></p>
  </div>`;
}
// Invite a dorm mate: a link that opens HelloDorm with the inviter's dorm already chosen.
function inviteCard() {
  const d = myDorm();
  return `<div class="invite">${ic('user-plus')}<div><b>${t('invite_t')}</b><p>${d ? t('invite_b', { d: d.short }) : t('invite_b_nodorm')}</p></div><button class="btn sun" data-act="invite">${ic('share-2')}${t('invite_btn')}</button></div>`;
}
function inviteLink() {
  const u = new URL('../', location.href.split('#')[0].split('?')[0]);
  if (S.prof.dorm) u.searchParams.set('dorm', S.prof.dorm);
  u.searchParams.set('ref', 'invite');
  return u.toString();
}
// Wishlist alerts: saved in the account, so they are a reason to sign up.
const alertMatches = (a) => availableItems().filter((i) => (!a.cat || i.cat === a.cat) && (!a.dorm || i.dorm === a.dorm)
  && (!a.q || (i.title.en + ' ' + i.title.cs + ' ' + i.desc.en + ' ' + i.desc.cs).toLowerCase().includes(a.q.toLowerCase())));
const alertName = (a) => [a.q ? `"${a.q}"` : '', a.cat ? t('cat_' + a.cat) : '', a.dorm ? t('pickup_at_d', { d: dormById(a.dorm).short }) : t('all_dorms')].filter(Boolean).join(' · ');

function availableItems() { return ITEMS.filter((i) => ['free', 'mine'].includes(shopState(i.id))); }

SCREENS.home = () => {
  const d = myDorm();
  const greet = S.mode === 'demo' ? t('hello_demo')
    : signedIn() ? (S.prevSeen ? t('welcome_back', { name: firstName() }) : t('hello_name', { name: firstName() }))
    : t('hello_guest');
  // "Since last time" strip
  const strip = [];
  if (signedIn()) {
    const offers = S.myItems.filter((i) => i.status === 'offer');
    if (offers.length) strip.push(`<a class="since sun" href="#/myitem/${offers[0].id}">${ic('banknote')}<span>${t('since_offer', { n: offers.length })}</span>${ic('chevron-right')}</a>`);
    const res = S.orders.filter((o) => o.status === 'reserved').sort((a, b) => a.expiresAt - b.expiresAt)[0];
    if (res) strip.push(`<a class="since" href="#/order/${res.id}">${ic('ticket')}<span>${t('since_res', { title: esc(orderTitle(res)), t: fmtLeft(res.expiresAt - now()) })}</span>${ic('chevron-right')}</a>`);
    const un = unreadCount();
    if (un) strip.push(`<a class="since" href="#/notes">${ic('bell')}<span>${t('since_unread', { n: un })}</span>${ic('chevron-right')}</a>`);
  }
  const here = d ? availableItems().filter((i) => i.dorm === d.id) : [];
  let hereBlock;
  if (!d) {
    hereBlock = `<div class="callout">${ic('map-pin')}<div><b>${t('no_dorm_t')}</b><p>${t('no_dorm_b')}</p></div><button class="btn primary" data-act="dorm">${t('choose_dorm')}</button></div>
      ${grid([...availableItems()].sort((a, b) => a.listedMin - b.listedMin).slice(0, 8))}`;
  } else if (!here.length) {
    const near = DORMS.filter((x) => x.id !== d.id && availableItems().some((i) => i.dorm === x.id)).sort((a, b) => distanceM(d, a) - distanceM(d, b))[0];
    hereBlock = `<div class="callout">${ic('store')}<div><b>${t('none_here_t')}</b><p>${near ? t('none_here_b', { d: near.short, dist: fmtDist(distanceM(d, near)) }) : ''}</p></div></div>
      ${near ? grid(availableItems().filter((i) => i.dorm === near.id).slice(0, 4)) : ''}`;
  } else hereBlock = grid(here.slice(0, 8));
  const draft = S.prof.draft;
  const w = nextWindow();
  const bg = d ? dormPhoto(d.id) : null;
  return {
    title: t('tab_home'),
    html: `<section class="home">
      <div class="hello ${bg ? 'has-bg' : ''}">
        ${bg ? `<div class="bgimg" style="background-image:url('img/${bg.file}')"></div><div class="bgtint"></div>` : ''}
        <div>
          <p class="eyebrow">${modeBadge()}</p>
          <h2>${esc(greet)}</h2>
          ${d ? `<button class="dorm-line" data-act="dorm">${ic('map-pin')}<span>${t('your_stand', { d: d.short })}${distTo(d.id) != null && S.pos ? ' · ' + fmtDist(distTo(d.id)) : ''}</span><u>${t('change')}</u></button>`
            : `<button class="btn primary big dorm-first" data-act="dorm">${ic('map-pin')}${t('choose_dorm_first')}</button><p class="dorm-why">${t('dorm_why')}</p>`}

        </div>
        ${bg ? `<span class="photo-credit">${bg.source === 'Google Gemini' ? t('credit_ai_short') : `${t('photo_credit')}: ${esc(bg.author)} · ${esc(bg.license)}`}</span>` : ''}
        ${pipPose(signedIn() ? 'wave' : 'curious', 'pip-greet bob', 100)}
      </div>
      ${!signedIn() ? accountChoices() : ''}
      ${strip.length ? `<div class="since-wrap">${strip.join('')}</div>` : ''}
      ${draft && signedIn() ? `<a class="continue" href="#/sell">${ic('pencil')}<div><b>${t('continue_listing')}</b><span>${esc(draft.title || t('untitled'))} · ${t('step_of', { n: draft.step || 1, total: 5 })}</span></div>${ic('chevron-right')}</a>` : ''}
      <div class="hero-actions">
        <a class="action-card sell" href="#/sell">${ic('circle-plus')}<div><b>${t('sell_donate')}</b><span>${t('sell_donate_sub')}</span></div></a>
        <a class="action-card buy" href="#/browse">${ic('shopping-bag')}<div><b>${t('buy_cta')}</b><span>${t('buy_cta_sub')}</span></div></a>
      </div>
      <form class="searchbar" id="fHomeSearch" role="search">${ic('search')}<input name="q" placeholder="${t('search_ph')}" aria-label="${t('search')}" value="${esc(S.prof.search)}"><button class="btn primary sm" type="submit">${t('search')}</button></form>
      <div class="cat-row">${SHOP_CATEGORIES.map((c) => `<button class="cat-chip" data-act="cat-go" data-cat="${c.id}">${ic(c.icon)}<span>${t('cat_' + c.id)}</span></button>`).join('')}</div>
      <div class="sec-head"><h2>${d ? t('at_your_stand', { d: d.short }) : t('fresh_items')}</h2><a href="#/browse">${t('see_all')}${ic('chevron-right')}</a></div>
      ${d && w ? `<p class="meta">${ic('clock')}<span>${w.open ? t('open_now_until', { t: String(new Date(w.end).getHours()) + ':00' }) : t('next_open', { w: winTxt(w) })}</span></p>` : ''}
      ${hereBlock}
      ${dormBoard()}
      ${inviteCard()}
      <div class="how">
        <h2>${t('how_title')}</h2>
        <ol class="how-steps">
          <li>${ic('package')}<b>${t('how1_t')}</b><span>${t('how1_b')}</span></li>
          <li>${ic('banknote')}<b>${t('how2_t')}</b><span>${t('how2_b')}</span></li>
          <li>${ic('sparkles')}<b>${t('how3_t')}</b><span>${t('how3_b')}</span></li>
          <li>${ic('ticket')}<b>${t('how4_t')}</b><span>${t('how4_b')}</span></li>
        </ol>
      </div>
      <div class="link-cards">
        <a class="link-card" href="#/about">${ic('users')}<div><b>${t('about_us')}</b><span>${t('about_us_sub')}</span></div>${ic('chevron-right')}</a>
        <a class="link-card" href="#/feedback">${ic('message-square-text')}<div><b>${t('fb_t')}</b><span>${t('fb_sub')}</span></div>${ic('chevron-right')}</a>
      </div>
      <a class="waitlist-banner" href="#/waitlist">${ic('mail')}<div><b>${t('wl_banner_t')}</b><span>${t('wl_banner_b')}</span></div>${ic('chevron-right')}</a>
    </section>`,
    after() {
      $('#fHomeSearch').addEventListener('submit', (e) => { e.preventDefault(); savePrefs({ search: new FormData(e.target).get('q').trim() }); go('browse'); });
    },
  };
};

// ---------- Browse ----------
function filtered() {
  const f = S.prof.filters, q = (S.prof.search || '').toLowerCase();
  return ITEMS.filter((i) => (!f.cat || i.cat === f.cat) && (!f.cond || i.cond === f.cond) && (!f.max || i.price <= f.max) && (!f.dorm || i.dorm === f.dorm)
    && (!q || (i.title.en + ' ' + i.title.cs + ' ' + i.desc.en + ' ' + i.desc.cs + ' ' + t('cat_' + i.cat)).toLowerCase().includes(q)));
}
SCREENS.browse = () => {
  const f = S.prof.filters, d = myDorm();
  const list = filtered();
  const dist = (i) => distTo(i.dorm) ?? 0;
  const sortFn = (a, b) => (shopState(a.id) === 'free' ? 0 : 1) - (shopState(b.id) === 'free' ? 0 : 1) || dist(a) - dist(b) || a.listedMin - b.listedMin;
  const mine = d ? list.filter((i) => i.dorm === d.id).sort(sortFn) : [];
  const others = list.filter((i) => !d || i.dorm !== d.id).sort(sortFn);
  const active = (f.cat ? 1 : 0) + (f.cond ? 1 : 0) + (f.max ? 1 : 0) + (f.dorm ? 1 : 0) + (S.prof.search ? 1 : 0);
  const fd = f.dorm ? dormById(f.dorm) : null;
  const withItems = DORMS.filter((x) => ITEMS.some((i) => i.dorm === x.id)).sort((a, b) => (d ? distanceM(d, a) - distanceM(d, b) : a.short.localeCompare(b.short)));
  return {
    title: t('nav_browse'),
    html: `<section class="browse">
      <form class="searchbar" id="fSearch" role="search">${ic('search')}<input name="q" id="qInput" placeholder="${t('search_ph')}" aria-label="${t('search')}" value="${esc(S.prof.search)}"></form>
      <div class="filters">
        <div class="chips" role="group" aria-label="${t('f_category')}">
          <button class="chip-btn ${!f.cat ? 'on' : ''}" aria-pressed="${!f.cat}" data-act="f-cat" data-v="">${tick(!f.cat)}${t('all')}</button>
          ${SHOP_CATEGORIES.map((c) => `<button class="chip-btn ${f.cat === c.id ? 'on' : ''}" aria-pressed="${f.cat === c.id}" data-act="f-cat" data-v="${c.id}">${f.cat === c.id ? tick(true) : ic(c.icon)}${t('cat_' + c.id)}</button>`).join('')}
        </div>
        <div class="filter-row">
          <label class="sel wide">${ic('map-pin')}<span>${t('f_dorm')}</span>
            <select data-in="f-dorm"><option value="">${t('all_dorms')}</option>${withItems.map((x) => `<option value="${x.id}" ${f.dorm === x.id ? 'selected' : ''}>${esc(x.short)}${d && x.id === d.id ? ` (${t('your_dorm_short')})` : d ? ` (${fmtDist(distanceM(d, x))})` : ''}</option>`).join('')}</select></label>
          <label class="sel">${ic('star')}<span>${t('f_condition')}</span>
            <select data-in="f-cond"><option value="">${t('any')}</option>${CONDITIONS.map((c) => `<option value="${c.id}" ${f.cond === c.id ? 'selected' : ''}>${t('cond_' + c.id)}</option>`).join('')}</select></label>
          <label class="sel">${ic('banknote')}<span>${t('f_max')}</span>
            <select data-in="f-max"><option value="0">${t('any')}</option>${[200, 400, 700, 1000].map((v) => `<option value="${v}" ${f.max === v ? 'selected' : ''}>${t('up_to', { p: czk(v) })}</option>`).join('')}</select></label>
          ${active ? `<button class="linkbtn" data-act="f-clear">${ic('x')}<span>${t('clear_filters')}</span></button>` : ''}
        </div>
        <p class="meta small">${ic('info')}<span>${t(signedIn() ? 'filters_saved' : 'filters_saved_guest')}</span></p>
        ${S.prof.search || f.cat ? `<button class="btn outline sm alert-btn" data-act="alert-add">${ic('bell-plus')}${t('alert_add')}</button>` : `<p class="meta small">${ic('bell-plus')}<span>${t('alert_hint')}</span></p>`}
      </div>
      ${fd ? `<div class="sec-head"><h2>${t('pickup_at_d', { d: fd.short })}</h2><span class="count-txt">${t('n_items', { n: list.length })}</span></div>
        ${list.length ? grid(list.sort(sortFn)) : empty('search', t('no_results_t'), t('no_results_b'), `<button class="btn outline" data-act="f-clear">${t('clear_filters')}</button>`)}` : `
      ${!d ? `<div class="callout">${ic('map-pin')}<div><b>${t('no_dorm_t')}</b><p>${t('no_dorm_b')}</p></div><button class="btn primary" data-act="dorm">${t('choose_dorm')}</button></div>` : ''}
      ${d ? `<div class="sec-head"><h2>${t('at_your_stand', { d: d.short })}</h2><span class="count-txt">${t('n_items', { n: mine.length })}</span></div>
        ${mine.length ? grid(mine) : `<div class="callout">${ic('store')}<div><b>${t('none_match_here')}</b><p>${t('none_match_here_b')}</p></div></div>`}` : ''}
      <div class="sec-head"><h2>${d ? t('other_stands') : t('all_stands')}</h2><span class="count-txt">${t('n_items', { n: others.length })}</span></div>
      ${others.length ? grid(others) : empty('search', t('no_results_t'), t('no_results_b'), `<button class="btn outline" data-act="f-clear">${t('clear_filters')}</button>`)}`}
    </section>`,
    after() {
      const inp = $('#qInput');
      $('#fSearch').addEventListener('submit', (e) => e.preventDefault());
      inp.addEventListener('input', () => {
        savePrefs({ search: inp.value.trim() }, 700);
        clearTimeout(inp._t); inp._t = setTimeout(() => { const pos = inp.selectionStart; render(); const n = $('#qInput'); n.focus(); n.setSelectionRange(pos, pos); }, 350);
      });
    },
  };
};

// v2: is the pickup place the user's own dorm? Said before they reserve, not after.
function dormNotice(d) {
  const me = myDorm();
  if (!me) return `<div class="callout">${ic('map-pin')}<div><b>${t('no_dorm_item_t')}</b><p>${t('no_dorm_item_b')}</p></div><button class="btn outline sm" data-act="dorm">${t('choose_dorm')}</button></div>`;
  if (me.id === d.id) return '';
  return `<div class="callout warn">${ic('triangle-alert')}<div><b>${t('not_my_dorm_t')}</b><p>${t('not_my_dorm_b', { d: d.short, dist: fmtDist(distanceM(me, d)), mine: me.short })}</p></div><button class="btn outline sm" data-act="my-dorm-items">${t('see_my_dorm')}</button></div>`;
}

// ---------- Item detail ----------
SCREENS.item = (id) => {
  const it = itemById(id);
  if (!it) return { title: '', html: empty('search', t('not_found'), '') };
  const d = dormById(it.dorm), st = shopState(id), w = nextWindow();
  const save = Math.round((1 - it.price / it.newPrice) * 100);
  const similar = availableItems().filter((x) => x.cat === it.cat && x.id !== id).sort((a, b) => (distTo(a.dorm) ?? 0) - (distTo(b.dorm) ?? 0)).slice(0, 4);
  let cta;
  if (st === 'free') cta = `<div class="cta-row"><button class="btn primary big" data-act="reserve" data-id="${id}">${ic('ticket')}<span>${t('reserve_now')}<small>${t('reserve_now_sub')}</small></span></button>${cartBtn(id, true)}</div>`;
  else if (st === 'mine') { const o = S.orders.find((x) => x.status === 'reserved' && orderItems(x).some((y) => y.id === id)); cta = `<a class="btn primary wide big" href="#/order/${o ? o.id : ''}">${ic('ticket')}${t('see_pickup')}</a>`; }
  else cta = `<div class="callout warn">${ic('clock')}<div><b>${t(st.includes('sold') ? 'taken_sold_t' : 'taken_res_t')}</b><p>${t('taken_b')}</p></div></div>`;
  return {
    title: L(it.title),
    html: `<section class="detail">
      <div class="detail-media">${photo(it, 'big')}<span class="chip price lg">${czk(it.price)}</span></div>
      <div class="detail-body">
        <div class="badges"><span class="badge clean">${ic('sparkles')}${t('cleaned')}</span><span class="badge cond">${ic('star')}${t('cond_' + it.cond)}</span><span class="badge">${ic(catById(it.cat).icon)}${t('cat_' + it.cat)}</span></div>
        <h2 class="detail-title">${esc(L(it.title))}</h2>
        <p class="price-line"><b>${czk(it.price)}</b> <s>${t('new_was', { p: czk(it.newPrice) })}</s> <span class="pill green">${t('you_save', { n: save })}</span></p>
        <p>${esc(L(it.desc))}</p>
        <p class="meta">${ic('star')}<span>${t('cond_' + it.cond)}: ${t('condd_' + it.cond)}</span></p>
        ${pickupPlace(d)}
        ${dormNotice(d)}
        <div class="detail-cta">${heartBtn(id, true)}${cta}</div>
      </div>
    </section>
    ${similar.length ? `<div class="sec-head"><h2>${t('similar')}</h2></div>${grid(similar)}` : ''}`,
  };
};

// ---------- Cart ----------
SCREENS.cart = () => {
  const rows = S.prof.cart.map((c) => ({ ...c, it: itemById(c.id) })).filter((c) => c.it);
  const state = (c) => shopState(c.id);
  const payable = rows.filter((c) => c.on && state(c) === 'free');
  const total = payable.reduce((s, c) => s + c.it.price, 0);
  const stands = new Set(payable.map((c) => c.it.dorm));
  return {
    title: t('cart_t'),
    html: `<section class="narrow cart">
      <p class="muted">${t(signedIn() ? 'cart_sub' : 'cart_sub_guest')}</p>
      ${!rows.length ? empty('shopping-cart', t('cart_empty_t'), t('cart_empty_b'), `<a class="btn primary" href="#/browse">${t('buy_cta')}</a>`) : `
      <div class="cols"><div class="main">
      <div class="list">${rows.map((c) => { const st = state(c), blocked = st !== 'free' && st !== 'mine'; const d = dormById(c.it.dorm); return `
        <div class="row-card cart-row ${blocked ? 'blocked' : ''}">
          <label class="tickbox"><input type="checkbox" data-in="cart-tick" data-id="${c.id}" ${c.on && !blocked ? 'checked' : ''} ${blocked ? 'disabled' : ''} aria-label="${t('tick_label')}"><span class="box">${ic('check')}</span></label>
          <a href="#/item/${c.id}" class="thumb-link">${photo(c.it, 'thumb')}</a>
          <div><b>${esc(L(c.it.title))}</b>
            <p class="meta">${ic('store')}<span>${t('stand_of', { d: d.short })}${distShort(c.it.dorm) ? ' · ' + distShort(c.it.dorm) : ''}</span></p>
            ${blocked ? `<p class="meta small"><span class="pill ${st.includes('sold') ? 'red' : 'sun'}">${ic(st.includes('sold') ? 'ban' : 'clock')}${t(st.includes('sold') ? 'sold' : 'cart_taken')}</span></p><p class="meta small"><span>${t(st.includes('sold') ? 'cart_sold_b' : 'cart_taken_b')}</span></p>` : ''}
            <button class="linkbtn sm" data-act="cart-remove" data-id="${c.id}">${ic('x')}<span>${t('remove_cart')}</span></button>
          </div>
          <b class="sum-price">${czk(c.it.price)}</b>
        </div>`; }).join('')}</div>
      </div><aside class="side"><div class="cart-sum">
        <p class="meta">${ic('square-check')}<span>${t('cart_ticked', { n: payable.length, total: rows.length })}</span></p>
        ${stands.size > 1 ? `<p class="meta">${ic('store')}<span>${t('cart_stands_note', { n: stands.size })}</span></p>` : ''}
        <div class="total"><span>${t('total')}</span><b>${czk(total)}</b></div>
        <button class="btn primary wide big" data-act="checkout-cart" ${payable.length ? '' : 'aria-disabled="true"'}>${ic('credit-card')}${t('cart_checkout', { p: czk(total) })}</button>
        <p class="meta small center">${ic(signedIn() ? 'circle-check' : 'info')}<span>${signedIn() ? t('cart_saved_note') : t('cart_guest')}</span></p>
      </div></aside></div>`}
    </section>`,
  };
};

// ---------- Checkout (demo): one item, or the ticked items in the cart ----------
function checkoutLines(arg) {
  if (arg === 'cart') return S.prof.cart.filter((c) => c.on && shopState(c.id) === 'free').map((c) => itemById(c.id)).filter(Boolean);
  const it = itemById(arg);
  return it ? [it] : [];
}
SCREENS.checkout = (arg) => {
  if (!signedIn()) { if (!S.seeding) setTimeout(() => needAccount('checkout/' + arg, t('pay_need_t'), t('pay_need_b')), 50); return { title: t('checkout'), html: `<section class="narrow">${empty('user', t('pay_need_t'), t('pay_need_b'), accountChoices())}</section>` }; }
  const lines = checkoutLines(arg);
  if (!lines.length) return { title: t('checkout'), html: `<section class="narrow">${empty('shopping-cart', t('cart_empty_t'), t('cart_empty_b'), `<a class="btn primary" href="#/browse">${t('buy_cta')}</a>`)}</section>` };
  const total = lines.reduce((s, x) => s + x.price, 0);
  const stands = [...new Set(lines.map((x) => x.dorm))];
  const me = myDorm();
  return {
    title: t('checkout'),
    html: `<section class="narrow">
      <ol class="steps" aria-label="${t('checkout')}"><li class="now"><b>1</b>${t('co_step1')}</li><li><b>2</b>${t('co_step2')}</li><li><b>3</b>${t('co_step3')}</li></ol>
      <div class="cols"><div class="main">
      <h2 class="co-h">${t('co_step1_h', { n: stands.length })}</h2>
      ${!me ? `<div class="callout">${ic('map-pin')}<div><b>${t('no_dorm_item_t')}</b><p>${t('no_dorm_item_b')}</p></div><button class="btn outline sm" data-act="dorm">${t('choose_dorm')}</button></div>` : ''}
      ${stands.map((dm) => { const d = dormById(dm); const its = lines.filter((x) => x.dorm === dm);
        const far = me && me.id !== d.id;
        return `${pickupPlace(d, { items: `<div class="co-items">${its.map((it) => `<div class="sum-card">${photo(it, 'thumb')}<div><b>${esc(L(it.title))}</b><p class="meta"><span>${t('cond_' + it.cond)}</span></p></div><b class="sum-price">${czk(it.price)}</b></div>`).join('')}</div>
          ${far ? `<p class="meta warn-line">${ic('triangle-alert')}<span>${t('not_my_dorm_b', { d: d.short, dist: fmtDist(distanceM(me, d)), mine: me.short })}</span></p>` : ''}
          <label class="confirm-pick"><input type="checkbox" form="fPay" name="ok" data-in="co-ok" value="${dm}"><span class="box">${ic('check')}</span><span>${t('co_confirm', { d: d.name })}</span></label>` })}`; }).join('')}
      ${stands.length > 1 ? `<p class="meta">${ic('ticket')}<span>${t('cart_stands_note', { n: stands.length })}</span></p>` : ''}
      </div><aside class="side">
      <h2 class="co-h">${t('co_step2')}</h2>
      <form id="fPay" class="form card-form" novalidate>
        <fieldset class="pay-pick"><legend class="sr">${t('pay_how')}</legend>
          <label class="pay-opt ${STRIPE_PAYMENT_LINK ? '' : 'off'}"><input type="radio" name="pm" value="card" ${STRIPE_PAYMENT_LINK ? '' : 'disabled'}><span class="box">${ic('check')}</span>
            <span><b>${ic('credit-card')}${t('pay_card_t')}</b><small>${STRIPE_PAYMENT_LINK ? t('pay_card_b') : t('pay_card_off')}</small></span></label>
          <label class="pay-opt"><input type="radio" name="pm" value="demo" checked><span class="box">${ic('check')}</span>
            <span><b>${ic('sparkles')}${t('pay_demo_t')}</b><small>${t('pay_demo_b')}</small></span></label>
        </fieldset>
        <p class="note">${ic('lock')}${t('pay_privacy')}</p>
        <div class="total"><span>${t('total')}</span><b>${czk(total)}</b></div>
        <p class="form-err" id="fErr" role="alert"></p>
        <button class="btn primary wide big" type="submit" id="payBtn" aria-describedby="fErr">${ic('credit-card')}<span id="payLabel">${t('pay_demo', { p: czk(total) })}</span></button>
        <p class="meta small" id="payHint">${ic('square-check')}<span>${t('co_confirm_first')}</span></p>
      </form>
      </aside></div>
    </section>`,
    after() {
      const boxes = () => [...document.querySelectorAll('[data-in="co-ok"]')];
      const sync = () => { const ok = boxes().every((b) => b.checked); $('#payBtn').setAttribute('aria-disabled', String(!ok)); $('#payHint').hidden = ok; if (ok) $('#fErr').textContent = ''; };
      boxes().forEach((b) => b.addEventListener('change', sync)); sync();
      const method = () => (($('#fPay').querySelector('input[name=pm]:checked') || {}).value || 'demo');
      $('#fPay').addEventListener('change', (e) => { if (e.target.name === 'pm') $('#payLabel').textContent = method() === 'card' ? t('pay_card_go', { p: czk(total) }) : t('pay_demo', { p: czk(total) }); });
      $('#fPay').addEventListener('submit', (e) => {
        e.preventDefault();
        const missing = boxes().find((b) => !b.checked);
        if (missing) { $('#fErr').textContent = t('co_err_confirm'); missing.focus(); missing.closest('.pickup-place').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
        doCheckout(arg, e.target, method());
      });
    },
  };
};

async function doCheckout(arg, form, method = 'demo') {
  const lines = checkoutLines(arg), u = uid();
  if (!signedIn()) return needAccount('checkout/' + arg, t('pay_need_t'), t('pay_need_b'));
  if (method === 'card' && !STRIPE_PAYMENT_LINK) method = 'demo';
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = t('working');
  const n = now();
  try {
    // Hold every item in one transaction; if any was taken meanwhile, nothing is reserved.
    const taken = await runTransaction(db, async (tx) => {
      const snaps = await Promise.all(lines.map((it) => tx.get(doc(db, 'shop', it.id))));
      const bad = [];
      snaps.forEach((s, i) => {
        if (!s.exists()) return;
        const x = s.data();
        if (x.status === 'sold' || (x.status === 'reserved' && x.until > n && x.by !== u)) bad.push(lines[i].id);
      });
      if (bad.length) return bad;
      lines.forEach((it) => tx.set(doc(db, 'shop', it.id), { status: 'reserved', by: u, until: n + HOLD_H * HOUR }));
      return [];
    });
    if (taken.length) {
      savePrefs({ cart: S.prof.cart.map((c) => (taken.includes(c.id) ? { ...c, on: false } : c)) });
      openModal(`<h2>${t('taken_some_t')}</h2><p>${t('taken_some_b')}</p><div class="mini-list">${taken.map(itemById).map((x) => `<a href="#/item/${x.id}" class="mini">${photo(x, 'thumb')}<span>${esc(L(x.title))}</span><b>${czk(x.price)}</b></a>`).join('')}</div><button class="btn outline wide" data-act="close">${t('close')}</button>`);
      go(arg === 'cart' ? 'cart' : 'item/' + arg, true);
      return;
    }
    // One order per stand, each with its own pickup code.
    const group = code('G');
    const stands = [...new Set(lines.map((x) => x.dorm))];
    const ids = [];
    for (const dm of stands) {
      const its = lines.filter((x) => x.dorm === dm).map((x) => ({ id: x.id, title: x.title, cat: x.cat, price: x.price, photoId: x.id }));
      const ref = await addDoc(collection(db, 'users', u, 'orders'), {
        group, dorm: dm, code: code('P'), items: its, total: its.reduce((s, x) => s + x.price, 0),
        status: 'reserved', reservedAt: n, expiresAt: n + HOLD_H * HOUR,
        paid: method === 'demo', payMethod: method, ...(method === 'demo' ? { paidAt: n } : {}),
      });
      ids.push(ref.id);
    }
    if (arg === 'cart') savePrefs({ cart: S.prof.cart.filter((c) => !lines.some((x) => x.id === c.id)) });
    else if (inCart(arg)) savePrefs({ cart: S.prof.cart.filter((c) => c.id !== arg) });
    bump('orders'); bump('pay_' + method);
    if (method === 'card') return toStripe(group, lines.reduce((s, x) => s + x.price, 0));
    celebrate();
    go('thanks/' + group, true);
  } catch (e) { fail(e); btn.disabled = false; btn.textContent = t('pay_demo', { p: czk(lines.reduce((s, x) => s + x.price, 0)) }); }
}

// ---------- Card payment through a Stripe Payment Link (round 4) ----------
// The order is saved first (items held, not yet paid); the person then types card details on Stripe's own page.
// Stripe sends them back to .../v2/?paid=1 (set in the Payment Link), and the app marks the pending order paid.
// Without a server the app cannot ask Stripe to confirm the payment, so it trusts that return: fine for a test mode
// prototype, not for real money (HOW-IT-WORKS.md section 13).
async function toStripe(group, total) {
  lsSet('hd_pending_pay', group);
  try { await setDoc(doc(db, 'users', uid()), { pendingPay: { group, at: now() } }, { merge: true }); } catch (e) { /* the local copy still works */ }
  const u = new URL(STRIPE_PAYMENT_LINK);
  u.searchParams.set('client_reference_id', group);
  if (S.prof.email) u.searchParams.set('prefilled_email', S.prof.email);
  if (S.prof.lang === 'cs') u.searchParams.set('locale', 'cs');
  toast(t('pay_card_leaving', { p: czk(total) }));
  setTimeout(() => location.assign(u.toString()), 400);
}
async function finishCardReturn() {
  const group = (S.prof.pendingPay && S.prof.pendingPay.group) || lsGet('hd_pending_pay');
  S.payReturn = false;
  if (!group) return;
  const mine = S.orders.filter((o) => o.group === group && o.paid === false);
  const n = now();
  for (const o of mine) await updateDoc(doc(db, 'users', uid(), 'orders', o.id), { paid: true, paidAt: n }).catch(() => {});
  setDoc(doc(db, 'users', uid()), { pendingPay: null }, { merge: true }).catch(() => {});
  try { localStorage.removeItem('hd_pending_pay'); } catch (e) { /* ignore */ }
  bump('pay_card_done');
  celebrate();
  go('thanks/' + group, true);
}

// One success screen for both ways of paying: order confirmed, a pickup code per stand naming the dorm, a thank-you letter.
SCREENS.thanks = (group) => {
  const list = S.orders.filter((o) => o.group === group);
  if (!list.length) return { title: t('order_placed_t'), html: empty('ticket', t('loading'), '') };
  if (list.some((o) => o.paid === false)) return SCREENS.order(list[0].id);
  const names = list.flatMap((o) => orderItems(o).map((x) => L(x.title)));
  const dear = S.mode === 'demo' ? t('letter_friend') : (firstName() || t('letter_friend'));
  return {
    title: t('order_placed_t'),
    html: `<section class="narrow thanks">
      <div class="confirmed">${ic('circle-check')}<div><h2>${t('order_confirmed_t')}</h2><p>${t(list[0].payMethod === 'card' ? 'paid_card_b' : 'paid_demo_b', { p: czk(list.reduce((s, o) => s + orderTotal(o), 0)) })}</p></div></div>
      <div class="cols"><div class="main">
      <h3>${t(list.length > 1 ? 'pickup_codes' : 'pickup_code')}</h3>
      ${list.map((o) => { const d = dormById(o.dorm); return `<a class="code-card link" href="#/order/${o.id}"><p class="eyebrow">${t('pickup_at')}</p><p class="code-where">${ic('store')}<span><b>${esc(d.name)}</b></span></p><p class="meta">${ic('map-pin')}<span>${esc(d.address)}</span></p><p class="bigcode">${esc(o.code)}</p><p class="meta">${ic('package')}<span>${orderItems(o).map((x) => esc(L(x.title))).join(', ')}</span></p><p class="meta">${ic('clock')}<span>${hoursTxt()}</span></p></a>`; }).join('')}
      </div><aside class="side">
      <article class="letter">
        ${pipPose('cheer', 'letter-pip', 84)}
        <p class="eyebrow">${t('letter_eyebrow')}</p>
        <p><b>${t('letter_dear', { name: esc(dear) })}</b></p>
        <p>${t('letter_p1', { items: esc(names.slice(0, 3).join(', ')), d: esc(dormById(list[0].dorm).short) })}</p>
        <p>${t('letter_p2')}</p>
        <p class="sign">${t('letter_sign')}</p>
      </article>
      <a class="btn outline wide" href="#/orders">${ic('shopping-bag')}${t('all_orders')}</a>
      </aside></div>
    </section>`,
  };
};
// Older links: #/placed/<group> shows the same screen.
SCREENS.placed = (group) => {
  const list = S.orders.filter((o) => o.group === group);
  if (!list.length) return { title: t('order_placed_t'), html: empty('ticket', t('loading'), '') };
  return {
    title: t('order_placed_t'),
    html: `<section class="narrow center-col">
      ${pipPose('cheer', 'bob', 140)}
      <h2>${t('order_placed_t')}</h2>
      <p>${t('order_placed_b')}</p>
      <h3>${t('pickup_codes')}</h3>
      ${list.map((o) => { const d = dormById(o.dorm); return `<a class="code-card link" href="#/order/${o.id}"><p class="eyebrow">${t('pickup_at')}</p><p class="code-where">${ic('store')}<span><b>${esc(d.name)}</b></span></p><p class="meta">${ic('map-pin')}<span>${esc(d.address)}</span></p><p class="bigcode">${esc(o.code)}</p><p class="meta">${ic('package')}<span>${orderItems(o).map((x) => esc(L(x.title))).join(', ')}</span></p></a>`; }).join('')}
      <a class="btn outline wide" href="#/orders">${ic('shopping-bag')}${t('all_orders')}</a>
    </section>`,
  };
};

// ---------- Order / pickup code ----------
SCREENS.order = (id) => {
  const o = S.orders.find((x) => x.id === id);
  if (!o) return { title: t('nav_orders'), html: empty('ticket', t('loading'), '') };
  const d = dormById(o.dorm), w = nextWindow();
  const it = orderThumb(o), its = orderItems(o);
  const showSlider = w && w.open;
  let body = '';
  const standBox = `<div class="stand-box">
        <h3>${ic('store')}${t('stand_of', { d: d.name })}</h3>
        <p class="meta">${ic('map-pin')}<span>${esc(d.address)}${distTo(d.id) != null ? ' · ' + fmtDist(distTo(d.id)) : ''}</span></p>
        <p class="meta">${ic('clock')}<span>${hoursTxt()}</span></p>
      </div>`;
  if (o.status === 'reserved' && o.paid === false) {
    body = `<div class="code-card pending">${ic('credit-card')}<h2>${t('pay_pending_t')}</h2><p>${t('pay_pending_b')}</p>
      <div class="stack">${STRIPE_PAYMENT_LINK ? `<button class="btn primary wide" data-act="pay-again" data-group="${esc(o.group)}">${ic('credit-card')}${t('pay_card_again')}</button>` : ''}
      <button class="btn outline wide" data-act="pay-demo-now" data-group="${esc(o.group)}">${ic('sparkles')}${t('pay_demo_instead')}</button></div></div>`;
  } else if (o.status === 'reserved') {
    body = `
      <div class="code-card">
        <p class="eyebrow">${t('pickup_code')}</p>
        <p class="bigcode">${esc(o.code)}</p>
        <p class="code-where">${ic('store')}<span>${t('show_code_at', { d: d.name })}</span></p>
        <div class="hold">${ic('timer')}<span>${t('held_for')}</span><b data-countdown="${o.expiresAt}">${fmtLeft(o.expiresAt - now())}</b></div>
        <div class="bar"><span style="width:${Math.max(0, Math.min(100, ((o.expiresAt - now()) / (HOLD_H * HOUR)) * 100))}%"></span></div>
      </div>
      ${showSlider ? '' : `<div class="wait-bar">${ic('clock')}<span>${t('opens_in', { t: fmtLeft(w ? w.start - now() : 0) })}</span><small>${w ? winTxt(w) : ''}</small></div>
        <button class="linkbtn" data-act="pretend">${ic('fast-forward')}<span>${t('pretend_here')}</span></button>`}
      <div class="swipe ${showSlider ? '' : 'hidden'}" id="swipeBox">
        <p><b>${t('at_stand_q')}</b></p>
        <label class="swipe-track">${ic('chevron-right')}<span>${t('swipe_confirm')}</span><input type="range" min="0" max="100" value="0" id="swipe" aria-label="${t('swipe_confirm')}"></label>
      </div>`;
  } else if (o.status === 'picked') {
    body = `<div class="done-card">${pipPose('cheer')}<h2>${t('picked_t')}</h2><p>${t('picked_b')}</p></div>`;
  } else {
    body = `<div class="done-card">${pipPose('sorry')}<h2>${t('expired_t')}</h2><p>${t('expired_b')}</p></div>`;
  }
  return {
    title: t('pickup_title'),
    html: `<section class="narrow">
      <div class="cols"><div class="main">
      ${body}
      ${o.status === 'reserved' && o.paid !== false ? pickupPlace(d) : ''}
      ${o.guest ? `<p class="meta small">${ic('smartphone')}<span>${t('guest_order_note')}</span></p>` : ''}
      </div><aside class="side">
      <div class="sum-card">${photo(it, 'thumb')}<div><b>${esc(orderTitle(o))}</b><p>${statusPill(o.status)}</p></div><b class="sum-price">${czk(orderTotal(o))}</b></div>
      ${its.length > 1 ? `<div class="list compact">${its.map((x) => `<a class="row-card" href="#/item/${x.id}">${photo({ ...x, photoId: x.photoId || x.id }, 'thumb')}<div><b>${esc(L(x.title))}</b></div><b class="sum-price">${czk(x.price)}</b></a>`).join('')}</div>` : ''}
      ${o.status === 'reserved' ? '' : standBox}
      <a class="btn outline wide" href="#/orders">${ic('shopping-bag')}${t('all_orders')}</a>
      </aside></div>
    </section>`,
    after() {
      const s = $('#swipe');
      if (!s) return;
      const done = async () => {
        if (+s.value < 92) { s.value = 0; s.parentElement.style.setProperty('--p', 0); return; }
        s.disabled = true;
        if (o.guest) { saveGuestOrders(guestOrders().map((x) => (x.id === id ? { ...x, status: 'picked', pickedAt: now() } : x))); toast(t('picked_t')); celebrate(); render(); return; }
        try {
          await updateDoc(doc(db, 'users', uid(), 'orders', id), { status: 'picked', pickedAt: now() });
          for (const x of its) if (!String(x.id).startsWith('demo')) await setDoc(doc(db, 'shop', x.id), { status: 'sold', by: uid(), until: 9e15 }).catch(() => {});
          toast(t('picked_t'));
          celebrate();
        } catch (e) { fail(e); s.disabled = false; s.value = 0; }
      };
      s.addEventListener('input', () => s.parentElement.style.setProperty('--p', s.value));
      s.addEventListener('change', done);
      s.addEventListener('pointerup', done);
    },
  };
};

SCREENS.orders = () => {
  const list = S.orders;
  return {
    title: t('nav_orders'),
    html: `<section class="narrow">
      <h2 class="screen-h">${t('nav_orders')}</h2>
      <p class="muted">${t('orders_sub')}</p>
      ${!signedIn() && list.length ? `<div class="callout">${ic('smartphone')}<div><b>${t('guest_orders_here_t')}</b><p>${t('guest_orders_here_b')}</p></div><a class="btn outline sm" href="#/signup">${t('sign_up')}</a></div>` : ''}
      ${!list.length ? empty('shopping-bag', t('no_orders_t'), t('no_orders_b'), `<a class="btn primary" href="#/browse">${t('buy_cta')}</a>`)
      : `<div class="list two">${list.map((o) => `<a class="row-card" href="#/order/${o.id}">${photo(orderThumb(o), 'thumb')}
          <div><b>${esc(orderTitle(o))}</b><p class="meta">${ic('store')}<span>${t('stand_of', { d: dormById(o.dorm).short })} · ${czk(orderTotal(o))}</span></p>
          <p class="meta small">${o.status === 'reserved' ? `${ic('timer')}<span data-countdown="${o.expiresAt}">${fmtLeft(o.expiresAt - now())}</span>` : `<span>${fmtDate(o.reservedAt)}</span>`}</p></div>
          ${o.status === 'reserved' && o.paid === false ? `<span class="pill sun">${ic('credit-card')}${t('pay_pending_pill')}</span>` : statusPill(o.status)}</a>`).join('')}</div>`}
    </section>`,
  };
};

// ---------- Saved ----------
SCREENS.saved = () => {
  const list = S.prof.hearts.map(itemById).filter(Boolean);
  return {
    title: t('tab_saved'),
    html: `<section>
      <h2 class="screen-h">${t('saved_title')}</h2>
      <p class="muted">${signedIn() ? t('saved_sub') : t('saved_sub_guest')}</p>
      ${(S.prof.alerts || []).length ? `<div class="alerts"><h3>${ic('bell-plus')}${t('alerts_h')}</h3>${S.prof.alerts.map((a, i) => { const m = alertMatches(a).length; return `<div class="row-card plain">${ic('bell')}<div><b>${esc(alertName(a))}</b><p class="meta small"><span>${t('alert_matches', { n: m })}</span></p></div><button class="btn outline sm" data-act="alert-open" data-i="${i}">${t('see_all')}</button><button class="linkbtn sm" data-act="alert-remove" data-i="${i}" aria-label="${t('alert_remove')}">${ic('x')}</button></div>`; }).join('')}<p class="meta small">${ic('info')}<span>${t('alert_note')}</span></p></div>` : ''}
      ${list.length ? grid(list) : empty('heart', t('no_saved_t'), t('no_saved_b'), `<a class="btn primary" href="#/browse">${t('buy_cta')}</a>`)}
    </section>`,
  };
};

// ---------- Sell / donate flow ----------
function newDraft() { return { step: 1, cat: '', other: '', title: '', desc: '', cond: '', photo: '', mode: '', stand: S.prof.dorm || '', day: 0 }; }
let draft = null;
function saveDraft() { savePrefs({ draft: { ...draft } }, 600); }

SCREENS.sell = () => {
  if (!signedIn()) {
    return { title: t('tab_sell'), html: `<section class="narrow">${empty('circle-plus', t('sell_guest_t'), t('sell_guest_b'),
      `<div class="stack"><a class="btn primary" href="#/signup" data-act="after" data-to="sell">${t('sign_up')}</a><button class="btn sun" data-act="demo">${ic('sparkles')}${t('demo_account')}</button></div>`)}</section>` };
  }
  if (!draft) draft = S.prof.draft ? { ...newDraft(), ...S.prof.draft } : newDraft();
  const st = draft.step;
  const progress = `<div class="progress" aria-label="${t('step_of', { n: st, total: 5 })}">${[1, 2, 3, 4, 5].map((n) => `<span class="${n <= st ? 'on' : ''}"></span>`).join('')}</div>
    <p class="eyebrow">${t('step_of', { n: st, total: 5 })}</p>`;
  let body = '';
  if (st === 1) {
    body = `<h2>${t('s1_t')}</h2>
      <p class="muted">${t('s1_b')}</p>
      <div class="cat-pick" role="radiogroup" aria-label="${t('f_category')}">${CATEGORIES.map((c) => `<button type="button" role="radio" aria-checked="${draft.cat === c.id}" class="pick ${draft.cat === c.id ? 'on' : ''}" data-act="d-set" data-k="cat" data-v="${c.id}">${tick(draft.cat === c.id)}${ic(c.icon)}<span>${t('cat_' + c.id)}</span></button>`).join('')}</div>
      ${draft.cat === 'other' ? `<label>${t('other_what')}<input data-in="d-other" maxlength="40" placeholder="${t('other_ph')}" value="${esc(draft.other)}"></label>` : ''}
      <label>${t('f_title')}<input data-in="d-title" maxlength="50" placeholder="${t('title_ph')}" value="${esc(draft.title)}"></label>
      <label>${t('f_desc')}<textarea data-in="d-desc" maxlength="200" rows="3" placeholder="${t('desc_ph')}">${esc(draft.desc)}</textarea></label>`;
  } else if (st === 2) {
    body = `<h2>${t('s2_t')}</h2><p class="muted">${t('s2_b')}</p>
      <div class="cond-pick" role="radiogroup">${CONDITIONS.map((c) => `<button type="button" role="radio" aria-checked="${draft.cond === c.id}" class="pick row ${draft.cond === c.id ? 'on' : ''}" data-act="d-set" data-k="cond" data-v="${c.id}">${tick(draft.cond === c.id)}${ic('star')}<div><b>${t('cond_' + c.id)}</b><span>${t('condd_' + c.id)}</span></div></button>`).join('')}</div>`;
  } else if (st === 3) {
    body = `<h2>${t('s3_t')}</h2><p class="muted">${t('s3_b')}</p>
      <div class="photo-drop">${draft.photo ? `<img src="${draft.photo}" alt="${t('your_photo')}" width="400" height="300">` : `${ic('camera')}<span>${t('no_photo_yet')}</span>`}</div>
      <div class="row2">
        <label class="btn outline file">${ic('camera')}<span>${t('take_photo')}</span><input type="file" accept="image/*" capture="environment" data-in="d-photo" hidden></label>
        <label class="btn outline file">${ic('image')}<span>${t('choose_photo')}</span><input type="file" accept="image/*" data-in="d-photo" hidden></label>
      </div>
      ${draft.photo ? `<button class="linkbtn" data-act="d-set" data-k="photo" data-v="">${ic('x')}<span>${t('remove_photo')}</span></button>` : ''}
      <div class="tips"><b>${ic('info')}${t('tips_t')}</b><ul><li>${t('tip1')}</li><li>${t('tip2')}</li><li>${t('tip3')}</li><li>${t('tip4')}</li></ul></div>`;
  } else if (st === 4) {
    const est = draft.cat && draft.cond ? standardOffer(draft.cat, draft.cond) : null;
    body = `<h2>${t('s4_t')}</h2>
      <div class="mode-pick">
        <button type="button" class="pick big ${draft.mode === 'sell' ? 'on' : ''}" aria-pressed="${draft.mode === 'sell'}" data-act="d-set" data-k="mode" data-v="sell">${tick(draft.mode === 'sell')}${ic('banknote')}<div><b>${t('mode_sell')}</b><span>${t('mode_sell_b')}</span>${est ? `<span class="pill sun">${t('typical_offer', { p: czk(est) })}</span>` : ''}</div></button>
        <button type="button" class="pick big ${draft.mode === 'donate' ? 'on' : ''}" aria-pressed="${draft.mode === 'donate'}" data-act="d-set" data-k="mode" data-v="donate">${tick(draft.mode === 'donate')}${ic('gift')}<div><b>${t('mode_donate')}</b><span>${t('mode_donate_b')}</span></div></button>
      </div>
      ${est ? `<p class="meta small">${ic('info')}<span>${t('estimate_note')}</span></p>` : ''}`;
  } else if (st === 5) {
    const base = myDorm() || DORMS[2];
    const stands = [...DORMS].sort((a, b) => distanceM(base, a) - distanceM(base, b)).slice(0, 6);
    const chosen = dormById(draft.stand);
    const nextFree = chosen && chosen.full ? stands.find((x) => !x.full && x.id !== chosen.id) : null;
    const days = [];
    let w = nextWindow();
    while (w && days.length < 6) { days.push(w); w = nextWindow(w.end + MIN); }
    if (!draft.day || !days.some((x) => x.start === draft.day)) draft.day = 0;
    body = `<h2>${t('s5_t')}</h2><p class="muted">${t('s5_b')}</p>
      <div class="stand-pick">${stands.map((x) => `<button type="button" class="pick row ${draft.stand === x.id ? 'on' : ''}" aria-pressed="${draft.stand === x.id}" data-act="d-set" data-k="stand" data-v="${x.id}">${tick(draft.stand === x.id)}${ic('store')}<div><b>${t('stand_of', { d: x.short })}${x.id === S.prof.dorm ? ` <span class="pill green">${t('your_dorm')}</span>` : ''}${x.full ? ` <span class="pill red">${ic('ban')}${t('full_today')}</span>` : ''}</b><span>${esc(x.address)} · ${fmtDist(distanceM(S.pos || base, x))}</span></div></button>`).join('')}</div>
      ${nextFree ? `<div class="callout warn">${ic('triangle-alert')}<div><b>${t('full_t', { d: chosen.short })}</b><p>${t('full_b', { d: nextFree.short, dist: fmtDist(distanceM(chosen, nextFree)) })}</p></div><button class="btn outline sm" data-act="d-set" data-k="stand" data-v="${nextFree.id}">${t('use_this')}</button></div>` : ''}
      <h3>${t('dropoff_day')}</h3>
      <div class="day-pick">${days.map((x) => `<button type="button" class="pick day ${draft.day === x.start ? 'on' : ''}" aria-pressed="${draft.day === x.start}" data-act="d-day" data-v="${x.start}">${tick(draft.day === x.start)}${ic('calendar')}<span>${winTxt(x)}</span></button>`).join('')}</div>`;
  }
  const canNext = (st === 1 && draft.cat && draft.title.trim() && (draft.cat !== 'other' || draft.other.trim())) || (st === 2 && draft.cond) || st === 3 || (st === 4 && draft.mode)
    || (st === 5 && draft.stand && draft.day && !(dormById(draft.stand) || {}).full);
  return {
    title: t('tab_sell'),
    html: `<section class="narrow sell">
      ${progress}
      <div class="cols"><div class="main">
      <div class="form sell-body">${body}</div>
      <p class="form-err" id="fErr" role="alert"></p>
      <div class="sell-nav">
        ${st > 1 ? `<button class="btn outline" data-act="d-back">${ic('chevron-left')}${t('back')}</button>` : `<button class="btn ghost" data-act="d-discard">${t('discard')}</button>`}
        <button class="btn primary" data-act="d-next" ${canNext ? '' : 'aria-disabled="true"'}>${st === 5 ? `${ic('check')}${t('confirm_listing')}` : `${t('next')}${ic('chevron-right')}`}</button>
      </div>
      <p class="meta small center">${ic('info')}<span>${t('draft_saved')}</span></p>
      </div><aside class="side laptop-only"><div class="side-card draft-sum">
        <h3>${t('draft_so_far')}</h3>
        ${draft.photo ? `<img src="${draft.photo}" alt="" width="400" height="300">` : ''}
        <dl>
          <dt>${t('f_category')}</dt><dd>${draft.cat ? esc(catName({ cat: draft.cat, other: draft.other })) : '…'}</dd>
          <dt>${t('f_title')}</dt><dd>${esc(draft.title) || '…'}</dd>
          <dt>${t('f_condition')}</dt><dd>${draft.cond ? t('cond_' + draft.cond) : '…'}</dd>
          <dt>${t('s4_t')}</dt><dd>${draft.mode ? t('mode_' + draft.mode) : '…'}</dd>
          <dt>${t('nav_stands')}</dt><dd>${draft.stand && dormById(draft.stand) ? t('stand_of', { d: dormById(draft.stand).short }) : '…'}</dd>
          <dt>${t('dropoff_day')}</dt><dd>${draft.day ? fmtDate(draft.day) : '…'}</dd>
        </dl>
      </div></aside></div>
    </section>`,
  };
};

async function submitDraft() {
  const n = now();
  const data = {
    cat: draft.cat, other: draft.cat === 'other' ? draft.other.trim() : '', title: draft.title.trim(), desc: draft.desc.trim(), cond: draft.cond, photo: draft.photo || '',
    mode: draft.mode, stand: draft.stand, dropDay: draft.day, dropCode: code('D'), status: 'waiting', createdAt: n,
  };
  try {
    const ref = await addDoc(collection(db, 'users', uid(), 'items'), data);
    draft = null; savePrefs({ draft: null });
    go('sold/' + ref.id, true);
  } catch (e) { fail(e); }
}

// Shrink a photo to 400 px wide JPEG, stored inside the item record (no Firebase Storage).
function compress(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const w = Math.min(400, img.width), h = Math.round(img.height * (w / img.width));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = rej; img.src = url;
  });
}

SCREENS.sold = (id) => {
  const it = S.myItems.find((x) => x.id === id);
  if (!it) return { title: '', html: empty('package', t('loading'), '') };
  const d = dormById(it.stand);
  return {
    title: t('listing_done'),
    html: `<section class="narrow center-col">
      ${pipPose('cheer', 'bob', 140)}
      <h2>${t('listing_done')}</h2>
      <p>${it.mode === 'sell' ? t('done_sell') : t('done_donate')}</p>
      <div class="code-card">
        <p class="eyebrow">${t('dropoff_code')}</p>
        <p class="bigcode">${esc(it.dropCode)}</p>
        <p class="meta">${ic('store')}<span>${t('stand_of', { d: d.short })} · ${esc(d.address)}</span></p>
        <p class="meta">${ic('calendar')}<span>${it.dropDay ? winTxt({ start: it.dropDay, end: it.dropDay + (STAND_HOURS[new Date(it.dropDay).getDay()][1] - STAND_HOURS[new Date(it.dropDay).getDay()][0]) * HOUR }) : ''}</span></p>
      </div>
      <a class="btn primary wide big" href="#/myitem/${id}">${ic('package')}${t('track_item')}</a>
      <a class="btn outline wide" href="#/sell" data-act="d-new">${ic('plus')}${t('list_another')}</a>
    </section>`,
  };
};

// ---------- My items ----------
SCREENS.myitems = () => {
  if (!signedIn()) return { title: t('tab_myitems'), html: `<section class="narrow">${empty('package', t('guest_items_t'), t('guest_items_b'), `<div class="stack"><a class="btn primary" href="#/signup">${t('sign_up')}</a><button class="btn sun" data-act="demo">${ic('sparkles')}${t('demo_account')}</button></div>`)}</section>` };
  const list = S.myItems;
  const act = list.filter((i) => ['waiting', 'examining', 'offer', 'declined', 'rejected'].includes(i.status));
  const past = list.filter((i) => !act.includes(i));
  const row = (i) => `<a class="row-card" href="#/myitem/${i.id}">${photo(i, 'thumb')}<div><b>${esc(i.title)}</b>
    <p class="meta">${ic('store')}<span>${t('stand_of', { d: dormById(i.stand).short })} · ${t(i.mode === 'sell' ? 'mode_sell' : 'mode_donate')}</span></p>
    <p class="meta small">${rowHint(i)}</p></div>${statusPill(i.status)}</a>`;
  return {
    title: t('tab_myitems'),
    html: `<section class="narrow">
      <div class="sec-head"><h2 class="screen-h">${t('my_items_t')}</h2><a class="btn primary sm" href="#/sell">${ic('plus')}${t('new_listing')}</a></div>
      ${!list.length ? empty('package', t('no_items_t'), t('no_items_b'), `<a class="btn primary" href="#/sell">${t('sell_donate')}</a>`) : `
      ${act.length ? `<h3>${t('in_progress')}</h3><div class="list two">${act.map(row).join('')}</div>` : ''}
      ${past.length ? `<h3>${t('finished')}</h3><div class="list two">${past.map(row).join('')}</div>` : ''}`}
      <a class="row-card plain" href="#/orders">${ic('shopping-bag')}<div><b>${t('nav_orders')}</b><p class="meta small"><span>${t('orders_link_b')}</span></p></div>${ic('chevron-right')}</a>
    </section>`,
  };
};
function rowHint(i) {
  const n = now();
  if (i.status === 'waiting') return `${ic('calendar')}<span>${t('hint_drop', { d: i.dropDay ? fmtDate(i.dropDay) : '' })}</span>`;
  if (i.status === 'examining') return `${ic('search')}<span>${t('hint_exam')}</span>`;
  if (i.status === 'offer') return `${ic('banknote')}<span>${t('hint_offer', { p: czk(i.offer), d: fmtDate(i.answerBy) })}</span>`;
  if (i.status === 'declined' || i.status === 'rejected') return `${ic('clock')}<span>${t('hint_collect', { d: fmtDate(i.collectBy) })}</span>`;
  if (i.status === 'accepted') return `${ic('banknote')}<span>${t('hint_paid', { p: czk(i.offer) })}</span>`;
  return `<span>${fmtDate(i.createdAt || n)}</span>`;
}

SCREENS.myitem = (id) => {
  const it = S.myItems.find((x) => x.id === id);
  if (!it) return { title: '', html: empty('package', t('loading'), '') };
  const d = dormById(it.stand);
  // Timeline
  const sellSteps = ['waiting', 'examining', 'offer', 'final'];
  const donSteps = ['waiting', 'donated'];
  const order = it.mode === 'sell' ? sellSteps : donSteps;
  const pos = { waiting: 0, examining: 1, offer: 2, accepted: 3, declined: 3, rejected: 2, donated: it.mode === 'sell' ? 3 : 1, disposed: 3, collected: 3 }[it.status] ?? 0;
  const finalLabel = it.mode === 'sell' ? (['accepted', 'declined', 'rejected', 'donated', 'disposed', 'collected'].includes(it.status) ? t('st_' + it.status) : t('tl_final')) : t('st_donated');
  const who = it.droppedBy ? `<small>${t(it.droppedBy === 'staff' ? 'confirmed_staff' : 'confirmed_you')}${it.droppedAt ? ' · ' + fmtDate(it.droppedAt) : ''}</small>` : '';
  const tl = order.map((s, n) => {
    const lab = s === 'final' ? finalLabel : (it.status === 'rejected' && s === 'offer' ? t('st_rejected') : t('tl_' + s));
    const sub = ((s === 'examining' && it.mode === 'sell') || (s === 'donated' && it.mode === 'donate')) && n <= pos ? who : '';
    return `<li class="${n < pos ? 'done' : n === pos ? 'now' : ''}"><span class="dot">${n < pos ? ic('check') : ''}</span><span>${lab}${sub}</span></li>`;
  }).join('');
  let action = '';
  const n = now();
  if (it.status === 'waiting') {
    action = `<div class="code-card"><p class="eyebrow">${t('dropoff_code')}</p><p class="bigcode">${esc(it.dropCode)}</p>
      <p class="meta">${ic('store')}<span>${t('stand_of', { d: d.short })} · ${esc(d.address)}</span></p>
      <p class="meta">${ic('calendar')}<span>${it.dropDay ? fmtDate(it.dropDay) : ''} · ${hoursTxt()}</span></p></div>
      <button class="btn primary wide big" data-act="dropped" data-id="${id}">${ic('package')}${t('i_dropped')}</button>
      <p class="hint center">${t('dropped_hint')}</p>`;
  } else if (it.status === 'examining') {
    const left = it.hold ? null : Math.max(0, it.droppedAt + AUTO_OFFER_MINUTES * MIN - n);
    action = `<div class="callout">${ic('search')}<div><b>${t('exam_t')}</b><p>${t('exam_b')}</p></div></div>`;
  } else if (it.status === 'offer') {
    action = `<div class="offer-card">
      <p class="eyebrow">${it.offerBy === 'auto' ? t('offer_auto') : t('offer_manager')}</p>
      <p class="offer-price">${czk(it.offer)}</p>
      <p class="meta">${ic('calendar')}<span>${t('answer_by', { d: fmtDateLong(it.answerBy) })}</span></p>
      <p class="meta small">${ic('info')}<span>${t('no_answer_rule')}</span></p>
      <div class="row2"><button class="btn outline" data-act="decline" data-id="${id}">${ic('x')}${t('decline')}</button><button class="btn primary" data-act="accept" data-id="${id}">${ic('check')}${t('accept')}</button></div>
    </div>`;
  } else if (it.status === 'accepted') {
    action = `<div class="done-card">${pipPose('cheer')}<h2>${t('paid_t')}</h2><p>${t('paid_b', { p: czk(it.offer), iban: esc(maskIban(S.prof.bank.iban)) })}</p></div>`;
  } else if (it.status === 'declined' || it.status === 'rejected') {
    action = `<div class="callout ${it.status === 'rejected' ? 'warn' : ''}">${ic(it.status === 'rejected' ? 'ban' : 'rotate-ccw')}<div>
      <b>${it.status === 'rejected' ? t('rejected_t') : t('declined_t')}</b>
      ${it.rejectReason ? `<p>${t('reason')}: ${esc(it.rejectReason)}</p>` : ''}
      <p>${t('collect_by', { d: d.short, date: fmtDateLong(it.collectBy) })}</p>
      <p class="meta small">${ic('info')}<span>${t('dispose_rule')}</span></p></div></div>
      <button class="btn outline wide" data-act="collected" data-id="${id}">${ic('check')}${t('i_collected')}</button>`;
  } else if (it.status === 'donated') {
    const kg = catById(it.cat).kg;
    action = `<div class="done-card">${pipPose('cheer')}<h2>${t('thanks_t')}</h2><p>${it.donatedReason === 'noanswer' ? t('thanks_noanswer') : t('thanks_b')}</p><p class="pill green">${ic('leaf')}${t('impact_line', { kg: fmtNum(kg) })}</p></div>`;
  } else if (it.status === 'disposed') {
    action = `<div class="callout">${ic('recycle')}<div><b>${t('disposed_t')}</b><p>${t('disposed_b')}</p></div></div>`;
  } else if (it.status === 'collected') {
    action = `<div class="callout">${ic('check')}<div><b>${t('st_collected')}</b></div></div>`;
  }
  return {
    title: it.title,
    html: `<section class="narrow">
      <div class="cols"><div class="main">
      <div class="sum-card">${photo(it, 'thumb')}<div><b>${esc(it.title)}</b><p class="meta"><span>${esc(catName(it))} · ${t('cond_' + it.cond)} · ${t(it.mode === 'sell' ? 'mode_sell' : 'mode_donate')}</span></p></div>${statusPill(it.status)}</div>
      <ol class="timeline">${tl}</ol>
      </div><aside class="side">
      ${action}
      </aside></div>
    </section>`,
  };
};
const maskIban = (s) => (s ? s.replace(/\s/g, '').replace(/^(.{4}).*(.{4})$/, '$1 •••• $2') : '');

// ---------- Bank (demo) ----------
SCREENS.bank = (then) => {
  const b = S.prof.bank;
  return {
    title: t('bank_t'),
    html: `<section class="narrow">
      <h2 class="screen-h">${t('bank_t')}</h2>
      <div class="demo-banner">${ic('info')}<span>${t('bank_demo')}</span></div>
      ${then ? `<p class="callout">${ic('banknote')}<span>${t('bank_needed')}</span></p>` : ''}
      <div class="cols"><div class="main">
      <form id="fBank" class="form">
        <label>${t('f_holder')}<input name="holder" value="${esc(b.holder)}" autocomplete="off" required></label>
        <label>IBAN<input name="iban" value="${esc(b.iban)}" placeholder="CZ00 0000 0000 0000 0000 0000" autocomplete="off" required></label>
        <label>${t('f_bankname')}<input name="bankName" value="${esc(b.bankName)}" autocomplete="off"></label>
        <p class="form-err" id="fErr" role="alert"></p>
        <button class="btn primary wide big" type="submit">${ic('check')}${then ? t('save_accept') : t('save')}</button>
      </form>
      </div><aside class="side"><div class="side-card">
      <h3>${t('bank_side_t')}</h3><p class="muted">${t('bank_side_b')}</p>
      <div class="demo-btns">
        <button class="btn outline" data-act="demo-only">${ic('send')}${t('transfer')}</button>
        <button class="btn outline" data-act="demo-only">${ic('credit-card')}${t('add_card')}</button>
        <button class="btn outline" data-act="demo-only">${ic('landmark')}${t('change_bank')}</button>
      </div></div></aside></div>
    </section>`,
    after() {
      $('#fBank').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const bank = { holder: f.get('holder').trim(), iban: f.get('iban').trim(), bankName: f.get('bankName').trim() };
        if (!bank.holder || bank.iban.replace(/\s/g, '').length < 10) { $('#fErr').textContent = t('err_bank'); return; }
        savePrefs({ bank });
        toast(t('saved_ok'));
        if (then) await acceptOffer(then); else go('profile');
      });
    },
  };
};

async function acceptOffer(id) {
  try {
    await updateDoc(doc(db, 'users', uid(), 'items', id), { status: 'accepted', acceptedAt: now() });
    note('paid', { title: (S.myItems.find((x) => x.id === id) || {}).title, price: (S.myItems.find((x) => x.id === id) || {}).offer });
    go('myitem/' + id, true);
    toast(t('paid_t'));
  } catch (e) { fail(e); }
}

// ---------- Notifications ----------
function noteText(n) {
  const p = n.p || {};
  const title = typeof p.title === 'object' ? L(p.title) : p.title;
  const args = { title: esc(title), price: p.price ? czk(p.price) : '', date: p.date ? fmtDateLong(p.date) : '', stand: p.stand ? dormById(p.stand)?.short : '' };
  return { h: t('n_' + n.type + '_t', args), b: t('n_' + n.type + '_b', args) };
}
const noteIcon = { offer: 'banknote', rejected: 'ban', thanks: 'hand-heart', noanswer: 'hand-heart', disposed: 'recycle', expired: 'clock', soon: 'timer', paid: 'banknote', welcome: 'sparkles' };
// Where a message leads: the item it is about, or the orders list.
function noteTarget(n) {
  const title = typeof n.p?.title === 'object' ? L(n.p.title) : n.p?.title;
  if (['offer', 'rejected', 'thanks', 'noanswer', 'disposed', 'paid'].includes(n.type)) { const it = S.myItems.find((x) => x.title === title); if (it) return 'myitem/' + it.id; }
  if (['expired', 'soon'].includes(n.type)) return 'orders';
  return '';
}
SCREENS.notes = () => {
  const sel = S.notes.find((x) => x.id === S.noteSel) || S.notes.find((x) => !x.read) || S.notes[0];
  const detail = sel ? (() => { const x = noteText(sel), to = noteTarget(sel); return `<div class="note-detail side-card">
      <span class="note-ic">${ic(noteIcon[sel.type] || 'bell')}</span><h3>${x.h}</h3><p>${x.b}</p>
      <p class="meta">${ic('clock')}<span>${fmtDateLong(sel.at)} · ${fmtAgo(now() - sel.at)}</span></p>
      ${to ? `<a class="btn primary" href="#/${to}">${ic('chevron-right')}${t(to === 'orders' ? 'nav_orders' : 'track_item')}</a>` : ''}
    </div>`; })() : '';
  return {
    title: t('nav_inbox'),
    html: `<section class="narrow">
      <div class="sec-head"><h2 class="screen-h">${t('inbox_t')}</h2>${unreadCount() ? `<button class="linkbtn" data-act="read-all">${ic('check')}<span>${t('mark_all')}</span></button>` : ''}</div>
      ${!signedIn() ? empty('bell', t('guest_inbox_t'), t('guest_inbox_b'), `<a class="btn primary" href="#/signup">${t('sign_up')}</a>`)
      : !S.notes.length ? empty('bell', t('no_notes_t'), t('no_notes_b'))
      : `<div class="cols"><div class="main"><div class="list">${S.notes.map((n) => { const x = noteText(n); return `<button class="note-row ${n.read ? '' : 'unread'} ${sel && n.id === sel.id ? 'sel' : ''}" data-act="note" data-id="${n.id}">
          <span class="note-ic">${ic(noteIcon[n.type] || 'bell')}</span>
          <div><b>${x.h}</b><p>${x.b}</p><p class="meta small"><span>${fmtAgo(now() - n.at)}</span>${n.read ? '' : `<span class="pill sun">${t('unread')}</span>`}</p></div></button>`; }).join('')}</div></div>
      <aside class="side laptop-only">${detail}</aside></div>`}
    </section>`,
  };
};

// ---------- Profile ----------
function impact() {
  const items = S.myItems.filter((i) => ['accepted', 'donated'].includes(i.status));
  const bought = S.orders.filter((o) => o.status === 'picked');
  const boughtItems = bought.flatMap(orderItems);
  const kg = items.reduce((s, i) => s + catById(i.cat).kg, 0) + boughtItems.reduce((s, x) => s + (catById(x.cat) || { kg: 1 }).kg, 0);
  return { n: items.length + boughtItems.length, kg: Math.round(kg * 10) / 10 };
}
SCREENS.profile = () => {
  const d = myDorm(), imp = impact();
  const initials = (S.mode === 'demo' ? 'D' : S.prof.name || (S.mode === 'guest' ? 'G' : '?')).split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  return {
    title: t('tab_profile'),
    html: `<section class="narrow profile">
      <div class="prof-head">
        <div class="avatar">${esc(initials)}</div>
        <div><h2>${S.mode === 'demo' ? t('demo_badge') : signedIn() ? esc(S.prof.name || t('student')) : t('guest_name')}</h2>
          <p class="meta"><span>${S.mode === 'demo' ? t('demo_badge') : S.mode === 'guest' ? t('guest_badge') : esc(S.prof.email)}</span></p></div>
      </div>
      <div class="cols"><aside class="side first">
      ${S.mode === 'guest' ? `<div class="callout">${ic('user')}<div><b>${t('guest_cta_t')}</b><p>${t('guest_cta_b')}</p></div><a class="btn primary sm" href="#/signup">${t('sign_up')}</a></div>` : ''}
      ${signedIn() ? `<div class="impact">
        <div><b>${imp.n}</b><span>${t('items_reused')}</span></div>
        <div><b>${fmtNum(imp.kg)} kg</b><span>${t('kg_saved')}</span></div>
        <p class="meta small">${ic('info')}<span>${t('impact_est')}</span></p>
      </div>` : ''}
      </aside><div class="main">
      <div class="settings">
        ${signedIn() && S.mode === 'user' ? `<form id="fName" class="set-row">${ic('user')}<label>${t('f_name')}<input name="name" value="${esc(S.prof.name)}" maxlength="40"></label><button class="btn outline sm" type="submit">${t('save')}</button></form>` : ''}
        <button class="set-row" data-act="dorm">${ic('map-pin')}<div><b>${t('your_dorm')}</b><span>${d ? esc(d.name) : t('not_set')}</span></div><u>${t('change')}</u></button>
        ${signedIn() ? `<a class="set-row" href="#/bank">${ic('landmark')}<div><b>${t('bank_t')}</b><span>${S.prof.bank.iban ? esc(maskIban(S.prof.bank.iban)) : t('not_set')}</span></div>${ic('chevron-right')}</a>
        <a class="set-row" href="#/cart">${ic('shopping-cart')}<div><b>${t('cart_t')}</b><span>${t('n_items', { n: cartCount() })}</span></div>${ic('chevron-right')}</a>
        <a class="set-row" href="#/orders">${ic('shopping-bag')}<div><b>${t('nav_orders')}</b><span>${t('n_orders', { n: S.orders.length })}</span></div>${ic('chevron-right')}</a>
        <a class="set-row" href="#/notes">${ic('bell')}<div><b>${t('nav_inbox')}</b><span>${t('n_unread', { n: unreadCount() })}</span></div>${ic('chevron-right')}</a>` : ''}
        <a class="set-row" href="#/stands">${ic('map')}<div><b>${t('nav_stands')}</b><span>${t('stands_sub')}</span></div>${ic('chevron-right')}</a>
        <a class="set-row" href="#/waitlist">${ic('mail')}<div><b>${t('wl_t')}</b><span>${t('wl_row')}</span></div>${ic('chevron-right')}</a>
        <a class="set-row" href="#/saved">${ic('bell-plus')}<div><b>${t('alerts_h')}</b><span>${t('n_alerts', { n: (S.prof.alerts || []).length })}</span></div>${ic('chevron-right')}</a>
        <button class="set-row" data-act="invite">${ic('user-plus')}<div><b>${t('invite_t')}</b><span>${t('invite_row')}</span></div>${ic('share-2')}</button>
        <a class="set-row" href="#/feedback">${ic('message-square-text')}<div><b>${t('fb_t')}</b><span>${t('fb_sub')}</span></div>${ic('chevron-right')}</a>
        <a class="set-row" href="#/about">${ic('users')}<div><b>${t('about_us')}</b><span>${t('about_row')}</span></div>${ic('chevron-right')}</a>
        ${S.isManager ? `<a class="set-row" href="#/manager">${ic('shield-check')}<div><b>${t('nav_manager')}</b><span>${t('manager_row')}</span></div>${ic('chevron-right')}</a>` : ''}
      </div>
      ${signedIn() ? `<button class="btn outline wide danger" data-act="signout">${ic('log-out')}${t('sign_out')}</button>`
      : `<div class="stack"><a class="btn primary wide" href="#/signin">${ic('lock')}${t('sign_in')}</a><button class="btn ghost wide" data-act="leave-guest">${ic('log-out')}${t('leave_guest')}</button></div>`}
      </div></div>
    </section>`,
    after() {
      const f = $('#fName');
      if (f) f.addEventListener('submit', (e) => { e.preventDefault(); const name = new FormData(f).get('name').trim(); if (name) { savePrefs({ name }); updateProfile(S.user, { displayName: name }).catch(() => {}); toast(t('saved_ok')); render(); } });
    },
  };
};

// Schematic course of the Vltava through Prague, south to north (rough, for orientation only).
const RIVER = [{ lat: 50.005, lon: 14.405 }, { lat: 50.03, lon: 14.418 }, { lat: 50.055, lon: 14.412 }, { lat: 50.075, lon: 14.41 }, { lat: 50.09, lon: 14.415 }, { lat: 50.105, lon: 14.425 }, { lat: 50.115, lon: 14.44 }, { lat: 50.125, lon: 14.425 }, { lat: 50.13, lon: 14.40 }];

// ---------- Stands (list and drawn map) ----------
SCREENS.stands = (view) => {
  const base = S.pos || myDorm();
  const list = [...DORMS].sort((a, b) => (base ? distanceM(base, a) - distanceM(base, b) : a.name.localeCompare(b.name)));
  const lat = DORMS.map((d) => d.lat), lon = DORMS.map((d) => d.lon);
  const [la0, la1, lo0, lo1] = [Math.min(...lat) - 0.008, Math.max(...lat) + 0.008, Math.min(...lon) - 0.012, Math.max(...lon) + 0.012];
  // v2: on a phone the map is drawn about as wide as the screen, so 1 map unit is about 1 pixel and the 12 px pin numbers stay readable
  // (v1 drew it 800 wide and shrank it to 45 %, which made the numbers about 5 px).
  const phone = window.matchMedia('(max-width: 599px)').matches;
  const W = phone ? 360 : 800, HIT = phone ? 24 : 54, H = Math.round(W * ((la1 - la0) / ((lo1 - lo0) * Math.cos(50.08 * Math.PI / 180))));
  const xy = (p) => [((p.lon - lo0) / (lo1 - lo0)) * W, ((la1 - p.lat) / (la1 - la0)) * H];
  const count = (id) => availableItems().filter((i) => i.dorm === id).length;
  const map = `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('map_aria')}">
    <rect width="${W}" height="${H}" rx="16" class="map-bg"/>
    <path class="river" d="${RIVER.map((p, i) => (i ? 'L' : 'M') + xy(p).map((v) => v.toFixed(0)).join(' ')).join(' ')}"/>
    ${DORMS.map((d) => { const [x, y] = xy(d); const me = d.id === S.prof.dorm; return `<g class="pin ${me ? 'me' : ''}" data-act="stand-pin" data-id="${d.id}" tabindex="0" role="button" aria-label="${esc(d.name)}"><circle class="hit" cx="${x}" cy="${y}" r="${HIT}"/><circle cx="${x}" cy="${y}" r="${me ? 15 : 12}"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="pin-n">${count(d.id)}</text><text x="${x + 18}" y="${y + 5}" class="pin-l">${esc(d.short)}</text></g>`; }).join('')}
    ${S.pos ? (() => { const [x, y] = xy(S.pos); return `<g class="you"><circle cx="${x}" cy="${y}" r="7"/><text x="${x + 12}" y="${y + 18}" class="pin-l">${t('you_are_here')}</text></g>`; })() : ''}
  </svg>`;
  return {
    title: t('nav_stands'),
    html: `<section>
      <div class="sec-head"><h2 class="screen-h">${t('stands_t')}</h2>
        <div class="seg"><a href="#/stands/list" class="${view !== 'map' ? 'on' : ''}">${ic('list')}${t('list')}</a><a href="#/stands/map" class="${view === 'map' ? 'on' : ''}">${ic('map')}${t('map')}</a></div></div>
      <p class="muted">${t('stands_b')}</p>
      <button class="btn outline sm" data-act="locate">${ic('navigation')}${t('use_location')}</button>
      <div class="${view === 'map' ? 'cols wide' : ''}"><div class="main">
      ${view === 'map' ? `${map}<p class="meta small">${ic('info')}<span>${t('map_note')}</span></p>` : ''}
      </div><div class="${view === 'map' ? 'side scroll' : ''}">
      <div class="list stands-list ${view === 'map' ? '' : 'two'}">${list.map((d) => `<div class="row-card" id="stand-${d.id}">
        <span class="stand-ic ${d.id === S.prof.dorm ? 'me' : ''}">${ic('store')}</span>
        <div><b>${esc(d.name)} ${d.id === S.prof.dorm ? `<span class="pill green">${t('your_dorm')}</span>` : ''} ${d.full ? `<span class="pill red">${ic('ban')}${t('full_today')}</span>` : ''}</b>
          <p class="meta"><span>${esc(d.address)}${base ? ' · ' + fmtDist(distanceM(base, d)) : ''}</span></p>
          <p class="meta small">${ic('clock')}<span>${hoursTxt()} · ${t('n_items', { n: count(d.id) })}</span></p></div>
        <button class="btn outline sm" data-act="pick-dorm" data-id="${d.id}">${d.id === S.prof.dorm ? ic('check') : ''}${t(d.id === S.prof.dorm ? 'your_dorm' : 'set_mine')}</button></div>`).join('')}</div>
      ${askStandCard()}
      </div></div>
    </section>`,
  };
};

// ---------- Waitlist ----------
SCREENS.waitlist = () => ({
  title: t('wl_t'),
  html: `<section class="narrow">
    <div class="cols"><div class="main">
    <div class="wl-hero">${pipPose('wave', 'bob', 120)}<h2>${t('wl_t')}</h2><p>${t('wl_b')}</p></div>
    ${lsGet('hd_waitlisted') ? `<div class="done-card">${ic('circle-check')}<h2>${t('wl_done_t')}</h2><p>${t('wl_done_b')}</p></div>` : ''}
    </div><aside class="side">
    <form id="fWait" class="form card-form">
      <label>${t('f_email')}<input name="email" type="email" required value="${esc(S.prof.email || '')}"></label>
      <label>${t('your_dorm')}<select name="dorm"><option value="">${t('choose_dorm')}</option>${DORMS.map((d) => `<option value="${d.id}" ${d.id === S.prof.dorm ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>
      <p class="form-err" id="fErr" role="alert"></p>
      <button class="btn primary wide big" type="submit">${ic('send')}${t('wl_join')}</button>
      <p class="meta small">${ic('lock')}<span>${t('wl_privacy')}</span></p>
    </form>
    </aside></div>
  </section>`,
  after() {
    $('#fWait').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), email = f.get('email').trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { $('#fErr').textContent = t('err_email'); return; }
      try {
        await addDoc(collection(db, 'waitlist'), { email, dorm: f.get('dorm') || '', lang: S.prof.lang, at: Date.now() });
        bump('waitlist'); lsSet('hd_waitlisted', '1');
        toast(t('wl_done_t')); render();
      } catch (x) { fail(x); }
    });
  },
});

// ---------- About ----------
SCREENS.about = () => ({
  title: t('about_us'),
  html: `<section class="narrow about">
    <h2 class="screen-h">${t('about_us')}</h2>
    <div class="cols"><div class="main">
    <div class="story">
      ${pipPose('wave', 'story-pip', 96)}
      <p class="eyebrow">${t('story_eyebrow')}</p>
      <h3>${t('story_h')}</h3>
      <p>${t('story_p1')}</p>
      <p>${t('story_p2')}</p>
      <p>${t('story_p3')}</p>
      <p class="story-team">${ic('users')}<span>${t('story_team')}</span></p>
    </div>
    <h3>${t('values_h')}</h3>
    <ul class="values"><li>${ic('sparkles')}<span><b>${t('value1_t')}</b> ${t('value1_b')}</span></li><li>${ic('store')}<span><b>${t('value2_t')}</b> ${t('value2_b')}</span></li><li>${ic('leaf')}<span><b>${t('value3_t')}</b> ${t('value3_b')}</span></li></ul>
    <div class="link-cards"><a class="link-card" href="#/feedback">${ic('message-square-text')}<div><b>${t('fb_t')}</b><span>${t('fb_sub')}</span></div>${ic('chevron-right')}</a>
      <button class="link-card" data-act="invite">${ic('user-plus')}<div><b>${t('invite_t')}</b><span>${t('invite_row')}</span></div>${ic('share-2')}</button></div>
    <h3>${t('about_t')}</h3>
    <p>${t('about_lead')}</p>
    <ol class="how-steps vertical">
      <li>${ic('package')}<b>${t('how1_t')}</b><span>${t('how1_b')}</span></li>
      <li>${ic('banknote')}<b>${t('how2_t')}</b><span>${t('how2_b')}</span></li>
      <li>${ic('sparkles')}<b>${t('how3_t')}</b><span>${t('how3_b')}</span></li>
      <li>${ic('ticket')}<b>${t('how4_t')}</b><span>${t('how4_b')}</span></li>
    </ol>
    <h3>${t('rules_t')}</h3>
    <ul class="rules"><li>${t('rule1')}</li><li>${t('rule2')}</li><li>${t('rule3')}</li><li>${t('rule4')}</li><li>${t('rule5')}</li></ul>
    <div class="demo-banner">${ic('info')}<span>${t('proto_note')}</span></div>
    </div><aside class="side">
    <h3>${t('credits_t')}</h3>
    <ul class="credits"><li>${t('credit_ai')}</li>
      ${S.dormCredits.filter((c) => c.source !== 'Google Gemini').map((c) => `<li>${t('dorm_photo')} ${esc(c.dorm)}: <a href="${esc(c.page)}" target="_blank" rel="noopener">${esc(c.title)}</a>, ${esc(c.author)}, <a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener">${esc(c.license)}</a>, Wikimedia Commons (cropped, blurred, tinted)</li>`).join('')}
      ${S.credits.map((c) => `<li>${t('photo_credit')}: <a href="${esc(c.page)}" target="_blank" rel="noopener">${esc(c.photographer)} / ${esc(c.source)}</a></li>`).join('') || `<li>${t('no_photos')}</li>`}
      <li>${t('credit_icons')}</li><li>${t('credit_fonts')}</li><li>${t('credit_dorms')}</li></ul>
    </aside></div>
  </section>`,
});

// ---------- Feedback form (v2) ----------
// Answers are counted in the existing 'stats' counters (allowed by the current security rules, no console change);
// the optional comment goes to the team's phones through ntfy. Nothing identifies the person.
const FB_SCALE = ['q1', 'q2'], FB_CHOICE = ['q3', 'q4'], FB_OPTS = ['yes', 'maybe', 'no'];
SCREENS.feedback = () => {
  const sent = lsGet('hd_feedback_sent');
  const scale = (q) => `<fieldset class="fb-q"><legend>${t('fb_' + q)}</legend><div class="scale">${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="${q}" value="${v}" required><span>${v}</span></label>`).join('')}</div><p class="scale-ends"><span>${t('fb_low')}</span><span>${t('fb_high')}</span></p></fieldset>`;
  const choice = (q) => `<fieldset class="fb-q"><legend>${t('fb_' + q)}</legend><div class="choice">${FB_OPTS.map((v) => `<label><input type="radio" name="${q}" value="${v}" required><span>${t('fb_' + v)}</span></label>`).join('')}</div></fieldset>`;
  return {
    title: t('fb_t'),
    html: `<section class="narrow center-col-l">
      <h2 class="screen-h">${t('fb_t')}</h2>
      <p class="muted">${t('fb_lead')}</p>
      ${sent ? `<div class="callout">${ic('circle-check')}<div><b>${t('fb_thanks_t')}</b><p>${t('fb_again')}</p></div></div>` : ''}
      <form id="fFb" class="form card-form" novalidate>
        ${FB_SCALE.map(scale).join('')}${FB_CHOICE.map(choice).join('')}
        <label>${t('fb_q5')}<textarea name="q5" rows="3" maxlength="500" placeholder="${t('fb_q5_ph')}"></textarea></label>
        <p class="meta small">${ic('lock')}<span>${t('fb_privacy')}</span></p>
        <p class="form-err" id="fFbErr" role="alert"></p>
        <button class="btn primary wide big" type="submit">${ic('send')}${t('fb_send')}</button>
      </form>
    </section>`,
    after() {
      $('#fFb').addEventListener('change', () => { $('#fFbErr').textContent = ''; });
      $('#fFb').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const miss = [...FB_SCALE, ...FB_CHOICE].find((q) => !f.get(q));
        if (miss) { $('#fFbErr').textContent = t('fb_err'); e.target.querySelector(`[name=${miss}]`).focus(); return; }
        [...FB_SCALE, ...FB_CHOICE].forEach((q) => bump(`fb_${q}_${f.get(q)}`));
        bump('fb_sent');
        const c = (f.get('q5') || '').trim().slice(0, 500);
        ntfy(`HelloDorm feedback: find ${f.get('q1')}/5, pickup clear ${f.get('q2')}/5, would sell ${f.get('q3')}, would buy ${f.get('q4')}${c ? `. Comment: ${c}` : ''}`);
        lsSet('hd_feedback_sent', String(Date.now()));
        openModal(`<div class="center-col">${pipPose('cheer', 'bob', 110)}<h2>${t('fb_thanks_t')}</h2><p>${t('fb_thanks_b')}</p></div><a class="btn primary wide" href="#/home" data-act="close">${t('tab_home')}</a>`);
        celebrate();
        e.target.reset();
      });
    },
  };
};

// ---------- Manager mode ----------
async function loadManager() {
  try {
    const qs = await getDocs(collectionGroup(db, 'items'));
    S.mgr.items = qs.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
    // Apply the 10-minute automatic offer for items nobody priced.
    const n = now();
    for (const it of S.mgr.items) {
      if (it.status === 'examining' && !it.hold && it.droppedAt && n - it.droppedAt > AUTO_OFFER_MINUTES * MIN) {
        const offer = standardOffer(it.cat, it.cond);
        await updateDoc(it.ref, { status: 'offer', offer, offerBy: 'auto', offerAt: n, answerBy: n + ANSWER_DAYS * DAY }).catch(() => {});
        Object.assign(it, { status: 'offer', offer, offerBy: 'auto', offerAt: n, answerBy: n + ANSWER_DAYS * DAY });
      }
    }
    const fbNames = [...FB_SCALE.flatMap((q) => [1, 2, 3, 4, 5].map((v) => `fb_${q}_${v}`)), ...FB_CHOICE.flatMap((q) => FB_OPTS.map((v) => `fb_${q}_${v}`))];
    const names = ['visits', 'sell', 'reserve', 'waitlist', 'signup', 'users', 'demo', 'orders_guest', 'fb_sent', 'invite_share', 'invite_visit', 'alert_set', ...fbNames];
    const snaps = await Promise.all(names.map((k) => getDoc(doc(db, 'stats', k)).catch(() => null)));
    S.mgr.stats = {}; names.forEach((k, i) => (S.mgr.stats[k] = (snaps[i] && snaps[i].exists() && snaps[i].data().n) || 0));
    const wl = await getDocs(collection(db, 'waitlist'));
    S.mgr.waitlist = wl.docs.map((d) => d.data()).sort((a, b) => b.at - a.at);
    S.mgr.loaded = true;
  } catch (e) { fail(e); S.mgr.loaded = true; }
  if (currentName === 'manager') render();
}
SCREENS.manager = () => {
  if (!S.mgr.loaded) { loadManager(); return { title: t('nav_manager'), html: empty('shield-check', t('loading'), '') }; }
  const tab = S.mgr.tab, n = now();
  const items = S.mgr.items;
  const queue = items.filter((i) => i.status === 'examining').sort((a, b) => a.droppedAt - b.droppedAt);
  const waiting = items.filter((i) => i.status === 'waiting');
  const offers = items.filter((i) => ['offer', 'accepted', 'declined', 'donated', 'rejected', 'disposed', 'collected'].includes(i.status) && i.mode === 'sell').sort((a, b) => (b.offerAt || b.createdAt) - (a.offerAt || a.createdAt));
  const tabs = [['queue', 'list', t('m_queue', { n: queue.length })], ['offers', 'banknote', t('m_offers')], ['totals', 'chart-column', t('m_totals')], ['controls', 'fast-forward', t('m_controls')]];
  let body = '';
  if (tab === 'queue') {
    body = `${queue.length ? `<div class="mgr-grid">${queue.map((i) => `<article class="mgr-card">
      ${photo(i, 'thumb lg')}
      <div class="mgr-info"><b>${esc(i.title)}</b>
        <p class="meta"><span>${esc(catName(i))} · ${t('cond_' + i.cond)}</span></p>
        <p class="meta">${ic('store')}<span>${t('stand_of', { d: dormById(i.stand).short })} · ${t(i.droppedBy === 'staff' ? 'confirmed_staff' : 'confirmed_you')}</span></p>
        <p class="meta">${ic('timer')}<span>${t('m_waiting', { t: fmtAgo(n - i.droppedAt) })}${i.hold ? '' : ' · ' + t('m_auto_in', { m: Math.max(0, Math.ceil((i.droppedAt + AUTO_OFFER_MINUTES * MIN - n) / MIN)) })}</span></p>
        ${i.desc ? `<p class="small">${esc(i.desc)}</p>` : ''}
      </div>
      <form class="mgr-form" data-form="price" data-path="${i.ref.path}">
        <label>${t('m_price')}<input name="price" type="number" min="0" step="10" value="${standardOffer(i.cat, i.cond)}"></label>
        <button class="btn primary sm" type="submit">${ic('check')}${t('m_set_price')}</button>
      </form>
      <form class="mgr-form" data-form="reject" data-path="${i.ref.path}">
        <label>${t('m_reason')}<input name="reason" placeholder="${t('m_reason_ph')}" maxlength="80"></label>
        <button class="btn outline sm danger" type="submit">${ic('ban')}${t('m_reject')}</button>
      </form>
    </article>`).join('')}</div>` : empty('circle-check', t('m_empty_t'), t('m_empty_b'))}
    <div class="confirm-box">
      <h3>${ic('scan-line')}${t('m_confirm_t')}</h3>
      <p class="muted">${t('m_confirm_b')}</p>
      <label class="searchbar">${ic('search')}<input id="mgrCode" placeholder="${t('m_confirm_ph')}" aria-label="${t('m_confirm_ph')}" autocomplete="off"></label>
      ${waiting.length ? `<div class="list" id="waitList">${waiting.map((i) => `<div class="row-card" data-code="${esc((i.dropCode || '').toLowerCase())}" data-title="${esc((i.title || '').toLowerCase())}">${photo(i, 'thumb')}<div><b>${esc(i.title)}</b><p class="meta"><span>${t('m_code')}: <b>${esc(i.dropCode || '')}</b> · ${t('stand_of', { d: dormById(i.stand).short })} · ${i.dropDay ? fmtDate(i.dropDay) : ''} · ${t(i.mode === 'sell' ? 'mode_sell' : 'mode_donate')}</span></p></div><button class="btn primary sm" data-act="staff-drop" data-path="${i.ref.path}">${ic('check')}${t('m_confirm_btn')}</button></div>`).join('')}</div>
      <p class="muted" id="noMatch" hidden>${t('m_no_match')}</p>` : `<p class="muted">${t('m_no_match')}</p>`}
    </div>`;
  } else if (tab === 'offers') {
    body = offers.length ? `<div class="list">${offers.map((i) => `<div class="row-card">${photo(i, 'thumb')}<div><b>${esc(i.title)}</b>
        <p class="meta"><span>${i.offer ? czk(i.offer) : ''} · ${i.offerBy === 'auto' ? t('m_by_auto') : i.offerBy === 'manager' ? t('m_by_manager') : ''}${i.rejectReason ? esc(i.rejectReason) : ''}</span></p>
        ${i.status === 'offer' ? `<form class="mgr-form inline" data-form="price" data-path="${i.ref.path}"><label class="sr">${t('m_price')}</label><input name="price" type="number" min="0" step="10" value="${i.offer}" aria-label="${t('m_price')}"><button class="btn outline sm" type="submit">${t('m_change')}</button></form>` : ''}</div>
        ${statusPill(i.status)}</div>`).join('')}</div>` : empty('banknote', t('m_no_offers'), '');
  } else if (tab === 'totals') {
    const s = S.mgr.stats;
    const tiles = [['users', t('m_t_users'), s.users], ['demo', t('m_t_demo'), s.demo], ['package', t('m_t_items'), items.length], ['mail', t('m_t_waitlist'), S.mgr.waitlist.length],
      ['eye', t('m_t_visits'), s.visits], ['circle-plus', t('m_t_sell'), s.sell], ['ticket', t('m_t_reserve'), s.reserve], ['user', t('m_t_signup'), s.signup]];
    body = `<div class="stat-grid">${tiles.map(([i, l, v]) => `<div class="stat">${ic(i === 'demo' ? 'sparkles' : i)}<b>${fmtNum(v || 0)}</b><span>${l}</span></div>`).join('')}</div>
      <p class="meta small">${ic('info')}<span>${t('m_counts_note')}</span></p>
      <h3>${t('m_comm_h')}</h3>
      <div class="stat-grid">${[['ticket', t('m_t_guest_orders'), s.orders_guest], ['message-square-text', t('m_t_fb'), s.fb_sent], ['share-2', t('m_t_inv_share'), s.invite_share], ['user-plus', t('m_t_inv_visit'), s.invite_visit], ['bell-plus', t('m_t_alerts'), s.alert_set]].map(([i, l, v]) => `<div class="stat">${ic(i)}<b>${fmtNum(v || 0)}</b><span>${l}</span></div>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>${t('m_fb_q')}</th><th>${t('m_fb_answers')}</th></tr></thead><tbody>
        ${FB_SCALE.map((q) => { const c = [1, 2, 3, 4, 5].map((v) => s[`fb_${q}_${v}`] || 0); const n = c.reduce((a, b) => a + b, 0); const avg = n ? (c.reduce((a, b, i) => a + b * (i + 1), 0) / n).toFixed(1) : '0'; return `<tr><td>${t('fb_' + q)}</td><td>${t('m_fb_avg', { a: avg, n })} (${c.map((x, i) => `${i + 1}: ${x}`).join(', ')})</td></tr>`; }).join('')}
        ${FB_CHOICE.map((q) => `<tr><td>${t('fb_' + q)}</td><td>${FB_OPTS.map((v) => `${t('fb_' + v)}: ${s[`fb_${q}_${v}`] || 0}`).join(', ')}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="meta small">${ic('info')}<span>${t('m_fb_note')}</span></p>
      <h3>${t('m_waitlist_h')}</h3>
      ${S.mgr.waitlist.length ? `<div class="table-wrap"><table><thead><tr><th>${t('f_email')}</th><th>${t('your_dorm')}</th><th>${t('m_date')}</th></tr></thead><tbody>${S.mgr.waitlist.map((w) => `<tr><td>${esc(w.email)}</td><td>${w.dormName ? `${esc(w.dormName)} <span class="pill sun">${t('m_requested')}</span>` : esc((dormById(w.dorm) || {}).short || '')}</td><td>${fmtDate(w.at)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('m_no_wl')}</p>`}`;
  } else {
    body = `<div class="callout warn">${ic('fast-forward')}<div><b>${t('m_ctrl_t')}</b><p>${t('m_ctrl_b')}</p><p class="meta"><span>${t('m_clock', { d: S.offsetDays, date: fmtDateLong(now()) })}</span></p></div></div>
      <div class="stack">
        <button class="btn primary" data-act="skip15">${ic('fast-forward')}${t('m_skip')}</button>
        <button class="btn outline" data-act="clock0">${ic('rotate-ccw')}${t('m_clock0')}</button>
        <button class="btn outline" data-act="shop-reset">${ic('refresh-cw')}${t('m_shop_reset')}</button>
      </div>`;
  }
  return {
    title: t('nav_manager'),
    html: `<section class="manager">
      <div class="sec-head"><h2 class="screen-h">${ic('shield-check')}${t('nav_manager')}</h2><button class="btn outline sm" data-act="mgr-refresh">${ic('refresh-cw')}${t('refresh')}</button></div>
      <div class="tabs" role="tablist">${tabs.map(([k, i, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="mgr-tab" data-v="${k}">${ic(i)}<span>${l}</span></button>`).join('')}</div>
      ${body}
    </section>`,
    after() {
      const q = $('#mgrCode');
      if (q) q.addEventListener('input', () => {
        const v = q.value.trim().toLowerCase(); let shown = 0;
        document.querySelectorAll('#waitList .row-card').forEach((r) => { const ok = !v || r.dataset.code.includes(v) || r.dataset.title.includes(v); r.hidden = !ok; if (ok) shown++; });
        const nm = $('#noMatch'); if (nm) nm.hidden = shown > 0;
      });
      document.querySelectorAll('.mgr-form').forEach((f) => f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ref = doc(db, f.dataset.path), fd = new FormData(f), n2 = now();
        try {
          if (f.dataset.form === 'price') {
            const price = Math.round(+fd.get('price'));
            if (!(price >= 0)) return;
            await updateDoc(ref, { status: 'offer', offer: price, offerBy: 'manager', offerAt: n2, answerBy: n2 + ANSWER_DAYS * DAY, n_offer: false });
            toast(t('m_priced', { p: czk(price) }));
          } else {
            const reason = (fd.get('reason') || '').trim() || t('m_reason_default');
            await updateDoc(ref, { status: 'rejected', rejectReason: reason, collectBy: n2 + COLLECT_DAYS * DAY });
            toast(t('m_rejected'));
          }
          loadManager();
        } catch (x) { fail(x); }
      }));
    },
  };
};

// ---------- Dorm pop-up ----------
function askDorm() {
  const draw = (q = '', nearest = null, msg = '') => {
    const base = S.pos || myDorm();
    const list = DORMS.filter((d) => (d.name + ' ' + d.address + ' ' + d.uni).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (base ? distanceM(base, a) - distanceM(base, b) : 0));
    return `
      <h2>${t('dorm_q')}</h2>
      <p class="muted">${t('dorm_sub')}</p>
      <button class="btn primary wide" data-act="locate-pop">${ic('navigation')}${t('use_location')}</button>
      ${nearest ? `<div class="nearest">${ic('map-pin')}<div><b>${t('nearest_is', { d: nearest.short, dist: fmtDist(distanceM(S.pos, nearest)) })}</b><span>${esc(nearest.address)}</span></div><button class="btn sun sm" data-act="pick-dorm" data-id="${nearest.id}">${t('choose_this')}</button></div>` : ''}
      ${msg ? `<p class="meta">${ic('info')}<span>${msg}</span></p>` : ''}
      <label class="searchbar">${ic('search')}<input id="dormQ" placeholder="${t('dorm_search')}" value="${esc(q)}" aria-label="${t('dorm_search')}"></label>
      <div class="dorm-list">${list.map((d) => `<button class="dorm-opt ${d.id === S.prof.dorm ? 'on' : ''}" aria-pressed="${d.id === S.prof.dorm}" data-act="pick-dorm" data-id="${d.id}">${ic('store')}<div><b>${esc(d.name)}</b><span>${esc(d.address)} · ${d.uni}${base ? ' · ' + fmtDist(distanceM(base, d)) : ''}</span></div>${tick(d.id === S.prof.dorm)}</button>`).join('')}</div>
      ${askStandCard()}
      <button class="btn ghost wide" data-act="close">${t('later')}</button>`;
  };
  openModal(draw(), 'dorm-sheet');
  const wire = () => {
    const q = $('#dormQ');
    if (q) q.addEventListener('input', () => { const v = q.value; $('#modal .sheet-body').innerHTML = draw(v, S._nearest); wire(); const n = $('#dormQ'); n.focus(); n.setSelectionRange(v.length, v.length); });
  };
  wire();
  S._redrawDorm = (nearest, msg) => { S._nearest = nearest; $('#modal .sheet-body').innerHTML = draw('', nearest, msg); wire(); };
}
function askStandCard() {
  return `<div class="ask-stand">${ic('sprout')}<div><b>${t('ask_stand_t')}</b><p>${t('ask_stand_b')}</p></div><button class="btn sun sm" data-act="ask-stand">${t('ask_stand_btn')}</button></div>`;
}
function askStand() {
  openModal(`<h2>${t('ask_stand_btn')}</h2><p class="muted">${t('ask_stand_b')}</p>
    <form id="fAsk" class="form">
      <label>${t('ask_stand_dorm')}<input name="dormName" maxlength="120" placeholder="${t('ask_stand_ph')}" required></label>
      <label>${t('f_email')}<input name="email" type="email" required value="${esc(S.prof.email || '')}"></label>
      <p class="form-err" id="fErr2" role="alert"></p>
      <button class="btn primary wide big" type="submit">${ic('send')}${t('ask_stand_btn')}</button>
      <p class="meta small">${ic('lock')}<span>${t('wl_privacy')}</span></p>
    </form>`);
  $('#fAsk').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), dormName = f.get('dormName').trim(), email = f.get('email').trim();
    if (!dormName) { $('#fErr2').textContent = t('err_dorm_name'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { $('#fErr2').textContent = t('err_email'); return; }
    try {
      await addDoc(collection(db, 'waitlist'), { email, dorm: '', dormName, lang: S.prof.lang, at: Date.now() });
      bump('waitlist'); closeModal(); toast(t('ask_stand_done', { d: dormName })); celebrate();
    } catch (x) { $('#fErr2').textContent = errMsg(x); }
  });
}

function locate(cb) {
  if (!navigator.geolocation) return cb(null, t('loc_none'));
  navigator.geolocation.getCurrentPosition(
    (p) => { S.pos = { lat: p.coords.latitude, lon: p.coords.longitude }; cb(S.pos); },
    () => cb(null, t('loc_denied')),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
  );
}

// ---------- Demo account ----------
async function startDemo() {
  try {
    if (S.user && S.user.isAnonymous) { go('home'); return; }
    openModal(`<div class="center-col">${ic('sparkles', 'spin')}<h2>${t('demo_making')}</h2><p class="muted">${t('demo_making_b')}</p></div>`);
    const lang = S.prof.lang, guest = { ...S.prof };
    const after = S.after; S.after = null;
    S.seeding = true;
    const cred = await signInAnonymously(auth);
    // Signed in from this moment: do not wait for Firebase's sign-in announcement before continuing to checkout.
    S.user = cred.user; S.mode = 'demo';
    const ref = doc(db, 'users', cred.user.uid);
    const ex = await getDoc(ref);
    if (!ex.exists()) { await seedDemo(cred.user.uid, lang, guest); await loadUser(); }
    S.seeding = false;
    lsSet('hd_mode', ''); try { localStorage.removeItem('hd_guest'); } catch (x) { /* ignore */ }
    closeModal();
    toast(t('demo_ready'));
    go(after || 'home', true);
  } catch (e) { S.seeding = false; closeModal(); fail(e); }
}
async function seedDemo(u, lang, guest = {}) {
  const gCart = (guest.cart || []).filter((c) => itemById(c.id));
  const n = now();
  const b = writeBatch(db);
  b.set(doc(db, 'users', u), {
    name: 'Demo account', email: '', isDemo: true, dorm: guest.dorm || 'thaler', lang, hearts: [...new Set([...(guest.hearts || []), 't1', 'e1', 'f1'])],
    cart: gCart.length ? gCart : [{ id: 'k3', on: true }, { id: 's4', on: false }], lastTab: 'home', search: '',
    filters: blankProf().filters, bank: { holder: 'Demo account', iban: 'CZ65 0800 0000 1920 0014 5399', bankName: 'Demo Bank' },
    draft: null, createdAt: n - 9 * DAY, lastSeen: n - 2 * DAY,
  });
  const items = collection(db, 'users', u, 'items');
  const pick = [['Microwave oven', 'Mikrovlnná trouba', '20 L', 'kitchen'], ['Rice cooker', 'Rýžovar', '1.8 L', 'kitchen'], ['Table lamp', 'Stolní lampa', 'Warm light', 'electronics'], ['Kettle', 'Konvice', '1.7 L', 'kitchen']][u.charCodeAt(0) % 4];
  b.set(doc(items), { cat: pick[3], title: lang === 'cs' ? pick[1] : pick[0], desc: pick[2], cond: 'good', photo: '', mode: 'sell', stand: 'thaler', dropDay: n - 1 * DAY, dropCode: code('D'), status: 'examining', hold: true, droppedBy: 'staff', createdAt: n - 2 * DAY, droppedAt: n - 1 * DAY });
  b.set(doc(items), { cat: 'furniture', title: lang === 'cs' ? 'Kancelářská židle' : 'Office chair', desc: '', cond: 'good', photo: '', mode: 'sell', stand: 'thaler', dropDay: n - 4 * DAY, dropCode: code('D'), status: 'offer', offer: 230, offerBy: 'manager', offerAt: n - 1 * DAY, answerBy: n + 13 * DAY, n_offer: true, droppedBy: 'student', createdAt: n - 5 * DAY, droppedAt: n - 4 * DAY });
  b.set(doc(items), { cat: 'electronics', title: lang === 'cs' ? 'Fén na vlasy' : 'Hair dryer', desc: '', cond: 'used', photo: '', mode: 'sell', stand: 'thaler', dropDay: n - 6 * DAY, dropCode: code('D'), status: 'rejected', rejectReason: lang === 'cs' ? 'Poškozený kabel, nelze bezpečně prodat.' : 'Cable is damaged, not safe to resell.', collectBy: n + 25 * DAY, n_rejected: true, droppedBy: 'staff', createdAt: n - 7 * DAY, droppedAt: n - 6 * DAY });
  b.set(doc(items), { cat: 'clothes', title: lang === 'cs' ? 'Džínová bunda' : 'Denim jacket', desc: '', cond: 'likenew', photo: '', mode: 'donate', stand: 'thaler', dropDay: n - 8 * DAY, dropCode: code('D'), status: 'donated', n_donated: true, droppedBy: 'student', createdAt: n - 9 * DAY, droppedAt: n - 8 * DAY });
  b.set(doc(collection(db, 'users', u, 'orders')), {
    group: code('G'), dorm: 'thaler', code: code('P'), total: 290,
    items: [{ id: 'demo-lamp', photoId: 'e1', title: { en: 'Reading lamp (demo order)', cs: 'Lampička na čtení (ukázková objednávka)' }, cat: 'electronics', price: 290 }],
    status: 'reserved', reservedAt: n - 10 * HOUR, expiresAt: n + 38 * HOUR,
  });
  const notes = collection(db, 'users', u, 'notes');
  b.set(doc(notes), { type: 'offer', p: { title: lang === 'cs' ? 'Kancelářská židle' : 'Office chair', price: 230, stand: 'thaler' }, read: false, at: n - 1 * DAY });
  b.set(doc(notes), { type: 'rejected', p: { title: lang === 'cs' ? 'Fén na vlasy' : 'Hair dryer', date: n + 25 * DAY, stand: 'thaler' }, read: true, at: n - 5 * DAY });
  await b.commit();
  bump('demo');
}

// ---------- Actions (one click handler for the whole app) ----------
const A = {
  back() { if (history.length > 1) history.back(); else go('home'); },
  close: closeModal,
  'lang-menu'(el) { const m = $('#langMenu'); m.hidden = !m.hidden; el.setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) m.querySelector('button').focus(); },
  'set-lang'(el) { setLang(el.dataset.v); },
  'cart-add'(el, e) {
    e.preventDefault();
    const id = el.dataset.id;
    if (!inCart(id)) savePrefs({ cart: [...S.prof.cart, { id, on: true }] });
    bump('cart');
    flyToCart(el);
    toast(t('cart_added'));
    softRender();
  },
  'cart-remove'(el) { savePrefs({ cart: S.prof.cart.filter((c) => c.id !== el.dataset.id) }); toast(t('cart_removed')); render(); },
  'checkout-cart'() {
    if (!S.prof.cart.some((c) => c.on && shopState(c.id) === 'free')) return toast(t('cart_none_ticked'), 'err');
    bump('reserve');
    if (!signedIn()) return needAccount('checkout/cart', t('pay_need_t'), t('pay_need_b'));
    go('checkout/cart');
  },
  'ask-stand'() { askStand(); },
  pip() { bump('pip'); openModal(faqHtml(t, ic), 'faq-sheet'); },
  async 'staff-drop'(el) {
    el.disabled = true;
    try {
      const r = await confirmDrop(doc(db, el.dataset.path), 'staff');
      toast(r ? t('m_confirmed') : t('m_already'));
      loadManager();
    } catch (e) { fail(e); el.disabled = false; }
  },
  'ob-skip'() { lsSet('hd_onboarded', '1'); go('welcome', true); },
  'ob-next'() {
    const tr = $('#onbTrack'); const n = Math.round(tr.scrollLeft / tr.clientWidth);
    if (n >= 2) return A['ob-skip']();
    tr.scrollTo({ left: (n + 1) * tr.clientWidth, behavior: 'smooth' });
  },
  guest() {
    lsSet('hd_mode', 'guest'); S.mode = 'guest';
    go('home');
    if (!S.prof.dorm) setTimeout(askDorm, 250);
  },
  demo() { startDemo(); },
  'leave-guest'() { go('welcome'); },
  async signout() {
    if (S.mode === 'demo') {
      openModal(`<h2>${t('demo_out_t')}</h2><p>${t('demo_out_b')}</p><div class="row2"><button class="btn outline" data-act="close">${t('stay')}</button><button class="btn primary danger" data-act="signout-yes">${t('sign_out')}</button></div>`);
      return;
    }
    A['signout-yes']();
  },
  async 'signout-yes'() { closeModal(); draft = null; S.mgr = { tab: 'queue', items: [], stats: {}, waitlist: [], loaded: false }; await signOut(auth); go('welcome', true); },
  dorm() { askDorm(); },
  'pick-dorm'(el) {
    const d = dormById(el.dataset.id);
    savePrefs({ dorm: d.id });
    closeModal(); toast(t('your_stand', { d: d.short })); render();
  },
  'locate-pop'() {
    S._redrawDorm(null, t('locating'));
    locate((pos, msg) => {
      if (!pos) return S._redrawDorm(null, msg);
      const nearest = [...DORMS].sort((a, b) => distanceM(pos, a) - distanceM(pos, b))[0];
      S._redrawDorm(nearest, '');
    });
  },
  locate() { locate((pos, msg) => { if (!pos) toast(msg, 'err'); render(); }); },
  'stand-pin'(el) {
    document.querySelectorAll('.pin.show').forEach((p) => p.classList.remove('show')); el.classList.add('show');
    const r = document.getElementById('stand-' + el.dataset.id); if (r) { r.scrollIntoView({ behavior: 'smooth', block: 'center' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1500); }
  },
  heart(el, e) {
    e.preventDefault();
    const id = el.dataset.id, h = new Set(S.prof.hearts);
    h.has(id) ? h.delete(id) : h.add(id);
    savePrefs({ hearts: [...h] });
    softRender();
  },
  'cat-go'(el) { savePrefs({ filters: { ...S.prof.filters, cat: el.dataset.cat }, search: '' }); go('browse'); },
  'pay-again'(el) { const g = el.dataset.group; toStripe(g, S.orders.filter((o) => o.group === g).reduce((s, o) => s + orderTotal(o), 0)); },
  async 'pay-demo-now'(el) {
    const g = el.dataset.group, n = now();
    for (const o of S.orders.filter((x) => x.group === g && x.paid === false)) await updateDoc(doc(db, 'users', uid(), 'orders', o.id), { paid: true, paidAt: n, payMethod: 'demo' }).catch(fail);
    setDoc(doc(db, 'users', uid()), { pendingPay: null }, { merge: true }).catch(() => {});
    bump('pay_demo'); celebrate(); go('thanks/' + g, true);
  },
  async invite() {
    const url = inviteLink(), d = myDorm();
    const text = d ? t('invite_share_text', { d: d.short }) : t('invite_share_text_nodorm');
    bump('invite_share');
    try {
      if (navigator.share) { await navigator.share({ title: 'HelloDorm', text, url }); return; }
      await navigator.clipboard.writeText(url); toast(t('invite_copied'));
    } catch (e) {
      if (e && e.name === 'AbortError') return; // the person closed the share sheet
      openModal(`<h2>${t('invite_t')}</h2><p>${t('invite_manual')}</p><label class="searchbar">${ic('copy')}<input readonly value="${esc(url)}" aria-label="${t('invite_t')}" onfocus="this.select()"></label><button class="btn outline wide" data-act="close">${t('close')}</button>`);
    }
  },
  'alert-add'() {
    const f = S.prof.filters;
    if (!signedIn()) return needAccount('browse', t('alert_need_t'), t('alert_need_b'));
    const a = { q: (S.prof.search || '').slice(0, 60), cat: f.cat || '', dorm: f.dorm || S.prof.dorm || '', at: Date.now() };
    const list = (S.prof.alerts || []).filter((x) => !(x.q === a.q && x.cat === a.cat && x.dorm === a.dorm));
    savePrefs({ alerts: [a, ...list].slice(0, 10) });
    bump('alert_set');
    toast(t('alert_saved', { n: alertMatches(a).length }));
    render();
  },
  'alert-remove'(el) { savePrefs({ alerts: (S.prof.alerts || []).filter((x, i) => i !== +el.dataset.i) }); render(); },
  'alert-open'(el) { const a = S.prof.alerts[+el.dataset.i]; savePrefs({ search: a.q, filters: { ...S.prof.filters, cat: a.cat, dorm: a.dorm } }); go('browse'); },
  'my-dorm-items'() { savePrefs({ filters: { ...S.prof.filters, dorm: S.prof.dorm } }, 300); go('browse'); },
  'f-cat'(el) { savePrefs({ filters: { ...S.prof.filters, cat: el.dataset.v } }, 300); render(); },
  'f-clear'() { savePrefs({ filters: { cat: '', cond: '', max: 0, dorm: '' }, search: '' }, 300); render(); },
  reserve(el) {
    bump('reserve');
    if (!signedIn()) return needAccount('checkout/' + el.dataset.id, t('pay_need_t'), t('pay_need_b'));
    go('checkout/' + el.dataset.id);
  },
  after(el) { S.after = el.dataset.to; },
  pretend() { const b = $('#swipeBox'); if (b) b.classList.remove('hidden'); },
  // Sell flow
  'd-set'(el, e) {
    if (el.dataset.k === 'mode' && el.dataset.v === 'donate' && draft.mode !== 'donate' && window.HD_FX) {
      const r = el.getBoundingClientRect();
      window.HD_FX.burst(e && e.clientX ? e.clientX : r.left + r.width / 2, e && e.clientY ? e.clientY : r.top + r.height / 2);
    }
    draft[el.dataset.k] = el.dataset.v;
    if (el.dataset.k === 'stand') draft.day = draft.day || 0;
    saveDraft(); render();
  },
  'd-day'(el) { draft.day = +el.dataset.v; saveDraft(); render(); },
  'd-back'() { draft.step = Math.max(1, draft.step - 1); saveDraft(); render(); window.scrollTo(0, 0); },
  'd-next'() {
    const st = draft.step;
    const err = $('#fErr');
    if (st === 1 && (!draft.cat || !draft.title.trim())) return (err.textContent = t('err_s1'));
    if (st === 1 && draft.cat === 'other' && !draft.other.trim()) return (err.textContent = t('err_other'));
    if (st === 2 && !draft.cond) return (err.textContent = t('err_s2'));
    if (st === 4 && !draft.mode) return (err.textContent = t('err_s4'));
    if (st === 5) {
      if (!draft.stand || (dormById(draft.stand) || {}).full) return (err.textContent = t('err_s5_stand'));
      if (!draft.day) return (err.textContent = t('err_s5_day'));
      return submitDraft();
    }
    draft.step = st + 1; saveDraft(); render(); window.scrollTo(0, 0);
  },
  'd-discard'() { draft = newDraft(); savePrefs({ draft: null }); render(); },
  'd-new'() { draft = newDraft(); },
  // My items
  async dropped(el) {
    el.disabled = true;
    try {
      const r = await confirmDrop(doc(db, 'users', uid(), 'items', el.dataset.id), 'student');
      toast(r ? t('dropped_ok') : t('already_dropped'));
      if (r) { const it = S.myItems.find((x) => x.id === el.dataset.id); if (it && it.mode === 'donate') celebrate(); }
    } catch (e) { fail(e); el.disabled = false; }
  },
  accept(el) {
    const b = S.prof.bank;
    if (!b.iban || !b.holder) return go('bank/' + el.dataset.id);
    acceptOffer(el.dataset.id);
  },
  async decline(el) {
    try { await updateDoc(doc(db, 'users', uid(), 'items', el.dataset.id), { status: 'declined', collectBy: now() + COLLECT_DAYS * DAY }); toast(t('declined_t')); } catch (e) { fail(e); }
  },
  async collected(el) {
    try { await updateDoc(doc(db, 'users', uid(), 'items', el.dataset.id), { status: 'collected' }); } catch (e) { fail(e); }
  },
  'demo-only'() { toast(t('demo_only')); },
  async forgot() {
    const inp = document.querySelector('#fSignin input[name=email]');
    const email = inp ? inp.value.trim() : '';
    if (!email) { $('#fErr').textContent = t('reset_need_email'); inp && inp.focus(); return; }
    try { await sendPasswordResetEmail(auth, email); toast(t('reset_sent', { email })); } catch (e) { $('#fErr').textContent = errMsg(e); }
  },
  // Notifications
  async note(el) {
    const n = S.notes.find((x) => x.id === el.dataset.id);
    S.noteSel = n.id;
    if (!n.read) updateDoc(doc(db, 'users', uid(), 'notes', n.id), { read: true }).catch(() => {});
    if (window.matchMedia('(min-width: 900px)').matches) { render(); return; } // laptop: the message opens in the right column
    const to = noteTarget(n);
    if (to) return go(to);
    render();
  },
  'read-all'() { S.notes.filter((n) => !n.read).forEach((n) => updateDoc(doc(db, 'users', uid(), 'notes', n.id), { read: true }).catch(() => {})); },
  // Manager
  'mgr-tab'(el) { S.mgr.tab = el.dataset.v; render(); },
  'mgr-refresh'() { S.mgr.loaded = false; render(); },
  async skip15() { try { await setDoc(doc(db, 'config', 'clock'), { offsetDays: S.offsetDays + 15 }); toast(t('m_skipped')); S.mgr.loaded = false; render(); } catch (e) { fail(e); } },
  async clock0() { try { await setDoc(doc(db, 'config', 'clock'), { offsetDays: 0 }); toast(t('m_clock0_ok')); S.mgr.loaded = false; render(); } catch (e) { fail(e); } },
  async 'shop-reset'() {
    try { await Promise.all(Object.keys(S.shop).map((id) => deleteDoc(doc(db, 'shop', id)))); toast(t('m_shop_ok')); } catch (e) { fail(e); }
  },
};
// Drop off confirmed by the student or by stand staff: the first one wins, the alert goes out once.
async function confirmDrop(ref, by) {
  const n = now();
  const res = await runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists()) throw { code: 'hd/missing' };
    const it = s.data();
    if (it.status !== 'waiting') return null;
    tx.update(ref, { status: it.mode === 'donate' ? 'donated' : 'examining', droppedAt: n, droppedBy: by });
    return it;
  });
  if (res && res.mode !== 'donate') ntfy(`New item to price: ${res.title}, ${TEXTS['cond_' + res.cond].en}, ${dormById(res.stand).short} stand`);
  return !!res;
}
function needAccount(after, title = t('need_acc_t'), body = t('need_acc_b')) {
  S.after = after;
  openModal(`<div class="center-col">${ic('user')}<h2>${title}</h2><p>${body}</p></div>
    <div class="stack"><a class="btn primary wide" href="#/signin">${ic('lock')}${t('sign_in')}</a><a class="btn outline wide" href="#/signup">${ic('user-plus')}${t('sign_up')}</a>
    <button class="btn sun wide" data-act="demo">${ic('sparkles')}<span>${t('demo_try')}<small>${t('demo_try_sub')}</small></span></button><button class="btn ghost wide" data-act="close">${t('not_now')}</button></div>`);
}
function setLang(l) { savePrefs({ lang: l }); render(); }
// Hooks filled in by fx.js (motion); harmless when motion is off.
function celebrate() { if (window.HD_FX) window.HD_FX.celebrate(); }
function flyToCart(el) { if (window.HD_FX) window.HD_FX.flyToCart(el); }

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && A[el.dataset.act]) {
    if (el.tagName === 'BUTTON' && el.getAttribute('aria-disabled') === 'true' && el.dataset.act !== 'd-next') return;
    A[el.dataset.act](el, e);
  }
  if (e.target.id === 'modal') closeModal();
  if (!e.target.closest('#langwrap')) { const m = $('#langMenu'); if (m && !m.hidden) { m.hidden = true; $('.langbtn').setAttribute('aria-expanded', 'false'); } }
  // Every tap on a Sell link is counted; guests are asked to make an account first.
  const a = e.target.closest('a[href="#/sell"]');
  if (a) {
    bump('sell');
    if (!signedIn() && S.mode === 'guest') { e.preventDefault(); needAccount('sell'); }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g.pin')) A['stand-pin'](e.target);
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.in;
  if (!k) return;
  if (k === 'd-title') { draft.title = e.target.value; saveDraft(); const b = $('[data-act="d-next"]'); if (b) b.setAttribute('aria-disabled', !(draft.cat && draft.title.trim())); }
  if (k === 'd-desc') { draft.desc = e.target.value; saveDraft(); }
  if (k === 'd-other') { draft.other = e.target.value; saveDraft(); }
});
document.addEventListener('change', async (e) => {
  const k = e.target.dataset && e.target.dataset.in;
  if (k === 'cart-tick') { savePrefs({ cart: S.prof.cart.map((c) => (c.id === e.target.dataset.id ? { ...c, on: e.target.checked } : c)) }, 300); render(); }
  if (k === 'f-dorm') { savePrefs({ filters: { ...S.prof.filters, dorm: e.target.value } }, 300); render(); }
  if (k === 'f-cond') { savePrefs({ filters: { ...S.prof.filters, cond: e.target.value } }, 300); render(); }
  if (k === 'f-max') { savePrefs({ filters: { ...S.prof.filters, max: +e.target.value } }, 300); render(); }
  if (k === 'd-photo' && e.target.files[0]) {
    try { draft.photo = await compress(e.target.files[0]); saveDraft(); render(); } catch (x) { toast(t('err_photo'), 'err'); }
  }
});

// Live countdowns
function refreshTimers() {
  document.querySelectorAll('[data-countdown]').forEach((el) => (el.textContent = fmtLeft(+el.dataset.countdown - now())));
}
setInterval(refreshTimers, 1000 * 20);

// ---------- Start ----------
(async function start() {
  if (window.HD_FX) window.HD_FX.init();
  try { const r = await fetch('img/credits.json'); if (r.ok) { S.credits = await r.json(); S.photoIds = new Set(S.credits.map((c) => c.id)); } } catch (e) { /* no photos: category tiles */ }
  try { const r = await fetch('img/dorms/credits-dorms.json'); if (r.ok) S.dormCredits = await r.json(); } catch (e) { /* no backdrops */ }
  try { if (!sessionStorage.getItem('hd_visit')) { sessionStorage.setItem('hd_visit', '1'); bump('visits'); } } catch (e) { /* storage blocked */ }
  render();
  document.documentElement.dataset.app = 'ready';
})();
