# HelloDorm prototype v1: product spec

_Written 2026-10-20 in a Cowork consult with Thang (DeClaun). Team 5, 3BE314 Entrepreneurship, Assignment 2 (prototype and validation, due Tue 10/11/2026 23:59). This file is the single source of truth for the build. Claude Code reads it; the Base44 prompt is a short version of it._

## 1. What HelloDorm is (one paragraph)
Students in Prague dorms who leave or no longer need things (kettle, lamp, chair, clothes, bedding) either DONATE them or SELL them to HelloDorm. They drop the item at a HelloDorm stand at their dorm. HelloDorm examines the item and sends a price offer in the app within 1 to 2 days. If the student accepts, money goes to their bank account; if not, they collect the item at the stand. HelloDorm cleans the items and resells them to other students (mostly new arrivals) at a higher price; buyers reserve in the app, pay, and collect at the stand with a pickup code. Tagline (editable): "Pass it on, dorm to dorm."

## 2. Who uses it and what they must be able to do alone
- The professor opens the link on her PHONE and on her LAPTOP, first as a new user, then later again as a returning user. Both must look polished. She must be able to do a full walkthrough with no explanation (brief rule).
- The link opens WITHOUT a password or login (brief rule): "Try as guest" and "Demo account" always visible.
- Classmates and 20 interview testers in Innovation Week (2 to 6 Nov 2026).
- Team managers (Thang + up to 4 teammates) price submitted items.

## 3. Accounts and memory (Firebase Spark plan, free)
- Sign up (name, email, password; note under password: "Prototype: please use a made-up password"), Sign in, Sign out, Forgot password (Firebase sends the reset mail).
- Try as guest: browse everything with no account. When a guest tries to reserve or sell, ask them to sign up; anything they did as guest (dorm, hearts) moves into the new account.
- Demo account: one tap creates a FRESH private demo copy (Firebase anonymous sign-in) pre-filled with history, so every demo user has their own and nobody's clicks collide: one item "Cleaning", one item with an offer waiting, one rejected item to collect, one reservation with a pickup code, 3 hearted items, a saved fake bank form, 2 notifications. Same device later = same demo copy (returning user).
- EVERYTHING the user chooses is saved in their account (Firestore) and comes back on any device after sign-in: name, dorm, language, hearted items, reservations and orders, submitted items and their status, bank form fields, notifications read/unread, last open tab, search text and filters, a half-filled sell form (draft, with "Continue your listing" card).
- First visit on a device: 3 swipe onboarding cards ("Sell or donate in 2 minutes", "We collect, clean and resell", "Pick up at your dorm stand"), then the welcome screen. Shown once per device.
- Returning user: no onboarding, no location pop-up, home says "Welcome back, <first name>", shows their dorm, a "since last time" strip (offer ready, reservation expires in X h).

## 4. Location pop-up
After sign up / first guest visit: "Which dorm are you in?" with a searchable list of real Prague dorms (file prague-dorms.md: name, address, coordinates) and a "Use my location" button. Location permission is asked by the browser only after that button is pressed. With location: pick the nearest dorm and show the REAL distance ("Thaler dorm stand, 350 m away"). If refused or unavailable (laptop): keep the list, no error wall. Every dorm has a (fictional) HelloDorm stand at its real address, with opening hours. Dorm can be changed later in Profile.

## 5. Selling or donating (journey A)
1. Sell or donate button (big, on home).
2. What is it: category, title, short description.
3. Condition: Like new / Good / Used (with one-line meaning each).
4. Photo: take or choose one (optional). Compress to a small picture (about 400 px wide) stored inside the item record. Do NOT use Firebase Storage.
5. Sell or Donate. Sell shows: "We examine it at the stand and send you an offer within 1 to 2 days."
6. Choose the stand (default: own dorm, with distance) and a drop-off day.
7. Confirmation with a drop-off code. Status timeline appears in "My items".
8. "I've dropped it at the stand" button (in reality staff would scan the code; prototype lets the student press it). This sends the item to the manager queue and a phone alert (ntfy, section 8).
Statuses: Waiting for drop-off > At the stand, being examined > Offer ready > Accepted, paid / Declined, collect within 30 days / Rejected (broken or cannot be priced), collect within 30 days / Donated, thank you.
- Offer ready: price, Accept or Decline. Accept > bank screen (if no saved details) > "Payment on its way (demo)". Decline > "Collect it at <stand> by <date + 30 days>".
- No answer for 14 days: item counts as a donation; the app shows a thank-you letter in notifications. Show the deadline date on the offer.
- Rejected or declined and not collected within 30 days: "Your item was disposed of responsibly." Show the deadline date.
- Donate path: after drop-off, status goes straight to "Donated, thank you" with a thank-you letter and an impact line.

## 6. Price offer: manager or automatic
- A manager sets the price or rejects the item (with a reason) in Manager mode.
- If no manager acts within 10 minutes of "I've dropped it", the app makes an automatic standard offer from category x condition (table in the app's data file; offer about 20 % of the new price, resale about 50 % of the new price, in CZK; mark these as prototype assumptions). A manager can still change the price until the student accepts.

## 7. Buying (journey B)
Browse items available at the user's dorm stand first, then other stands (with distance). Search and filter by category, price, condition. Item card: photo, price in CZK, "Cleaned and checked" badge, condition badge, stand and distance, new-price comparison ("New: 799 CZK"). Item detail > heart / Reserve > checkout (fake card form, labelled DEMO, nothing charged) > pickup code + stand + opening hours + "held for 48 hours" with countdown. Orders list. Item sold or reserved by someone else meanwhile: friendly message and similar items.

## 8. Manager mode and phone alerts
- Manager logins: emails in an allowlist (Thang + up to 4 teammates; Thang fills the emails in later, keep them in one config line and in the security rules).
- Manager screens: queue of items to examine (photo, category, condition, stand, waiting time), Set price, Reject with reason, list of offers and their answers, totals (users, items submitted, waitlist sign-ups, visits and key taps).
- Phone alert: when a student presses "I've dropped it", the app sends a message to ntfy.sh on a long random topic name (one config line). Message has NO personal data: "New item to price: Kettle, Good, Thaler stand". Managers install the free ntfy app and subscribe to that topic.

## 9. Other screens
- Bank screen (payout details): fields (account holder, IBAN, bank name) that are saved to the account and shown again when she returns; "Prototype: use made-up details. No money moves." Buttons Transfer, Add card, Change bank are visible but only show a small "Demo only" message.
- Notifications inbox: offer ready, reservation expiring, thank-you letters, item rejected.
- Profile: name, dorm, language EN / CZ, bank details, my impact (items reused, kg kept out of the bin, estimate labelled as such), sign out.
- Waitlist: "Join the HelloDorm launch list" (email + dorm), saved in Firestore, for the demand test.
- Click counter: counts visits and taps on key buttons (Sell, Reserve, Join waitlist, Sign up) in Firestore; totals show in Manager mode. No personal data in counts.
- About / how it works, with a line "Prototype for a university course. Stands and payments are simulated."

## 10. Look and feel
Feels like Too Good To Go: friendly, green, rounded corners, environmentally friendly. Follow design-brief.md (palette with checked contrast, font, icons, photo sources). Mobile first (390 px wide) and equally good on a laptop (1280 px: wider grid, side navigation). Bottom tab bar on phone: Home, Sell, My items, Saved, Profile. Every icon has a word. Text contrast at least 4.5 : 1. Item pictures: free photos with a credit line (see design-brief.md) or none, never brand logos.

## 11. Language
English and Czech switch, remembered in the account. ALL texts in one file (texts.js) with English and Czech side by side, so a Czech teammate can check the Czech. Czech marked "(beta)" until checked.

## 12. Sample content
About 30 items across 6 categories (kitchen, bedding and textiles, lamps and electronics, small furniture, clothes, study supplies), spread over the dorm stands, prices in CZK, realistic Prague student items. No real people's names, no real phone numbers, no brand logos.

## 13. Boundaries and failure cases
Reservation held 48 h then released. Offer answer window 14 days then donation. Collection window 30 days then disposal. Box/stand full: suggest the next nearest stand. No items at a dorm: show nearest stand with items. Offline: show a clear "No connection" note; nothing is lost. Firebase limit reached: friendly message, the rest of the app still browses sample items.

## 14. Brief minimums this must meet
At least 10 distinct screens (each at least 80 % different), at least 10 meaningful interactions, at least 3 key features shown: (1) sell or donate in 2 minutes with live offer tracking, (2) buy cleaned items at your own dorm stand, (3) your account remembers everything across phone and laptop. Two links (v1 now, v2 after testing), both online without login until 31/01/2027.
