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

// EDIT: manager emails (lower case). Keep the same list in firestore.rules (function isManager).
export const MANAGER_EMAILS = ['manager1@hellodorm-demo.test', 'manager2@example.com', 'manager3@example.com', 'manager4@example.com', 'manager5@example.com'];

// EDIT: ntfy.sh topic for phone alerts. Managers subscribe to this name in the free ntfy app.
export const NTFY_TOPIC = 'hellodorm-1qdfw8sunx3i6wmo1jm141mjj4dw';

// EDIT (optional): Stripe Payment Link in TEST mode, for "Pay by card". Looks like https://buy.stripe.com/test_...
// Empty = the card option shows as "not set up yet" and only Demo pay works. Card details are typed on Stripe's page only;
// this app never sees or stores them. Setup steps: HOW-IT-WORKS.md section 13.
export const STRIPE_PAYMENT_LINK = '';

export const APP_VERSION = 'v2';
