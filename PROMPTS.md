# HelloDorm prototype v1: run guide and prompts

_Written 2026-10-20 (Cowork consult). Folder: `C:\Users\ASUS\Downloads\Claude Workplace\Study\Entrepreneurship\4-my-files\prototype-a2\hellodorm\`. Files Claude Code reads: `SPEC.md` (what to build), `design-brief.md` (look), `prague-dorms.md` (stand locations)._

## Step 0. Your 15 minutes before Claude Code (by hand, free)

**A. Firebase (free Spark plan, no card).** Firebase = Google's free backend, the online notebook that lets one account work on phone and laptop.
1. Open https://console.firebase.google.com and sign in with your Google account.
2. Create a project named `hellodorm`. Turn Google Analytics OFF (not needed).
3. Left menu: Build > Authentication > Get started. Under Sign-in method, enable **Email/Password** and **Anonymous** (Anonymous = the one-tap Demo account).
4. Left menu: Build > Firestore Database > Create database. Location: **europe-west3 (Frankfurt)**. Start in **production mode** (locked; Claude Code writes the rules that open exactly what is needed).
5. Gear icon > Project settings > Your apps > the `</>` (Web) button. App nickname `hellodorm-web`. Do NOT tick Firebase Hosting. Copy the block that starts `const firebaseConfig = {` into a new file `firebase-config.txt` in the hellodorm folder. (These keys are meant to sit in public web pages; the security rules are what protect the data.)

**B. ntfy (free phone alerts).** Install "ntfy" from the App Store or Google Play. Claude Code will print a topic name in Prompt 1; subscribe to it then. Teammates who will price items do the same.

**C. Manager emails.** Write down your email and up to 4 teammates' emails who will price items.

**D. Start Claude Code in the hellodorm folder (not in Claude Workplace itself).**
1. Press the Windows key, type `cmd`, press Enter. A black window (Command Prompt) opens.
2. Copy this line exactly, including the quote marks, paste it into the black window (right-click pastes), press Enter:
   `cd /d "C:\Users\ASUS\Downloads\Claude Workplace\Study\Entrepreneurship\4-my-files\prototype-a2\hellodorm"`
3. Check: the line before the blinking cursor now ends with `...\prototype-a2\hellodorm>`.
4. Type `claude --chrome` and press Enter. Claude Code starts.
5. If it asks "Do you trust the files in this folder?", choose Yes.
6. Paste Prompt 1.

## Prompt 1. Build v1 (paste into Claude Code)

```
You are building a clickable, working prototype web app called HelloDorm for a university entrepreneurship course (team assignment, graded). It must look beautiful and feel like a real app on a phone AND on a laptop.

READ FIRST, fully: SPEC.md (what to build, the single source of truth), design-brief.md (look and feel), prague-dorms.md (real dorm addresses and coordinates for the stands), firebase-config.txt (Firebase web settings).

TECH
- Plain HTML, CSS and JavaScript. No build step, no framework install. Firebase JavaScript SDK (modular) loaded from Google's official CDN, version pinned.
- Firebase: Authentication (Email/Password + Anonymous for the Demo account) and Cloud Firestore. Do NOT use Firebase Storage, Cloud Functions or anything that needs a paid plan.
- The 10-minute automatic offer runs in the app (when any user or manager opens the app, items past 10 minutes with no manager action get the standard offer). No server code.
- Phone alerts: POST a short message to https://ntfy.sh/<topic>. Generate a long random topic name (at least 24 random letters and digits), keep it in ONE config line, and print it for me at the end so I can subscribe.
- Manager emails: one config line MANAGER_EMAILS with placeholder emails; tell me where to put the real ones. The same list goes into the Firestore security rules.
- Folder layout: v1/ holds the whole app (index.html, styles.css, app.js, texts.js with English and Czech side by side, data/items.js, data/dorms.js, data/prices.js). firestore.rules at the top. README.md (how to run, how to change managers, how to reset). AI-LOG.md (see below). Later a v2/ folder will be a copy of v1 with changes; v1 must stay frozen once published.
- Write firestore.rules so that: each user reads and writes only their own data; anyone can read the item catalogue; only managers (email in the list) can read all submitted items and set prices or reject; anyone can add a waitlist entry and increment counters but nobody except managers can read them.

MUST MEET (assignment rules)
- At least 10 clearly different screens and at least 10 meaningful interactions; the 3 key features in SPEC.md section 14.
- The link opens with no password or login: "Try as guest" and "Demo account" are always one tap away on the welcome screen.
- Every saved choice comes back after sign-in on another device (SPEC.md section 3).
- Mobile 390 px wide and laptop 1280 px both polished. Text contrast at least 4.5:1. Every icon has a word.

DO NOT
- Do not create, edit, move or delete any file outside this hellodorm folder. Do not touch C:\Users\ASUS\claude-practice. Do not delete anything; if a file must be replaced, keep the old one as name.old.
- Do not fetch from the internet except: the Firebase SDK, the font and icon libraries named in design-brief.md, free photos from Unsplash or Pexels (with credit lines), ntfy.sh, and looking up documentation.
- No real payments, no real bank checks, no real people's names or phone numbers, no brand logos. Every payment or bank screen says it is a demo.
- Do not publish, push to GitHub or create any online repository in this step.

AI LOG
Keep AI-LOG.md: every time you misunderstood something and I corrected you, write one line (date, what you assumed, what was right). Our assignment's AI statement needs this.

HOW TO WORK
1. First restate the app in 10 lines in your own words, list the screens you will build (aim for 14 or more), list every assumption you are making and any question where SPEC.md is unclear or contradicts itself. Then STOP and wait for my answers before writing code.
2. After I confirm: build it, run it locally (a simple local web server), and test it yourself in a browser at 390 px and 1280 px: guest walk-through, sign up, location pop-up, sell flow to offer and accept, decline path, buy flow to pickup code, demo account, manager pricing, sign out and sign in again with everything remembered. Fix what breaks.
3. Finish with: the list of screens, how to open it locally, the ntfy topic name, the manager-email line to edit, the firestore.rules text I must paste into the Firebase console (Firestore > Rules > Publish), and anything you could not test.
```

## Prompt 2. Publish v1 online (paste after Prompt 1 is done and you are happy)

```
Publish v1 to GitHub Pages so it has a public link that works on phone and laptop until at least 31/01/2027.
- Create a NEW public GitHub repository named hellodorm under my account daklod48 (never use claude-practice). Push this folder (excluding firebase-config.txt if it holds anything other than the public web config; the web config itself may be public). Use the GitHub CLI if it is installed, otherwise guide me through it step by step.
- Turn on GitHub Pages for the main branch. The v1 link must be https://daklod48.github.io/hellodorm/v1/
- Tell me exactly where in the Firebase console to add daklod48.github.io as an authorised domain (Authentication > Settings > Authorised domains), and wait until I say done.
- Then open the live link yourself, at 390 px and 1280 px, and repeat the main walk-through (guest, sign up, demo, sell, buy, manager). Report what works and what does not.
- Do not change any file outside this folder. Do not delete anything. Ask before any step that publishes something new.
```

## Prompt 3. Polish pass (any time after Prompt 2)

```
Polish pass on v1 before the professor sees it. Read SPEC.md and design-brief.md again.
1. Walk through the app as a first-time user on a 390 px phone screen, then as a returning user, then the same at 1280 px. Take screenshots and look at them yourself.
2. List the 10 weakest visual or wording spots (crowded, misaligned, unclear text, small tap targets, anything that looks unfinished) with your fix for each. Wait for my OK, then fix them.
3. Check contrast of every text colour against its background with a script (at least 4.5:1) and every link and button works.
4. Update AI-LOG.md and README.md. Do not change files outside this folder; do not delete anything; ask before pushing to GitHub.
```

## Fix loop
When something is off, paste into Claude Code: what you did (taps), what you expected, what happened, plus a screenshot. One problem per message works best.

## Base44 (same product, for the tool comparison)
Base44's free plan gives 25 message credits a month, so paste this whole prompt as your FIRST message and make it count. Base44 has its own login and database, so it needs no Firebase.

```
Build HelloDorm, a mobile-first app (must also look great on a laptop) for a university entrepreneurship course prototype.

WHAT IT IS: Students in Prague dorms donate or sell used items (kettle, lamp, chair, clothes, bedding) to HelloDorm. They drop items at a HelloDorm stand at their dorm. HelloDorm examines the item and sends a price offer in the app. Accept: money goes to their bank (demo only). Decline: collect the item at the stand within 30 days. HelloDorm cleans items and resells them at a higher price; buyers reserve in the app, pay (demo), and collect at the stand with a pickup code. Prices in CZK.

ACCOUNTS: Sign up, sign in, sign out, plus "Try as guest" (no login) and "Demo account" (opens a returning user with history: an item being cleaned, an offer waiting, a rejected item to collect, a reservation with pickup code, saved items, saved bank details). Everything a user chooses is saved in their account and comes back on any device: dorm, language, saved items, orders, submitted items and status, bank form, last tab, filters, unfinished listing. First visit: 3 swipe intro cards. Returning: "Welcome back, <name>".

LOCATION POP-UP: "Which dorm are you in?" with a list of Prague dorms (Palach, Eisler, Thaler, Blanice and other Prague student dorms) and a "Use my location" button that picks the nearest dorm and shows the real distance to its stand.

SELL/DONATE FLOW: category, title, condition (Like new / Good / Used), photo, sell or donate, pick stand and drop-off day, drop-off code, "I've dropped it" button. Status: Waiting for drop-off > Being examined > Offer ready (Accept / Decline) > Paid / Collect within 30 days / Rejected, collect within 30 days / Donated, thank-you letter. No answer to an offer in 14 days = donation with thank-you letter. If no manager prices it within 10 minutes, an automatic standard offer by category and condition appears.

BUY FLOW: browse items at my dorm stand first, search and filter, item detail with "Cleaned and checked" badge, new-price comparison, save, reserve, demo payment, pickup code held 48 hours with countdown, orders list.

MANAGER MODE: manager logins (up to 5 emails) see the queue of items to examine, set a price or reject with a reason, and totals (users, items, waitlist, visits and key taps).

ALSO: bank details screen (fields saved, Transfer and Add card buttons visible but demo only), notifications inbox, profile with English/Czech switch and "my impact", waitlist sign-up screen, visit and tap counters, About screen saying stands and payments are simulated.

LOOK: friendly like Too Good To Go: green, rounded corners, soft shadows, eco-friendly. Colours: primary #17754A, text #0B3D2E, background mint #E8F5EE, accent #F4B740 (dark text only), error #B42318, grey text #4B5563. Fonts Nunito (headings) and Inter (body). Bottom tabs on phone: Home, Sell, My items, Saved, Profile. Every icon has a word.

RULES: at least 10 clearly different screens and 10 meaningful interactions; a reviewer must complete a full walk-through alone; the app link must open without login. No real payments, no real people's names, no brand logos. About 30 sample items in 6 categories spread across the stands.
```
