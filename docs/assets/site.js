// NeuroCause site script: navigation, figures, forms, films and statistics.
// Our own audience measurement uses no cookies and stores nothing in the
// browser to recognise visitors; Microsoft Clarity never loads before consent.

// The storage choice is kept under 'neurocause-consent'. A choice stored under
// the site's former key is carried over once, so no visitor is asked again.
try {
  const former = localStorage.getItem('neurofly-consent');
  if (former !== null) {
    if (localStorage.getItem('neurocause-consent') === null) localStorage.setItem('neurocause-consent', former);
    localStorage.removeItem('neurofly-consent');
  }
} catch { /* storage unavailable */ }

// ---- configuration ------------------------------------------------------------------------------
// formEmail: the address the forms deliver to through Airform (https://airform.io/<address>).
//   Airform receives a normal HTML form POST; the visitor sees Airform's confirmation page.
// contactEmail: public address shown next to the forms.
// statistics: Microsoft Clarity, loaded only after the visitor allows it.
// collector: our own audience measurement (Cloudflare Worker `neurofly-downloads`).
const CONFIG = {
  formEmail: 'contact@neuro-cause.com',
  contactEmail: 'contact@neuro-cause.com',
  statistics: { src: 'https://www.clarity.ms/tag/ypl7e33gz2' },
  collector: 'https://get.neuro-cause.com/collect',
};

// Our own audience measurement is first-party and aggregate: no cookies, nothing
// stored in or read back from the browser to recognise anyone, no profile across
// sites or days. It runs on our legitimate interest in understanding how the
// site is used (privacy notice, section 3). Visitors can object in Privacy
// settings; a Global Privacy Control signal counts as that objection too.
const OWN_MEASUREMENT_OPTOUT_KEY = 'neurocause-measurement-optout';
function ownMeasurementEnabled() {
  if (navigator.globalPrivacyControl === true) return false;
  try { return localStorage.getItem(OWN_MEASUREMENT_OPTOUT_KEY) !== '1'; }
  catch { return true; }
}

// ---- our own statistics ---------------------------------------------------------------------------
// Page views with referrer, campaign and screen class; reading time and depth;
// sections seen; clicks on downloads, donations, email and other sites; form
// sends; load timings and Core Web Vitals. Each beacon is a small JSON body sent
// with sendBeacon. The collector derives country, region, city, device, browser,
// system and language from the request itself and keeps only daily totals.
// Only the published site counts; a prerendered page counts once it is shown.
const collect = (() => {
  if (location.hostname !== 'neuro-cause.com') return () => {};
  const send = (m) => {
    if (!ownMeasurementEnabled()) return;
    try { navigator.sendBeacon(CONFIG.collector, JSON.stringify(m)); } catch { /* not counted */ }
  };
  const notFound = document.documentElement.dataset.page === '404';
  const p = notFound ? '/404' : location.pathname;
  const q = new URLSearchParams(location.search);
  const missingType = !notFound ? undefined : location.pathname.toLowerCase().endsWith('.html')
    ? '/unknown.html' : /\.[a-z0-9]{1,6}$/i.test(location.pathname) ? '/unknown.bin' : '/unknown';
  const start = () => {
    send({ t: 'pv', p, nf: missingType });
    send({ t: 'detail', p, r: document.referrer || '', w: screen.width,
      us: q.get('utm_source') || undefined, um: q.get('utm_medium') || undefined, uc: q.get('utm_campaign') || undefined });
  };
  if (document.prerendering) document.addEventListener('prerenderingchange', start, { once: true });
  else start();

  // Navigation timings by page: operational load metrics, aggregated per day.
  const reportLoad = () => {
    const n = performance.getEntriesByType?.('navigation')?.[0];
    if (!n || !Number.isFinite(n.loadEventEnd) || n.loadEventEnd <= 0) return;
    send({ t: 'perf', p, ms: Math.round(n.loadEventEnd), ttfb: Math.round(n.responseStart - n.requestStart) });
  };
  if (document.readyState === 'complete') setTimeout(reportLoad, 0);
  else addEventListener('load', () => setTimeout(reportLoad, 0), { once: true });

  // Core Web Vitals, measured by the browser's own performance observers:
  // largest contentful paint, cumulative layout shift and the slowest
  // interaction. Sent once, when the page is first hidden.
  const vitals = { lcp: undefined, cls: 0, inp: undefined };
  const observe = (type, fn, extra = {}) => {
    try { new PerformanceObserver((list) => list.getEntries().forEach(fn)).observe({ type, buffered: true, ...extra }); }
    catch { /* not supported by this browser */ }
  };
  observe('largest-contentful-paint', (e) => { vitals.lcp = Math.round(e.startTime); });
  observe('layout-shift', (e) => { if (!e.hadRecentInput) vitals.cls += e.value; });
  observe('event', (e) => { if (e.interactionId) vitals.inp = Math.max(vitals.inp ?? 0, Math.round(e.duration)); }, { durationThreshold: 40 });

  // Sections a visitor actually saw (at least half on screen), once per page.
  const seen = new Set();
  if ('IntersectionObserver' in window) {
    const watch = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || seen.has(e.target.id)) continue;
        seen.add(e.target.id);
        send({ t: 'ev', p, n: 'seen', v: e.target.id });
        watch.unobserve(e.target);
      }
    }, { threshold: 0.5 });
    for (const s of document.querySelectorAll('main section[id], section[id]')) if (/^[a-z][a-z0-9-]{0,30}$/.test(s.id)) watch.observe(s);
  }

  let since = document.visibilityState === 'visible' ? performance.now() : null, first = true, depth = 0;
  const measure = () => {
    const room = document.documentElement.scrollHeight - innerHeight;
    depth = Math.max(depth, room > 0 ? Math.min(100, Math.round(100 * scrollY / room)) : 100);
  };
  measure();
  addEventListener('scroll', measure, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { since = performance.now(); return; }
    if (first) send({ t: 'vital', p, lcp: vitals.lcp, cls: Math.round(vitals.cls * 1000), inp: vitals.inp });
    if (since !== null) send({ t: 'end', p, ms: Math.round(performance.now() - since), sc: first ? depth : undefined });
    since = null; first = false;
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    let u;
    try { u = new URL(a.href, location.href); } catch { return; }
    if (u.protocol === 'mailto:') send({ t: 'ev', p, n: 'email' });
    else if (/^get\.(neuro-cause\.com|neurofly\.app)$/.test(u.hostname)) send({ t: 'ev', p, n: 'download', v: u.pathname.slice(1) });
    else if (/(^|\.)stripe\.com$/.test(u.hostname)) {
      send({ t: 'ev', p, n: 'donate' });
      send({ t: 'ev', p, n: 'outbound', v: u.hostname.replace(/^www\./, '') });
    } else if (/^https?:$/.test(u.protocol) && u.hostname !== location.hostname) send({ t: 'ev', p, n: 'outbound', v: u.hostname.replace(/^www\./, '') });
  }, { capture: true });
  document.addEventListener('submit', (e) => {
    send({ t: 'ev', p, n: 'form', v: e.target.id || e.target.getAttribute('name') || 'form' });
  }, { capture: true });
  return (name, value) => send({ t: 'ev', p, n: name, v: value });
})();

// ---- navigation -----------------------------------------------------------------------------------
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');
if (toggle && nav) {
  const closeNav = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { closeNav(); toggle.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
  });
}

// ---- statistics and storage choices ---------------------------------------------------------------
// A conventional banner: accept all, only necessary, or settings with one switch
// per category. Necessary storage (the choice itself, 'neurocause-consent') is
// always on. Microsoft Clarity starts only after statistics consent; our own
// cookieless measurement is not consent-based and has its own objection switch.
// The choice is asked again after 12 months and can be changed under
// "Privacy settings".
const CONSENT_KEY = 'neurocause-consent';
const CONSENT_MAX_AGE = 365 * 24 * 3600 * 1000;
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable: the choice holds for this page only */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* nothing stored */ } },
};
function readConsent() {
  try {
    const c = JSON.parse(storage.get(CONSENT_KEY));
    if (c?.v === 3 && (c.statistics === true || c.statistics === false)
      && Number.isFinite(c.at) && c.at <= Date.now() && Date.now() - c.at < CONSENT_MAX_AGE) return c;
  } catch { /* no valid choice */ }
  return null;
}
let statisticsLoaded = false;
function loadStatistics() {
  if (statisticsLoaded) return;
  statisticsLoaded = true;
  window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  // Consent V2 is queued before Clarity loads; advertising consent stays denied.
  window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  const s = document.createElement('script');
  s.src = CONFIG.statistics.src;
  s.async = true;
  document.head.append(s);
}
function saveConsent(statistics, ownMeasurement = ownMeasurementEnabled()) {
  const before = readConsent();
  storage.set(CONSENT_KEY, JSON.stringify({ statistics, at: Date.now(), v: 3 }));
  if (ownMeasurement && navigator.globalPrivacyControl !== true) storage.del(OWN_MEASUREMENT_OPTOUT_KEY);
  else storage.set(OWN_MEASUREMENT_OPTOUT_KEY, '1');
  document.querySelector('.consent')?.remove();
  for (const n of document.querySelectorAll('[data-consent-state]')) n.textContent = statistics ? 'accepted' : 'declined';
  for (const n of document.querySelectorAll('[data-own-measurement-state]'))
    n.textContent = ownMeasurementEnabled() ? 'on' : 'off';
  if (statistics) loadStatistics();
  else {
    if (statisticsLoaded) window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
    // A statistics script that already runs cannot be unloaded; reload without it.
    if (statisticsLoaded || before?.statistics) location.reload();
  }
}
function consentBanner() {
  document.querySelector('.consent')?.remove();
  const box = document.createElement('section');
  box.className = 'consent';
  box.setAttribute('aria-label', 'Cookies');
  box.innerHTML = `
    <p><b>Privacy choices</b><br>With your consent, Microsoft Clarity helps us improve this site with usage statistics, heatmaps
      and masked session recordings, and may set cookies. Our own audience measurement uses no cookies.
      <a href="cookies.html">Details and later changes</a></p>
    <div class="consent-actions">
      <button type="button" class="linklike ink" data-consent="settings">Settings</button>
      <button type="button" class="btn primary" data-consent="necessary">Only necessary</button>
      <button type="button" class="btn primary" data-consent="all">Accept all</button>
    </div>`;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-consent]');
    if (!b) return;
    if (b.dataset.consent === 'settings') consentSettings();
    else saveConsent(b.dataset.consent === 'all');
  });
  document.body.append(box);
}
function consentSettings() {
  let dlg = document.getElementById('consent-settings');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'consent-settings';
    dlg.className = 'consent-dialog';
    dlg.setAttribute('aria-labelledby', 'consent-title');
    dlg.innerHTML = `
      <form method="dialog">
        <h2 id="consent-title">Privacy settings</h2>
        <p>Choose which cookies and similar technologies this website may use in your browser. Details are in our
          <a href="cookies.html">cookie</a> and <a href="privacy.html">privacy</a> notices.</p>
        <div class="consent-cat">
          <div><h3>Necessary</h3><p>Stores your choice on this page (<code>neurocause-consent</code>). Needed for the site to respect it;
            contains no personal data.</p></div>
          <label class="switch"><input type="checkbox" checked disabled><span aria-hidden="true"></span><em>Always on</em></label>
        </div>
        <div class="consent-cat">
          <div><h3>Audience measurement</h3><p>Our own measurement of how the site is used, without cookies and without storing
            anything in your browser: daily totals of pages, referrers and campaigns, approximate location, device, browser and
            language, reading time and depth, sections seen, clicks and page speed. Based on our legitimate interest; you may object here.</p></div>
          <label class="switch"><input type="checkbox" name="own-measurement" aria-label="Allow our own audience measurement"><span aria-hidden="true"></span><em>Object anytime</em></label>
        </div>
        <div class="consent-cat">
          <div><h3>Statistics with Microsoft Clarity</h3><p>Usage statistics, heatmaps and masked session recordings by Microsoft
            Clarity, which may set analytics cookies and process device, page and interaction data. Loads only if you allow it.
            Advertising storage remains disabled.</p></div>
          <label class="switch"><input type="checkbox" name="statistics" aria-label="Allow statistics with Microsoft Clarity"><span aria-hidden="true"></span><em>Optional</em></label>
        </div>
        <div class="consent-actions">
          <button type="submit" class="btn primary" value="save">Save settings</button>
          <button type="submit" class="btn primary" value="all">Accept all</button>
        </div>
      </form>`;
    // Decide on the click itself; the dialog's close event can arrive late.
    dlg.querySelector('form').addEventListener('click', (e) => {
      const b = e.target.closest('button[value]');
      if (!b) return;
      e.preventDefault();
      const statistics = b.value === 'all' || dlg.querySelector('[name=statistics]').checked;
      const ownMeasurement = b.value === 'all' || dlg.querySelector('[name=own-measurement]').checked;
      dlg.close();
      saveConsent(statistics, ownMeasurement);
    });
    document.body.append(dlg);
  }
  dlg.querySelector('[name=statistics]').checked = !!readConsent()?.statistics;
  dlg.querySelector('[name=own-measurement]').checked = ownMeasurementEnabled();
  dlg.querySelector('[name=own-measurement]').disabled = navigator.globalPrivacyControl === true;
  dlg.showModal();
}
{
  const c = readConsent();
  if (c?.statistics) loadStatistics();
  else if (!c) consentBanner();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-privacy-settings]');
  if (!b) return;
  e.preventDefault();
  consentSettings();
});
for (const n of document.querySelectorAll('[data-consent-state]')) {
  const c = readConsent();
  n.textContent = c?.statistics ? 'accepted' : c ? 'declined' : 'not yet chosen';
}
for (const n of document.querySelectorAll('[data-own-measurement-state]'))
  n.textContent = ownMeasurementEnabled() ? 'on' : 'off';

// ---- named events: our own counter always, Clarity only after consent ------------------------------
function track(name, props) {
  collect(name, props ? Object.values(props)[0] : undefined);
  if (statisticsLoaded) try { window.clarity?.('event', name); } catch { /* optional */ }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-track]');
  if (a) track(a.dataset.track);
});

// ---- figures ----------------------------------------------------------------------------------------
const SVGNS = 'http://www.w3.org/2000/svg';
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'];      // validated categorical slots 1-3 (light)
const SURFACE = '#ffffff';

function el(tag, attrs = {}, parent = null) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.append(n);
  return n;
}
function txt(parent, x, y, s, cls, anchor = 'middle', extra = {}) {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor, ...extra }, parent);
  t.textContent = s;
  return t;
}
const fmt = {
  pct: (v) => `${Math.round(v * 100)}%`,
  num0: (v) => (Math.round(v)).toLocaleString('en'),
  num1: (v) => (Math.round(v * 10) / 10).toLocaleString('en', { minimumFractionDigits: 1 }),
  num2: (v) => (Math.round(v * 100) / 100).toLocaleString('en', { minimumFractionDigits: 2 }),
};
function niceMax(v) {
  if (v <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function makeTip(box) {
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  box.append(tip);
  return {
    show(x, y, rows) {
      tip.replaceChildren();
      rows.forEach(([value, label, color], i) => {
        if (i) tip.append(document.createElement('br'));
        if (color) { const k = document.createElement('span'); k.className = 'k'; k.style.background = color; tip.append(k); }
        const b = document.createElement('b'); b.textContent = value; tip.append(b);
        if (label) tip.append(document.createTextNode(`  ${label}`));
      });
      tip.style.left = `${x}px`; tip.style.top = `${y}px`;
      tip.hidden = false;
    },
    hide() { tip.hidden = true; },
  };
}

function drawCurve(box, spec) {
  const W = 560, H = spec.height || 320, m = { l: 52, r: 96, t: 16, b: 50 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': spec.title || 'Figure' });
  const xs = spec.series.flatMap((s) => s.x || spec.x).concat((spec.markers || []).map((q) => q.x));
  const x0 = spec.xMin ?? Math.min(...xs), x1 = spec.xMax ?? Math.max(...xs);
  const ymax = spec.yMax ?? niceMax(Math.max(...spec.series.flatMap((s) => s.hi || s.y)));
  const X = (v) => m.l + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const Y = (v) => H - m.b - (v / ymax) * (H - m.t - m.b);
  const yf = fmt[spec.yFormat || 'pct'];
  const g = el('g', { class: 'axis' }, svg);
  for (let i = 0; i <= 4; i++) {
    const v = (ymax * i) / 4, y = Y(v);
    el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i ? 'grid-line' : 'base-line' }, g);
    txt(g, m.l - 8, y + 4, yf(v), '', 'end');
  }
  for (const v of spec.xTicks || spec.x) txt(g, X(v), H - m.b + 18, String(v), '');
  txt(svg, (m.l + W - m.r) / 2, H - 8, spec.xLabel, 'axis-title');
  txt(svg, 14, (m.t + H - m.b) / 2, spec.yLabel, 'axis-title', 'middle', { transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})` });
  const points = [];
  // Direct labels sit right of the last point when they fit in the margin;
  // otherwise above it, right-aligned, so nothing runs off the figure.
  const endLabel = (x, y, label, dy) => {
    if (x + 10 + label.length * 6.8 <= W) txt(svg, x + 10, y + 4 + dy, label, 'end-lbl', 'start');
    else txt(svg, x - 4, y - 12 + dy, label, 'end-lbl', 'end');
  };
  spec.series.forEach((s, si) => {
    const color = s.color || SERIES[si];
    const sx = s.x || spec.x;
    if (s.lo && s.hi) {
      const up = sx.map((v, i) => `${X(v)},${Y(s.hi[i])}`), down = sx.map((v, i) => `${X(v)},${Y(s.lo[i])}`).reverse();
      el('polygon', { points: [...up, ...down].join(' '), fill: color, 'fill-opacity': 0.1 }, svg);
    }
    el('polyline', { points: sx.map((v, i) => `${X(v)},${Y(s.y[i])}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    sx.forEach((v, i) => {
      el('circle', { cx: X(v), cy: Y(s.y[i]), r: 4, fill: color, stroke: SURFACE, 'stroke-width': 2 }, svg);
      points.push({ x: X(v), y: Y(s.y[i]), rows: [[yf(s.y[i]), `${s.label} · ${spec.xLabel.toLowerCase()} ${v}`
        + (s.lo ? ` · 95% CI ${yf(s.lo[i])}–${yf(s.hi[i])}` : '') + (s.n ? ` · n = ${s.n[i]}` : ''), color]] });
    });
    const li = sx.length - 1;
    // one series: the panel title names it, so no direct label
    if (spec.series.length > 1 && spec.series.length <= 4) endLabel(X(sx[li]), Y(s.y[li]), s.label, s.labelDy || 0);
  });
  (spec.markers || []).forEach((q, qi) => {
    const color = SERIES[spec.series.length + qi] || '#52514e';
    el('circle', { cx: X(q.x), cy: Y(q.y), r: 5, fill: SURFACE, stroke: color, 'stroke-width': 2.5 }, svg);
    endLabel(X(q.x), Y(q.y), q.label, q.labelDy || 0);
    points.push({ x: X(q.x), y: Y(q.y), rows: [[yf(q.y), `${q.label}${q.n ? ` · n = ${q.n}` : ''}`, color]] });
  });
  box.append(svg);
  attachHover(box, svg, points, W);
}

function drawBars(box, spec) {
  const W = 560, H = 300, m = { l: 52, r: 16, t: 20, b: 58 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': spec.title || 'Figure' });
  const ymax = spec.yMax ?? niceMax(Math.max(...spec.values));
  const Y = (v) => H - m.b - (v / ymax) * (H - m.t - m.b);
  const yf = fmt[spec.yFormat || 'num0'];
  const g = el('g', { class: 'axis' }, svg);
  for (let i = 0; i <= 4; i++) {
    const v = (ymax * i) / 4, y = Y(v);
    el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i ? 'grid-line' : 'base-line' }, g);
    txt(g, m.l - 8, y + 4, yf(v), '', 'end');
  }
  const band = (W - m.l - m.r) / spec.categories.length, bw = Math.min(24, band * 0.5);
  const points = [];
  spec.categories.forEach((c, i) => {
    const cx = m.l + band * (i + 0.5), v = spec.values[i], y = Y(v), h = Y(0) - y;
    const color = spec.colors?.[i] ?? SERIES[0];
    if (h > 0.5) {
      const r = Math.min(4, h);
      el('path', { d: `M${cx - bw / 2},${Y(0)} V${y + r} Q${cx - bw / 2},${y} ${cx - bw / 2 + r},${y} H${cx + bw / 2 - r} Q${cx + bw / 2},${y} ${cx + bw / 2},${y + r} V${Y(0)} Z`, fill: color }, svg);
    }
    txt(svg, cx, y - 7, yf(v), 'end-lbl');
    const lines = String(c).split('\n');
    lines.forEach((ln, k) => txt(g, cx, H - m.b + 18 + k * 14, ln, ''));
    points.push({ x: cx, y, rows: [[yf(v), `${c.replace('\n', ' ')}${spec.unit ? ` · ${spec.unit}` : ''}${spec.n ? ` · n = ${spec.n[i]}` : ''}`, color]] });
  });
  txt(svg, 14, (m.t + H - m.b) / 2, spec.yLabel, 'axis-title', 'middle', { transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})` });
  box.append(svg);
  attachHover(box, svg, points, W);
}

// Nearest-point hover (24 px hit radius in screen space) with a keyboard-reachable table below.
function attachHover(box, svg, points, W) {
  const tip = makeTip(box);
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect(), s = r.width / W;
    const px = (e.clientX - r.left) / s, py = (e.clientY - r.top) / s;
    let best = null, bd = Infinity;
    for (const p of points) { const d = Math.hypot(p.x - px, p.y - py); if (d < bd) { bd = d; best = p; } }
    if (best && bd * s < 28) tip.show(best.x * s, best.y * s, best.rows); else tip.hide();
  });
  svg.addEventListener('pointerleave', () => tip.hide());
}

for (const box of document.querySelectorAll('.chart[data-spec]')) {
  const src = document.getElementById(box.dataset.spec);
  if (!src) continue;
  try {
    const spec = JSON.parse(src.textContent);
    if (spec.type === 'bars') drawBars(box, spec); else drawCurve(box, spec);
  } catch (err) {
    box.textContent = 'Figure could not be drawn; the data table below holds every value.';
  }
}

// ---- forms --------------------------------------------------------------------------------------------
for (const tabs of document.querySelectorAll('[role="tablist"][data-tabs]')) {
  const buttons = [...tabs.querySelectorAll('[role="tab"]')];
  const select = (btn) => {
    for (const b of buttons) {
      const on = b === btn;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
    }
  };
  buttons.forEach((b) => b.addEventListener('click', () => { select(b); history.replaceState(null, '', `#${b.dataset.hash}`); }));
  tabs.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
    select(next); next.focus();
  });
  const fromHash = buttons.find((b) => `#${b.dataset.hash}` === location.hash);
  if (fromHash) select(fromHash);
}

const loadedAt = Date.now();
for (const form of document.querySelectorAll('form[data-form]')) {
  const status = form.querySelector('.form-status');
  const say = (message, kind) => { status.textContent = message; status.className = `form-status ${kind}`; status.hidden = false; };
  form.addEventListener('submit', (e) => {
    if (!form.reportValidity()) { e.preventDefault(); return; }
    const trap = form.querySelector('[name="website"]');
    // Spam traps: a hidden field people never fill, and a minimum time on the
    // page. When one of them stops a message, say so plainly and keep the text,
    // so a person who was simply quick can send again.
    if (trap?.value || Date.now() - loadedAt < 3000) {
      e.preventDefault();
      say(`Not sent yet. Please check your message and press send again, or write to ${CONFIG.contactEmail}.`, 'err');
      return;
    }
    if (!CONFIG.formEmail) {
      e.preventDefault();
      say('The online form is not connected yet, so nothing was sent. Please try again later.', 'err');
      return;
    }
    // The browser sends the form itself (a plain POST); the trap field stays out of it.
    if (trap) trap.disabled = true;
    form.action = `https://airform.io/${encodeURIComponent(CONFIG.formEmail).replace('%40', '@')}`;
    form.method = 'post';
    track(`form-${form.dataset.form}`);
  });
}
for (const n of document.querySelectorAll('[data-contact-email]')) {
  if (CONFIG.contactEmail) { n.textContent = CONFIG.contactEmail; n.closest('[hidden]')?.removeAttribute('hidden'); }
}

// ---- videos -------------------------------------------------------------------------------------
// Editorial films on the Methods and Vision pages have native controls and
// only load when a visitor chooses to play them.

// The hero is a continuous, muted background film that always plays. Native
// autoplay and a widely supported H.264 source make it work even if this
// script is delayed; the script only restarts it when the browser stopped it
// (returning to the tab, power saving, a stalled connection).
const hero = document.querySelector('video[data-hero]');
if (hero) {
  const resume = () => { if (hero.paused) hero.play().catch(() => {}); };
  for (const type of ['canplay', 'pause', 'stalled']) hero.addEventListener(type, resume);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
  addEventListener('pageshow', resume);
  resume();
}

// Reel gallery: the full film, with sound, in a dialog.
const reelDialog = document.getElementById('reel-dialog');
if (reelDialog) {
  const film = reelDialog.querySelector('video'), filmTitle = reelDialog.querySelector('.title');
  const closeFilm = () => { film.pause(); film.removeAttribute('src'); film.load(); if (reelDialog.open) reelDialog.close(); };
  for (const card of document.querySelectorAll('[data-reel]')) {
    card.addEventListener('click', () => {
      film.src = card.dataset.reel;
      filmTitle.textContent = card.dataset.title || '';
      reelDialog.showModal();
      film.play().catch(() => {});
      track('reel-play', { reel: card.dataset.reel });
    });
  }
  reelDialog.querySelector('.close').addEventListener('click', closeFilm);
  reelDialog.addEventListener('click', (e) => { if (e.target === reelDialog) closeFilm(); });
  reelDialog.addEventListener('cancel', (e) => { e.preventDefault(); closeFilm(); });
}
