// TEST ONLY. An in-memory stand-in for the Firebase app module, loaded by tools/browser.py when HD_FAKE=1.
// It lets the checks open signed-in screens (demo account, manager) without writing to the real HelloDorm database.
export function initializeApp(config) { return { options: config, name: '[fake]' }; }
