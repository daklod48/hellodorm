// TEST ONLY. In-memory stand-in for firebase-auth.js (see firebase-app.js). Any password is accepted.
const KEY = 'firebase:authUser:fake';
const listeners = new Set();
let current = null;
try { current = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { current = null; }
const save = () => { try { current ? localStorage.setItem(KEY, JSON.stringify(current)) : localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };
const emit = () => { save(); listeners.forEach((f) => setTimeout(() => f(current), 0)); };
const rid = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
export function getAuth() { return { get currentUser() { return current; } }; }
export function onAuthStateChanged(auth, cb) { listeners.add(cb); setTimeout(() => cb(current), 0); return () => listeners.delete(cb); }
export async function signInAnonymously() { current = { uid: rid(), isAnonymous: true, email: null, displayName: null }; emit(); return { user: current }; }
export async function createUserWithEmailAndPassword(auth, email) { current = { uid: 'u_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_'), isAnonymous: false, email: email.toLowerCase(), displayName: null }; emit(); return { user: current }; }
export async function signInWithEmailAndPassword(auth, email) { return createUserWithEmailAndPassword(auth, email); }
export async function updateProfile(user, p) { Object.assign(user, p); if (current && current.uid === user.uid) Object.assign(current, p); save(); }
export async function signOut() { current = null; emit(); }
export async function sendPasswordResetEmail() { /* nothing is sent */ }
