// NeuroFly site script: navigation, figures, forms, films, our own statistics and
// the choice about third-party statistics. No frameworks and no cookies. Our own
// statistics keep nothing in the browser; nothing from a third party loads unless
// the visitor has allowed page statistics (see consent below).

// ---- configuration ------------------------------------------------------------------------------
// formEmail: the address the forms deliver to through Airform (https://airform.io/<address>).
//   Airform receives a normal HTML form POST; the visitor sees Airform's confirmation page.
// contactEmail: public address shown next to the forms.
// statistics: Rybbit page statistics, loaded only after the visitor allows it.
// collector: our own statistics (Cloudflare Worker `neurofly-downloads`).
const CONFIG = {
  formEmail: 'contact@neurofly.app',
  contactEmail: 'contact@neurofly.app',
  statistics: { src: 'https://app.rybbit.io/api/script.js?siteId=662701b51c45', storageKeys: ['rybbit-visitor-id', 'rybbit-user-id'] },
  collector: 'https://get.neurofly.app/collect',
  // Donations: Stripe Payment Links (Stripe dashboard → Payment links), one per
  // amount; `onceOther` is a link where the donor chooses the amount. In each
  // link's settings, after payment redirect to https://neurofly.app/?thanks=1#support.
  // The support section and its menu link stay hidden until a link is filled in.
  donate: {
    currency: 'CHF',
    once: [
      { amount: 10, url: '', impact: 'Fuels another round of simulation runs.' },
      { amount: 25, url: '', impact: 'Helps render the next film from a simulation run.', suggested: true },
      { amount: 50, url: '', impact: 'Supports a new experiment in the in-silico lab.' },
      { amount: 100, url: '', impact: 'Backs a whole release — free for everyone.' },
    ],
    onceOther: '',
    monthly: [
      { amount: 5, url: '', impact: 'Keeps NeuroFly running, month after month.' },
      { amount: 10, url: '', impact: 'Makes you part of every release.', suggested: true },
      { amount: 25, url: '', impact: 'Carries the science forward, steadily.' },
    ],
  },
};

// ---- our own statistics ---------------------------------------------------------------------------
// Each page tells our counter what it is, where the visit came from (referring
// site, campaign parameters), the screen's width, how long it was looked at and
// how far it was scrolled, and which downloads, films, forms and links were
// used. The counter keeps daily totals only and nothing is stored in the
// browser, so it runs without consent. Only the published site counts, and a
// prerendered page only once it is shown.
const collect = (() => {
  if (location.hostname !== 'neurofly.app') return () => {};
  const send = (m) => { try { navigator.sendBeacon(CONFIG.collector, JSON.stringify(m)); } catch { /* not counted */ } };
  const notFound = document.documentElement.dataset.page === '404';
  const p = notFound ? '/404' : location.pathname;
  const q = new URLSearchParams(location.search);
  const pageview = () => send({ t: 'pv', p, nf: notFound ? location.pathname : undefined, r: document.referrer || '', w: screen.width,
    us: q.get('utm_source') || undefined, um: q.get('utm_medium') || undefined, uc: q.get('utm_campaign') || undefined });
  if (document.prerendering) document.addEventListener('prerenderingchange', pageview, { once: true });
  else pageview();

  let since = document.visibilityState === 'visible' ? performance.now() : null, first = true, depth = 0;
  const measure = () => {
    const room = document.documentElement.scrollHeight - innerHeight;
    depth = Math.max(depth, room > 0 ? Math.min(100, Math.round(100 * scrollY / room)) : 100);
  };
  measure();
  addEventListener('scroll', measure, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { since = performance.now(); return; }
    if (since === null) return;
    send({ t: 'end', p, ms: Math.round(performance.now() - since), sc: first ? depth : undefined });
    since = null; first = false;
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const u = new URL(a.href, location.href);
    if (u.protocol === 'mailto:') send({ t: 'ev', p, n: 'email' });
    else if (u.hostname === 'get.neurofly.app') send({ t: 'ev', p, n: 'download', v: u.pathname.slice(1) });
    else if (/^https?:$/.test(u.protocol) && u.hostname !== location.hostname) send({ t: 'ev', p, n: 'outbound', v: u.hostname.replace(/^www\./, '') });
  }, { capture: true });
  document.addEventListener('submit', (e) => send({ t: 'ev', p, n: 'form', v: e.target.id || e.target.getAttribute('name') || 'form' }), { capture: true });
  return (name, value) => send({ t: 'ev', p, n: name, v: value });
})();

// ---- navigation -----------------------------------------------------------------------------------
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

// ---- cookie consent ----------------------------------------------------------------------------
// A conventional banner: accept all, only necessary, or settings with one switch
// per category. Necessary storage (the choice itself, 'neurofly-consent') is
// always on; statistics (Rybbit) load only when accepted. The choice is asked
// again after 12 months and can be changed under "Privacy settings".
const CONSENT_KEY = 'neurofly-consent';
const CONSENT_MAX_AGE = 365 * 24 * 3600 * 1000;
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable: the choice holds for this page only */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* nothing stored */ } },
};
function readConsent() {
  try {
    const c = JSON.parse(storage.get(CONSENT_KEY));
    if (c && (c.statistics === true || c.statistics === false) && Date.now() - c.at < CONSENT_MAX_AGE) return c;
  } catch { /* no valid choice */ }
  return null;
}
let statisticsLoaded = false;
function loadStatistics() {
  if (statisticsLoaded) return;
  statisticsLoaded = true;
  const s = document.createElement('script');
  s.src = CONFIG.statistics.src;
  s.defer = true;
  document.head.append(s);
}
function saveConsent(statistics) {
  const before = readConsent();
  storage.set(CONSENT_KEY, JSON.stringify({ statistics, at: Date.now(), v: 2 }));
  document.querySelector('.consent')?.remove();
  for (const n of document.querySelectorAll('[data-consent-state]')) n.textContent = statistics ? 'accepted' : 'declined';
  if (statistics) loadStatistics();
  else {
    for (const k of CONFIG.statistics.storageKeys) storage.del(k);
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
    <p><b>Cookies on neurofly.app</b><br>We use cookies and similar technologies. Necessary ones keep the site working; with your
      consent we also use statistics to see which pages are read. You can change your choice at any time under Privacy settings.
      <a href="cookies.html">More</a></p>
    <div class="consent-actions">
      <button type="button" class="linklike ink" data-consent="settings">Settings</button>
      <button type="button" class="btn secondary" data-consent="necessary">Only necessary</button>
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
          <div><h3>Necessary</h3><p>Stores your choice on this page (<code>neurofly-consent</code>). Needed for the site to respect it;
            contains no personal data.</p></div>
          <label class="switch"><input type="checkbox" checked disabled><span aria-hidden="true"></span><em>Always on</em></label>
        </div>
        <div class="consent-cat">
          <div><h3>Statistics</h3><p>Page statistics by Rybbit (rybbit.com), stored on servers in the EU for up to three years:
            which pages are read, the referring page, browser, device type, screen size, language and approximate location, and
            clicks on links to other sites. Stores a random visitor ID in your browser (<code>rybbit-visitor-id</code>) to recognise
            a repeat visit. No advertising, no profiles.</p></div>
          <label class="switch"><input type="checkbox" name="statistics" aria-label="Allow statistics"><span aria-hidden="true"></span><em>Optional</em></label>
        </div>
        <div class="consent-actions">
          <button type="submit" class="btn secondary" value="save">Save settings</button>
          <button type="submit" class="btn primary" value="all">Accept all</button>
        </div>
      </form>`;
    // Decide on the click itself; the dialog's close event can arrive late.
    dlg.querySelector('form').addEventListener('click', (e) => {
      const b = e.target.closest('button[value]');
      if (!b) return;
      e.preventDefault();
      const statistics = b.value === 'all' || dlg.querySelector('[name=statistics]').checked;
      dlg.close();
      saveConsent(statistics);
    });
    document.body.append(dlg);
  }
  dlg.querySelector('[name=statistics]').checked = !!readConsent()?.statistics;
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

// ---- statistics events (only if the visitor allowed statistics) --------------------------------
function track(name, props) {
  collect(name, props ? Object.values(props)[0] : undefined);
  try { window.rybbit?.event?.(name, props); } catch { /* statistics are optional */ }
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
// Loops load only when they come into view, play muted, and pause off-screen and in hidden tabs.
// With reduced motion requested, nothing plays by itself; the posters stay.
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const loops = [...document.querySelectorAll('video[data-autoplay]')];
const visibleLoops = new Set();
const playLoop = (v) => {
  if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src;
  v.play().catch(() => { /* autoplay refused: the poster stays */ });
};
if (!reduceMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { visibleLoops.add(e.target); if (!document.hidden) playLoop(e.target); }
      else { visibleLoops.delete(e.target); e.target.pause(); }
    }
  }, { threshold: 0.2 });
  loops.forEach((v) => io.observe(v));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) loops.forEach((v) => v.pause());
    else visibleLoops.forEach(playLoop);
  });
}

// Hero film: the size that suits the screen and connection, set only after the
// page has loaded, shown only once it can play through without stalling, and
// paused while off-screen or in a hidden tab. The poster stays until then.
const hero = document.querySelector('video[data-hero]');
if (hero && !reduceMotion) {
  const conn = navigator.connection;
  const slow = conn && (conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || ''));
  if (!slow) {
    // The sharpest file this browser plays well for this screen: AV1, then
    // HEVC (Apple devices), then H.264; 1440p where the screen has the pixels.
    const px = Math.max(window.innerWidth, 1) * (window.devicePixelRatio || 1);
    const can = (type) => hero.canPlayType?.(type) === 'probably';
    const d = hero.dataset;
    const src = can('video/mp4; codecs="av01.0.12M.08"') && px > 2000 ? d.srcAv1Xl
      : can('video/mp4; codecs="av01.0.08M.08"') ? d.srcAv1
      : can('video/mp4; codecs="hvc1.1.6.L150.90"') && px > 1400 ? d.srcHevcXl
      : px > 1400 ? d.srcLarge : d.srcSmall;
    const start = () => {
      hero.src = src;
      hero.preload = 'auto';
      hero.addEventListener('canplaythrough', () => {
        hero.classList.add('is-ready');
        if (heroVisible && !document.hidden) hero.play().catch(() => {});
      }, { once: true });
      hero.load();
    };
    let heroVisible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        heroVisible = e.isIntersecting;
        if (!hero.classList.contains('is-ready')) return;
        if (heroVisible && !document.hidden) hero.play().catch(() => {}); else hero.pause();
      }, { threshold: 0.05 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => {
      if (!hero.classList.contains('is-ready')) return;
      if (document.hidden) hero.pause(); else if (heroVisible) hero.play().catch(() => {});
    });
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
  }
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

// ---- support (donations) ----------------------------------------------------------------------------
// Each amount opens its own Stripe Payment Link; Stripe brings the donor back
// to /?thanks=1#support, where the section says thank you instead.
const support = document.querySelector('[data-support]');
if (support) {
  const D = CONFIG.donate;
  const offers = { once: D.once.filter((o) => o.url), monthly: D.monthly.filter((o) => o.url) };
  if (D.onceOther) offers.once.push({ amount: null, url: D.onceOther, impact: 'Choose any amount on the next page. Every franc counts.' });
  if (offers.once.length || offers.monthly.length) {
    support.hidden = false;
    for (const a of document.querySelectorAll('[data-support-link]')) a.hidden = false;
    const amounts = support.querySelector('[data-support-amounts]');
    const impact = support.querySelector('[data-support-impact]');
    const go = support.querySelector('[data-support-go]');
    const freqButtons = [...support.querySelectorAll('[data-freq]')];
    let freq = offers.once.length ? 'once' : 'monthly', choice = null;
    if (!offers.once.length || !offers.monthly.length) freqButtons[0].parentElement.hidden = true;
    const render = () => {
      const list = offers[freq];
      if (!list.includes(choice)) choice = list.find((o) => o.suggested) || list[0];
      for (const b of freqButtons) b.setAttribute('aria-pressed', String(b.dataset.freq === freq));
      amounts.replaceChildren(...list.map((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(o === choice));
        if (o.amount === null) { b.className = 'other'; b.textContent = 'Other amount'; }
        else {
          b.textContent = `${D.currency} ${o.amount}`;
          if (o.suggested) { const s = document.createElement('small'); s.textContent = 'Suggested'; b.append(s); }
        }
        b.addEventListener('click', () => { choice = o; render(); });
        return b;
      }));
      impact.textContent = choice.impact;
      go.href = choice.url;
      go.textContent = choice.amount === null ? 'Choose your amount'
        : `Donate ${D.currency} ${choice.amount}${freq === 'monthly' ? ' a month' : ''}`;
    };
    for (const b of freqButtons) b.addEventListener('click', () => { freq = b.dataset.freq; render(); });
    go.addEventListener('click', () => collect('donate', `${freq} ${choice.amount ?? 'other'}`));
    render();
    if (new URLSearchParams(location.search).has('thanks')) {
      support.querySelector('[data-support-form]').hidden = true;
      support.querySelector('[data-support-thanks]').hidden = false;
      collect('donate-thanks');
      support.scrollIntoView({ block: 'center' });
    }
  }
}
