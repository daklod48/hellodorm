# How HelloDorm works, explained for a smart reader with no programming background

_Written 20 October 2026 for HelloDorm v1; updated 5 November 2026 for v2 (sections 2, 4, 7, 8, 10 to 13). Plain words. Every technical term is explained the first time it appears._

**Two versions side by side.** `v1/` is the published first link and is frozen: nobody edits it again. `v2/` started on 5 November 2026 as an exact copy of `v1/` and carries the design and accessibility pass described in section 10. Both use the same Firebase project. Wherever this document says `v1/`, the same file exists in `v2/`.

## 1. The big picture

HelloDorm is a **web app**: a program that runs inside a web browser (Chrome, Safari) instead of being installed from an app store. You open a link, the browser downloads a few files, and those files draw the screens and react to taps.

It has two halves:

- **The front end**: the files in the `v1/` folder. They run on the phone or laptop of the person using the app. They draw screens, remember what the user tapped, and talk to the back end.
- **The back end**: Firebase, a service run by Google. We use two parts of it. **Authentication** keeps the accounts (email and password, or an anonymous "demo" account). **Firestore** is the database, an online notebook where every user's data is written so it can be read again later on any device.

A third, tiny helper is **ntfy.sh**, a free notification service. When a student drops an item at a stand, the app sends one short line of text to ntfy, and every manager phone subscribed to our topic rings.

```
 phone or laptop (front end, v1/ files)
 +---------------------------------------------+
 |  index.html  boot.js  app.js  styles.css ...|
 +-----------+-------------------+-------------+
             |                   |
             | reads and writes  | one short alert line
             v                   v
   +-------------------+     +-----------+
   | Firebase          |     | ntfy.sh   |
   | Authentication    |     | (free)    |
   | Firestore (data)  |     +-----+-----+
   +-------------------+           |
             ^                     v
             | reads items,     manager phones
             | sets prices      (ntfy app)
   +---------+-----------+
   | Manager mode        |
   | (same web app,      |
   |  manager account)   |
   +---------------------+
```

Hosting: the `v1/` files sit on **GitHub Pages**, a free service that serves static files (files that do not change per visitor) from a public address. There is no server program of ours running anywhere; all the logic runs in the browser, and Firebase stores the data.

## 2. What each file does

| File | What it is | In plain words |
|---|---|---|
| `v1/index.html` | The page skeleton | The one web page. It names the fonts and styles, has the empty boxes (top bar, main area, tab bar, dialog layer) and loads `boot.js`. It also contains a copy of the styles for the first screen so that screen can be drawn before the big style file arrives. |
| `v1/boot.js` | First paint | A small script that draws the onboarding or welcome screen immediately, then loads the real app behind it. If someone taps before the app is ready, the tap is remembered and replayed. |
| `v1/first.js` | Shared markup | The HTML for the onboarding cards and the welcome screen, used by both `boot.js` and `app.js` so they draw exactly the same thing. |
| `v1/app.js` | The app | Every screen (home, browse, item, cart, sell, my items, orders, inbox, profile, stands, manager) and every rule (what happens on a tap, what is saved where, deadlines). About 1,900 lines. |
| `v1/styles.css` | The look | Colours, type sizes, spacing, rounded corners, shadows, animations, phone and laptop layouts. The design tokens (named values such as `--green`) sit at the top. |
| `v1/fx.js` | Motion | Background drift, scroll reveal, the leaf burst on Donate, the thumbnail flying into the cart, confetti on success, screen transitions. Switches itself off when the phone's "reduce motion" setting is on. |
| `v1/pip.js` | Pip the seal | The mascot: idle breathing and blink in the top bar, the FAQ panel, and the poses for empty and success screens. |
| `v1/texts.js` | Every sentence | Every text in English and Czech side by side. Change a sentence here, not in `app.js`. |
| `v1/config.js` | Settings | The Firebase connection details, the list of manager emails, the ntfy topic name. |
| `v1/icons.js` | Icons | The Lucide icon drawings, copied in so they work offline. |
| `v1/data/items.js` | Shop items | The 30 sample items for sale: titles in both languages, prices, stands. |
| `v1/data/dorms.js` | Dorms and stands | The 16 Prague dorms with real addresses and coordinates, the stand opening hours, and the distance formula. |
| `v1/data/prices.js` | Price table | The 7 categories, the 3 conditions, and the standard offer formula. |
| `v1/img/` | Pictures | Item photos (WebP, with credits in `credits.json`), dorm backdrops (`dorms/`), Pip poses (`pip/`). |
| `v1/fonts/` | Fonts | Inter and Nunito, copied here so the first screen does not wait for Google's servers. |
| `firestore.rules` | Security rules | Who may read or write what in the database. Pasted into the Firebase console. |
| `index.html` (top level) | The public link | Forwards https://daklod48.github.io/hellodorm/ to the newest version (`v2/`), keeping any `?dorm=` from an invite link. To point it at v3 later, change `v2/` in that file. |
| `v2/` | Second version | A copy of `v1/` with the 5 November 2026 changes (sections 10 and 12). Same files, same names. |
| `tools/` | Checks | Small scripts that scan for dashes and real emails, measure text contrast, tap target sizes, text sizes and field outlines (section 11). |
| `tools/browser.py` | Shared test setup | Opens the test browser for every check; can swap in the stand-in database (section 11). |
| `tools/fake-firebase/` | Stand-in database, tests only | Three small files that imitate Firebase inside the test browser so checks can open demo and manager screens without writing to the real database. The live site never loads them. |

Files ending in `.old` are the versions before the design pass. They are kept, not used.

## 3. What happens when a student taps "Sell"

Follow one item from the tap to the manager's phone and back. Terms on the way:

- A **tap handler** is the part of `app.js` that waits for taps. There is one for the whole app: every button carries a small label (`data-act="dropped"`, for example), and the handler looks up what to do for that label.
- A **document** in Firestore is one record, like one row in a spreadsheet. Documents live in **collections**, like sheets. HelloDorm keeps one document per user at `users/<id>`, and under it three smaller collections: `items` (things the student is selling), `orders` (things they are buying) and `notes` (their inbox).
- A **listener** is a standing request to Firestore: "tell me whenever these documents change". The app opens three listeners (items, orders, notes) when a user signs in, so the screens update by themselves, on every device at once.

Step by step:

1. **Tap "Sell or donate"** on Home. The handler opens the sell flow. Each answer (category, title, condition, photo, sell or donate, stand, day) is written into a **draft**, a small object kept in memory and saved to the user's document every 600 milliseconds. That is why a half finished listing shows up as "Continue your listing" on another device.
2. **Tap "Confirm"** on step 5. `app.js` builds one new document in `users/<id>/items` with status `waiting`, a drop off code such as `D7LQ8T`, the chosen stand and day. Firestore stores it. The items listener fires, the "My items" screen now shows the item with its timeline.
3. **Drop off**. Either the student taps "I've dropped it at the stand", or stand staff type the code into Manager mode and confirm. Both do the same thing: a **transaction** (a change Firestore applies only if nothing changed meanwhile) that checks the status is still `waiting` and then sets it to `examining` with the time and who confirmed. Because it is a transaction, if both sides tap at the same moment only the first one wins and the second gets "already confirmed".
4. **Alert**. After a successful drop off, the app sends one line to `https://ntfy.sh/<topic>`: "New item to price: Kettle, Good, Thalerova stand". No name, no email. Every phone subscribed to the topic shows it.
5. **Manager**. A manager signs in with a listed email. Manager mode reads every `items` document across all users (the rules allow managers to do that), shows the queue, and the manager types a price or a rejection reason. That writes `status: offer`, the price, and the deadline (14 days) into the student's item document.
6. **Back to the student**. The student's items listener fires on any device where they are signed in: the item shows "Offer ready" with the price, Home shows "Offer ready for 1 of your items", and a note appears in the inbox. Accept writes `accepted` (and asks for bank details first if none are saved); decline writes `declined` with a 30 day collection deadline.

```
 student taps Confirm        student or staff        manager types price
        |                    confirms drop off              |
        v                           |                       v
 users/<id>/items/<item>  --------> |  --------------> same document:
   status: waiting          status: examining        status: offer, offer: 230
        |                           |                       |
        |                           +--> ntfy.sh --> manager phones
        v                                                   |
 "My items" timeline  <---- listener ----------------------+
 (every device where the student is signed in)
```

## 4. Accounts: sign up, guest, demo, and "remembered on every device"

- **Sign up** creates an account in Firebase Authentication (email and password; Firebase stores the password in scrambled form, we never see it) and a user document in Firestore with the name, dorm, language, saved items, cart, filters, last tab, bank form and draft. Everything the user chooses later is written into that one document, so on another device, after sign in, the app reads it and continues where they left off.
- **Sign in** on a second device: Firebase checks the password and gives the app a **token**, a signed pass that proves who the user is. Every read or write to Firestore carries that token, and the rules compare it with the document being touched.
- **Guest (v2: everybody who is not signed in).** In v2 there is no welcome wall: the link opens Home and the visitor is a guest at once. A guest can browse, choose a dorm, fill a cart and check out to a demo pickup code. The guest's orders are kept in the browser's own storage only (section 12). Sign in and sign up stay available and optional.
- **Try as guest** (v1 wording) needs no account. The app keeps the guest's choices (dorm, hearts, cart, filters) in the browser's own storage, a notebook that stays on that one device. When the guest signs up, those choices are copied into the new account.
- **Demo account** uses Firebase **anonymous sign in**: a real account with no email or password. The first time it is created, the app writes a ready made history into it (an item being examined, an offer waiting, a rejected item, a donation, a reservation with a pickup code, saved items, a cart, bank details, two inbox notes). The same browser keeps the same demo account until the person signs out; a sign out makes it unreachable (no password exists), so the next tap on Demo creates a fresh copy. Every tester therefore gets their own private copy and nobody's clicks collide.
- **Remembered on every device** works because nothing important is stored on the device itself for signed in users; it is all in the user document and its three collections, and the listeners bring it to any device within a second.

## 5. Security rules: what they allow and why

The rules are the gatekeeper in front of the database. The browser code can be read by anyone (it is a public web page), so the rules, not the code, protect the data. In plain words:

- **Own data only.** A signed in user can read and write only `users/<their own id>` and everything under it. Nobody can read another student's bank form, orders or inbox.
- **Managers see every item.** Accounts in the manager list (by Firebase user ID since 6 November 2026, section 15) may read and update any `items` document (to price, reject or confirm a drop off), but not other users' orders, notes or profiles.
- **The shop state is public to read.** Whether a sample item is free, reserved or sold is one small document per item in `shop/`. Anyone can read it; a signed in user may reserve a free item, release their own, or take over a reservation whose 48 hours have run out. Managers may reset it.
- **The prototype clock.** Managers may move the app's clock forward (`config/clock`); everyone may read it. That is how the 14 day and 30 day rules can be shown live.
- **Waitlist and counters are write only.** Anyone can add a waitlist entry (email, dorm, or a typed dorm name for "Ask for a stand") or add one to a counter such as "visits", but only managers can read them. A visitor cannot download the list of emails.
- **Nothing else exists.** Any path not mentioned is closed.

Why this shape: the free Firebase plan has no server code, so the rules carry all the trust. They are deliberately narrow; when a new field is added (as `dormName` was), the rules must be updated and republished, otherwise the write is refused with "Not allowed".

## 6. The 10 minute automatic offer and the 14 and 30 day rules

There is no server waking up at night, so time based rules run inside the app whenever someone has it open:

- **Automatic offer.** Every 30 seconds, and each time its data changes, the app looks at the signed in user's items. An item that has been `examining` for more than 10 minutes without a manager price gets the standard offer: typical new price for its category, times a condition factor (like new 1.0, good 0.75, used 0.5), times 20 percent, rounded to 10 CZK. A manager's Manager mode does the same check for all items when it loads. A demo item marked `hold` is skipped so the demo always shows "being examined".
- **14 days.** An offer carries an `answerBy` date. If the app sees that date has passed, it sets the item to `donated` with the reason "no answer" and writes a thank you note into the inbox.
- **30 days.** Declined or rejected items carry a `collectBy` date. When it passes, the item becomes `disposed` and the inbox says so.
- **48 hours.** Orders carry `expiresAt`. When it passes, the order becomes `expired`, the shop document for each item is released, and the inbox says the hold ended. Twelve hours before, a reminder note appears.
- **The clock.** All of these compare against `now()`, which is the real time plus the manager's "skip ahead" offset. Skipping 15 days therefore triggers the 14 day and 48 hour rules on the spot; "Back to real time" resets it.

## 7. How to change things

- **Managers**: by Firebase user ID, in `v2/config.js` (`MANAGER_UIDS`) and `firestore.rules` (`isManager()`), then republish the rules. Exact steps: section 15.
- **Prices**: `v1/data/prices.js`. `newPrice` per category, `factor` per condition, `OFFER_SHARE` (20 percent) and `RESALE_SHARE` (50 percent). Shop item prices are in `v1/data/items.js`.
- **Dorms and stands**: `v1/data/dorms.js`. Name, address, coordinates, `full: true` to show a full stand, and `STAND_HOURS` for opening times. A backdrop picture goes into `v1/img/dorms/<id>.webp` with a line in `credits-dorms.json`.
- **Texts**: `v1/texts.js`. Each key has `en` and `cs`. Placeholders in braces are filled by the app; `{n|item|items}` picks the plural. Run `python tools/scan-dashes.py` afterwards; it must print 0.
- **Items**: `v1/data/items.js` plus a 600 by 600 WebP in `v1/img/` and a credit line in `credits.json`.
- **Look**: the tokens at the top of `v2/styles.css` (v1 is frozen). After editing styles, run `python tools/build-critical.py v2` so the copy inside `index.html` matches. Two v2 tokens guard accessibility: `--fs-min` (12 px, the smallest text allowed) and `--field` (the outline colour of text boxes, 3.9:1 on white). Do not go below either.

## 8. How to make v2 from v1 (done on 5 November 2026; the same steps make v3 from v2)

1. Copy the whole `v1/` folder to `v2/`. Do not touch `v1/` again; it is the frozen first link.
2. In `v2/`, change what the tests asked for. Both folders share the same Firebase project and database, so a user signed in on v1 is signed in on v2 too.
3. If v2 needs a new field in the database, add it to `firestore.rules` and republish.
4. Push the folder to GitHub; the second link is `https://daklod48.github.io/hellodorm/v2/`.

## 9. What is free and what costs money

- **GitHub Pages**: free for a public repository. Limit 1 GB of files, 100 GB of traffic a month; HelloDorm v1 is about 5 MB.
- **Firebase Spark plan** (the free plan): Authentication is free for email and anonymous sign in. Firestore allows 50,000 document reads, 20,000 writes and 20,000 deletes per day, and 1 GB stored. One visit to HelloDorm reads roughly 10 to 40 documents (the user document, their items, orders, notes, the shop state), so 20 testers a day use well under 2,000 reads. If the limit is ever hit, the app shows "The free online database has reached its daily limit" and still lets people browse the sample items. Nothing in HelloDorm uses Storage, Cloud Functions or any paid feature.
- **ntfy.sh**: free public topics; the only cost is that the topic name is visible in the code, so a stranger could post a fake alert. Change the topic name if that happens.
- **Fonts, icons, photos**: Inter and Nunito (SIL Open Font License), Lucide icons (ISC licence), Unsplash photos (Unsplash licence), Wikimedia Commons photos (CC BY or CC BY-SA, credited in About), Gemini illustrations (listed in About and `IMAGE-PROMPTS.md`). All free to use here.
- **Domain**: the `github.io` address is free. A custom domain would cost roughly 300 to 400 CZK a year and is not needed for the course.

## 10. The v2 design and accessibility pass (5 November 2026)

**Benchmark.** In October the team studied Prism, Too Good To Go, Olio, Vinted, Back Market and Ecosia (`DESIGN-NOTES.md`). From Vinted it borrowed the item card: "square photo, price chip, two line meta". Measured on a 390 px phone (the width of a typical iPhone, and the width SPEC.md section 10 names), v1 had drifted from its own benchmark: four lines of meta text and two stacked buttons under every photo. v2 brings the phone layout back to that benchmark. The outside reference pages could not be opened again on 5 November (the build machine's network blocks those sites), so no new outside source is cited for this pass; the numbers below were measured on the app itself.

Each change, why, and the number behind it:

1. **A floor for text size: nothing under 12 px.** In v1 the words under the top bar icons ("Help", "Cart", "Inbox") were 9.3 px and the condition badges 11.2 px. A pixel here is a **CSS pixel**: the browser's unit of length, about 1/96 of an inch at arm's length on any screen, so 12 px looks the same size on a phone and a laptop. The token `--fs-min` (12 px) now sets every small label.
2. **Text boxes have a visible outline.** WCAG, the international accessibility standard (Web Content Accessibility Guidelines), has two contrast rules. The one HelloDorm already checked (1.4.3) says text needs 4.5:1 against its background. A second one (1.4.11, **non-text contrast**) says the edge of a control people must find, such as the outline of a text box, needs 3:1. v1's text box outline (`#9DBFAE`) was 2.0:1 against white, so on a bright screen the box could disappear. v2 uses `--field` `#5E8C76`: 3.9:1 on white and 3.4:1 on mint.
3. **Compact item card.** The Save heart is now a round 46 px button on the photo, the stand line is short ("Thalerova · in your dorm", the shop icon already says "stand"), and "Add to cart" is one full width button. Measured on a 390 px phone, one row of two cards went from 440 px to 397 px (card plus gap), about 10 % shorter, with fewer buttons competing for the thumb. The heart's word did not disappear: it moved into an **aria-label**, a hidden name that screen readers (software that reads the screen aloud for blind users) announce, so they still hear "Save" or "Saved".
4. **Filters side by side.** On a phone, Condition and Price sit next to each other, each with its word above the choice, instead of taking a full row each.
5. **Sticky action bar on the item page.** In v1 "Reserve now" started 1,008 px down the item page on a 390 x 844 px phone (1.19 screens), so it was not visible without scrolling. In v2 it is visible on the first screen and stays visible. In v2 the actions are **sticky**: a CSS setting that lets a box scroll normally until it reaches an edge of the screen and then stay there. The bar holds Save (as an icon), Reserve now and Add to cart, and rides just above the tab bar until the end of the item section. On a laptop nothing changed, because the button is already visible there.
6. **Works at 320 px, in Czech too.** WCAG's **reflow** rule (1.4.10) asks that a page still works at 320 px wide with no sideways scrolling. Czech words are longer, so below 380 px the small explanation lines inside the bar ("Pay later") are hidden and only the button words stay. Measured: 0 px sideways overflow at 320 and 390 px in both languages.
7. **No automatic hyphens.** Browsers can split long words with a hyphen (`hyphens: auto`). That would put dashes into visible text, which the owner ruled out (`AI-LOG.md`, 20 October), so v2 forbids it and `scan-dashes.py` now fails if it appears.
8. **Readable stand map on phones.** The map is a drawing whose size is set in its own units. v1 drew it 800 units wide and the phone shrank it to about 45 %, so the 11 unit pin numbers showed at about 5 px. v2 draws it 360 units wide on phones (1 unit is about 1 px), with 12 px numbers and 48 px tap circles. On a laptop it is unchanged.
9. **Nicer line breaks.** Headings use `text-wrap: balance` (lines of similar length) and paragraphs `text-wrap: pretty` (no single word alone on the last line). Browsers that do not know these settings simply ignore them.

What did not change: colours, fonts, motion, Pip, every screen's content and every rule in sections 3 to 6.

## 11. The checks, and how to run them without touching the real database

Run the local server first (`python -m http.server 8080` in the `hellodorm` folder). Each script prints problems, then a count on the last line, which must be `0`.

| Script | What it proves | v2 result, 5 Nov 2026 |
|---|---|---|
| `python tools/scan-dashes.py v2` | No dash in any visible text, and no automatic hyphens | 0 |
| `python tools/scan-emails.py` | No real looking email address in `config.js`, `firestore.rules` or `firebase-config.txt`. Allowed are only names reserved for examples by internet standards (RFC 2606 and RFC 6761): `example.com`, `example.org`, `example.net`, and anything ending `.test`, `.example` or `.invalid`. Those can never reach a real person. | 0 |
| `python tools/check-contrast.py` | Every text 4.5:1 or more, at 390 and 1280 px | 0 |
| `python tools/check-taps.py` | Every button and link at least 44 x 44 px on a phone | 0 |
| `python tools/check-readable.py` | Every text 12 px or more, every text box outline 3:1 or more, on a phone | 0 (v1: 111) |

**The stand-in database.** The checks open the demo account and Manager mode. Against the real Firebase project that creates test accounts and adds to the visit and tap counters, which are the demand test numbers for the assignment. Setting `HD_FAKE=1` before a check swaps Firebase for the three small files in `tools/fake-firebase/`, inside the test browser only: they keep the data in the test browser's memory and nothing leaves the machine. Use it whenever you only want to check the look:

```
set HD_FAKE=1
python tools/check-readable.py
```

(On Mac or Linux write `HD_FAKE=1 python tools/check-readable.py`.) Without `HD_FAKE`, the checks behave exactly as before and use the real database, which is still the right final test of sign up and sync. `HD_CHROME=<path>` points the checks at a different Chrome program if the installed Chrome is not found.

**What was not measured on 5 November.** Lighthouse (Google's speed and quality score) was not run for v2: the build machine could not load Firebase from Google's servers, so a speed score from there would not be comparable with the October numbers. v2 adds no images, fonts or libraries and about 4 KB of styles, so the October scores should hold; run Lighthouse on v2 once before publishing it.

## 12. Round 3: the professor's feedback (5 November 2026)

The professor tested the app and wrote three things: (a) a link that needs no log in and lands on Home, (b) items could be checked out without choosing a dorm and the pickup code did not say where to collect, (c) features for sign ups and community, an About us (our story), and the user feedback form. Everything below is in `v2/` only; `v1/` is unchanged.

**(a) Straight to Home, no account.**
- The public link https://daklod48.github.io/hellodorm/ is a tiny forwarding page (`index.html` at the top of the repository) that opens `v2/` at once.
- v1 started every new visitor on 3 onboarding cards and then a welcome screen with Sign in, Sign up, Guest and Demo. v2 makes anyone who is not signed in a **guest** immediately and shows Home. Sign in and Sign up are small links on Home marked "(optional)".
- **Guest checkout without the database.** A guest's order and pickup code are saved in the browser's own storage (the same notebook that already held the guest's cart). Why: it needs no change in the Firebase console, it works even if the free database quota is used up, and a professor clicking through does not hold real shop items away from other testers. The cost: a guest order exists only in that browser and is not moved into an account at sign up. A signed in user's checkout works exactly as before (database, shared shop state, 48 hour hold).

**(b) Dorm first.**
- Home starts with a large "Choose your dorm" button for anyone without a dorm. The choice is remembered (guests: on the device; accounts: in the account).
- Every item card says "Pick up: Thalerova" with the distance. Browse has a **Pickup dorm** filter, sorted by distance from your dorm.
- The item page shows the full **pickup place**: dorm, stand spot, address, distance, opening hours, next pickup window. If it is not your dorm, a yellow box says so ("You pick this up at Strahov, 6.7 km from Thalerova") with a button to see items at your own dorm.
- Checkout is now 3 numbered steps: 1 Pickup place, 2 Payment (demo), 3 Pickup code. For every stand in the order, the pickup place is shown again with a large tick box "I can pick up at Koleje Strahov". The pay button stays grey and a tap explains why until every pickup place is ticked. This is the step the professor asked for: the place is confirmed before payment, not discovered after.
- The pickup code card says "Show this code at the HelloDorm stand in Koleje Strahov", followed by the full pickup place.
- **Stand spot.** The data has opening hours but no room or stand location, and the stands are fictional, so v2 shows a generic line "HelloDorm stand at the main entrance (planned location)" instead of inventing rooms. To set a real spot for a dorm, add `spot: { en: 'Lobby, next to reception', cs: 'Vstupní hala u recepce' }` to that dorm in `v2/data/dorms.js`.

**(c) Community and sign ups.**
- **About us**: our story (built only from facts in `SPEC.md`: the problem in Prague dorms, the stand idea, the November 2026 tests, Team 5 of 3BE314), what we promise, and links to feedback and invites. The words are in `v2/texts.js` (`story_p1` to `story_p3`); please put the story in your own words.
- **Give feedback**: your feedback forms from last week were not in the repository, so the app has a short form of its own: (1) how easy was it to find an item at your dorm, 1 to 5; (2) how clear was where you pick up, 1 to 5; (3) would you sell or donate through HelloDorm when you move out, yes, maybe or no; (4) would you buy a cleaned item at your dorm stand instead of new, yes, maybe or no; (5) an optional comment. Questions 1 to 4 are counted in the existing `stats` counters (for example `fb_q1_4` counts how many people answered 4 to question 1). The current security rules already allow that, so no console change was needed. The comment is sent to the managers' phones through ntfy, like the drop off alerts. Manager mode, Totals, shows the averages and counts. Note: an ntfy topic can be read by anyone who knows its name, and the name is in the public code, so the form asks people to leave out names and contact details.
- **Three features, and why these three:**
  1. **Wishlist alerts** ("Tell me about new matches" in Browse after a search or category). They are saved in the account, so a guest who taps it is invited to sign up: the feature gives a concrete reason to make an account. Saved shows each alert with the matching items available now. Honest limit: the 30 sample items never change, so an alert cannot fire for a truly new listing in this prototype.
  2. **Invite a dorm mate** (Home, Profile, About us). It shares or copies a link such as `https://daklod48.github.io/hellodorm/?dorm=thaler&ref=invite`, which opens HelloDorm with that dorm already chosen. A stand is only useful when enough people in the same building use it (a local **network effect**: every extra user makes the service better for the others), so growth should spread dorm by dorm.
  3. **Dorm board** (Home). Stands ranked by the items waiting there, your dorm highlighted. It gives each dorm a little team pride and shows that others take part (**social proof**: people join more readily when they see others doing it). It also helps the dorm first goal by showing where the items are. It says on screen that it counts the sample items.
- New counters (Manager mode, Totals): guest demo orders, feedback forms sent, invite links shared, visits from invites, alerts set, and every feedback answer.

**Optional console step (not needed for anything above).** To store feedback comments in the database instead of only sending them to phones, a new rule would be needed for a `feedback` collection. This was deliberately avoided; ask Claude Code for the rule text if you want it.

## 13. Round 4: accounts and payment like a real app (5 November 2026)

**Accounts.**
- The link still lands on Home with no wall. Home shows one card with three clear choices: **Sign in**, **Sign up**, **Try the demo account** ("No sign up, ready made history").
- The app asks for an account only when it is needed: reserving or checking out, wishlist alerts, selling. The dialog always offers the demo account next to Sign in and Sign up, and after the demo starts the person continues straight to where they were going (for example checkout).
- **Staying signed in.** Firebase Authentication keeps a signed in person on that device after the browser is closed. This was checked in the Firebase code itself (version 12.19.0, `getAuth` starts with `indexedDBLocalPersistence`, the browser's on disk database), so no code change was needed.
- **Same data on phone and laptop.** Dorm, saved items, cart, alerts, orders and pickup codes are stored in Firestore under `users/<id>`, so the same account shows the same data on every device.
- **The demo reads as a demo.** New demo copies are named "Demo account" (no more "Alex"), Home says "Welcome to the demo account", and Profile shows "Demo account" even for older demo copies.
- **What a guest picked comes along.** Sign up (new account): dorm, cart, saved items and filters move in, as before. Sign in (existing account): the guest's cart and saved items are added, and the guest's dorm is used if the account has none. Demo: the guest's dorm and cart are used for the new demo copy.
- **Guest checkout on the device is gone** (it was round 3's answer to the professor). Checkout now needs an account or the demo; the professor can still reach a pickup code without signing up, through "Try the demo account" (one tap).

**Payment.** Checkout step 2 offers two ways to pay. The app has no card fields at all any more.
- **Pay by card** sends the person to a **Stripe Payment Link**: a ready made payment page that Stripe hosts. Card details are typed only on Stripe's page; HelloDorm never sees or stores them. Before leaving, the app saves the order (items held, marked "not paid") and remembers its order group code. The link carries `client_reference_id=<group code>` so the payment can be matched in Stripe, plus the email and language. After payment Stripe sends the person back to `.../v2/?paid=1`; the app marks the remembered order paid and shows the success screen. If the person never comes back, the order shows "Payment pending" with "Try card payment again" or "Use demo pay instead".
- **Demo pay** marks the order paid at once.
- Both end on the same **success screen**: "Order confirmed", one pickup code per stand naming the dorm (with address and hours), and a **thank you letter** from the team.
- **Honest limits of a server free setup.** (1) A Payment Link has one fixed price, so the Stripe test page shows that fixed test amount, not the exact cart total. (2) The app trusts the return from Stripe instead of asking Stripe to confirm the payment. Both are fine for a test mode prototype and not for real money. The real fix is a tiny server (for example a free Cloudflare Worker) that creates a Stripe Checkout Session with the exact amount and confirms payment with a **webhook** (a message Stripe sends to that server when a payment succeeds).
- Until a link is added, "Pay by card" shows as "Not set up yet" and only Demo pay works.

**Stripe setup, click by click (owner).** Stripe's pages could not be opened from the build machine on 5 November 2026, so these steps come from Claude Code's knowledge and were not checked against Stripe today; the names of buttons may differ slightly.
1. Go to https://dashboard.stripe.com/register and create an account (email, name, password). You do not need to activate payments or give bank details for test mode.
2. In the dashboard, make sure you are in **test mode** (a "Test mode" switch at the top, or a "Sandbox" in newer dashboards). Test mode pages say "TEST MODE" and never charge real cards.
3. Open **Payment Links** (left menu, or search "Payment Links") and press **+ New** (or "Create payment link").
4. Add a product: name `HelloDorm test order`, price `100`, currency `CZK`, one time. Save the product.
5. Open the **After payment** tab. Choose **Don't show confirmation page** and then **Redirect customers to your website**, and enter: `https://daklod48.github.io/hellodorm/v2/?paid=1`
6. Press **Create link**. Copy the link; it starts with `https://buy.stripe.com/test_`.
7. Send the link to Claude Code (or paste it yourself in `v2/config.js`, line `STRIPE_PAYMENT_LINK = ''`, between the quotes) and publish.
8. To pay on the test page use Stripe's test card `4242 4242 4242 4242`, any future date (for example 12/34), any 3 digit CVC, any name.

**Firebase console: nothing to do.** Email and password sign in and anonymous sign in (for the demo) are already switched on (v1 uses both). The current security rules already let each signed in person read and write only their own `users/<id>` document and its orders, including the new fields `paid`, `payMethod`, `paidAt` and `pendingPay`. Email and password sign in does not depend on the authorized domains list.

## 14. The Improvement Lab (`LAB/`)

The owner's `LAB/MACHINE.md` describes measured improvement rounds: a frozen rubric (`LAB/RUBRIC.md`: 8 criteria, 1 to 10), captures of every main screen at phone and laptop size (`LAB/capture.py`, using the stand-in database so nothing is written), an **independent scorer** (a fresh AI agent that sees only the rubric, the captures and the measured numbers, never the builder's reasoning), and a strict rule: a run is kept only if the total score rises. `LAB/RUNS.md` and `LAB/runs.json` log every run; `LAB/tracker.html` shows them as cards with a score chart and opens by double-click. `python LAB/build_tracker.py` rebuilds it.

Result on 5 November 2026: baseline (round 4) 59 / 80; run 1 57 (reverted); run 2 58 (reverted); stop rule reached. The app on `main` was not changed by the Lab. Recommendations are at the end of `LAB/RUNS.md`.

## 15. Security fix: managers by Firebase user ID (5 and 6 November 2026)

**The hole.** Until 5 November 2026, `isManager()` in `firestore.rules` checked only the email on the sign in pass. Firebase lets anyone sign up with any address without proving they own it, so a stranger could register a listed manager address and get manager rights, including reading the waitlist emails.

**First fix (5 Nov, replaced).** Require a verified email. Its drawback: verification needs real inboxes, and real addresses would have to sit in public files, against the owner's rule "no real emails in any config file".

**Final fix (6 Nov, owner's decision).** Managers are listed by **Firebase user ID (UID)**: the random account number Firebase gives every account, for example `Xy3kQ9aB...` (28 letters and digits). A UID cannot be claimed by signing up with someone's email, it needs no verification, and it is not an email address, so it may sit in public files.
- `firestore.rules`: `isManager()` is `signedIn() && request.auth.uid in ['PASTE_MANAGER_UID_HERE']`. Every manager permission goes through it (pricing and rejecting items, reading the waitlist and counters, the prototype clock, test data cleanup).
- `v2/config.js`: `MANAGER_UIDS = ['PASTE_MANAGER_UID_HERE']`. The app shows Manager mode only to a signed in account whose UID is in that list (never to the demo account).
- Until the placeholder is replaced, nobody is a manager. Everything else works as before.
- v1 (frozen) still lists placeholder emails in its own config, so v1 never shows Manager mode to real accounts; manager work happens in v2.

**Step 1: make the manager's HelloDorm account.** The UID belongs to the account inside the HelloDorm app, not to the Google account used for the Firebase console. The app offers email and password sign in (it has no Google sign in button). Open https://daklod48.github.io/hellodorm/v2/ , tap **Sign up**, and create the account with the manager's own email and a password. Skip this if that account already exists.

**Step 2: read the UID in the Firebase console, click by click.** (Written from Claude Code's knowledge; the console could not be opened from the build machine, so labels may differ slightly.)
1. Open https://console.firebase.google.com and choose the project **hellodorm**.
2. In the left menu open **Build**, then **Authentication**.
3. Open the **Users** tab at the top.
4. Find the row whose **Identifier** column shows the manager's email (the search box above the table helps).
5. In the same row, the last column **User UID** shows the UID. Point at it and press the small **copy** icon that appears next to it.

**Step 3: paste the UID in two places.**
1. `firestore.rules`, inside `isManager()`: replace `PASTE_MANAGER_UID_HERE` with the UID, keeping the single quotes, so the line reads `'Xy3kQ9aB...'`. For a second manager add a comma and another quoted UID.
2. `v2/config.js`, line `export const MANAGER_UIDS = ['PASTE_MANAGER_UID_HERE'];`: the same UID in the same quotes. Both lists must match.
3. Commit and push (GitHub web editor is fine); after the pull request is merged, the app part is live.

**Step 4: publish the rules, click by click.**
1. Firebase console, project **hellodorm**, left menu **Build**, then **Firestore Database**, then the **Rules** tab.
2. Click into the editor, select all text (Ctrl+A) and delete it.
3. Paste the whole `firestore.rules` file (with the UID from step 3) and press **Publish**.
4. Optional test with the **Rules Playground** button: simulate a **get** on `/waitlist/test` as an **authenticated** user. With a random UID the result is **denied**; with the manager's UID it is **allowed**.
5. Sign in to v2 with the manager account: **Manager mode** appears in the menu and in Profile.

**Restrict the web API key, click by click (owner).** The `apiKey` in `v2/config.js` is meant to be public (it identifies the project; the rules protect the data), but restricting it stops strangers from using it from their own websites or for other Google APIs. Written from knowledge, not checked against Google's pages today.
1. Open https://console.cloud.google.com/apis/credentials while signed in with the Google account that owns the Firebase project, and pick the project **hellodorm** in the project selector at the top.
2. Under **API keys**, open the key whose value starts with `AIzaSyDgKu` (Firebase names it "Browser key (auto created by Firebase)"). If unsure, press **Show key** and compare it with `v2/config.js`.
3. **Application restrictions**: choose **Websites** and add `https://daklod48.github.io/*`. Add `http://localhost:8080/*` as well if the team runs the app or the checks on a laptop.
4. **API restrictions**: choose **Restrict key** and tick only **Identity Toolkit API** (sign in), **Token Service API** (keeps people signed in) and **Cloud Firestore API** (the database).
5. Press **Save**, wait up to 5 minutes, then open the live link and try sign in and the demo account. If a page shows "requests from referer ... are blocked" or "API key not valid", recheck steps 3 and 4; if the error names another Firebase API, add that API to the list.

**Checks.** `tools/check-contrast.py` still walks Manager mode: with `HD_FAKE=1` the test browser puts the stand-in test manager's UID in place of the placeholder (the real config file is not changed). Against the real database, pass a manager account that is in the UID list.
