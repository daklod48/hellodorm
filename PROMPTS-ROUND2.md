# HelloDorm round 2 prompts (2026-10-20, after Thang's first test)

Firestore rules published by Cowork via Chrome at 20:02 on 20/10/2026 (version shown "Today 8:02 PM"), same text as firestore.rules (sha256 bb7226c3...cd9fe8). The red "Not allowed" toast was the locked default rules, not the app.

## Prompt A: Claude Code (Fable)

```
ROLE
You are the lead product designer and front-end engineer on HelloDorm v1. Functionally it works. Your job this session is to take it from "working student prototype" to a release a design studio would put in its portfolio, and to apply the owner's test feedback. You have Chrome (claude --chrome) and the shell; use them.

CONTEXT YOU MUST LOAD FIRST
SPEC.md, design-brief.md, prague-dorms.md, README.md, AI-LOG.md and the current v1/ code. v1 has NOT been published yet, so you may change v1 freely.
The Firestore security rules (firestore.rules, unchanged) were published in the Firebase console at 20:02 today. The red "Not allowed. ... security rules" toast came from the old locked rules. Re-test every journey; if any write is still refused, fix the rules or the code, show me the new rules text and tell me to republish. Never weaken a rule just to make an error disappear.

PART 1: FUNCTIONAL CHANGES (from the owner's test)
1. Welcome screen order, top to bottom: Sign in and Sign up first, then Try as guest, then Demo account last.
2. NO DASHES anywhere in visible text, in English and Czech: no "-", "–" or "—". Time ranges read "16:00 to 19:00"; "drop-off" becomes "drop off"; replace " — " with a comma, colon or a new sentence. Write a script that scans texts.js and every data file for dash characters in user-facing strings and run it at the end; it must print 0.
3. Every pop-up and dialog opens centred in the viewport on phone and laptop, with the page behind dimmed and not scrollable; long lists scroll inside the dialog. Test the dorm change dialog when the page is scrolled down, and test all dialogs at 390 px and 1280 px.
4. Language: a small round button at the top right of every page (globe icon plus "EN" or "CZ"). Tapping it opens a small two-option menu (English, Čeština). Remove the old language control.
5. Cart next to buy now. Every item has "Add to cart" beside "Reserve now". A Cart page (and a cart icon with a count in the top bar) lists everything picked, each row with a tick box on the left, ticked by default. Checkout pays only the ticked items, as one order with one pickup code per stand. Unticked items stay in the cart, saved in the account, and are there at the next sign in on any device. Guest carts move into the account at sign up. If an item in the cart was reserved or sold by someone else, the row says so and cannot be ticked.
6. Sell categories: add "Other" (with a free text "what is it?" field) to the existing 6.
7. Selected state everywhere: a picked drop off day (and every other choice chip or card) must look clearly picked: filled green, white text, check mark, small scale pulse. Never only a thin border.
8. Drop off confirmation by either side. The student can press "I've dropped it", OR stand staff (managers) can confirm it in Manager mode by searching or typing the drop off code (and from the queue). Whichever happens first moves the item on and sends the ntfy alert once only. Show who confirmed it in the timeline ("Confirmed by you" or "Confirmed by stand staff").
9. Keep the "ask for a new stand by joining the waitlist" idea and make it more visible: on the dorm list, a card "Your dorm is not here? Ask for a stand" that adds to the waitlist with the dorm name typed.

PART 2: DESIGN AND MOTION OVERHAUL (the main goal)
Benchmark: open https://21st.dev/community/templates?preview=%2F%40mohammadshehadeh%2Ftemplates%2Fprism in Chrome and study it properly (layering, depth, scroll and entrance motion, micro-interactions, typography scale, spacing rhythm, how light and gradients are used). Also study 3 to 5 best-in-class sites or apps in sustainability or marketplaces (for example Too Good To Go, Olio, Vinted, award-winning eco brand sites). Write DESIGN-NOTES.md: what you borrow from each and why, with links. Do NOT copy Prism's theme; HelloDorm stays green, rounded, friendly and environmental. Borrow the craft, not the look.

Required results:
a. A design system in CSS custom properties: colour tokens (keep the contrast-checked palette in design-brief.md; you may add tints, gradients and glass layers but every text pair must stay at 4.5:1 or more), type scale, spacing scale, radii, shadows in 3 depth levels, motion tokens (durations, easing curves, springs).
b. Depth and layers: layered backgrounds (soft gradient blobs or leaf shapes with slow parallax), frosted glass top bar, cards that lift on hover and press, sections that reveal on scroll with stagger. Animate only transform and opacity so it stays smooth on a mid-range phone.
c. Micro-interactions: every button and tappable card shrinks slightly on press and springs back. Pressing Donate releases a short burst of small leaves from the pointer or tap position. Adding to cart flies a small thumbnail to the cart icon and bumps the count. Hearts pop. Successful steps get a small celebration (confetti of leaves on "Donated, thank you" and on order confirmed). Page changes use smooth transitions (View Transitions API where supported, a simple fade or slide otherwise).
d. Mascot: a cute seal named Pip (the owner may rename it), shown at the top left on every page next to the logo, gently idling (breathing or bobbing, occasional blink). Clicking Pip opens a friendly panel of frequently asked questions with answers (at least 10: how selling works, how long the offer takes, what happens if I decline, the 14 day and 30 day rules, what items are refused, how pickup works, payments are demo, how to change dorm, how to delete my data, who runs HelloDorm). Pip also appears with a different pose on empty states and success screens. Pip must be an original character, not resembling any existing brand mascot.
e. Dorm backdrop: after the user picks a dorm, the Home header shows an image of that dorm (or its area) as a soft, slightly blurred, tinted background behind the greeting, with gentle parallax. Use real photos ONLY where the licence allows reuse (for example Wikimedia Commons with CC BY or CC BY-SA, credit line in About); otherwise generate an illustration of a Prague dorm building in a consistent style with Gemini. One image per dorm, or one per area (Jarov, Chodov, Větrník and so on) if photos are thin.
f. Item images: every one of the 30 items gets a real photo (Unsplash or Pexels, licence checked, credit in About) or, if a good match cannot be found, a Gemini-generated product photo in one consistent studio style (same light, same mint background). All images converted to WebP, at most 150 KB each, with width and height set, lazy loaded below the fold.
g. Gemini: use Chrome to open gemini.google.com (the owner is signed in) to generate the mascot (several poses on a transparent or plain background), dorm illustrations where needed and missing item photos. Keep every prompt you used in IMAGE-PROMPTS.md. Chrome saves downloads to C:\Users\ASUS\Downloads\Claude Workplace\Downloads from Chrome\ ; you may READ from that folder (ask me once) and copy files into v1/img/. Never move or delete anything there.
h. Mark AI-generated images in About ("Illustrations generated with Google Gemini") and log them in AI-LOG.md; our assignment's AI statement needs this.

QUALITY BAR (measure, do not guess)
- Lighthouse on the local build, mobile profile: Performance 85 or more, Accessibility 95 or more, Best Practices 90 or more. Report the scores.
- Layout shift (CLS) under 0.1; largest image visible fast (LCP under 2.5 s on Lighthouse mobile).
- prefers-reduced-motion: all non-essential motion off, app fully usable.
- Contrast script: every text and background pair at least 4.5:1, prints 0 failures.
- Dash scan script prints 0.
- Every tap target at least 44 by 44 px on phone.
- No console errors on any journey.

HOW TO WORK
1. Post a plan of at most 25 lines (order of work, what you will research, how you will verify). Then proceed WITHOUT waiting, unless a question truly blocks you; collect non-blocking questions for the end.
2. Do Part 1 first and test it, then Part 2.
3. Verify with Playwright at 390 x 844 and 1280 x 800: guest, sign up, sign out and sign in again (cart, choices and dorm remembered), demo account, sell with drop off confirmed by the student, sell with drop off confirmed by staff, manager pricing, auto offer, accept and bank screen, decline, cart with 3 ticked and 1 unticked then checkout, Pip FAQ, language switch. Save before and after screenshots to review/ and look at them yourself.
4. Fresh eyes: when you think you are done, start a separate reviewer agent that has NOT seen your work. It gets only the screenshots, the Prism link and this quality bar, and scores 6 criteria from 1 to 10 (visual polish, depth and layering, motion quality, clarity for a first time user, consistency, delight). Fix everything below 8 and repeat once.
5. Finish with: what changed, Lighthouse scores, the two script results, remaining weaknesses, your open questions.

DO NOT
- Do not create, edit, move or delete files outside this hellodorm folder (reading "Downloads from Chrome" as described above is the only exception). Never touch C:\Users\ASUS\claude-practice. Do not delete project files; keep a replaced file as name.old.
- Do not push to GitHub or publish anything in this session.
- No real payments, no real people's names or phone numbers, no brand logos, no images whose licence you could not confirm.
- Do not use any font, icon set or library whose licence does not allow free use; keep licence notices.
- Keep AI-LOG.md updated with every misunderstanding I corrected.
```

## Prompt B: Base44 (one message, free plan has 25 credits a month)

```
Update HelloDorm with these changes. Keep every feature that already works.

1. Welcome screen order: Sign in and Sign up first, then Try as guest, then Demo account last.
2. Never use dashes in any visible text (no "-", "–" or "—"), in English and Czech. Write "16:00 to 19:00", "drop off", "Stand A, lobby". Remove texts like "— no login".
3. Every pop-up and dialog must open centred on the screen on phone and laptop, with the background dimmed. Bug: the change dorm pop-up on the Profile page opens far too high and is cut off. Long lists scroll inside the dialog.
4. Language: a small round button at the top right of every page showing "EN" or "CZ". Tapping it opens a small menu with two options, English and Čeština. Translate all screen text, not only menus.
5. Cart: put "Add to cart" next to "Buy now" on every item. A Cart page (cart icon with a count in the top bar) lists all picked items, each with a tick box on the left, ticked by default. Checkout pays only the ticked items as one order. Unticked items stay in the cart, saved in the user's account, and are still there at the next login. If an item was sold to someone else, show that on its row and disable its tick box.
6. Sell or donate: add a category "Other" with a short "what is it?" text field.
7. When the user picks a drop off day (and any other choice button), it must look clearly selected: filled green, white text, a check mark, and a small pulse.
8. "I've dropped it" can be confirmed by the student OR by stand staff: in Manager mode staff can type or search the drop off code and press "Confirm drop off". Whichever happens first counts, and the timeline shows who confirmed it.
9. Keep the "ask for a new stand by joining the waitlist" feature and make it easy to find on the dorm list.
10. Look and feel, make it far more polished and alive (green, rounded, eco friendly, friendly):
   a. Every button shrinks slightly when pressed and springs back.
   b. Pressing Donate makes a small burst of green leaves appear near the tap and float away.
   c. Soft layered background with gentle gradient shapes, cards that lift slightly on hover, smooth page transitions, items that fade in as you scroll, a small leaf confetti on "Donated, thank you" and on order confirmed.
   d. Mascot: a cute original cartoon seal named Pip, small, at the top left of every page next to the logo, gently bobbing and blinking. Clicking Pip opens a panel of frequently asked questions with answers (at least 10: how selling works, how long an offer takes, what if I decline, the 14 day and 30 day rules, refused items, how pickup works, payments are demo, changing dorm, deleting my data, who runs HelloDorm). Pip also appears on empty pages and success screens.
   e. After the user picks a dorm, show a picture of a Prague dorm building as a soft, blurred, green tinted background behind the greeting on the Home page.
   f. Give every item a real photo of that kind of item (free stock photos), all in a similar clean style.
   g. If you can generate images, generate Pip and the dorm pictures; otherwise use free stock photos and a simple drawn seal.
11. Keep text readable: dark text on light backgrounds, contrast high enough to read easily.
After the changes, list what you changed and anything you could not do.
```
