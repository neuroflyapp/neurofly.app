// NeuroFly download dashboard (Cloudflare Worker `neurofly-stats` at stats.neurofly.app,
// D1 binding `DB` = the counter's database `neurofly-downloads`).
//
// The whole Worker sits behind Cloudflare Access (Worker-level: every hostname,
// workers.dev and preview URL; login by one-time code to contact@neurofly.app).
// It also refuses any request that carries no Access token itself.
//
// GET  /           the dashboard (page shell; its code and styles come from
//                  neurofly.app/assets/download-stats.*, which hold no data)
// GET  /data.json  daily website downloads and GitHub total snapshots
// POST /snapshot   the dashboard, after reading GitHub's live totals in the
//                  viewer's browser, stores them as today's snapshot. The counter's
//                  hourly cron does the same when GitHub answers it; from
//                  Cloudflare's shared addresses GitHub usually refuses
//                  unauthenticated calls.
//
// Deployment: the dashboard editor mangles multi-line typing, so the deployed copy
// is this file with the comment lines removed and the lines joined by spaces. Keep
// every statement terminated and no comments inside code lines.

const PRIVATE = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY' };
const PAGE = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>NeuroFly Downloads</title><link rel="icon" href="https://neurofly.app/brand/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="https://neurofly.app/assets/site.css"><link rel="stylesheet" href="https://neurofly.app/assets/download-stats.css"></head><body><script src="https://neurofly.app/assets/download-stats.js"></script></body></html>';
const PAGE_CSP = "default-src 'none'; script-src https://neurofly.app; style-src https://neurofly.app; img-src https://neurofly.app data:; font-src https://neurofly.app; connect-src 'self' https://api.github.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const ZIP = /^NeuroFly-\d+\.\d+\.\d+-win-x64\.zip$/;
const text = (body, status) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...PRIVATE } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!request.headers.get('cf-access-jwt-assertion')) return text('Login required.', 403);
    if (request.method === 'GET' && url.pathname === '/') return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': PAGE_CSP, ...PRIVATE } });
    if (request.method === 'GET' && url.pathname === '/data.json') {
      const [web, gh] = await env.DB.batch([
        env.DB.prepare('SELECT day, file, n FROM downloads ORDER BY day, file'),
        env.DB.prepare('SELECT day, file, total FROM github_totals ORDER BY day, file'),
      ]);
      return new Response(JSON.stringify({ website: web.results, github: gh.results, generated: new Date().toISOString() }), { headers: { 'content-type': 'application/json', ...PRIVATE } });
    }
    if (request.method === 'POST' && url.pathname === '/snapshot') {
      if (request.headers.get('content-type') !== 'application/json') return text('Unsupported.', 415);
      const list = await request.json().catch(() => null);
      if (!Array.isArray(list) || list.length > 50) return text('Bad request.', 400);
      const good = list.filter((x) => x && typeof x.file === 'string' && ZIP.test(x.file) && Number.isSafeInteger(x.total) && x.total >= 0 && x.total < 1e9);
      if (good.length !== list.length) return text('Bad request.', 400);
      const day = new Date().toISOString().slice(0, 10);
      if (good.length) await env.DB.batch(good.map((x) => env.DB.prepare(
        'INSERT INTO github_totals (day, file, total) VALUES (?1, ?2, ?3) ON CONFLICT (day, file) DO UPDATE SET total = MAX(total, excluded.total)',
      ).bind(day, x.file, x.total)));
      return text('Stored.', 200);
    }
    return text('Not found.', 404);
  },
};
