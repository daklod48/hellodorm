# HelloDorm prototype

**Link for the report (opens the newest version on its Home page, no login): https://daklod48.github.io/hellodorm/**

- v2 (5 November 2026: design pass, professor feedback, see `HOW-IT-WORKS.md` sections 10 and 12): https://daklod48.github.io/hellodorm/v2/
- v1 (first version, frozen): https://daklod48.github.io/hellodorm/v1/

Team 5, 3BE314 Entrepreneurship, Assignment 2. Clickable prototype: students sell or donate dorm items at a HelloDorm stand, others buy them cleaned. Built 2026-10-20 with Claude Code from `SPEC.md`, `design-brief.md` and `prague-dorms.md`; design pass the same evening (see `DESIGN-NOTES.md`).

## Folders
- `v1/`: the whole app (plain HTML, CSS, JavaScript; no build step). Frozen once published. A later `v2/` starts as a copy of `v1/`.
  - `index.html`, `styles.css` (design system: tokens, layout, motion), `boot.js` (paints the first screen before the app and Firebase load, then imports `app.js`), `first.js` (onboarding and welcome markup shared by boot.js and app.js), `app.js` (all screens and logic), `fx.js` (motion: background layers, reveal, leaf burst, fly to cart, confetti, screen transitions), `pip.js` (Pip the seal: idle, FAQ, poses), `texts.js` (every English and Czech text side by side), `config.js` (settings), `icons.js` (Lucide icons, ISC licence), `fonts/` (Inter and Nunito, SIL Open Font License, self hosted so the first paint does not wait for Google's servers).
  - `data/items.js` (30 sample shop items), `data/dorms.js` (16 dorms and stand hours), `data/prices.js` (categories, including Other, and the standard offer table).
  - `img/*.webp` (item photos from Unsplash, 600 x 600, `credits.json` lists photographer and page), `img/dorms/*.webp` (home header backdrops: Wikimedia Commons photos with `credits-dorms.json`, plus three Gemini illustrations), `img/pip/*.webp` (Pip poses, Gemini).
  - `*.old` files are the versions before the design pass (kept, never deleted).
- `index.html` (top level): forwards the public link to the newest version (`v2/`).
- `v2/`: copy of `v1/` made on 5 November 2026, with the phone layout and accessibility changes and the professor's feedback (dorm first, guest checkout, community). Same file names as `v1/`. Edit this one; `v1/` stays frozen.
- `LAB/`: the Improvement Lab (rubric, captures, run log, `tracker.html`); see `HOW-IT-WORKS.md` section 14.
- `firestore.rules`: Firestore security rules. Paste into the Firebase console after every change (the current file adds the `dormName` field for "Ask for a stand" and must be republished).
- `tools/`: checks and build helpers. `scan-dashes.py` (no dashes in visible texts), `check-contrast.py` (every text pair 4.5:1 or more, runtime, both widths), `check-taps.py` (every tap target 44 px at 390 px), `build-critical.py v2` (copies the first screen's styles into `index.html`; run it after editing `styles.css`), `scan-emails.py` (no real email in config files), `check-readable.py` (text 12 px or more, text box outlines 3:1 or more), `browser.py` and `fake-firebase/` (shared test setup; `HD_FAKE=1` runs the checks without touching the real database).
- `review/`: screenshots. `before/` (first build), `part1/` (after the owner's functional feedback), `after/` (after the design pass).
- `DESIGN-NOTES.md`: what was studied and borrowed, plus measured results. `IMAGE-PROMPTS.md`: every Gemini prompt. `AI-LOG.md`: corrections during the build. `HOW-IT-WORKS.md`: the whole app explained for a reader with no programming background (files, data flow, accounts, rules, deadlines, how to change things, costs).

## How to run it on your computer
The app uses JavaScript modules, so it must be opened through a small local web server, not by double-clicking.
1. Open Command Prompt in the `hellodorm` folder.
2. Run: `python -m http.server 8080`
3. Open http://localhost:8080/v1/ in Chrome. (`localhost` is already an authorised domain in Firebase.)
4. Stop the server with Ctrl+C.

## How to run the checks
With the local server running and Playwright for Python installed (`pip install playwright`; it drives the installed Chrome):
- `python tools/scan-dashes.py v2` (must end with `0`)
- `python tools/scan-emails.py` (must end with `0`)
- `python tools/check-contrast.py http://localhost:8080/v2/ <manager password>` (must end with `0`)
- `python tools/check-taps.py` (must end with `0`)
- `python tools/check-readable.py` (must end with `0`)
- To check only the look without creating test accounts or adding to the counters, run `set HD_FAKE=1` first (details in `HOW-IT-WORKS.md` section 11).
Lighthouse: run `lighthouse http://localhost:8080/v1/ --preset=mobile` with Node installed, or Chrome DevTools > Lighthouse > Mobile.

## How to change the managers
Managers are the people who may price or reject items, confirm drop offs and see totals. Since 6 November 2026 they are listed by **Firebase user ID** (UID), not by email, so no email address sits in the public files.
1. The manager signs up once in v2 with their own email and a password.
2. Firebase console > project hellodorm > Build > Authentication > Users: copy the **User UID** of that row.
3. Add it to the list in `v2/config.js` (`MANAGER_UIDS`) and in `firestore.rules` (`isManager()`); both lists hold the owner's UID since 7 November 2026.
4. Firebase console > Firestore Database > Rules: paste the whole `firestore.rules` file and press Publish.
Full click by click steps: `HOW-IT-WORKS.md` section 15.

## Phone alerts (ntfy)
`v1/config.js`, line `NTFY_TOPIC`. Install the free ntfy app, tap +, subscribe to that exact topic name. When a drop off is confirmed (by the student's button or by stand staff in Manager mode), every subscribed phone gets "New item to price: <title>, <condition>, <stand> stand" (no personal data), once per item. The topic name is visible in the public code, so a stranger who reads it could send fake alerts; change the name if that happens.

## How to reset for a fresh demo
- Shop reservations: Manager mode > Prototype controls > "Make all 30 shop items available again".
- App clock: Manager mode > Prototype controls > "Back to real time" (after using "Skip ahead 15 days").
- One person's data: Firebase console > Firestore Database > `users` > their id > delete the document and its sub-collections; Authentication > Users > delete the account.
- Everything: delete the `users`, `shop`, `stats`, `waitlist` and `config` collections in the console. (Make an export first if you need the numbers.) Test accounts from the automated checks are named `tester-xxxxxx@hellodorm-demo.test`.
- First-visit screens on one device: in the browser, clear site data for the page (Chrome: lock icon > Site settings > Delete data).

## Prototype rules worth knowing
- Automatic offer: if no manager prices a dropped item within 10 minutes, the seller's or a manager's app sets the standard offer from `data/prices.js` (offer 20 % of a typical new price, resale 50 %, times a condition factor). Prototype assumptions, not market data.
- Drop off is confirmed by whichever side is first: the student's "I've dropped it" button or stand staff in Manager mode (search by drop off code). The timeline shows who confirmed it.
- Deadlines: offer answer 14 days (then donation), collection 30 days (then disposal), reservation hold 48 hours. Use "Skip ahead 15 days" to show them live.
- Cart: items can be added to the cart and ticked or unticked; checkout pays only the ticked items, one order and one pickup code per stand. The cart is saved in the account (guests keep it on the device until they sign up).
- Photos sellers add are shrunk to 400 px wide and stored inside the item record. Firebase Storage is not used.
- Everything a signed-in user chooses (dorm, language, hearts, cart, filters, search, last tab, sell draft, bank form, notifications read state, items, orders) is stored in Firestore under `users/<uid>` and comes back on any device.
- The demo account uses Firebase anonymous sign-in: each tap on "Demo account" on a new device makes a private copy. The same browser keeps the same copy until the user signs out.
- Motion respects the system setting "reduce motion": background drift, reveals, particles, Pip's idling and screen transitions switch off; everything stays usable.
