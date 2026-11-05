# AI log: misunderstandings corrected

For the assignment's AI statement. One line per correction: date | what the AI (Claude Code) assumed or did | what the owner said was right.

| Date | What Claude Code assumed or did | What was right |
|---|---|---|
| 2026-10-20 | First build: the 12 assumptions A1 to A12 listed before coding were all confirmed as stated. | No correction. |
| 2026-10-20 | Welcome screen led with "Try as guest" and "Demo account", with Sign in and Sign up below. | Order must be Sign in and Sign up first, then Try as guest, then Demo account last. |
| 2026-10-20 | Used hyphens and en dashes in visible texts ("drop-off", "16:00–19:00", "second-hand", codes like "D-ABCDE"). | No dashes anywhere in visible text, English or Czech; time ranges read "16:00 to 19:00"; a script must prove it. |
| 2026-10-20 | Dialogs slid up from the bottom on the phone and left the page scrollable behind them. | Every dialog opens centred on phone and laptop, the page behind is dimmed and locked, long lists scroll inside the dialog. |
| 2026-10-20 | Language switch was a text link in the menu, on the welcome screen and in Profile. | One small round globe button at the top right of every page, opening a two option menu; the old controls removed. |
| 2026-10-20 | Buying was "Reserve" only, one item at a time. | A cart next to "Reserve now": tick boxes, checkout pays only ticked items, one pickup code per stand, cart saved in the account, guest cart moves in at sign up. |
| 2026-10-20 | Six sell categories. | Add "Other" with a free text "What is it?" field. |
| 2026-10-20 | Selected choices (drop off day, stand, condition) were shown by a thin green border and a tinted background. | Selected state must be filled green with white text, a check mark and a small scale pulse, everywhere. |
| 2026-10-20 | Only the student could confirm the drop off ("I've dropped it"). | Either side: the student's button or stand staff in Manager mode by drop off code; first one wins, one ntfy alert, the timeline says who confirmed. |
| 2026-10-20 | "Ask for a stand" existed only as the general launch waitlist. | A visible card in the dorm list: "Your dorm is not here? Ask for a stand", saving the typed dorm name to the waitlist. |
| 2026-10-20 | Item photos were kept as JPEG. | All images as WebP, at most 150 KB, with width and height set and lazy loading below the fold. |
| 2026-10-20 | After a reviewer flagged duplicated controls, the laptop top bar was hidden on the main screens and kept only on deep screens. | The top bar must work on both phone and laptop: it now stays on every laptop screen with the title, Cart and Inbox; only the duplicated page heading is hidden. |
| 2026-10-21 | Laptop pages such as Cart, Inbox and the offer screen were a single centred column, leaving the right third empty. | Use the full width at 1280 px: list on the left, summary or detail on the right, on every laptop page. |
| 2026-10-21 | The welcome screen had two filled buttons and two strong coloured buttons. | Keep the order but calm it: Sign up is the one filled button, Sign in is outlined, then a divider "or look around first", then Guest and Demo as two equal quiet buttons. |
| 2026-10-21 | Prototype notes ("prototype hours", "Prototype: pretend the stand is open") sat inside the flows. | One footer line "Prototype: stands, payments and stand hours are simulated" on every screen plus the About page; the flows themselves stay clean. |
| 2026-10-21 | Test data cleanup was left to the owner with console instructions. | Do it: list the tester and anonymous accounts, delete them and their documents, reset the counters; keep manager1 and delete nothing else. |
| 2026-11-05 | v2 design pass: Claude Code turned on automatic hyphenation for narrow phones, which split "Rezervovat" as "Rezervo-vat". | Caught by Claude Code against the owner's no dash rule: hyphenation is off and `scan-dashes.py` now fails if it is turned on. |
| 2026-11-05 | v1 and v2 opened on onboarding cards and a welcome screen; guests had to make an account to reserve. | Professor: the link must land directly on Home with no log in. Now the top level link opens v2 Home as a guest, and guests can check out to a demo pickup code saved on their device. |
| 2026-11-05 | Items could be reserved and paid without choosing a dorm; the pickup code screen did not name the dorm. | Professor: make the pickup dorm clear before payment. Now: Choose your dorm on Home, Pick up label on every card, Pickup dorm filter, not your dorm warning, a confirm step before payment, and the dorm named on the code. |
| 2026-11-05 | No About us story, no feedback form, no community features. | Professor and owner: add About us, an in app feedback form and 2 or 3 sign up and community features (alerts, invites, dorm board chosen). |
| 2026-11-05 | The owner asked for the questions of last week's user feedback forms; they were not in the repository, so Claude Code wrote a short 5 question form. | Open: the owner should replace them with the real form's questions if they differ (`v2/texts.js`, keys `fb_q1` to `fb_q5`). |
| 2026-11-05 | Round 3 let guests check out on their device with no account. | Owner (round 4): ask for sign in only when needed (checkout, alerts, selling), always with the demo account next to it; keep the link landing on Home. |
| 2026-11-05 | The demo user was called "Alex"; checkout had pretend card fields inside the app. | Owner: the demo must read as "Demo account"; card details only on the payment provider's page (Stripe test mode) plus a Demo pay option, both ending in the same success flow with a thank you letter. |
| 2026-11-05 | After "Try the demo account" in the reserve dialog, the app went back to the item instead of checkout (it continued before Firebase announced the sign in). | Caught by Claude Code in testing: the demo now counts as signed in the moment it starts. |
| 2026-11-05 | firestore.rules (written by Claude Code on 2026-10-20) granted manager rights to any sign in whose email was on the list, verified or not. | Owner, from a secret scan: require `email_verified == true` in `isManager()` and in the app; list the console steps to publish the rules and to restrict the web API key. |
## AI generated images (for the AI statement)
- Pip the seal (5 poses) and the dorm area illustrations for Jarov, Rooseveltova and Hostivař were generated with Google Gemini on 2026-10-20. Prompts: `IMAGE-PROMPTS.md`. Shown in the app's About screen as "Illustrations generated with Google Gemini".
- Item photos are not AI generated (Unsplash, credits in `v1/img/credits.json`). Dorm photos for the other 10 dorms are Wikimedia Commons photos under CC BY or CC BY-SA (credits in `v1/img/dorms/credits-dorms.json` and in About).
