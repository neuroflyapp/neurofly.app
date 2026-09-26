// Statistics dashboard: visitors of neurofly.app (our own counter, no cookies:
// daily totals only) and downloads (GitHub's live download counts per release
// ZIP and the website counter). The page is served at stats.neurofly.app by the
// Worker `neurofly-stats`, behind Cloudflare Access; neurofly.app/login leads
// there. This script holds no data: it builds the page, reads the figures from
// the same origin, and stores GitHub's live totals there as today's snapshot.
(() => {
  document.body.innerHTML = `
<header class="dl-head">
  <div class="wrap bar">
    <div>
      <span class="kicker">Intern · nur mit Anmeldung</span>
      <h1>Statistik</h1>
      <div class="meta" id="updated">Lade Zahlen …</div>
    </div>
    <button class="btn secondary" id="refresh" type="button">Aktualisieren</button>
  </div>
</header>
<main class="wrap dl-main">
  <p class="status" id="status" hidden></p>

  <div class="dl-sectionbar">
    <h2 class="dl-section">Besucher</h2>
    <div class="seg" role="group" aria-label="Zeitraum" id="period">
      <button type="button" data-days="1">Heute</button><button type="button" data-days="7">7 Tage</button><button type="button" data-days="30">30 Tage</button><button type="button" data-days="90">90 Tage</button>
    </div>
  </div>
  <section class="dl-facts facts" aria-label="Besucher, Übersicht">
    <div class="fact total"><b id="s-visitors">–</b><span>Besucher</span><div class="src" id="s-visitors-sub">–</div></div>
    <div class="fact"><b id="s-visits">–</b><span>Besuche</span><div class="src" id="s-visits-sub">–</div></div>
    <div class="fact"><b id="s-pv">–</b><span>Seitenaufrufe</span><div class="src" id="s-pv-sub">–</div></div>
    <div class="fact"><b id="s-bounce">–</b><span>Absprungrate</span><div class="src" id="s-time">–</div></div>
  </section>
  <section class="dl-panel" aria-labelledby="h-trend">
    <h2 id="h-trend">Verlauf</h2>
    <p class="sub" id="trend-sub">–</p>
    <div class="legend"><span><i class="sw-gh"></i>Seitenaufrufe</span><span><i class="sw-web"></i>Besucher</span></div>
    <svg class="chart" id="chart-views" viewBox="0 0 900 240" role="img" aria-label="Besucher und Seitenaufrufe"></svg>
  </section>
  <section class="dl-panel" aria-labelledby="h-hours">
    <h2 id="h-hours">Tageszeit</h2>
    <p class="sub">Seitenaufrufe im gewählten Zeitraum nach Uhrzeit, in der Zeitzone dieses Browsers.</p>
    <svg class="chart" id="chart-hours" viewBox="0 0 900 200" role="img" aria-label="Seitenaufrufe nach Tageszeit"></svg>
  </section>
  <div class="dl-grid" id="lists"></div>

  <h2 class="dl-section">Downloads</h2>
  <section class="dl-facts facts" aria-label="Downloads, Übersicht">
    <div class="fact total"><b id="f-total">–</b><span>Downloads insgesamt</span><div class="src">GitHub-Zähler, live</div></div>
    <div class="fact"><b id="f-web">–</b><span>über die Webseite</span><div class="src">get.neurofly.app</div></div>
    <div class="fact"><b id="f-gh">–</b><span>direkt auf GitHub</span><div class="src">insgesamt − Webseite</div></div>
    <div class="fact"><b id="f-today">–</b><span>heute (UTC)</span><div class="src" id="f-today-split">Webseite / GitHub</div></div>
  </section>
  <section class="dl-panel" aria-labelledby="h-days">
    <h2 id="h-days">Pro Tag</h2>
    <p class="sub">Letzte 30 Tage, UTC. GitHub-Direktdownloads pro Tag stammen aus gespeicherten Zählerständen (stündlich, und bei jedem Öffnen dieser Seite); was vor dem ersten gespeicherten Stand direkt auf GitHub geladen wurde, zählt zu dessen Tag.</p>
    <div class="legend"><span><i class="sw-web"></i>Webseite</span><span><i class="sw-gh"></i>direkt auf GitHub</span></div>
    <svg class="chart" id="chart" viewBox="0 0 900 240" role="img" aria-label="Downloads pro Tag"></svg>
  </section>
  <section class="dl-panel" aria-labelledby="h-byversion">
    <h2 id="h-byversion">Pro Tag und Version</h2>
    <p class="sub">Letzte 30 Tage, UTC: Downloads (Webseite und GitHub direkt) jeder Veröffentlichung; gestrichelt der Tag der Veröffentlichung.</p>
    <div class="legend" id="version-legend"></div>
    <svg class="chart" id="chart-versions" viewBox="0 0 900 240" role="img" aria-label="Downloads pro Tag und Version"></svg>
  </section>
  <section class="dl-panel" aria-labelledby="h-versions">
    <h2 id="h-versions">Pro Version</h2>
    <p class="sub">Windows-Build (ZIP) jeder Veröffentlichung.</p>
    <div class="table-wrap dl-table">
      <table class="dl">
        <thead><tr><th>Version</th><th>Veröffentlicht</th><th>Insgesamt</th><th>Webseite</th><th>GitHub direkt</th><th>Ø pro Tag</th></tr></thead>
        <tbody id="versions"><tr><td colspan="6">–</td></tr></tbody>
      </table>
    </div>
  </section>
  <ul class="notes">
    <li>Besucherzahlen kommen aus unserem eigenen Zähler, unabhängig von der Cookie-Wahl: gespeichert werden nur Tagessummen.
      Besucher werden je UTC-Tag unterschieden (über einen täglich neuen, danach gelöschten Zufallswert, nie über Cookies
      oder gespeicherte IP-Adressen); über mehrere Tage summiert, zählt ein wiederkehrender Besucher also mehrfach. Ein Besuch
      endet nach 30 Minuten ohne Seitenaufruf; «Absprung» ist ein Besuch mit nur einer Seite. Suchmaschinen und Bots werden
      nicht gezählt. Die ausführlichen Werte (Besucher, Herkunft, Geräte …) gibt es ab dem 25.09.2026, Seitenaufrufe seit dem 24.09.</li>
    <li>„Downloads insgesamt“ ist GitHubs eigener Zähler: jeder Abruf der ZIP-Datei, egal ob über die Webseite oder direkt auf
      GitHub. GitHub zählt auch abgebrochene Downloads und automatische Abrufe.</li>
    <li>„Über die Webseite“ zählt jeden Klick auf den Download-Button, der einen Download startet. Suchmaschinen, Link-Vorschauen
      und Prüfdienste werden nicht gezählt. Gespeichert werden nur Datum und Datei.</li>
    <li>„Direkt auf GitHub“ ist die Differenz der beiden. Sie kann kurzzeitig leicht abweichen, wenn ein Download über
      die Webseite gestartet, aber nicht abgeschlossen wurde.</li>
  </ul>
</main>`;

  const REPO = 'neuroflyapp/neurofly';
  const ZIP = /^NeuroFly-\d+\.\d+\.\d+-win-x64\.zip$/;
  const TOP = 10;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString('de-CH');
  const pct = (x) => `${(100 * x).toLocaleString('de-CH', { maximumFractionDigits: 0 })} %`;
  const version = (file) => (file.match(/NeuroFly-(\d+\.\d+\.\d+)-/) || [])[1] || file;
  const dayLabel = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
  const duration = (ms) => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} s`; };
  const regionNames = new Intl.DisplayNames(['de-CH'], { type: 'region' });
  const languageNames = new Intl.DisplayNames(['de-CH'], { type: 'language' });
  const flag = (cc) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '');
  const country = (cc) => { try { return `${flag(cc)} ${regionNames.of(cc)}`; } catch { return cc; } };
  const place = (k) => { const [cc, name] = k.split(' · '); return name ? `${flag(cc)} ${name}` : k; };
  const language = (l) => { try { return l === 'unbekannt' ? l : `${languageNames.of(l)}`; } catch { return l; } };
  const pageName = (p) => (p === '/' ? 'Startseite' : p);
  // metric, title, label, value (count, average time, average percent)
  const LISTS = [
    ['pv', 'Seiten', pageName], ['entry', 'Einstiegsseiten', pageName], ['ref', 'Herkunft'],
    ['utm_source', 'Kampagnen · Quelle'], ['utm_medium', 'Kampagnen · Medium'], ['utm_campaign', 'Kampagnen · Name'],
    ['country', 'Länder', country], ['region', 'Regionen', place], ['city', 'Orte', place],
    ['device', 'Geräte'], ['browser', 'Browser'], ['os', 'Betriebssysteme'], ['screen', 'Bildschirmbreite'], ['lang', 'Sprachen', language],
    ['engaged', 'Lesezeit pro Seite', pageName, 'time'], ['scroll', 'Gelesen (Scrolltiefe) pro Seite', pageName, 'percent'],
    ['scrolldepth', 'Scrolltiefe'], ['event', 'Ereignisse'], ['outbound', 'Links zu anderen Seiten'], ['404', 'Nicht gefunden (404)'],
  ];

  const VERSION_COLORS = ['#0b7a47', '#2a78d6', '#eb6834', '#9b59b6', '#c9a227', '#1baf7a', '#7f8c8d'];
  let data = null, period = 30;
  // Release days (UTC) -> versions, from GitHub's release list.
  const releaseMarks = (span, releases) => {
    const at = new Map(span.map((d, i) => [d, i]));
    return (releases || []).filter((r) => r.published_at && at.has(r.published_at.slice(0, 10)))
      .map((r) => ({ index: at.get(r.published_at.slice(0, 10)), label: r.tag_name }));
  };
  try { period = Number(localStorage.getItem('nf-stats-period')) || 30; } catch { /* default */ }

  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${new URL(url, location.href).host} antwortet mit ${r.status}`);
    return r.json();
  }

  function days(n) {
    const out = [];
    const d = new Date();
    for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - i)).toISOString().slice(0, 10));
    return out;
  }

  function tableRow(cells) {
    const tr = document.createElement('tr');
    for (const v of cells) {
      const td = document.createElement('td'); td.textContent = v; tr.append(td);
    }
    return tr;
  }

  function emptyRow(cols, text) {
    const tr = document.createElement('tr');
    const td = document.createElement('td'); td.colSpan = cols; td.textContent = text; tr.append(td);
    return tr;
  }

  // Site statistics: the first counter's page views (table pageviews) count as
  // metric 'pv' too.
  function siteRows(stats) {
    return [...(stats.stats || []), ...(stats.pageviews || []).map((r) => ({ day: r.day, metric: 'pv', key: r.page, n: r.n, sum: 0 }))];
  }

  function renderSite() {
    if (!data) return;
    for (const b of $('period').children) b.setAttribute('aria-pressed', String(Number(b.dataset.days) === period));
    const span = days(period), inSpan = new Set(span);
    const rows = data.site.filter((r) => inSpan.has(r.day));
    const total = (metric) => rows.reduce((s, r) => s + (r.metric === metric ? r.n : 0), 0);
    const visitors = total('visitors'), visits = total('visits'), pv = total('pv'), bounces = total('bounces');
    const visitDays = new Set(rows.filter((r) => r.metric === 'visits').map((r) => r.day));
    const pvWithVisits = rows.reduce((s, r) => s + (r.metric === 'pv' && visitDays.has(r.day) ? r.n : 0), 0);
    const engaged = rows.filter((r) => r.metric === 'engaged');
    const engagedN = engaged.reduce((s, r) => s + r.n, 0), engagedMs = engaged.reduce((s, r) => s + r.sum, 0);
    const perDay = (x) => (period > 1 ? `Ø ${fmt(Math.round(x / period))} pro Tag` : 'heute (UTC)');
    $('s-visitors').textContent = fmt(visitors);
    $('s-visitors-sub').textContent = period > 1 ? `${perDay(visitors)} · je Tag eindeutig` : 'heute, eindeutig';
    $('s-visits').textContent = fmt(visits);
    $('s-visits-sub').textContent = visits ? `Ø ${(pvWithVisits / visits).toLocaleString('de-CH', { maximumFractionDigits: 1 })} Seiten pro Besuch` : '–';
    $('s-pv').textContent = fmt(pv);
    $('s-pv-sub').textContent = perDay(pv);
    $('s-bounce').textContent = visits ? pct(bounces / visits) : '–';
    $('s-time').textContent = engagedN ? `Ø ${duration(engagedMs / engagedN)} Lesezeit pro Seite` : 'Lesezeit: noch keine Daten';

    // Trend: per day, or per hour for today.
    const hourOf = (h) => (Number(h) - new Date().getTimezoneOffset() / 60 + 24) % 24;
    if (period === 1) {
      $('trend-sub').textContent = 'Heute: Seitenaufrufe nach Stunde (Zeitzone dieses Browsers); Besucher gibt es nur pro Tag.';
      const byHour = new Array(24).fill(0);
      for (const r of rows) if (r.metric === 'hour') byHour[hourOf(r.key)] += r.n;
      drawChart($('chart-views'), byHour.map((v, h) => ({ parts: [v, 0], label: h % 3 === 0 ? `${String(h).padStart(2, '0')} h` : null })), ['#9fb3aa', 'var(--accent)'], { overlay: true });
    } else {
      $('trend-sub').textContent = `Letzte ${period} Tage, UTC. Besucher je Tag eindeutig.`;
      const byDay = (metric) => { const m = new Map(); for (const r of rows) if (r.metric === metric) m.set(r.day, (m.get(r.day) || 0) + r.n); return m; };
      const pvDay = byDay('pv'), visDay = byDay('visitors');
      const every = period <= 7 ? 1 : period <= 30 ? 5 : 15;
      drawChart($('chart-views'), span.map((d, i) => ({ parts: [pvDay.get(d) || 0, visDay.get(d) || 0],
        label: i % every === every - 1 || i === span.length - 1 ? dayLabel(d) : null })), ['#9fb3aa', 'var(--accent)'],
        { overlay: true, marks: releaseMarks(span, data.releases) });
    }
    const hours = new Array(24).fill(0);
    for (const r of rows) if (r.metric === 'hour') hours[hourOf(r.key)] += r.n;
    drawChart($('chart-hours'), hours.map((v, h) => ({ parts: [v], label: h % 3 === 0 ? `${String(h).padStart(2, '0')}` : null })), ['var(--accent)'], { height: 200 });

    $('lists').replaceChildren(...LISTS.map(([metric, title, name = (k) => k, value = 'count']) => {
      const agg = new Map();
      for (const r of rows) {
        if (r.metric !== metric) continue;
        const a = agg.get(r.key) || { n: 0, sum: 0 };
        a.n += r.n; a.sum += r.sum;
        agg.set(r.key, a);
      }
      const all = [...agg].filter(([, a]) => a.n > 0).sort((x, y) => y[1].n - x[1].n);
      const max = Math.max(1, ...all.map(([, a]) => a.n));
      const sumN = all.reduce((s, [, a]) => s + a.n, 0);
      const card = document.createElement('section');
      card.className = 'dl-panel dl-list';
      const h = document.createElement('h3'); h.textContent = title;
      const list = document.createElement('ol');
      for (const [key, a] of all.slice(0, TOP)) {
        const li = document.createElement('li');
        const label = document.createElement('span'); label.className = 'k'; label.textContent = name(key) || '–'; label.title = key;
        const val = document.createElement('span'); val.className = 'v';
        val.textContent = value === 'time' ? duration(a.sum / a.n) : value === 'percent' ? `${Math.round(a.sum / a.n)} %` : `${fmt(a.n)} · ${pct(a.n / sumN)}`;
        const bar = document.createElement('i'); bar.style.setProperty('--w', (a.n / max).toFixed(3));
        li.append(label, val, bar);
        list.append(li);
      }
      if (!all.length) { const li = document.createElement('li'); li.className = 'none'; li.textContent = 'Noch keine Daten'; list.append(li); }
      else if (all.length > TOP) { const li = document.createElement('li'); li.className = 'none'; li.textContent = `und ${all.length - TOP} weitere`; list.append(li); }
      card.append(h, list);
      return card;
    }));
  }

  function renderDownloads(releases, stats) {
    const files = [];
    for (const r of releases) for (const a of r.assets) if (ZIP.test(a.name)) files.push({ file: a.name, total: a.download_count });
    // Only published files count: the test path v0.0.0 and mistyped versions are not downloads.
    const published = new Set(files.map((f) => f.file));
    const web = stats.website.filter((row) => published.has(row.file));
    const webBy = (file) => web.filter((r) => r.file === file).reduce((s, r) => s + r.n, 0);

    const total = files.reduce((s, f) => s + f.total, 0);
    const webTotal = web.reduce((s, r) => s + r.n, 0);
    $('f-total').textContent = fmt(total);
    $('f-web').textContent = fmt(webTotal);
    $('f-gh').textContent = fmt(Math.max(0, total - webTotal));

    // Per day and file: direct GitHub downloads so far = GitHub's total - website downloads so far;
    // a day's share is the growth since the previous stored total (all earlier ones land on the
    // first stored day), so the bars add up to the totals above.
    const span = days(30);
    const today = span[span.length - 1];
    const ghDay = new Map(), ghFileDay = new Map();
    for (const f of files) {
      const own = new Map();
      ghFileDay.set(f.file, own);
      const totals = new Map(stats.github.filter((r) => r.file === f.file).map((r) => [r.day, r.total]));
      totals.set(today, Math.max(totals.get(today) || 0, f.total)); // live value for today
      const webRows = web.filter((r) => r.file === f.file);
      let prev = 0;
      for (const d of [...totals.keys()].sort()) {
        const direct = totals.get(d) - webRows.reduce((s, r) => s + (r.day <= d ? r.n : 0), 0);
        if (direct > prev) { ghDay.set(d, (ghDay.get(d) || 0) + direct - prev); own.set(d, direct - prev); prev = direct; }
      }
    }
    const webDay = new Map();
    for (const r of web) webDay.set(r.day, (webDay.get(r.day) || 0) + r.n);
    const series = span.map((d) => ({ d, w: webDay.get(d) || 0, g: ghDay.get(d) || 0 }));
    const t = series[series.length - 1];
    $('f-today').textContent = fmt(t.w + t.g);
    $('f-today-split').textContent = `Webseite ${fmt(t.w)} / GitHub ${fmt(t.g)}`;
    const marks = releaseMarks(span, releases);
    drawChart($('chart'), series.map((s, i) => ({ parts: [s.w, s.g], label: i % 5 === 4 || i === series.length - 1 ? dayLabel(s.d) : null })),
      ['var(--accent)', '#9fb3aa'], { marks });

    // Per day and version: website + direct GitHub downloads of each release's ZIP.
    const byVersion = files.slice().sort((a, b) => version(a.file).localeCompare(version(b.file), undefined, { numeric: true }));
    const fills = byVersion.map((_, k) => VERSION_COLORS[k % VERSION_COLORS.length]);
    const legend = $('version-legend');
    legend.replaceChildren(...byVersion.map((f, k) => {
      const item = document.createElement('span'); const sw = document.createElement('i');
      sw.style.background = fills[k]; item.append(sw, document.createTextNode(version(f.file)));
      return item;
    }));
    drawChart($('chart-versions'), span.map((d, i) => ({
      parts: byVersion.map((f) => web.reduce((n, r) => n + (r.file === f.file && r.day === d ? r.n : 0), 0) + (ghFileDay.get(f.file)?.get(d) || 0)),
      label: i % 5 === 4 || i === span.length - 1 ? dayLabel(d) : null })), fills, { marks });

    const releasedAt = new Map();
    for (const r of releases) for (const a of r.assets) if (ZIP.test(a.name) && r.published_at) releasedAt.set(a.name, r.published_at);
    const rows = files.slice().sort((a, b) => version(b.file).localeCompare(version(a.file), undefined, { numeric: true }));
    $('versions').replaceChildren(...(rows.length ? rows.map((f) => {
      const w = webBy(f.file);
      const at = releasedAt.get(f.file);
      const daysOut = at ? Math.max(1, (Date.now() - Date.parse(at)) / 864e5) : null;
      return tableRow([version(f.file), at ? new Date(at).toLocaleDateString('de-CH') : '–', fmt(f.total), fmt(w), fmt(Math.max(0, f.total - w)),
        daysOut ? (f.total / daysOut).toLocaleString('de-CH', { maximumFractionDigits: 1 }) : '–']);
    }) : [emptyRow(6, 'Noch keine Veröffentlichung')]));
  }

  // Bars per slot: parts[k] in fills[k], stacked from the bottom, or (overlay)
  // each drawn from the baseline over the previous one.
  function drawChart(svg, series, fills, { overlay = false, height = 240, marks = [] } = {}) {
    const W = 900, H = height, L = 40, R = 8, T = 12, B = 34;
    const heightOf = (s) => (overlay ? Math.max(...s.parts) : s.parts.reduce((a, b) => a + b, 0));
    const max = Math.max(1, ...series.map(heightOf));
    const step = niceStep(max);
    const top = Math.ceil(max / step) * step;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const bw = (W - L - R) / series.length;
    const ns = 'http://www.w3.org/2000/svg';
    const el = (name, attrs, text) => { const e = document.createElementNS(ns, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
    const nodes = [];
    for (let v = 0; v <= top; v += step) {
      nodes.push(el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--rule)', 'stroke-width': 1 }));
      nodes.push(el('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, fmt(v)));
    }
    series.forEach((s, i) => {
      const x = L + i * bw + bw * 0.18, w = bw * 0.64;
      let base = 0;
      s.parts.forEach((v, k) => {
        const from = overlay ? 0 : base;
        if (v) nodes.push(el('rect', { x: overlay && k ? x + w * 0.2 : x, y: y(from + v), width: overlay && k ? w * 0.6 : w, height: y(from) - y(from + v), fill: fills[k], rx: 2 }));
        base += v;
      });
      if (s.label) nodes.push(el('text', { x: L + i * bw + bw / 2, y: H - 12, 'text-anchor': 'middle' }, s.label));
    });
    for (const m of marks) {
      const x = L + m.index * bw + bw / 2;
      nodes.push(el('line', { x1: x, x2: x, y1: T, y2: H - B, stroke: '#eb6834', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }));
      const right = x > W - 90;   // near the right edge the label goes to the left of the line
      nodes.push(el('text', { x: right ? x - 4 : x + 4, y: T + 10, 'text-anchor': right ? 'end' : 'start', fill: '#eb6834' }, m.label));
    }
    svg.replaceChildren(...nodes);
  }

  function niceStep(max) {
    const raw = max / 4;
    const p = 10 ** Math.floor(Math.log10(raw));
    // Counts are whole numbers: never a step below 1.
    return Math.max(1, [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) || p * 10);
  }

  async function load() {
    $('status').hidden = true;
    $('refresh').disabled = true;
    const problems = [];
    try {
      const [gh, site] = await Promise.allSettled([
        getJSON(`https://api.github.com/repos/${REPO}/releases?per_page=100`),
        getJSON('/data.json'),
      ]);
      const stats = site.status === 'fulfilled' ? site.value : null;
      if (stats) { data = { site: siteRows(stats) }; renderSite(); }
      else problems.push('Die eigenen Zahlen (Besucher, Webseiten-Downloads) sind gerade nicht abrufbar – Anmeldung abgelaufen? Seite neu laden.');
      if (gh.status === 'fulfilled') {
        if (data) { data.releases = gh.value; renderSite(); }
        // Without the counter's figures, GitHub's totals still show; the split waits for them.
        renderDownloads(gh.value, stats || { website: [], github: [] });
        storeSnapshot(gh.value);
      } else {
        problems.push(`GitHubs Download-Zahlen konnten nicht geladen werden: ${gh.reason.message}.`);
      }
      $('updated').textContent = `Stand ${new Date().toLocaleString('de-CH')}` + (gh.status === 'fulfilled' ? ' · GitHub live' : '')
        + (stats?.generated ? `, eigene Zahlen ${new Date(stats.generated).toLocaleTimeString('de-CH')}` : '');
    } catch (e) {
      problems.push(`Zahlen konnten nicht angezeigt werden: ${e.message}.`);
    } finally {
      if (problems.length) {
        $('status').textContent = problems.join(' ');
        $('status').hidden = false;
      }
      $('refresh').disabled = false;
    }
  }

  // GitHub usually refuses the hourly cron's unauthenticated calls from
  // Cloudflare's shared addresses; the viewer's browser reads the same totals
  // fine, so each visit keeps today's snapshot current.
  function storeSnapshot(releases) {
    const files = [];
    for (const r of releases) for (const a of r.assets) if (ZIP.test(a.name)) files.push({ file: a.name, total: a.download_count });
    if (files.length) fetch('/snapshot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(files) }).catch(() => {});
  }

  $('period').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-days]');
    if (!b) return;
    period = Number(b.dataset.days);
    try { localStorage.setItem('nf-stats-period', String(period)); } catch { /* per session */ }
    renderSite();
  });
  $('refresh').addEventListener('click', load);
  load();
})();
