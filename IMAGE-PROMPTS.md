# Image prompts used for HelloDorm v1 (Google Gemini, 20 October 2026)

All generated images were made in gemini.google.com (signed in as the owner) during the Part 2 design pass, downloaded through Chrome and copied into `v1/img/`. Backgrounds were removed and files converted to WebP with Python (Pillow). This file is part of the assignment's AI statement, together with `AI-LOG.md`.

## Pip the seal (mascot, original character)
Chat: "Cute Seal Mascot Design". One base image, then edits in the same chat so the character stays consistent.

1. `img/pip/pip-wave.webp`
   "Create an image of an original cute mascot character: a small round harbour seal named Pip. Friendly big dark eyes, soft grey blue body with a lighter cream belly, tiny whiskers, a small green knitted scarf. Flat vector sticker style, soft shading, thick clean outlines, no text, no logo. Pose: sitting upright and waving one flipper with a happy smile. Centred on a plain pure white background, square 1:1 image."
2. `img/pip/pip-blink.webp`
   "Edit this image: keep everything exactly the same (same pose, same colours, same position and size, same white background), only change Pip's eyes so they are gently closed, as if blinking."
3. `img/pip/pip-cheer.webp`
   "Same character Pip, same style, colours and scarf, same white background, square 1:1: Pip celebrating with both flippers raised high, big happy open-mouth smile, eyes closed with joy, a few small green leaves floating around him."
4. `img/pip/pip-curious.webp`
   "Same character Pip, same style, colours and scarf, same white background, square 1:1: Pip looking curious, holding a magnifying glass in one flipper and peering through it, head slightly tilted, one eyebrow raised."
5. `img/pip/pip-sorry.webp`
   "Same character Pip, same style, colours and scarf, same white background, square 1:1: Pip looking a little sad and sorry, shoulders down, holding an empty open cardboard box, small apologetic smile."

## Dorm area illustrations (where no licensed photo was available)
Style line used in every prompt: "Flat vector illustration with soft gradients and gentle morning light, a calm palette of mint green, sage green, warm cream and a touch of sunflower yellow, a few trees, no people, no text, no logos, wide 16:9 image."

6. `img/dorms/jarov.webp` (used for Palachova, Eislerova, Thalerova and Jarov II)
   "Flat vector illustration of a group of modern student dormitory blocks on a quiet green hillside street in Prague Žižkov, with the tall Žižkov television tower small in the far distance. " + style line
7. `img/dorms/roosevelt.webp` (Rooseveltova kolej)
   "Flat vector illustration of a 1930s functionalist student dormitory building with rounded corners and long window bands, on a tree lined street near Letná park in Prague. " + style line
8. `img/dorms/hostivar.webp` (Kolej areál Hostivař)
   "Flat vector illustration of a student dormitory campus with several low blocks in a park with paths, a small pond and tall trees, Prague Hostivař. " + style line

## Not generated
Item photos: all 30 shop items use Unsplash photos (credits in `v1/img/credits.json`), so no product photos were generated.
