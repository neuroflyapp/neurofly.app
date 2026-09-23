// Download dashboard (download-stats.html): GitHub's live download counts per
// release ZIP and the website counter at get.neurofly.app/stats.
(() => {
  const REPO = 'neuroflyapp/neurofly';
  const TEST_FILE = /-0\.0\.0-/;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString('de-CH');
  const version = (file) => (file.match(/NeuroFly-(\d+\.\d+\.\d+)-/) || [])[1] || file;

  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${new URL(url).host} antwortet mit ${r.status}`);
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
    for (const r of releases) for (const a of r.assets) if (a.name.endsWith('.zip')) files.push({ file: a.name, total: a.download_count });
    const web = stats.website.filter((row) => !TEST_FILE.test(row.file));
    const webBy = (file) => web.filter((r) => r.file === file).reduce((s, r) => s + r.n, 0);

    const total = files.reduce((s, f) => s + f.total, 0);
    const webTotal = web.reduce((s, r) => s + r.n, 0);
    $('f-total').textContent = fmt(total);
    $('f-web').textContent = fmt(webTotal);
    $('f-gh').textContent = fmt(Math.max(0, total - webTotal));

    // Per day: website counts directly; GitHub direct = growth of GitHub's total that day minus website downloads.
    const span = days(30);
    const today = span[span.length - 1];
    const ghDay = new Map();
    const snaps = stats.github.filter((r) => !TEST_FILE.test(r.file));
    for (const f of files) {
      const rows = snaps.filter((r) => r.file === f.file).sort((a, b) => a.day.localeCompare(b.day));
      const last = new Map(rows.map((r) => [r.day, r.total]));
      last.set(today, f.total); // live value for today
      let prev = 0;
      for (const d of [...last.keys()].sort()) {
        const t = last.get(d);
        ghDay.set(d, (ghDay.get(d) || 0) + Math.max(0, t - prev));
        prev = t;
      }
    }
    const webDay = new Map();
    for (const r of web) webDay.set(r.day, (webDay.get(r.day) || 0) + r.n);
    const series = span.map((d) => {
      const w = webDay.get(d) || 0;
      return { d, w, g: Math.max(0, (ghDay.get(d) || 0) - w) };
    });
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
        getJSON('https://get.neurofly.app/stats'),
      ]);
      if (gh.status === 'rejected') throw gh.reason;
      // Without the website counter, GitHub's totals still show; the split waits for the counter.
      const stats = site.status === 'fulfilled' ? site.value : { website: [], github: [], generated: null };
      render(gh.value, stats);
      if (site.status === 'rejected') {
        $('status').textContent = 'Der Webseiten-Zähler (get.neurofly.app) ist von hier aus gerade nicht erreichbar. '
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

  $('refresh').addEventListener('click', load);
  load();
})();
