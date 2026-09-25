// NeuroFly download and page counter (Cloudflare Worker `neurofly-downloads` at
// get.neurofly.app, D1 binding `DB`). Public: it holds no figures anyone can read.
//
// GET /v2.1.0  counts one website download of that release's Windows build
//              (date and file name only: no IP address, cookie or identifier
//              is stored) and redirects to the file on GitHub.
// POST /view   counts one page view of neurofly.app: assets/site.js sends the
//              page's path with navigator.sendBeacon. Stored are the date and
//              the page only (no IP address, cookie or identifier; nothing is
//              kept in the browser), so it runs without cookie consent. Only
//              requests from neurofly.app pages count; bots do not.
// GET /stats   moved: the dashboard is the separate Worker `neurofly-stats` at
//              stats.neurofly.app, behind Cloudflare Access (stats-worker.js).
// Cron         once an hour, records GitHub's total download count per file,
//              so website and GitHub downloads can be told apart:
//              GitHub page downloads = GitHub total - website downloads.
//              GitHub usually refuses unauthenticated calls from Cloudflare's
//              shared addresses; with a secret GITHUB_TOKEN (a fine-grained token
//              without any permissions) they succeed. The dashboard also stores
//              the totals whenever it is opened.
//
// Deployment: the dashboard editor mangles multi-line typing, so the deployed copy
// is this file with the comment lines removed and the lines joined by spaces. Keep
// every statement terminated and no comments inside code lines.
//
// Schema:
//   CREATE TABLE downloads (day TEXT NOT NULL, file TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, file));
//   CREATE TABLE github_totals (day TEXT NOT NULL, file TEXT NOT NULL, total INTEGER NOT NULL, PRIMARY KEY (day, file));
//   CREATE TABLE pageviews (day TEXT NOT NULL, page TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, page));

const REPO = 'neuroflyapp/neurofly';
const NOT_A_VISITOR = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|skype|monitor|pingdom|uptime|lighthouse|headless|python-requests|go-http-client|okhttp/i;
const PAGE_PATH = /^\/(?:[a-z0-9-]{1,40}(?:\.html)?)?$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const agent = request.headers.get('user-agent') || '';
    const visitor = agent !== '' && !NOT_A_VISITOR.test(agent);
    const day = new Date().toISOString().slice(0, 10);
    if (url.pathname === '/view') {
      if (request.method === 'POST' && visitor && request.headers.get('origin') === 'https://neurofly.app') {
        const path = (await request.text()).slice(0, 64);
        if (PAGE_PATH.test(path)) {
          const page = path.replace(/\.html$/, '').replace(/^\/index$/, '/');
          ctx.waitUntil(env.DB.prepare(
            'INSERT INTO pageviews (day, page, n) VALUES (?1, ?2, 1) ON CONFLICT (day, page) DO UPDATE SET n = n + 1',
          ).bind(day, page).run());
        }
      }
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/stats' || url.pathname.startsWith('/stats/')) return Response.redirect('https://stats.neurofly.app/', 301);
    const m = url.pathname.match(/^\/v(\d+\.\d+\.\d+)\/?$/);
    if (!m) return Response.redirect('https://neurofly.app/#get', 302);
    const file = `NeuroFly-${m[1]}-win-x64.zip`;
    const target = `https://github.com/${REPO}/releases/download/v${m[1]}/${file}`;
    if (request.method === 'GET' && visitor) {
      ctx.waitUntil(env.DB.prepare(
        'INSERT INTO downloads (day, file, n) VALUES (?1, ?2, 1) ON CONFLICT (day, file) DO UPDATE SET n = n + 1',
      ).bind(day, file).run());
    }
    return new Response(null, { status: 302, headers: { location: target, 'cache-control': 'no-store' } });
  },

  async scheduled(event, env) {
    const headers = { 'user-agent': 'neurofly-download-counter', accept: 'application/vnd.github+json' };
    if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, { headers });
    if (!r.ok) return;
    const day = new Date().toISOString().slice(0, 10);
    const rows = [];
    for (const release of await r.json()) {
      for (const asset of release.assets) {
        if (!asset.name.endsWith('.zip')) continue;
        rows.push(env.DB.prepare(
          'INSERT INTO github_totals (day, file, total) VALUES (?1, ?2, ?3) ON CONFLICT (day, file) DO UPDATE SET total = MAX(total, excluded.total)',
        ).bind(day, asset.name, asset.download_count));
      }
    }
    if (rows.length) await env.DB.batch(rows);
  },
};
