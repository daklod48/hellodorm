// Round 6 rules test: runs firestore.rules in the official Firestore emulator (nothing touches the real database).
// Setup (once): npm install @firebase/rules-unit-testing@4.0.1 firebase@11.10.0 ; download the emulator jar
// (https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.19.7.jar),
// start it: java -jar cloud-firestore-emulator-v1.19.7.jar --host 127.0.0.1 --port 8085
// Run: node tools/rules-test/rules.test.mjs   (prints PASS or FAIL per check and a final failure count, must be 0)
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const MANAGER = rules.match(/request\.auth\.uid in \[\s*'([^']+)'/)[1];
const env = await initializeTestEnvironment({ projectId: 'hellodorm-rules-test', firestore: { rules, host: '127.0.0.1', port: 8085 } });
await env.clearFirestore();
let fails = 0;
const check = async (name, p, ok) => { try { await (ok ? assertSucceeds(p) : assertFails(p)); console.log('PASS', name); } catch (e) { fails++; console.log('FAIL', name, String(e.message || e).slice(0, 160)); } };

await env.withSecurityRulesDisabled(async (c) => {
  const db = c.firestore();
  await setDoc(doc(db, 'users/alice/items/i1'), { status: 'accepted', cat: 'furniture', cond: 'good', stand: 'thaler', title: 'Chair' });
  await setDoc(doc(db, 'users/alice/items/i2'), { status: 'offer', cat: 'kitchen', cond: 'good', stand: 'thaler', title: 'Pan' });
  await setDoc(doc(db, 'users/alice/items/i3'), { status: 'accepted', cat: 'kitchen', cond: 'used', stand: 'thaler', title: 'Pot' });
  await setDoc(doc(db, 'users/anon1/items/d1'), { status: 'donated', cat: 'clothes', cond: 'good', stand: 'thaler', title: 'Coat' });
  await setDoc(doc(db, 'salePrices/alice_i3'), { price: 150, at: 1 });
  await setDoc(doc(db, 'listings/bob_x'), { seller: 'bob', demo: false, price: 100 });
});
const L = (o) => ({ title: { en: 'Chair', cs: 'Chair' }, desc: { en: '', cs: '' }, cat: 'furniture', cond: 'good', dorm: 'thaler', price: 560, newPrice: 1500, photo: '', listedAt: 1, kw: [], seller: 'alice', item: 'i1', demo: false, ...o });
const alice = env.authenticatedContext('alice', { firebase: { sign_in_provider: 'password' } }).firestore();
const anon = env.authenticatedContext('anon1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const mgr = env.authenticatedContext(MANAGER, { firebase: { sign_in_provider: 'password' } }).firestore();
const guest = env.unauthenticatedContext().firestore();

// salePrices
await check('manager sets a sale price', setDoc(doc(mgr, 'salePrices/alice_i1x'), { price: 400, at: 1 }), true);
await check('seller cannot set a sale price', setDoc(doc(alice, 'salePrices/alice_i1'), { price: 9999, at: 1 }), false);
await check('anyone reads sale prices', getDoc(doc(guest, 'salePrices/alice_i3')), true);
// listings by the seller
await check('seller lists accepted item at the table price (furniture good 560)', setDoc(doc(alice, 'listings/alice_i1'), L()), true);
await check('seller cannot change the price afterwards', updateDoc(doc(alice, 'listings/alice_i1'), { price: 1 }), false);
await check('seller cannot list at another price', setDoc(doc(alice, 'listings/alice_i3'), L({ item: 'i3', cat: 'kitchen', cond: 'used', price: 180 })), false);
await check('seller lists at the manager sale price (150)', setDoc(doc(alice, 'listings/alice_i3'), L({ item: 'i3', cat: 'kitchen', cond: 'used', price: 150 })), true);
await check('seller cannot list an item that is only offered', setDoc(doc(alice, 'listings/alice_i2'), L({ item: 'i2', cat: 'kitchen', cond: 'good', price: 260 })), false);
await check('seller cannot list under another id', setDoc(doc(alice, 'listings/zzz'), L()), false);
await check('seller cannot list as someone else', setDoc(doc(alice, 'listings/bob_i1'), L({ seller: 'bob' })), false);
await check('listing with an extra field is refused', setDoc(doc(alice, 'listings/alice_i1b'), L({ item: 'i1b', email: 'x' })), false);
await check('anonymous demo must mark demo: true', setDoc(doc(anon, 'listings/anon1_d1'), L({ seller: 'anon1', item: 'd1', cat: 'clothes', cond: 'good', price: 450, demo: false })), false);
await check('anonymous demo lists its donation with demo: true', setDoc(doc(anon, 'listings/anon1_d1'), L({ seller: 'anon1', item: 'd1', cat: 'clothes', cond: 'good', price: 450, demo: true })), true);
await check('demo copy deletes its own demo listing', deleteDoc(doc(anon, 'listings/anon1_d1')), true);
await check('seller cannot delete a real listing', deleteDoc(doc(alice, 'listings/alice_i1')), false);
await check('nobody else deletes listings', deleteDoc(doc(alice, 'listings/bob_x')), false);
await check('manager changes a listing price', updateDoc(doc(mgr, 'listings/alice_i1'), { price: 600 }), true);
await check('anyone reads listings', getDoc(doc(guest, 'listings/alice_i1')), true);
// leaderboard
const E = (o) => ({ name: 'Alice', avatar: '', kg: 9.5, items: 2, at: 1, ...o });
await check('owner writes own leaderboard entry', setDoc(doc(alice, 'leaderboard/alice'), E()), true);
await check('nobody writes someone else\'s entry', setDoc(doc(alice, 'leaderboard/bob'), E()), false);
await check('anonymous demo never gets an entry', setDoc(doc(anon, 'leaderboard/anon1'), E()), false);
await check('entry with an extra field is refused', setDoc(doc(alice, 'leaderboard/alice'), E({ email: 'a' })), false);
await check('entry with 0 items is refused', setDoc(doc(alice, 'leaderboard/alice'), E({ items: 0 })), false);
await check('entry with absurd kg is refused', setDoc(doc(alice, 'leaderboard/alice'), E({ kg: 50000 })), false);
await check('anyone reads the leaderboard', getDoc(doc(guest, 'leaderboard/alice')), true);
await check('owner deletes own entry (toggle off)', deleteDoc(doc(alice, 'leaderboard/alice')), true);
await check('manager hides an avatar', setDoc(doc(mgr, 'lbHide/alice'), { at: 1 }), true);
await check('user cannot hide avatars', setDoc(doc(alice, 'lbHide/bob'), { at: 1 }), false);
// unchanged parts still work
await check('Other dorm request on the waitlist (no email)', setDoc(doc(guest, 'waitlist/w1'), { email: '', dorm: '', dormName: 'Kolej X, Praha', lang: 'en', at: 1 }), true);
await check('user writes own profile (avatar, card last 4, transfers)', setDoc(doc(alice, 'users/alice'), { avatar: 'data:image/webp;base64,AAA', card: { last4: '1234' }, transfers: [], board: true }, { merge: true }), true);
await check('user cannot write another profile', setDoc(doc(alice, 'users/bob'), { name: 'x' }), false);
await env.cleanup();
console.log(fails);
process.exit(fails ? 1 : 0);
