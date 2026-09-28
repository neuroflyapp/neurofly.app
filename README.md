# NeuroCause

In-silico experiments on measured nervous systems. NeuroCause turns published
connectomes into models you can experiment on: closed-loop simulations with
stated assumptions, assays that reproduce exactly from their seed, and a causal
trace behind every result. The first model is the fruit fly *Drosophila
melanogaster*: 7,270 brain neurons and 784,219 signed connections from FlyWire
FAFB v783 and a 1,045-neuron nerve cord from MaleCNS v1.0, driving a modelled
body.

**Website:** https://neuro-cause.com (the former address neurofly.app forwards here)

## What is measured and what is modelled

The wiring and the synapse counts are measured. Cell dynamics, sensory
transduction, body mechanics and behaviour are models, labelled as such
wherever their results are shown. No model claims to feel anything, and there
is no "sentience score".

## This repository

`docs/` is the website, published by GitHub Pages. It is plain HTML, CSS and
one script — no framework, no web fonts.

| File | Page |
|---|---|
| `index.html` | overview: approach, assays, models, evidence, download |
| `science.html` | methods of the fly model: data, neuron model, senses, motor system, limitations |
| `evidence.html` | benchmark assays with figures and data tables, verification, data fingerprints |
| `vision.html` | vision and roadmap |
| `ethics.html` | ethical commitments |
| `contact.html` | contact and suggestion forms |
| `legal.html`, `imprint.html`, `privacy.html`, `cookies.html`, `terms.html`, `software-terms.html` | legal pages |
| `assets/site.css`, `assets/site.js` | shared style; navigation, figures, forms, films, statistics, consent |
| `brand/` | NeuroCause logo, symbol, favicons and app icons |

### Editing

`tools/build_legal.py` writes the legal pages and gives every page the same
header, icons and footer; run it after changing either (`python
tools/build_legal.py`). Operator name, domain and contact address are three
constants at its top. Other page text can be edited directly.

Figures on the Evidence page are drawn by `site.js` from the JSON blocks next
to them (`<script type="application/json" id="fig-…">`). Update the numbers
there and in the data table below each figure together.

The external services the site uses (hosting, statistics, forms, download
counter) are named in the privacy notice; `tools/build_legal.py` records the
facts behind that wording. The Content-Security-Policy of every page allows
exactly those services.

### Statistics and downloads

`tools/download-counter/` holds the two Cloudflare Workers: the download
counter with cookieless page statistics (`worker.js`) and the login-protected
dashboard (`stats-worker.js`). Deploy with `npm run deploy:counter` and
`npm run deploy:stats` from that folder.

## Licence

© 2026 NeuroCause. The website's text, figures, films and design are not
licensed for reuse. The NeuroCause software is licensed under the PolyForm
Noncommercial License 1.0.0. The connectome datasets keep their own licences
(FlyWire FAFB v783: CC BY-NC 4.0; MaleCNS v1.0 and BANC v888: CC BY 4.0) — see
`docs/legal.html#licences`.
