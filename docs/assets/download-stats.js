// Download dashboard: GitHub's live download counts per release ZIP and the
// website counter. The page is served at stats.neurofly.app by the Worker
// `neurofly-stats`, behind Cloudflare Access; this script holds no data, it
// builds the page, reads the figures from the same origin, and stores GitHub's
// live totals there as today's snapshot.
(() => {
  document.body.innerHTML = `
<header class="dl-head">
  <div class="wrap bar">
    <div>
      <span class="kicker">Intern · nur mit Anmeldung</span>
      <h1>Downloads</h1>
      <div class="meta" id="updated">Lade Zahlen …</div>
    </div>
    <button class="btn secondary" id="refresh" type="button">Aktualisieren</button>
  </div>
</header>
<main class="wrap dl-main">
  <p class="status" id="status" hidden></p>
  <section class="dl-facts facts" aria-label="Übersicht">
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
  <section class="dl-panel" aria-labelledby="h-versions">
    <h2 id="h-versions">Pro Version</h2>
    <p class="sub">Windows-Build (ZIP) jeder Veröffentlichung.</p>
    <div class="table-wrap dl-table">
      <table class="dl">
        <thead><tr><th>Version</th><th>Insgesamt</th><th>Webseite</th><th>GitHub direkt</th></tr></thead>
        <tbody id="versions"><tr><td colspan="4">–</td></tr></tbody>
      </table>
    </div>
  </section>
  <ul class="notes">
    <li>„Insgesamt“ ist GitHubs eigener Zähler: jeder Abruf der ZIP-Datei, egal ob über die Webseite oder direkt auf
      GitHub. GitHub zählt auch abgebrochene Downloads und automatische Abrufe.</li>
    <li>„Webseite“ zählt jeden Klick auf den Download-Button, der einen Download startet. Suchmaschinen, Link-Vorschauen
      und Prüfdienste werden nicht gezählt. Gespeichert werden nur Datum und Datei.</li>
    <li>„Direkt auf GitHub“ ist die Differenz der beiden. Sie kann kurzzeitig leicht abweichen, wenn ein Download über
      die Webseite gestartet, aber nicht abgeschlossen wurde.</li>
  </ul>
</main>`;

  const REPO = 'neuroflyapp/neurofly';
  const ZIP = /^NeuroFly-\d+\.\d+\.\d+-win-x64\.zip$/;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString('de-CH');
  const version = (file) => (file.match(/NeuroFly-(\d+\.\d+\.\d+)-/) || [])[1] || file;

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

  function render(releases, stats) {
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
    const ghDay = new Map();
    for (const f of files) {
      const totals = new Map(stats.github.filter((r) => r.file === f.file).map((r) => [r.day, r.total]));
      totals.set(today, Math.max(totals.get(today) || 0, f.total)); // live value for today
      const webRows = web.filter((r) => r.file === f.file);
      let prev = 0;
      for (const d of [...totals.keys()].sort()) {
        const direct = totals.get(d) - webRows.reduce((s, r) => s + (r.day <= d ? r.n : 0), 0);
        if (direct > prev) { ghDay.set(d, (ghDay.get(d) || 0) + direct - prev); prev = direct; }
      }
    }
    const webDay = new Map();
    for (const r of web) webDay.set(r.day, (webDay.get(r.day) || 0) + r.n);
    const series = span.map((d) => ({ d, w: webDay.get(d) || 0, g: ghDay.get(d) || 0 }));
    const t = series[series.length - 1];
    $('f-today').textContent = fmt(t.w + t.g);
    $('f-today-split').textContent = `Webseite ${fmt(t.w)} / GitHub ${fmt(t.g)}`;
    drawChart(series);

    const rows = files.slice().sort((a, b) => version(b.file).localeCompare(version(a.file), undefined, { numeric: true }));
    $('versions').replaceChildren(...(rows.length ? rows.map((f) => {
      const w = webBy(f.file);
      const tr = document.createElement('tr');
      for (const v of [version(f.file), fmt(f.total), fmt(w), fmt(Math.max(0, f.total - w))]) {
        const td = document.createElement('td'); td.textContent = v; tr.append(td);
      }
      return tr;
    }) : [(() => { const tr = document.createElement('tr'); tr.innerHTML = '<td colspan="4">Noch keine Veröffentlichung</td>'; return tr; })()]));

    $('updated').textContent = `Stand ${new Date().toLocaleString('de-CH')} · GitHub live` + (stats.generated ? `, Webseite ${new Date(stats.generated).toLocaleTimeString('de-CH')}` : '');
  }

  function drawChart(series) {
    const svg = $('chart');
    const W = 900, H = 240, L = 40, R = 8, T = 12, B = 34;
    const max = Math.max(1, ...series.map((s) => s.w + s.g));
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
      if (s.w) nodes.push(el('rect', { x, y: y(s.w), width: w, height: y(0) - y(s.w), fill: 'var(--accent)', rx: 2 }));
      if (s.g) nodes.push(el('rect', { x, y: y(s.w + s.g), width: w, height: y(s.w) - y(s.w + s.g), fill: '#9fb3aa', rx: 2 }));
      if (i % 5 === 4 || i === series.length - 1) nodes.push(el('text', { x: L + i * bw + bw / 2, y: H - 12, 'text-anchor': 'middle' }, s.d.slice(8, 10) + '.' + s.d.slice(5, 7) + '.'));
    });
    svg.replaceChildren(...nodes);
  }

  function niceStep(max) {
    const raw = max / 4;
    const p = 10 ** Math.floor(Math.log10(raw));
    // Downloads are whole numbers: never a step below 1.
    return Math.max(1, [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) || p * 10);
  }

  async function load() {
    $('status').hidden = true;
    $('refresh').disabled = true;
    try {
      const [gh, site] = await Promise.allSettled([
        getJSON(`https://api.github.com/repos/${REPO}/releases?per_page=100`),
        getJSON('/data.json'),
      ]);
      if (gh.status === 'rejected') throw gh.reason;
      // Without the website counter, GitHub's totals still show; the split waits for the counter.
      const stats = site.status === 'fulfilled' ? site.value : { website: [], github: [], generated: null };
      render(gh.value, stats);
      storeSnapshot(gh.value);
      if (site.status === 'rejected') {
        $('status').textContent = 'Die Zahlen des Webseiten-Zählers sind gerade nicht abrufbar (Anmeldung abgelaufen? Seite neu laden). '
          + 'Angezeigt sind GitHubs Zahlen; „über die Webseite“ fehlt deshalb.';
        $('status').hidden = false;
      }
    } catch (e) {
      $('status').textContent = `Zahlen konnten nicht geladen werden: ${e.message}.`;
      $('status').hidden = false;
    } finally {
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

  $('refresh').addEventListener('click', load);
  load();
})();
