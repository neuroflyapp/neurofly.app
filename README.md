# NeuroFly

An in-silico fruit fly built on measured connectomes: 7,270 brain neurons and
784,219 signed connections from FlyWire FAFB v783, a 1,045-neuron nerve cord
from MaleCNS v1.0, a modelled body, and every behaviour traceable to the
neurons that caused it.

**Website:** https://neurofly.app

## What is measured and what is modelled

The wiring and the synapse counts are measured. Cell dynamics, sensory
transduction, body mechanics and behaviour are models. The program claims no
feeling and shows no "sentience score": model activity cannot tell you whether
anything inside is felt.

## This repository

`docs/` is the website, published by GitHub Pages at neurofly.app. It is plain
HTML, CSS and one script — no build step, no framework, no third-party
requests.

| File | Page |
|---|---|
| `index.html` | overview |
| `science.html` | methods: data, neuron model, senses, motor system, limitations |
| `evidence.html` | benchmarks with figures and data tables, verification, data fingerprints |
| `vision.html` | vision and roadmap |
| `ethics.html` | ethical commitments |
| `contact.html` | contact and suggestion forms |
| `legal.html` | imprint and privacy notice |
| `assets/site.css`, `assets/site.js` | shared style; navigation, figures, forms, optional statistics |

### Editing

Every page is a self-contained HTML file; the header and footer are repeated
in each. Text can be edited directly on GitHub (open the file, pencil icon,
commit) and is live about a minute later.

Figures on the Evidence page are drawn by `site.js` from the JSON blocks next
to them (`<script type="application/json" id="fig-…">`). Update the numbers
there and in the data table below each figure together. The numbers come from
the application's guided experiments (master seed 20260923).

### Forms and statistics

- **Forms** (`contact.html`): delivered by [Airform](https://airform.io) as a
  plain HTML POST to `https://airform.io/<address>`; the visitor then sees
  Airform's confirmation page. The address is `CONFIG.formEmail` at the top of
  `assets/site.js`. Before sending, the script checks the required fields, a
  hidden honeypot field and a minimum time on the page.
- **Statistics**: [Rybbit](https://rybbit.com), cookie-free, via the script
  tag in the `<head>` of every page (site ID `662701b51c45`). The dashboard is
  in the Rybbit account. Links marked `data-track` and form submissions are
  also sent as Rybbit events.

The Content-Security-Policy in each page allows exactly `app.rybbit.io`
(script and beacon) and `airform.io` (form target); any other service must be
added there. The privacy notice in `legal.html` describes both services and
must be updated if either changes.

## Licences

Program code: MIT. Neural data keeps its own licences — FlyWire FAFB v783
under CC BY-NC 4.0 (non-commercial, attribution), MaleCNS v1.0 and BANC v888
under CC BY 4.0. Because of the non-commercial data licence, NeuroFly is free
and stays free: no ads, no sale, no paid features.
