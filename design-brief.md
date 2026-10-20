## Design brief to paste into a builder

**Look and feel**
- Mobile-first: one column on phones, a 2–4 column card grid on laptop. White or mint backgrounds, 16px card corners, pill buttons and chips, soft shadows. Too Good To Go is praised for a "consistent card layout, blurred and gentle shadows" (Pratt IxD, 2023).
- Friendly, humble, community voice, like Too Good To Go's 2023 rebrand (Markt&Kom, 2023).
- Too Good To Go publishes green/white logo files but no hex codes (Too Good To Go, n.d.-a), so the palette below is our own.

**Palette (contrast checked with the WCAG formula; normal text needs at least 4.5:1; W3C, 2023)**
- Primary green `#17754A`: buttons and links. White on green is 5.71:1, green on white is 5.71:1 and green on mint is 5.09:1.
- Dark green `#0B3D2E`: headings and body text. It is 12.20:1 on white and 10.88:1 on mint.
- Light mint `#E8F5EE`: page and section backgrounds.
- Accent sunflower `#F4B740`: badges such as "Free" or "New". Use dark-green text on it (6.79:1), never white (1.80:1, which fails).
- Error red `#B42318`: errors and "Sold out". It is 6.57:1 on white and 5.86:1 on mint.
- Neutral grey `#4B5563`: secondary text such as "listed 12 min ago". It is 7.56:1 on white and 6.74:1 on mint.
- Never show status by colour alone; add a word or icon.

**Type, icons, photos**
- Fonts: Nunito (rounded) for headings, Inter (built for screens) for body and prices; both SIL Open Font License 1.1 (Google Fonts, n.d.-a, n.d.-b; google/fonts, n.d.-a, n.d.-b). Load latin-ext for Czech (ř, ů, č).
- Icons: Lucide, 2px stroke; ISC licence, keep the notice in code, no UI credit needed (Lucide, n.d.).
- Placeholder photos: Unsplash or Pexels, free commercial use without permission; credit not required but appreciated (Unsplash, n.d.; Pexels, n.d.). Add "Photo: Name / Unsplash" in a footer credits list; swap in real item photos before launch.

**Screens and patterns**
- Item card: a square photo, then a price chip on the photo (or a green "Free" chip for donations), a condition badge, the title, the dorm stand name and "listed X min ago". Over half of Olio listings are requested within 60 minutes (Olio, n.d.).
- Condition: 4 grades with one-line meanings, like Back Market's Premium/Excellent/Good/Fair ("Like new", "Almost no signs of wear") (Back Market, n.d.), plus a "Cleaned & checked" badge.
- Pickup info on every card and detail page: stand name (for example "Kolej Strahov – Block 5 stand") and a pickup window ("Today 16:00–19:00"). Too Good To Go shows pickup time and location clearly before ordering (Pratt IxD, 2026) and uses fixed time windows (Too Good To Go, n.d.-b).
- Before the pickup window opens, replace the "I'm here" button with a grey countdown bar, as Too Good To Go does (Pratt IxD, 2023). At the stand, the student swipes a slider to confirm collection (Too Good To Go, n.d.-b).
- Order status cards with clear labels: Reserved → Ready at stand → Picked up / Not confirmed. Too Good To Go's "Picked up" vs "Pickup not confirmed" labels were praised (Pratt IxD, 2026).
- Map/list toggle for dorm stands, with clustered pins and a radius filter. Too Good To Go uses numbered clusters and a 1–30 km radius (ScreensDesign, n.d.; Pratt IxD, 2023).
- Sell/donate flow in 5 steps with photo first: photos (up to 10; the first photo shows the whole item) → title and description → category → condition → price or "Donate". Mirrors Vinted's order, minus its package-size step (Vinted, n.d.-a).
- In-flow photo tips: daylight, no filters, show flaws, no faces (Vinted, n.d.-b). Finish with a green tick, like Olio (Olio, n.d.).
- Seller drop-off: choose stand and a window of at least 2 hours, as Olio recommends (Olio, n.d.).
- Onboarding: 3 short illustrated screens (Sell or donate → We clean it → Pick up at your dorm stand), then pick your dorm. Ask for location only when the map opens. ScreensDesign counts 10 Too Good To Go onboarding steps without describing them (ScreensDesign, n.d.), so this flow is our suggestion.
- Avoid jargon: Too Good To Go's "Collection" was flagged as unexplained (Valles, 2023); say "Pickup".
- Tap targets at least 44px; bottom tab bar on mobile (Home, Map, Sell, Orders, Profile), top bar on laptop.

## Sources

Back Market. (n.d.). *What are Back Market phone grades?* https://backmarket.com/en-us/c/smartphones/what-are-back-market-phone-grades

Google Fonts. (n.d.-a). *Inter*. https://fonts.google.com/specimen/Inter

Google Fonts. (n.d.-b). *Nunito*. https://fonts.google.com/specimen/Nunito

google/fonts. (n.d.-a). *Inter OFL.txt* [Licence file]. GitHub. https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt

google/fonts. (n.d.-b). *Nunito OFL.txt* [Licence file]. GitHub. https://github.com/google/fonts/blob/main/ofl/nunito/OFL.txt

Lucide. (n.d.). *License*. https://lucide.dev/license

Markt&Kom. (2023, March 6). *Too Good To Go with new look and brand positioning*. https://www.markt-kom.com/en/?p=194260

Olio. (n.d.). *10 steps to create the perfect Olio listing*. https://help.olioapp.com/article/226-10-steps-to-create-the-perfect-olio-listing

Pexels. (n.d.). *License*. https://www.pexels.com/license/

Pratt Institute IxD. (2023, February). *Design critique: Too Good To Go (iOS app)*. https://ixd.prattsi.org/2023/02/design-critique-too-good-to-go-ios-app/

Pratt Institute IxD. (2026, February). *Design critique: Too Good To Go (iOS app)*. https://ixd.prattsi.org/2026/02/design-critique-too-good-to-go-mobile-app/

ScreensDesign. (n.d.). *Too Good To Go: End food waste* [App showcase]. https://screensdesign.com/showcase/too-good-to-go-end-food-waste

Too Good To Go. (n.d.-a). *Media assets: Logo pack*. https://www.toogoodtogo.com/en-us/media-assets-logo-pack

Too Good To Go. (n.d.-b). *How to collect Too Good To Go*. https://www.toogoodtogo.com/en-gb/how-to-collect-too-good-to-go

Unsplash. (n.d.). *License*. https://unsplash.com/license

Valles, C. (2023, March 27). *Revitalizing Too Good to Go app: A UX design case study*. UX Planet. https://uxplanet.org/revitalizing-too-good-to-go-app-a-ux-design-case-study-48c3bfab90a5

Vinted. (n.d.-a). *Uploading step by step*. https://www.vinted.com/help/375

Vinted. (n.d.-b). *Photo tips* [Help Centre article]. https://www.vinted.co.uk/help/48

W3C. (2023). *Understanding Success Criterion 1.4.3: Contrast (minimum)* (WCAG 2.2). https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
