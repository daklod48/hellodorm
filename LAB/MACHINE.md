# IMPROVEMENT LAB (the machine), v1, 2026-11-05

Drop this file into any product (app, website, slide deck, video, document). One command = one run = one measured upgrade. The owner reviews, then says "lab run" again (or "lab run 3", or "lab run b" to pick an option). Built from DeClaun's "make it better x20" experiment (quality peaked at round 9 of 20, then got worse) and Nate Herk's agent-loop method (fixed rubric, separate scorer, stop rule): https://www.youtube.com/watch?v=EuzYhzB0vbI

## Commands
- "lab run" = 1 run. "lab run N" = N runs, then STOP. "lab run a/b/c" = do the option the last report offered.
- Never run more than asked. Never chain runs on your own. Runs are expensive and the owner steers between them.

## Run 0 (first time only): baseline and rubric
1. Make a folder LAB/ next to the product (or in the repo root).
2. Capture the product: apps and sites = screenshots at phone 390x844 and laptop 1440x900 of every main screen plus a click-through of the main flow; decks = every slide as an image; video = a contact sheet of frames every 2 s plus the file; documents = page images.
3. Write LAB/RUBRIC.md: 8 criteria, 1 to 10 each, with what a 3, a 6 and a 9 look like. Start from the type default and freeze it, so scores compare across runs.
   - App or website: first-impression beauty, clarity of the main task, flow without dead ends, trust and credibility, mobile quality, speed, accessibility (contrast, tap size, text size), delight or innovation.
   - Slide deck: story and structure, one idea per slide, visual design, data clarity, readability at the back of a room, brand consistency, evidence and sources, memorability.
   - Video: character and illustration appeal, depth and lighting, colour palette, background richness, motion smoothness, typography and phone readability, sync with narration, style match to the target.
   - Document: structure, clarity, evidence, visual design, scannability, tone fit, accuracy, usefulness.
4. Score run 0 (see step 6) and log it.

## One run
1. SCOUT (references). Spend real effort looking at strong work of the same type: 21st.dev, Mobbin, Dribbble, Behance, Awwwards, Land-book for apps and sites; Kurzgesagt and other explainer channels on YouTube for video; Pitch, Gamma and top decks for slides. Pick 2 or 3 references, write what to borrow and the link. If the network blocks a site, say so and use what you can reach.
2. DIAGNOSE. Take the 3 weakest criteria from the last score plus any owner feedback.
3. IDEATE. Write 3 candidate changes. At least one must be an INNOVATION: a feature, interaction or visual idea the product does not have yet, not just polish. Pick the 1 to 3 with the best expected gain for the effort.
4. BUILD on a branch or copy named lab-run-NN. Budget: the product must not grow more than about 25 percent in code size per run unless the owner asked for a feature. Bigger is not better.
5. VERIFY. Run the existing tests; click through the main flow in a headless browser at both sizes; 0 console errors; contrast and tap sizes; facts, data contract and save logic unchanged; the owner's KEEP list respected.
6. SCORE with an INDEPENDENT scorer. Spawn a fresh subagent that did not see your reasoning; give it only the captures and RUBRIC.md; it returns the 8 scores and the top 3 flaws. If you cannot spawn one, score yourself and label it "self-scored".
7. KEEP OR REVERT. Keep if the total rises, no criterion drops by more than 1, and tests pass. Otherwise revert and log why. A reverted run is still a result.
8. LOG. Append to LAB/RUNS.md and LAB/runs.json: run number, date, what changed, the innovation, the references used, scores before and after per criterion and total, size change, tests result, verdict, preview link, tools used and why. Update LAB/tracker.html: it must open by DOUBLE-CLICK with no server and no file picker (data embedded as JSON in the page, thumbnails embedded as small base64 JPEGs), one card per run, a score chart across runs, the best run marked. Commit and tag lab-run-NN.
9. SHOW. Publish a preview the owner can open without any setup: a live link (GitHub Pages or other hosting), an artifact link, or the files as separate downloads (each video as its own file, never only inside a big zip).
10. REPORT in at most 8 lines: what changed, total before and after, the innovation, the preview link, and options a, b, c for the next run with your recommendation. Then STOP.

## Stop rules
- Stop after the runs asked for.
- If the average score reaches 9 or two runs in a row gain less than 2 points total, say so and recommend a different direction instead of more polish.

## Never
- Never touch secrets, passwords, real patient or customer data.
- Never change a data contract or save logic without asking.
- No em-dashes, no emojis. Explain any new term in plain words.

## Tools (optional, use when they help, say which you used)
Web research and browsing; YouTube for visual references; 21st.dev components; open-source renderers (cairo, skia, manim, Lottie, Blender) if installable; headless Chromium (Playwright) for captures; Gemini image generation through the owner's browser: if you cannot reach it, write the exact Gemini prompts into the run log and the coordinating Claude brings the images back.
