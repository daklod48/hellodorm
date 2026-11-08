// HelloDorm v3 settings (same Firebase project as v2). Change only the lines marked EDIT.

// Firebase web settings (from firebase-config.txt). Public by design; firestore.rules protects the data.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDgKuAjvdrdjKDeOShKaRId3ynigmX_k7M',
  authDomain: 'hellodorm.firebaseapp.com',
  projectId: 'hellodorm',
  storageBucket: 'hellodorm.firebasestorage.app',
  messagingSenderId: '971938179864',
  appId: '1:971938179864:web:1b4efcf397788449af0c6d',
};

// EDIT: managers by Firebase user ID (UID), not by email. Keep the same list in firestore.rules (function isManager)
// and in v2/config.js.
// How to read a UID in the Firebase console and where to paste it: HOW-IT-WORKS.md section 15.
export const MANAGER_UIDS = ['H4LqAN23sfewbZYZekVs0Jb7KS62'];

// EDIT: ntfy.sh topic for phone alerts. Managers subscribe to this name in the free ntfy app.
export const NTFY_TOPIC = 'hellodorm-1qdfw8sunx3i6wmo1jm141mjj4dw';

// v3 round 6: no Stripe Payment Link. "Pay by card" is a demo payment page inside the app (round6.js); nothing is charged.

export const APP_VERSION = 'v3';
