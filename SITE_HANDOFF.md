# NeuroCause website handoff

## 8 October 2026 — onboarding and scientific precision (latest)

Built on Claude's `c821b5f` home page and its public 2.5.0 browser build.

- Added `#first-visit`, linked from the hero: three concrete first steps and
  four keyboard-accessible, JavaScript-independent questions about devices,
  local saves, scientific scope and optional contributions. Responsive cards
  match the existing dark-green / document-style visual system.
- Tightened claims about synaptic strength, manually calibrated model
  components, causality and seed-only reproducibility. No unsupported claim
  of subjective experience or validated drug-testing capability.
- Hero movie/autoplay, payments, analytics and legal texts are unchanged.
  Homepage stylesheet version is `20261008c`.
- `docs/play/` remains the released 2.5.0 build. Reliability improvements in
  the private app repository are NOT silently published through this site.
- Tests: 10 static visitor-path checks and 10 collector tests pass. New
  `tools/smoke-site.mjs` checks 1440/768/390px, advancing hero playback,
  no horizontal overflow, FAQ keyboard controls, main links, page errors and
  absence of Clarity before consent. All three local viewports passed.
  It accepts `PLAYWRIGHT_MODULE`, `CHROME_PATH`, optional `QA_OUTPUT` outside
  the repository, and `SITE_URL` to repeat the same checks on production.

Publication: push this commit to `main` (GitHub Pages publishes `docs/`),
then verify the live `#first-visit` section and run the deployment smoke test.

## Earlier handoff — 1 October 2026

The website is the static `docs/` tree on the `main` branch. The latest tested
change in this handoff is `a322b5c` (confirm the current head before editing).
The work includes a JavaScript-independent one-time support path, a visible
mobile Support link, explicit motion controls, a shorter landing message and
static visitor-path regression tests. The hero film must keep rotating by
default: its H.264 source and muted autoplay are declared in HTML, with an
explicit pause button. A local browser check confirmed playback time advancing
from 5.49 s to 8.00 s over a 2.5-second observation window.

## Changes on 1 October 2026 (release 2.3.0)

- Own audience measurement is no longer consent-gated: legitimate interest,
  no cookies, nothing stored in the browser except an objection
  (`neurocause-measurement-optout`; Global Privacy Control counts as one).
  It adds Core Web Vitals (LCP/CLS/INP) and sections seen. Only Microsoft
  Clarity asks for consent. Collector: `get.neuro-cause.com/collect` (the
  Worker `neurofly-downloads` now also answers on get.neuro-cause.com;
  get.neurofly.app keeps old links working). Dashboard lists for the new
  metrics; Worker tests 9/9.
- Social profiles: Instagram `neurocauseofficial`, X `neurocause`, TikTok
  `@neurofly` (footer via `tools/build_legal.py`, follow strip, contact page,
  schema.org `sameAs`).
- Hero film always plays: the pause control is gone; the script only
  restarts the film when the browser stopped it.
- Supporter perk everywhere: supporters may be invited to pre-releases
  (support card, hero link, download section, footer, contact page, app's
  Model workspace); terms of use 13 (#prereleases), software terms 5
  (pre-releases) and 10 (termination), privacy notice (supporter emails).
- Release 2.3.0: download `get.neuro-cause.com/v2.3.0`, SHA-256
  `2c60748e9fc302209acb442b50f25b6af73e4e4a8b7dbebc7ad7927bf21b2158`, 181 MB;
  "New in 2.3" list; version references updated (31 test suites).
- New screenshots from the 2.3.0 app (English UI, follow camera, 1.00x real
  time) at 1x and 2x (`srcset`); the drop film is the first reel.
- Legal: MANC v1.0 and the male optic lobe v1.1 credited (CC BY 4.0) in the
  credits, imprint, footer and software terms; all legal dates 1 October 2026.
- `site.js?v=20261001` / `site.css?v=20261001` on every page.

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
