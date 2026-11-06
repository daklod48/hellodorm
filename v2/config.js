// HelloDorm v2 settings. Change only the lines marked EDIT.

// Firebase web settings (from firebase-config.txt). Public by design; firestore.rules protects the data.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDgKuAjvdrdjKDeOShKaRId3ynigmX_k7M',
  authDomain: 'hellodorm.firebaseapp.com',
  projectId: 'hellodorm',
  storageBucket: 'hellodorm.firebasestorage.app',
  messagingSenderId: '971938179864',
  appId: '1:971938179864:web:1b4efcf397788449af0c6d',
};

// EDIT: managers by Firebase user ID (UID), not by email. Keep the same list in firestore.rules (function isManager).
// How to read a UID in the Firebase console and where to paste it: HOW-IT-WORKS.md section 15.
export const MANAGER_UIDS = ['PASTE_MANAGER_UID_HERE'];

// EDIT: ntfy.sh topic for phone alerts. Managers subscribe to this name in the free ntfy app.
export const NTFY_TOPIC = 'hellodorm-1qdfw8sunx3i6wmo1jm141mjj4dw';

// EDIT (optional): Stripe Payment Link in TEST mode, for "Pay by card". Looks like https://buy.stripe.com/test_...
// Empty = the card option shows as "not set up yet" and only Demo pay works. Card details are typed on Stripe's page only;
// this app never sees or stores them. Setup steps: HOW-IT-WORKS.md section 13.
export const STRIPE_PAYMENT_LINK = '';

export const APP_VERSION = 'v2';
