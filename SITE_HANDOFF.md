# NeuroCause website handoff — 30 September 2026

The website is the static `docs/` tree on the `main` branch. The latest tested
change in this handoff is `a322b5c` (confirm the current head before editing).
The work includes a JavaScript-independent one-time support path, a visible
mobile Support link, explicit motion controls, a shorter landing message and
static visitor-path regression tests.

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

- A Git push to `main` succeeded and the remote branch was verified. Confirm
  that GitHub Pages has published that commit before announcing the live site
  as updated; no Pages build status was available in this environment.
- The one-time donation button uses the existing Stripe Payment Link in
  `docs/index.html`. Its hosted checkout and a completed payment were **not**
  tested here. Check the link manually in a normal browser without submitting
  a payment. Do not show a monthly option until a real, verified recurring
  Stripe link exists.
- Confirm the final mobile layout on a physical narrow-screen device. Local
  headless Chrome was visually checked at a 500-pixel viewport, but its window
  minimum prevented a reliable 390-pixel capture.
