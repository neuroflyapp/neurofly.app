// NeuroFly download counter (Cloudflare Worker, D1 binding `DB`).
//
// GET /v2.1.0  counts one website download of that release's Windows build
//              (date and file name only: no IP address, cookie or identifier
//              is stored) and redirects to the file on GitHub.
// GET /stats   daily website downloads and GitHub's own download totals, as JSON.
// Cron         once an hour, records GitHub's total download count per file,
//              so website and GitHub downloads can be told apart:
//              GitHub page downloads = GitHub total - website downloads.
//
// Schema:
//   CREATE TABLE downloads (day TEXT NOT NULL, file TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, file));
//   CREATE TABLE github_totals (day TEXT NOT NULL, file TEXT NOT NULL, total INTEGER NOT NULL, PRIMARY KEY (day, file));

const REPO = 'neuroflyapp/neurofly';
// Crawlers, link previews and uptime checkers follow links without downloading anything.
const NOT_A_DOWNLOAD = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|skype|monitor|pingdom|uptime|lighthouse|headless|python-requests|go-http-client|okhttp/i;

const json = (data) => new Response(JSON.stringify(data), {
  headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' },
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/stats') {
      const [web, gh] = await env.DB.batch([
        env.DB.prepare('SELECT day, file, n FROM downloads ORDER BY day, file'),
        env.DB.prepare('SELECT day, file, total FROM github_totals ORDER BY day, file'),
      ]);
      return json({ website: web.results, github: gh.results, generated: new Date().toISOString() });
    }
    const m = url.pathname.match(/^\/v(\d+\.\d+\.\d+)\/?$/);
    if (!m) return Response.redirect('https://neurofly.app/#get', 302);
    const file = `NeuroFly-${m[1]}-win-x64.zip`;
    const target = `https://github.com/${REPO}/releases/download/v${m[1]}/${file}`;
    const agent = request.headers.get('user-agent') || '';
    if (request.method === 'GET' && agent && !NOT_A_DOWNLOAD.test(agent)) {
      const day = new Date().toISOString().slice(0, 10);
      ctx.waitUntil(env.DB.prepare(
        'INSERT INTO downloads (day, file, n) VALUES (?1, ?2, 1) ON CONFLICT (day, file) DO UPDATE SET n = n + 1',
      ).bind(day, file).run());
    }
    return new Response(null, { status: 302, headers: { location: target, 'cache-control': 'no-store' } });
  },

  async scheduled(event, env) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, {
      headers: { 'user-agent': 'neurofly-download-counter', accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return;
    const day = new Date().toISOString().slice(0, 10);
    const rows = [];
    for (const release of await r.json()) {
      for (const asset of release.assets) {
        if (!asset.name.endsWith('.zip')) continue;
        rows.push(env.DB.prepare(
          'INSERT INTO github_totals (day, file, total) VALUES (?1, ?2, ?3) ON CONFLICT (day, file) DO UPDATE SET total = excluded.total',
        ).bind(day, asset.name, asset.download_count));
      }
    }
    if (rows.length) await env.DB.batch(rows);
  },
};
