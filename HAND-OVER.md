# HAND-OVER 2026-11-06

## Where the work lives
- Repository daklod48/hellodorm, branch `claude/festive-maxwell-hf0eh2` (all work pushed). `main` = PR #1 merge 6b2ab8d (2026-11-05).
- Open PR: https://github.com/daklod48/hellodorm/pull/2 (round 4, security fix, Lab). Not merged.
- Live: https://daklod48.github.io/hellodorm/ (top level `index.html` forwards to `v2/`); v1 frozen at `/hellodorm/v1/`.
- App: `v2/` (copy of v1, all changes). Docs: `HOW-IT-WORKS.md` sections 10 to 15, `AI-LOG.md`, `README.md`. Lab: `LAB/` (`RUBRIC.md`, `RUNS.md`, `runs.json`, `tracker.html`, `capture.py`, `captures/run-00..02`).
- Checks: `tools/` (scan-dashes, scan-emails, check-contrast, check-taps, check-readable; `browser.py`; stand-in database `tools/fake-firebase/`).
- Local only (not on GitHub): tags `lab-run-00..02` (tag push refused, HTTP 403); branches `lab-run-01` (81146d0), `lab-run-02` (6c52014) with the reverted candidates.

## Steps done this session (dated, one line each, measured results)
- 2026-11-05 v2 created as an exact copy of v1; v1 0 lines changed since.
- 2026-11-05 Text floor 12 px (top bar words were 9.3 px, badges 11.2 px); field outlines 3.9:1 (were 2.0:1).
- 2026-11-05 Item card compacted: row of two 440 to 397 px; sticky item action bar ("Reserve now" was 1.19 screens down, now visible); 0 px sideways overflow at 320 and 390 px, EN and CZ.
- 2026-11-05 Stand map drawn at screen scale on phones: pin numbers about 5 px to 12 px.
- 2026-11-05 New checks: check-readable (v2 0, v1 111), scan-emails (0); fake Firebase for no-write test runs.
- 2026-11-05 PR #1 opened; then round 3 (professor): link lands on Home; dorm first (filter, card label, not your dorm warning, 3-step checkout with pickup confirm before pay, dorm on code); About us, feedback form (stats counters + ntfy), alerts, invites, dorm board; top level index.html.
- 2026-11-05 PR #1 merged with owner permission; Pages deploy success for 6b2ab8d; local copy of main under /hellodorm/ passed the logged-out flow with the real Firebase SDK, 0 page errors.
- 2026-11-05 Round 4: Home account choices (Sign in, Sign up, Try the demo account); account asked only at checkout, alerts, selling; demo continues to checkout; "Demo account" naming; guest cart, hearts, dorm carried into sign up, sign in, demo; Stripe Payment Link (placeholder) or Demo pay; success screen with code and letter; checks 0.
- 2026-11-05 Lab: run 0 59/80; run 1 57 reverted; run 2 58 reverted; stop rule reached; tracker built.
- 2026-11-05 Security fix: `isManager()` requires `email_verified == true`; app shows Manager mode only to listed and verified emails; verify buttons in Profile; checks 0.
- 2026-11-06 STATUS.md and HAND-OVER.md written.

## Decisions taken (owner or session)
- Owner: v1 stays untouched; work in v2; no em dashes, no emojis, no dashes in visible text, no real emails in config files.
- Owner: link must land on Home with no login (professor); merge permission given for round 3 and for kept Lab runs only.
- Owner: accounts with demo next to every sign in prompt; card data only on Stripe's page; Demo pay path.
- Owner: managers need verified email; publish rules and restrict API key are owner console steps.
- Session: guest checkout on device in round 3, replaced by demo account in round 4.
- Session: Stripe Payment Link without a server (fixed test amount, return trusted); a real launch needs a small server and webhook.
- Session: stand spot shown as "main entrance (planned location)"; no invented rooms; `spot` field available in `v2/data/dorms.js`.
- Session: test runs use the stand-in database so the demand counters stay clean.
- Session: Lab captures kept identical across runs for comparability, despite the lazy photo artifact.
- Session: PR #2 not merged (no kept Lab run).

## Where it stopped
- PR #2 open with round 4, the security fix and Lab logs. New rules not yet published in the Firebase console. Live site = round 3.

## Next
- Owner decides on PR #2 and on manager identity (real inboxes vs Firebase user IDs; user IDs recommended).
- Lab option a: Stripe link in, capture scrolls before full page shots, re-score baseline with 3 scorers averaged.
- Then retry run 2's calmer Home and run 1's QR pickup pass.

## Owner steps (exact place and value)
- Firebase console, project hellodorm, Build, Firestore Database, Rules: replace all text with `firestore.rules` from the repo, Publish. First verify each real manager email in v2 Profile. Test in Rules Playground: unverified manager get `/waitlist/test` = denied.
- Google Cloud Console, APIs and Services, Credentials, key starting `AIzaSyDgKu`: Application restrictions Websites `https://daklod48.github.io/*` (plus `http://localhost:8080/*` for laptop tests); API restrictions: Identity Toolkit API, Token Service API, Cloud Firestore API; Save.
- Stripe dashboard (test mode), Payment Links, New: product `HelloDorm test order`, 100 CZK one time; After payment: redirect to `https://daklod48.github.io/hellodorm/v2/?paid=1`; copy the `https://buy.stripe.com/test_...` link into `v2/config.js` `STRIPE_PAYMENT_LINK`.
- Optional: allow `daklod48.github.io` in this environment's network settings so the live link can be checked from a session.
- Replace feedback questions (`v2/texts.js` fb_q1 to fb_q5) and story text (story_p1 to story_p3) if they differ; Czech check by a Czech teammate.

## Lessons (what went wrong -> why -> fix)
- Card saving claimed 490 to 385 px -> estimated from a scaled screenshot -> measure in the browser before writing a number (real: 440 to 397).
- "Rezervo-vat" appeared -> CSS hyphens: auto adds dashes -> removed; scan-dashes fails on it.
- Czech "e-mail" broke the no dash rule -> new strings not matched to existing spelling -> use "email"; run scan-dashes after every text change.
- Demo from the reserve dialog returned to the item -> app continued before Firebase announced the sign in -> set signed in state when the demo starts.
- Tap check failed 1 in 3 runs -> measured during animations -> 46 px buttons, re-measure at rest.
- Empty feedback submit showed no message -> browser required check blocked the handler -> novalidate plus own message.
- Committed and pushed before reading a failing check -> chained commands -> check results first, then commit.
- Lab run 1 lowered clarity -> items first hid Sell or donate -> remove blocks, do not reorder main tasks.
- Lab scores moved within scorer noise -> one scorer per run -> average 3 scorers.
- Full page captures showed empty photo tiles -> lazy loading not triggered -> scroll before capture (needs a new baseline).
- Tag push refused -> session may push only the working branch -> record commit hashes in the run log.
- Rules trusted unverified emails (since 2026-10-20) -> email allowlist alone -> email_verified required.

## New terms explained
- Non-text contrast (WCAG 1.4.11): outlines and icons people must find need 3:1 against their surroundings.
- Reflow (WCAG 1.4.10): page works at 320 px wide without sideways scrolling.
- Sticky: a box that scrolls until it reaches a screen edge, then stays there.
- Lazy loading: images load only when scrolled near, to keep the page fast.
- Stand-in database: test-only imitation of Firebase in the test browser; nothing reaches the real database.
- Redirect: a page that sends the browser on to another address at once.
- Payment Link: a ready made payment page hosted by Stripe.
- Webhook: a message a service (Stripe) sends to your server when something happens (a payment succeeds).
- Network effect: each extra user makes the service more useful for the others.
- Social proof: people join more readily when they see others taking part.
- QR code: square barcode a phone camera reads.
- email_verified: Firebase flag that turns true after the person clicks the link sent to their inbox.
- Independent scorer: a fresh AI agent that sees only the rubric, captures and metrics.

## Files changed
- New: `v2/` (all files), `index.html`, `LAB/*`, `STATUS.md`, `HAND-OVER.md`, `tools/browser.py`, `tools/check-readable.py`, `tools/scan-emails.py`, `tools/fake-firebase/*`, `v2/vendor-qrcode.mjs` only on local branch lab-run-01.
- Changed: `firestore.rules`, `HOW-IT-WORKS.md`, `AI-LOG.md`, `README.md`, `DESIGN-NOTES.md`, `.gitignore`, `tools/build-critical.py`, `tools/scan-dashes.py`, `tools/check-contrast.py`, `tools/check-taps.py`.
- Unchanged: `v1/`.

## Privacy check (names, accounts, task ids, secrets)
- Names: NONE in these two files.
- Accounts: NONE (only placeholder addresses on reserved domains in config; no real inboxes).
- Task ids: NONE.
- Secrets: NONE. The Firebase web apiKey in `v2/config.js` is public configuration by design, not a secret; restriction steps above.
