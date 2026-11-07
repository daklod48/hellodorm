# HelloDorm Improvement Lab: run log

Procedure: `MACHINE.md` (Improvement Lab v1, 2026-11-05). Rubric: `RUBRIC.md` (frozen). Captures: `captures/run-NN/`. Tracker: open `tracker.html` by double-click.
Network note: from the build machine every outside site was blocked on 5 November 2026 (21st.dev, Mobbin, Dribbble, Behance, Awwwards, Land-book, Stripe, GitHub Pages), so reference scouting uses the sites the team studied in Chrome on 20 October 2026 (`DESIGN-NOTES.md`), not reopened.

## Run 0: baseline (2026-11-05)
- State: v2 after round 4 (Home account choices with the demo account, Stripe test card or Demo pay, success screen with thank you letter).
- Scores (independent scorer): beauty 7, clarity 6, flow 8, trust 8, mobile 7, speed 8, accessibility 8, delight 7. **Total 59 / 80.**
- Measured: ready in 0.403 s (median of 3, local, stand-in database); code 367 KB; checks: contrast 0, taps 0, readable 0, dashes 0 failures; click-through reached checkout and the success screen at 390 and 1440 px; 0 page errors.
- Scorer's top 3 flaws: (1) Home first view has too many competing actions and no items above the phone fold; (2) checkout shows internal team text on the disabled card option and the Pay button sits below the fold; (3) some items have no photo, Home is long, laptop About is half credits.
- Tools: Playwright with headless Chromium, the stand-in database in `tools/fake-firebase/`, an independent scorer subagent.

## Run 1: reverted (2026-11-05)
- References (studied 20 Oct 2026 in Chrome, not reopened: blocked by the build machine's network): Too Good To Go https://www.toogoodtogo.com/en-gb (nearby offers first), Vinted https://www.vinted.co.uk/ (feed first, search on top), Olio https://olioapp.com/en/ (near you first).
- Diagnosed (weakest in run 0): clarity 6, beauty 7, mobile 7.
- Ideas: (1) items first on Home as a phone strip; (2) phone pay bar and user facing card wording; (3) innovation: Pickup pass with a QR code. All three built.
- Scores: beauty 7, clarity 6, flow 7, trust 8, mobile 7, speed 8, accessibility 7, delight 7. **Total 57 / 80 (run 0: 59).**
- Size: 421 KB (+14.9 %, mostly the QR library, loaded only on pass screens). Ready 0.319 s. Checks all 0; flow complete; 0 page errors.
- Verdict: **reverted**, because the total fell (flow and accessibility each dropped 1). The scorer's reading: putting items first pushed Sell or donate below the carousel on phones, so one main task got hidden; the phone top bar cuts titles; the pinned pay bar covers the payment choice. Candidate kept on local branch `lab-run-01` (commit 81146d0), not published.
- Lesson for run 2: keep both main tasks above the fold; remove blocks instead of reordering them; give the phone top bar room.
- Tools: Playwright with headless Chromium, stand-in database, npm registry, independent scorer subagent.

## Run 2: reverted (2026-11-05)
- References (studied 20 Oct 2026, not reopened: blocked): Too Good To Go https://www.toogoodtogo.com/en-gb (impact as a concrete number), Ecosia https://www.ecosia.org/ (one community impact counter), Olio https://olioapp.com/en/ (neighbourhood framing).
- Diagnosed: clarity 6, beauty 7, mobile 7, plus run 1's lesson (keep both main tasks above the fold; remove blocks rather than reorder; room in the phone top bar).
- Built: calmer Home (account row in the header, both tasks side by side, How it works and link cards merged away, duplicate dorm box removed); phone top bar gives the title room on inner pages; innovation "kept out of the bin" (kg per item, Dorm board ranked by kg with a total, labelled estimates).
- Scores: beauty 7, clarity 7, flow 7, trust 7, mobile 7, speed 8, accessibility 8, delight 7. **Total 58 / 80 (baseline 59).**
- Size: 370 KB (+0.8 %). Ready 0.327 s. Checks all 0; flow complete; 0 page errors.
- Verdict: **reverted** (total below the baseline). Candidate on local branch `lab-run-02` (commit 6c52014), not published.

## Stop rule reached after run 2
Two runs in a row gained less than 2 points in total (run 1: minus 2, run 2: minus 1). Following the procedure, the recommendation is a different direction instead of more polish:
1. **The two flaws every scorer named are not design polish.** (a) "Pay by card: not set up yet" at checkout: fixed for good by adding the Stripe test link (HOW-IT-WORKS.md section 13). (b) Empty photo tiles: a measurement artifact; the capture should scroll the page before full-page shots so lazy photos load. Fixing the capture changes the measurement, so run 0 must then be re-captured and re-scored as a new baseline.
2. **Scorer noise is about the size of the changes.** Each run used one fresh scorer; differences of 1 to 2 points are within what two scorers would disagree on. Scoring each run with 3 independent scorers and using the average would make keep or revert decisions reliable.
3. Run 2's gains (clarity 6 to 7 from a calmer Home) and the QR Pickup pass from run 1 are worth trying again once 1 and 2 are done; both candidates are kept on local branches.
