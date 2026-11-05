// TEST ONLY. In-memory stand-in for firebase-firestore.js (see firebase-app.js).
// Data lives in this browser tab's localStorage, so it survives reloads within one test run and touches no server.
const KEY = 'fakefs';
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
const subs = new Set();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } };
const rid = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const INC = '__fake_increment__';

export function initializeFirestore() { return { fake: true }; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
export function increment(n) { return { [INC]: n }; }

function mkDoc(path) { const p = path.split('/'); return { type: 'doc', path, id: p[p.length - 1], get parent() { return mkCol(p.slice(0, -1).join('/')); } }; }
function mkCol(path) { const p = path.split('/'); return { type: 'col', path, id: p[p.length - 1] }; }
export function doc(base, ...segs) {
  if (base && base.type === 'col') return mkDoc(base.path + '/' + (segs.length ? segs.join('/') : rid()));
  return mkDoc(segs.join('/'));
}
export function collection(base, ...segs) { return mkCol(base && base.path ? base.path + '/' + segs.join('/') : segs.join('/')); }
export function collectionGroup(db, id) { return { type: 'group', id }; }

const snapDoc = (ref) => { const d = store[ref.path]; return { id: ref.id, ref, exists: () => d !== undefined, data: () => clone(d) }; };
const inCol = (path, colPath) => path.startsWith(colPath + '/') && path.slice(colPath.length + 1).indexOf('/') === -1;
const inGroup = (path, id) => { const p = path.split('/'); return p.length >= 2 && p[p.length - 2] === id; };
function snapQuery(q) {
  const paths = Object.keys(store).filter((k) => (q.type === 'group' ? inGroup(k, q.id) : inCol(k, q.path))).sort();
  const docs = paths.map((k) => snapDoc(mkDoc(k)));
  return { docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f) };
}
const snapOf = (r) => (r.type === 'doc' ? snapDoc(r) : snapQuery(r));
const notify = () => { persist(); subs.forEach((s) => setTimeout(() => s.cb(snapOf(s.ref)), 0)); };

function applyVal(old, v) {
  if (v && typeof v === 'object' && INC in v) return (typeof old === 'number' ? old : 0) + v[INC];
  return clone(v);
}
function deepMerge(target, src) {
  const out = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !(INC in v)) out[k] = deepMerge(out[k], v);
    else out[k] = applyVal(out[k], v);
  }
  return out;
}
function writeSet(ref, data, opts) { store[ref.path] = opts && opts.merge ? deepMerge(store[ref.path], data) : deepMerge({}, data); }
function writeUpdate(ref, data) {
  if (store[ref.path] === undefined) throw { code: 'not-found', message: 'No document to update' };
  const d = clone(store[ref.path]);
  for (const [k, v] of Object.entries(data)) {
    const parts = k.split('.'); let o = d;
    for (const p of parts.slice(0, -1)) { if (!o[p] || typeof o[p] !== 'object') o[p] = {}; o = o[p]; }
    const last = parts[parts.length - 1]; o[last] = applyVal(o[last], v);
  }
  store[ref.path] = d;
}
export async function getDoc(ref) { return snapDoc(ref); }
export async function getDocs(q) { return snapQuery(q); }
export async function setDoc(ref, data, opts) { writeSet(ref, data, opts); notify(); }
export async function updateDoc(ref, data) { writeUpdate(ref, data); notify(); }
export async function addDoc(col, data) { const ref = doc(col); writeSet(ref, data); notify(); return ref; }
export async function deleteDoc(ref) { delete store[ref.path]; notify(); }
export function onSnapshot(ref, cb) { const s = { ref, cb }; subs.add(s); setTimeout(() => cb(snapOf(ref)), 0); return () => subs.delete(s); }
export function writeBatch() {
  const ops = [];
  const b = { set: (r, d, o) => (ops.push(() => writeSet(r, d, o)), b), update: (r, d) => (ops.push(() => writeUpdate(r, d)), b), delete: (r) => (ops.push(() => delete store[r.path]), b), commit: async () => { ops.forEach((f) => f()); notify(); } };
  return b;
}
export async function runTransaction(db, fn) {
  const ops = [];
  const tx = { get: async (r) => snapDoc(r), set: (r, d, o) => (ops.push(() => writeSet(r, d, o)), tx), update: (r, d) => (ops.push(() => writeUpdate(r, d)), tx), delete: (r) => (ops.push(() => delete store[r.path]), tx) };
  const res = await fn(tx);
  ops.forEach((f) => f()); notify();
  return res;
}
