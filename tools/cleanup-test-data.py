"""Delete test data from Firestore as a manager: demo copies (isDemo) and automated tester-* accounts' documents
(their items, orders, notes and profile). Needs the extended rules published. Does not touch Authentication accounts
(a web app cannot delete other users' logins); delete those in the console.
Run with the local server up:  python tools/cleanup-test-data.py <manager email> <password> [base url]"""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
email, pw = sys.argv[1], sys.argv[2]
BASE = sys.argv[3] if len(sys.argv) > 3 else "http://localhost:8080/v1/"
JS = """async ([email, pw]) => {
  const { getApp } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js');
  const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js');
  const { getFirestore, collection, getDocs, deleteDoc, query, where } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');
  const app = getApp(); const auth = getAuth(app); const db = getFirestore(app);
  if (!auth.currentUser || auth.currentUser.email !== email) await signInWithEmailAndPassword(auth, email, pw);
  const found = new Map();
  for (const q of [query(collection(db, 'users'), where('isDemo', '==', true)), query(collection(db, 'users'), where('email', '>=', 'tester-'), where('email', '<', 'tester.'))]) {
    const qs = await getDocs(q); qs.docs.forEach((d) => found.set(d.id, d.data().email || '(demo copy)'));
  }
  const out = [];
  for (const [uid, label] of found) {
    let n = 0;
    for (const sub of ['items', 'orders', 'notes']) { const qs = await getDocs(collection(db, 'users', uid, sub)); for (const d of qs.docs) { await deleteDoc(d.ref); n++; } }
    const { doc } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'users', uid)); n++;
    out.push([uid, label, n]);
  }
  return out;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True); page = b.new_page()
    page.goto(BASE); page.wait_for_selector("html[data-app=ready]", timeout=30000); page.wait_for_timeout(500)
    res = page.evaluate(JS, [email, pw])
    for uid, label, n in res: print(f"deleted {label} ({uid}): {n} documents")
    print(len(res), "test users removed from Firestore")
    b.close()
