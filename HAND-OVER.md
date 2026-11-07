# HAND-OVER 2026-11-07

## Where the work lives
- Repository daklod48/hellodorm. `main` = 14713c5 (PR #2 merged 2026-11-07, on top of PR #1 merge 6b2ab8d). Working branch `claude/festive-maxwell-hf0eh2`, restarted from main after the merge.
- Live: https://daklod48.github.io/hellodorm/ (top level `index.html` forwards to `v2/`); v1 frozen at `/hellodorm/v1/`.
- App: `v2/`. Docs: `HOW-IT-WORKS.md` sections 10 to 15, `AI-LOG.md`, `README.md`. Lab: `LAB/` (`RUBRIC.md`, `RUNS.md`, `runs.json`, `tracker.html`, `capture.py`, `captures/run-00..02`).
- Checks: `tools/` (scan-dashes, scan-emails, check-contrast, check-taps, check-readable; `browser.py`; stand-in database `tools/fake-firebase/`).
- Local only: tags `lab-run-00..02` (tag push refused, HTTP 403); branches `lab-run-01` (81146d0) and `lab-run-02` (6c52014) with the reverted candidates.

## Steps done this session (dated, one line each, measured results)
- 2026-11-05 v2 created as an exact copy of v1; v1 0 lines changed since.
- 2026-11-05 Text floor 12 px (top bar words were 9.3 px, badges 11.2 px); field outlines 3.9:1 (were 2.0:1).
- 2026-11-05 Item card row 440 to 397 px; sticky item action bar ("Reserve now" was 1.19 screens down, now visible); 0 px sideways overflow at 320 and 390 px, EN and CZ.
- 2026-11-05 Stand map at screen scale on phones: pin numbers about 5 px to 12 px.
- 2026-11-05 New checks: check-readable (v2 0, v1 111), scan-emails (0); stand-in Firebase for no-write test runs.
- 2026-11-05 Round 3 (professor): link lands on Home; dorm first (filter, card label, not your dorm warning, 3-step checkout, pickup confirm before pay, dorm on code); About us, feedback form, alerts, invites, dorm board; top level index.html. PR #1 merged; Pages deploy success.
- 2026-11-05 Round 4: Home account choices (Sign in, Sign up, Try the demo account); account asked only at checkout, alerts, selling; "Demo account" naming; guest cart, hearts, dorm carried over; Stripe Payment Link (placeholder) or Demo pay; success screen with code and letter.
- 2026-11-05 Lab: run 0 59/80; run 1 57 reverted; run 2 58 reverted; stop rule reached.
- 2026-11-05 Security fix 1: email_verified required (replaced on 2026-11-06).
- 2026-11-06 Managers by Firebase user ID (placeholder); listed UID opens Manager mode, other accounts go to Home.
- 2026-11-07 Owner's UID in `firestore.rules` and `v2/config.js`; checks with HD_FAKE=1: dashes 0, emails 0, contrast 0, taps 0, readable 0; commit 2e3a4ad; PR #2 merged (14713c5); Pages deploy for 14713c5 success (18:46 UTC).

## Decisions taken (owner or session)
- Owner: v1 untouched; work in v2; no em dashes, no emojis, no dashes in visible text, no real emails in config files.
- Owner: link lands on Home with no login; accounts with the demo next to every sign in prompt; card data only on Stripe's page plus Demo pay.
- Owner: managers by Firebase user ID; the owner is the only manager; no email address in public files.
- Owner: the laptop session publishes `firestore.rules`; this session does not touch the Firebase console.
- Session: Stripe Payment Link without a server (fixed test amount, return trusted); a real launch needs a small server and webhook.
- Session: stand spot shown as "main entrance (planned location)"; `spot` field available in `v2/data/dorms.js`.
- Session: test runs use the stand-in database so the demand counters stay clean.
- Session: Lab captures kept identical across runs despite the lazy photo artifact.

## Where it stopped
- Round 4 merged into main and live (Pages deploy success). The new `firestore.rules` (owner's UID) is in the repository but not yet published in the Firebase console, so the live database still runs the old rules until the laptop session publishes them.

## Next
- Laptop session: publish `firestore.rules`, then test Manager mode with the owner's account on the live v2.
- Lab option a: Stripe link in, capture scrolls before full page shots, re-score the baseline with 3 scorers averaged; then retry run 2's calmer Home and run 1's QR pickup pass.

## Owner steps (exact place and value)
- Firebase console, project hellodorm, Build, Firestore Database, Rules: replace all text with `firestore.rules` from `main`, Publish. Test in Rules Playground: get `/waitlist/test` as an authenticated user with a random UID = denied, with the owner's UID = allowed.
- Google Cloud Console, APIs and Services, Credentials, key starting `AIzaSyDgKu`: Application restrictions Websites `https://daklod48.github.io/*` (plus `http://localhost:8080/*` for laptop tests); API restrictions: Identity Toolkit API, Token Service API, Cloud Firestore API; Save.
- Stripe dashboard (test mode), Payment Links, New: product `HelloDorm test order`, 100 CZK one time; After payment: redirect to `https://daklod48.github.io/hellodorm/v2/?paid=1`; put the `https://buy.stripe.com/test_...` link into `v2/config.js` `STRIPE_PAYMENT_LINK`.
- To add a manager later: the person signs up in v2; Firebase console, Build, Authentication, Users, copy User UID; add it to `isManager()` in `firestore.rules` and `MANAGER_UIDS` in `v2/config.js`; publish the rules.
- Optional: allow `daklod48.github.io` in this environment's network settings so a session can check the live link.
- Replace feedback questions (`v2/texts.js` fb_q1 to fb_q5) and story text (story_p1 to story_p3) if they differ; Czech check by a Czech teammate.

## Lessons (what went wrong -> why -> fix)
- Card saving claimed 490 to 385 px -> estimated from a scaled screenshot -> measure in the browser first (real: 440 to 397).
- "Rezervo-vat" appeared -> CSS hyphens: auto adds dashes -> removed; scan-dashes fails on it.
- Czech "e-mail" broke the no dash rule -> new strings not matched to existing spelling -> "email"; scan after every text change.
- Demo from the reserve dialog returned to the item -> app continued before Firebase announced the sign in -> set signed in state when the demo starts.
- Tap check failed 1 in 3 runs -> measured during animations -> 46 px buttons, re-measure at rest.
- Empty feedback submit showed no message -> browser required check blocked the handler -> novalidate plus own message.
- Committed before reading a failing check -> chained commands -> read every result, then commit.
- Lab run 1 lowered clarity -> items first hid Sell or donate -> remove blocks, do not reorder main tasks.
- Lab scores moved within scorer noise -> one scorer per run -> average 3 scorers.
- Full page captures showed empty photo tiles -> lazy loading not triggered -> scroll before capture (new baseline needed).
- Rules trusted any sign in email -> email allowlist alone -> managers by UID.
- Verified email forced real inboxes into public files -> identity chosen before the publishing constraint was weighed -> UID list.
- Placeholder replaced by the real UID would have broken the test manager -> test helper replaced the placeholder text -> helper now adds the test UID to the list.

## New terms explained
- Non-text contrast (WCAG 1.4.11): outlines and icons people must find need 3:1 against their surroundings.
- Reflow (WCAG 1.4.10): page works at 320 px wide without sideways scrolling.
- Sticky: a box that scrolls until it reaches a screen edge, then stays there.
- Lazy loading: images load only when scrolled near, to keep the page fast.
- Stand-in database: test-only imitation of Firebase in the test browser; nothing reaches the real database.
- Redirect: a page that sends the browser on to another address at once.
- Payment Link: a ready made payment page hosted by Stripe.
- Webhook: a message a service (Stripe) sends to your server when something happens.
- Network effect: each extra user makes the service more useful for the others.
- Social proof: people join more readily when they see others taking part.
- QR code: square barcode a phone camera reads.
- UID (Firebase user ID): the random account number Firebase gives each account; cannot be claimed by signing up.
- Publishing rules: security rules take effect on the live database only when pasted and published in the Firebase console, not when committed.
- Independent scorer: a fresh AI agent that sees only the rubric, captures and metrics.

## Files changed
- New this session: `v2/` (all files), `index.html`, `LAB/*`, `STATUS.md`, `HAND-OVER.md`, `tools/browser.py`, `tools/check-readable.py`, `tools/scan-emails.py`, `tools/fake-firebase/*`.
- Changed: `firestore.rules`, `HOW-IT-WORKS.md`, `AI-LOG.md`, `README.md`, `DESIGN-NOTES.md`, `.gitignore`, `tools/build-critical.py`, `tools/scan-dashes.py`, `tools/check-contrast.py`, `tools/check-taps.py`.
- Last turn (2026-11-07): `firestore.rules`, `v2/config.js`, `tools/browser.py`, `HOW-IT-WORKS.md`, `README.md`, `STATUS.md`, `HAND-OVER.md`.
- Unchanged: `v1/`.

## Privacy check (names, accounts, task ids, secrets)
- Names: NONE.
- Accounts: one Firebase UID (the owner's manager account) in `firestore.rules` and `v2/config.js`, placed there by the owner's decision; it is an account number, not an email. No email address of a real person in the repository.
- Task ids: NONE.
- Secrets: NONE. The Firebase web apiKey in `v2/config.js` is public configuration by design; restriction steps above.
