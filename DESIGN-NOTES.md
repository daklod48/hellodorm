# HelloDorm v1 design notes (Part 2 overhaul, 2026-10-20)

What was studied in Chrome on 20 October 2026, what HelloDorm borrows from each, and why. HelloDorm keeps its own look: green, rounded, friendly, environmental, contrast-checked palette from `design-brief.md`. We borrow craft, not themes.

## 1. Prism (benchmark set by the owner)
Link: https://21st.dev/community/templates?preview=%2F%40mohammadshehadeh%2Ftemplates%2Fprism (live preview served from https://hirael.com/embed/templates/prism)

Measured in the live preview (computed styles, 1400 px wide):
- Type scale: display 88 px / line 74.8 px / letter spacing -4 px (Instrument Serif, weight 400); section titles 60 px / 54 px / -1.5 px; body 14 px / 20 px (Barlow). A two-font pairing: an expressive display face and a plain workhorse.
- Section rhythm: 128 px top and bottom padding on major sections, 96 px on lighter ones. Few sections, each with one idea.
- Motion: entrance keyframes `prism-rise 0.6s ease-out` and `prism-word-rise 0.7s ease-out` (text rises and fades in, word by word); hover transitions `transform 0.18s cubic-bezier(0.2, 0, 0, 1)` and `all 0.15s cubic-bezier(0.4, 0, 0.2, 1)`; opacity fades 0.2 to 0.3 s. Everything is transform and opacity only.
- Layering: a floating pill navigation bar over full-bleed imagery; a soft glow behind the hero; thin 1 px borders on cards over a dark field; section labels as small pills ("How It Works", "Capabilities").
- Buttons: 10 px radius, 14 px text, 150 ms ease, white on black.

Borrowed for HelloDorm:
- Two-font pairing with a real scale (Nunito 900 for display, Inter for body), tight letter spacing on big headings, generous section spacing on laptop (clamped on phone).
- Rise-and-fade entrance of headings and cards, staggered, 0.5 to 0.7 s, ease-out, transform and opacity only.
- Floating frosted navigation (we use a frosted top bar and side rail) and pill section labels.
- Hover: lift of 2 to 4 px with a softer, larger shadow; press: scale 0.97 with a spring back.
Not borrowed: the dark theme, serif italics, abstract 3D imagery.

## 2. Too Good To Go
Link: https://www.toogoodtogo.com/en-gb
- Full-bleed deep green hero with white chunky display type; dark pill buttons; "How to use the app" told in numbered steps with a phone mockup and a dot stepper; strong single brand colour used as a surface, not only as an accent.
Borrowed: green used as a surface for hero moments (home header, order placed, donated); numbered how-it-works steps; pill buttons. Already in the brief: pickup window shown before ordering, countdown bar before the window opens, slider to confirm pickup.

## 3. Olio
Link: https://olioapp.com/en/
- Big rounded sans headings with one accent word in colour; organic blob shapes and circular photo masks behind content; warm gradient orbs; soft off-white sections.
Borrowed: layered background with slow-moving soft blobs (mint, sunflower, sage) behind the app; circular and rounded masks for the mascot and dorm photos; one accent word in headings on the welcome screen.

## 4. Vinted
Link: https://www.vinted.co.uk/
- Calm white product surface, a single teal action colour, item cards with square photos and a short meta line, big "Sell now" entry point.
Borrowed: card anatomy (square photo, price chip, two-line meta), quiet surfaces so photos carry the colour, one primary action per screen. Already in the brief: photo-first sell flow and photo tips.

## 5. Back Market
Link: https://www.backmarket.co.uk/en-gb
- Playful contrast: a heavy serif headline next to a flat lime block, product photos cut out on colour; condition grades explained in one line each.
Borrowed: the condition grade line under every item ("Good: light signs of use, works perfectly"), playful colour blocks for empty and success states.

## 6. Ecosia
Link: https://www.ecosia.org/
- Full-bleed nature photo with white type and a frosted glass search box; a single lime call to action; impact number in the hero.
Borrowed: frosted glass over photography (home header over the dorm backdrop), the impact numbers block in Profile.

## What this becomes in the code
- `v1/styles.css`: design tokens (colour, tints, gradients, glass; type scale; spacing scale; radii; three shadow depths; motion durations, easings, spring), layered background (`.bg-layer` blobs with slow parallax), frosted top bar, scroll reveal (`.reveal` with stagger), press and hover springs, selected states, reduced-motion rules.
- `v1/fx.js`: scroll reveal observer, pointer parallax, leaf burst on Donate, fly-to-cart, heart pop, leaf confetti on success, View Transitions between screens.
- `v1/pip.js`: Pip the seal, idle breathing and blinking, FAQ panel, poses for empty and success states.

## Performance notes (measured with Lighthouse, mobile preset, on a local gzip server)
- The first paint must not wait for the Firebase SDK (about 240 KB). `boot.js` paints the onboarding or welcome screen from `first.js` with only `texts.js`, `icons.js` and `pip.js` loaded, then imports `app.js` one frame later. A tap made before the app is ready is replayed.
- The first onboarding picture is a 480 px, 19 KB WebP with `fetchpriority="high"` and a static preload; the other two cards lazy load.
- Background blobs are radial gradients, not `filter: blur()`, because large blurred layers are slow to rasterise without a GPU (headless Chrome and low end phones). Dorm backdrops are blurred in the image file, not in CSS. Price chips use a near solid white instead of a backdrop filter; only the top bar, tab bar and language button keep frosted glass.
- Fonts are self hosted with `font-display: swap`; every image has width and height, so layout shift stays near zero.

## Measured results (20 October 2026, local gzip server, Lighthouse 13 mobile preset, installed Chrome)
- Lighthouse (21 October, after the critical CSS, font preloads and image work): Performance 84 and 85 on the two cleanest runs, 68 to 79 on most others, with single runs as low as 37 when the laptop was busy; Accessibility 100, Best Practices 100. FCP 2.2 to 2.7 s, LCP 3.2 s, CLS 0, TBT 250 to 340 ms, Speed Index 2.2 to 2.8 s. The HTML report of a clean run is `review/lighthouse-mobile.html`. The variance is the measuring laptop, not the page; the remaining gap to a steady 85 is the Firebase SDK (about 240 KB) plus unminified plain JavaScript, which only a bundler and minifier would shrink.
- `tools/check-contrast.py`: 0 pairs under 4.5:1 on 40 screen states at 390 px and 1280 px.
- `tools/check-taps.py`: 0 targets under 44 px at 390 px.
- `tools/scan-dashes.py`: 0 dashes in visible texts.
- Playwright walkthrough (sign up, cart, checkout with 3 ticked and 1 unticked, sell with Other, student and staff drop off confirmation, manager, demo, sign out and in): 51 of 52 checks pass; the one failure is "Ask for a stand", which needs the updated `firestore.rules` published.
- Fresh eyes reviews (screenshots only): round 1 scored 6, 6, 5, 7, 6, 6; round 2 after fixes scored 7, 6, 6, 7, 6, 7 (polish, depth, motion, clarity, consistency, delight). Both rounds' fixes are applied; the remaining points are listed in the hand over note.

