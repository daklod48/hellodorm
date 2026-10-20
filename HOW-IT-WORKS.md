# How HelloDorm works, explained for a smart reader with no programming background

_Written 20 October 2026 for HelloDorm v1. Plain words. Every technical term is explained the first time it appears._

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
| `tools/` | Checks | Small scripts that scan for dashes, measure text contrast, and measure tap target sizes. |

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
- **Try as guest** needs no account. The app keeps the guest's choices (dorm, hearts, cart, filters) in the browser's own storage, a notebook that stays on that one device. When the guest signs up, those choices are copied into the new account.
- **Demo account** uses Firebase **anonymous sign in**: a real account with no email or password. The first time it is created, the app writes a ready made history into it (an item being examined, an offer waiting, a rejected item, a donation, a reservation with a pickup code, saved items, a cart, bank details, two inbox notes). The same browser keeps the same demo account until the person signs out; a sign out makes it unreachable (no password exists), so the next tap on Demo creates a fresh copy. Every tester therefore gets their own private copy and nobody's clicks collide.
- **Remembered on every device** works because nothing important is stored on the device itself for signed in users; it is all in the user document and its three collections, and the listeners bring it to any device within a second.

## 5. Security rules: what they allow and why

The rules are the gatekeeper in front of the database. The browser code can be read by anyone (it is a public web page), so the rules, not the code, protect the data. In plain words:

- **Own data only.** A signed in user can read and write only `users/<their own id>` and everything under it. Nobody can read another student's bank form, orders or inbox.
- **Managers see every item.** Emails in the manager list may read and update any `items` document (to price, reject or confirm a drop off), but not other users' orders, notes or profiles.
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

- **Managers**: `v1/config.js`, the line `MANAGER_EMAILS`, lower case emails. Put the same list into `firestore.rules` in `isManager()` and republish the rules. Each manager then signs up once with that email.
- **Prices**: `v1/data/prices.js`. `newPrice` per category, `factor` per condition, `OFFER_SHARE` (20 percent) and `RESALE_SHARE` (50 percent). Shop item prices are in `v1/data/items.js`.
- **Dorms and stands**: `v1/data/dorms.js`. Name, address, coordinates, `full: true` to show a full stand, and `STAND_HOURS` for opening times. A backdrop picture goes into `v1/img/dorms/<id>.webp` with a line in `credits-dorms.json`.
- **Texts**: `v1/texts.js`. Each key has `en` and `cs`. Placeholders in braces are filled by the app; `{n|item|items}` picks the plural. Run `python tools/scan-dashes.py` afterwards; it must print 0.
- **Items**: `v1/data/items.js` plus a 600 by 600 WebP in `v1/img/` and a credit line in `credits.json`.
- **Look**: the tokens at the top of `v1/styles.css`. After editing styles, run `python tools/build-critical.py` so the copy inside `index.html` matches.

## 8. How to make v2 from v1

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
