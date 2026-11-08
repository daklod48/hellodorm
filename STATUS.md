# STATUS (rewritten at the end of every turn)
- State: round 6 built in v3 (demo card page, Pip cheer fix, accepted items in Browse, all stands and Other dorm, payout screens, credits in About, profile photo, leaderboard); all checks 0; test-round6 39 of 39; professor flow (test-round5) 52 of 52; v1 and v2 unchanged.
- Branch: claude/kind-fermi-hegw88 (restarted from main 449442a after PR #3 merged). Last commit before this file update: b8feb18.
- PR: https://github.com/daklod48/hellodorm/pull/4, open, not merged. (PR #3, round 5, merged 7 Nov.)
- Live link: https://daklod48.github.io/hellodorm/ (top level still forwards to v2). v3: https://daklod48.github.io/hellodorm/v3/ (round 5 live; round 6 after merging PR #4).
- Rules: firestore.rules changed (salePrices, listings replaced, leaderboard, lbHide); 31 emulator checks pass (tools/rules-test).
- Next: owner reviews and merges PR #4; laptop chat publishes firestore.rules; tries the live Nominatim search once on the Other dorm dialog; says "publish v3" when ready.
- Owner steps: after the merge, Firebase console, Build, Firestore Database, Rules: paste the whole firestore.rules, Publish (until then new listings, leaderboard and sale prices are refused and the app falls back quietly).
- Deadline: hand in Tue 10 Nov 2026 23:59.
- Date: 2026-11-08.
