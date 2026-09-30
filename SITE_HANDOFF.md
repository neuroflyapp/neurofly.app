# NeuroCause website handoff — 30 September 2026

The website is the static `docs/` tree on the `main` branch. The latest tested
change in this handoff is `a322b5c` (confirm the current head before editing).
The work includes a JavaScript-independent one-time support path, a visible
mobile Support link, explicit motion controls, a shorter landing message and
static visitor-path regression tests. The hero film must keep rotating by
default: its H.264 source and muted autoplay are declared in HTML, with an
explicit pause button. A local browser check confirmed playback time advancing
from 5.49 s to 8.00 s over a 2.5-second observation window.

## Changes on 30 September 2026 (later the same day)

- Narrow screens (max-width 900px) load the 4 MB 720p H.264 hero film
  instead of the 8 MB 1080p one, declared as `<source media>` in HTML;
  checked in the browser at 375 px and on desktop (`test_site.py` covers it).
- The consent choice is stored as `neurocause-consent`; `site.js` migrates a
  stored `neurofly-consent` once at load (checked: the banner does not
  reappear). `site.js?v=20260930-consent` on the home page.
- Methods page: the eye's efference copy (model change in the app, see the
  app's VALIDATION.md, 30 September); roadmap stage 8 "In progress";
  comparison connectomes announced for the next release (MANC, male optic
  lobe; hemibrain and larva only after their redistribution terms are
  confirmed — both are export-ignored in the app repository).
- Contact and ethics pages have link previews (og:image).
- 375-px check of all content pages: no horizontal page scroll; the wide
  evidence table and the architecture diagram scroll inside their own
  `overflow-x: auto` containers.

## Before changing the site

- Run `python -m unittest discover -s tools -p 'test_*.py'` and
  `npm test --prefix tools/download-counter`.
- `python tools/build_legal.py` updates common headers and footers. The current
  `docs/privacy.html` and `docs/cookies.html` contain more recent, reviewed
  analytics disclosures than the old generator body templates; the generator
  deliberately preserves these two files' bodies. Do not remove that guard
  without first reconciling the templates with the current disclosures.
- Do not replace the measured/modelled distinction with claims of biological
  validation or subjective experience. The hero explicitly identifies the
  mixed female-brain/male-cord model interface.

## External checks still needed

- Git push and remote-branch verification succeeded. A later read-only request
  to `https://neuro-cause.com/` returned HTTP 200 with the new support section
  and mobile header link; the updated Methods and Vision pages also returned
  HTTP 200. The GitHub Pages build dashboard itself was not inspected.
- The one-time donation button uses the existing Stripe Payment Link in
  `docs/index.html`. The link returned HTTP 200 and was not marked inactive in
  the returned HTML. The checkout's visual content, recipient account and a
  completed payment were **not** independently tested. Check those in a normal
  browser; do not show a monthly option until a real, verified recurring Stripe
  link exists.
- Confirm the final mobile layout on a physical narrow-screen device. Local
  headless Chrome was visually checked at a 500-pixel viewport, but its window
  minimum prevented a reliable 390-pixel capture.
