# HelloDorm Improvement Lab: run log

Procedure: `MACHINE.md` (Improvement Lab v1, 2026-11-05). Rubric: `RUBRIC.md` (frozen). Captures: `captures/run-NN/`. Tracker: open `tracker.html` by double-click.
Network note: from the build machine every outside site was blocked on 5 November 2026 (21st.dev, Mobbin, Dribbble, Behance, Awwwards, Land-book, Stripe, GitHub Pages), so reference scouting uses the sites the team studied in Chrome on 20 October 2026 (`DESIGN-NOTES.md`), not reopened.

## Run 0: baseline (2026-11-05)
- State: v2 after round 4 (Home account choices with the demo account, Stripe test card or Demo pay, success screen with thank you letter).
- Scores (independent scorer): beauty 7, clarity 6, flow 8, trust 8, mobile 7, speed 8, accessibility 8, delight 7. **Total 59 / 80.**
- Measured: ready in 0.403 s (median of 3, local, stand-in database); code 367 KB; checks: contrast 0, taps 0, readable 0, dashes 0 failures; click-through reached checkout and the success screen at 390 and 1440 px; 0 page errors.
- Scorer's top 3 flaws: (1) Home first view has too many competing actions and no items above the phone fold; (2) checkout shows internal team text on the disabled card option and the Pay button sits below the fold; (3) some items have no photo, Home is long, laptop About is half credits.
- Tools: Playwright with headless Chromium, the stand-in database in `tools/fake-firebase/`, an independent scorer subagent.
