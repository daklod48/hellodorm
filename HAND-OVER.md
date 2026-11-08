# HAND-OVER 2026-11-08

## Where the work lives
- Repository daklod48/hellodorm. `main` = 59a4464 (merge of PR #6, round 7, 8 Nov 2026). Working branch `claude/kind-fermi-hegw88` (this note and STATUS.md on top of main).
- Merged pull requests this session: #3 round 5 (7 Nov), #4 round 6 (8 Nov), #5 round 6 text fixes (8 Nov), #6 round 7 (8 Nov). No pull request open.
- Live links: main https://daklod48.github.io/hellodorm/ (forwards to v3 since round 7, keeps `?dorm=` invites and `#/screen`); v3 https://daklod48.github.io/hellodorm/v3/ ; v2 https://daklod48.github.io/hellodorm/v2/ (frozen); v1 https://daklod48.github.io/hellodorm/v1/ (frozen).
- App: `v3/` (all round 5 to 7 work). Rules: `firestore.rules` (published by the laptop chat 8 Nov 5:24 PM, round 6 version; round 7 did not change it).
- Docs: `HOW-IT-WORKS.md` sections 16 (round 5), 17 (round 6), 18 (round 7); `AI-LOG.md`; `README.md`; `STATUS.md`.
- Tests and checks (`tools/`): `test-round5.py` (52 checks incl. the professor flow), `test-round6.py` (39), `test-round7.py` (23), `check-v3-states.py` (every screen and state, EN and CZ, 320, 390, 1280 px), `rules-test/rules.test.mjs` (31 rule checks in the Firestore emulator), plus the older scan-dashes, scan-emails, check-contrast, check-taps, check-readable. Results: `review/round5/`, `review/round6/`, `review/round7/` (`results.md`); professor flow screenshots `review/round5/prof-*.png` (6 at 390 px, 6 at 1280 px).

## Steps done this session (dated, one line each, measured results)
- 2026-11-07 Round 5, v3 made from v2: word search with accents and hyphens ignored, bilingual keywords, ranking, Closest matches; "lamp desk", "rychlovarna konvice", "konvice", "kettle" all find the item.
- 2026-11-07 Real street map (Leaflet 1.9.4 copied from npm, OpenStreetMap tiles), loaded only on Stands or a pickup box tap (0 map requests on Home); walking route via FOSSGIS OSRM, live Thalerova to Strahov 7.9 km, 105 min; drawn map fallback.
- 2026-11-07 Best stand card in Cart, one tap Swap for sold items, Open now badges in Prague time, photo label card (0 overlaps at 320, 390, 1280 px).
- 2026-11-07 Professor flow: welcome scene once per account (welcomed in Firestore), Welcome back card with counts since lastSeenAt, demo strip with Reset demo, Sign out in one place with a confirm; test-round5 52 of 52.
- 2026-11-07 Speed: font files were downloaded up to 5 times each (variable fonts listed under 5 names); fixed, Home fonts 435 KB to 168 KB; Lighthouse mobile Home v3 86 and 80 against v2 78 and 78 (both with the stand-in Firebase).
- 2026-11-07 Fresh eyes reviewer (screenshots only): 41 then 42 of 60 after one fix round (pin grouping, burst behind text, hold until the stand opens).
- 2026-11-08 Round 6: demo card payment page (any made up card, keeps name, expiry, last 4 digits), Stripe path removed; Pip cheer pose with two flippers merged; accepted sales and donations appear in Browse at once (manager sale price or the rules' price table); every stand on Sell; Other dorm via Nominatim, map pin or name; payout screens; all credits in About us; profile photo (WebP up to 50 KB); leaderboard of kg; test-round6 39 of 39; rules 31 of 31 in the emulator.
- 2026-11-08 Round 6 text fixes: real dorm and area names in About credits; checkout card line matches the card page; 5 unused Stripe texts removed.
- 2026-11-08 Round 7: stands open 24 hours, Thalerova closed 01:00 to 03:00, Strahov 05:00 to 06:00 (Prague time); hold runs on past a closed period; Sell offers today and 6 days; main link forwards to v3; test-round7 23 of 23; all other checks 0.
- 2026-11-08 Owner checked live: map tiles, Thalerova stand, leaderboard, card page, payout screens, Pip, 0 console errors; main link opens v3 as a guest.

## Decisions taken (owner or session)
- Owner: v1 and v2 frozen; work only in v3; publish v3 on 8 Nov ("the app is good, I will send my friends the links").
- Owner: card payment is a fake page inside the app; no Stripe. Save only name, expiry and last 4 digits.
- Owner: accepted items go on sale the moment they are accepted or donated; only a manager sets prices; photos stored in Firestore as WebP (150 KB items, 50 KB avatars), not Firebase Storage.
- Owner: all credits in About us; only the OpenStreetMap credit stays on the map (OSM attribution guidelines).
- Owner: leaderboard counts both sides of a deal; demo and anonymous accounts never shown; "Show me" on by default.
- Owner: stand hours 24/7 except Thalerova 01:00 to 03:00 and Strahov 05:00 to 06:00.
- Session: the seller's own app publishes a listing; rules check its price against the manager's `salePrices` or a price table written into the rules, so no one sets their own price.
- Session: demo account listings are private to that demo copy (`demo: true`), so testers do not fill the real shop.
- Session: Manager mode, Stands and the round 6 screens load only when opened, to keep Home fast.
- Session: Other dorm counts as an "Ask for a stand" waitlist entry.

## Where it stopped
- Everything merged and live; main link opens v3. No open pull request. Firestore rules published (round 6 version, still current).

## Next
- Hand in Tue 10 Nov 2026 23:59; the class gets https://daklod48.github.io/hellodorm/
- Open points from the fresh eyes rescore (HOW-IT-WORKS 16): sticky Reserve bar covers the edge of a button on phones; narrow Swap panel on phones; "your dorm" and "Your dorm" written two ways; phone tab bar highlights nothing on Cart.
- A layout shift of 0.077 to 0.161 when the splash is replaced by Home (same in v2).
- If the leaderboard matters: compute kg on a server (Cloud Function, paid plan) so nobody can type their own numbers.

## Owner steps (exact place and value)
- Stripe: no longer used by v3. Nothing to set up; the old round 4 Stripe instructions (HOW-IT-WORKS 13) apply only to v2.
- Czech texts: a Czech teammate should read `v3/texts.js` (cs values, especially the round 5 to 7 keys at the end of the file, e.g. `lb_count`, `od_*`, `av_*`, `hours_*`) and correct grammar; Czech is still marked beta.
- Feedback questions: replace `fb_q1` to `fb_q5` in `v3/texts.js` with the real form's questions if they differ; story text `story_p1` to `story_p3` in your own words.
- ntfy: managers install the free ntfy app and subscribe to the topic in `v3/config.js` (`NTFY_TOPIC`); change the topic name if strangers post to it (it is visible in public code).
- Live checks not possible from the build machine: try the Other dorm search once (Nominatim) and click through the About us credit links once (their hosts were blocked here).
- API key restriction (Google Cloud Console, key starting `AIzaSyDgKu`, websites `https://daklod48.github.io/*`): still recommended if not done (HOW-IT-WORKS 15).
- If prices in `v3/data/prices.js` ever change, change `resaleTable()` in `firestore.rules` the same way and publish the rules.

## Lessons (what went wrong -> why -> fix)
- Welcome scene covered by the dorm pop-up -> Firebase announced the new account after sign up had finished -> recognise the late announcement once and open nothing over the scene.
- Leaflet buttons stayed 24 to 30 px -> Leaflet's style sheet loads after ours and won the tie -> stronger selectors for its controls.
- v3 Home first measured slower than v2 -> the same font file downloaded 5 times (since 20 Oct), not the new code -> measure the network list before cutting features; one rule per variable font.
- Preloading app.js made the first paint worse -> extra downloads competed with fonts -> removed; measure each speed change.
- Two background test runs wrote to the same log -> I started a run before the previous one ended -> one run at a time, check the process list first.
- Test scripts failed on their own mistakes four times (object instead of text, credit read after leaving the map, stand outside the first 6, countdown read a second late) -> tests written fast -> read every failure before blaming the app; the app was right each time.
- Map pins and names overlapped at city zoom -> 16 stands, 4 within 1 km -> group pins closer than 64 px and show names from zoom 13.
- A demo hold ended 5 hours before the stand opened -> the demo order counted from 10 hours earlier -> hold computed from the real time, then extended past closed periods.
- "Pay by card" showed "Not set up yet" for 3 days -> it depended on a Stripe link nobody added -> a self contained demo page.
- Pip cheer had three front flippers for 3 weeks -> AI image not checked by eye -> check every generated picture against a short list (limbs, text, hands).
- Credit labels showed raw ids ("Dorm photo jarov") -> labels built from data keys -> map keys to real names and scan the rendered page.
- Old weekday stand hours were a Claude Code invention from 20 Oct -> nobody asked the owner -> ask for business rules instead of inventing them.
- `git push -f` was refused -> not needed when main already contains the old branch tip -> check `merge-base --is-ancestor` and push normally.

## New terms explained
- Normalise (search): make texts comparable: small letters, no accents, hyphens as spaces.
- Leaflet: a free map program for web pages; tiles: the small square pictures a street map is made of.
- OSRM (FOSSGIS): a free route service run by the German OpenStreetMap association.
- Nominatim: OpenStreetMap's free place search; at most 1 request a second, never while typing.
- Lazy loading (code): a file is fetched only when the screen that needs it opens.
- Variable font: one font file that holds every weight (regular to extra bold).
- WebP: a picture format about a third smaller than JPEG.
- Firestore emulator: Google's local copy of the database for testing rules; nothing reaches the real one.
- Reduced motion: a phone setting asking apps not to animate; the welcome scene then shows a still card.
- Prague time (Europe/Prague): the stand hours follow Prague clocks, whatever time zone the device uses.
- Listing: an item put on sale again in the shop after a student sold or donated it.
- Fresh eyes reviewer: a separate AI that sees only screenshots and the owner's bars, never the code.

## Files changed (rounds 5 to 7)
- New: `v3/` (copy of v2 plus `search.js`, `map.js`, `stands.js`, `manager.js`, `fireworks.js`, `round6.js`, `vendor/leaflet/`), `tools/test-round5.py`, `tools/test-round6.py`, `tools/test-round7.py`, `tools/check-v3-states.py`, `tools/capture-round5.py`, `tools/rules-test/`, `review/round5/`, `review/round6/`, `review/round7/`.
- Changed: `index.html` (forwards to v3), `firestore.rules`, `tools/browser.py`, `HOW-IT-WORKS.md`, `AI-LOG.md`, `README.md`, `STATUS.md`, `HAND-OVER.md`, `.gitignore`.
- Unchanged: `v1/`, `v2/`.

## Privacy check (names, accounts, task ids, secrets)
- Names: NONE of real people (test accounts are made up, e.g. "Jana Novakova" on tester-...@hellodorm-demo.test, reserved test domain).
- Accounts: NONE real; the manager is listed by Firebase user ID only.
- Task ids: NONE.
- Secrets: NONE. The Firebase web apiKey in `v3/config.js` is public configuration by design.
