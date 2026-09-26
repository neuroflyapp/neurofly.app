// NeuroFly download counter and site statistics (Cloudflare Worker
// `neurofly-downloads` at get.neurofly.app, D1 binding `DB`). Public: it holds
// no figures anyone can read; the dashboard is `neurofly-stats` (stats-worker.js).
//
// GET  /v2.1.0  counts one website download of that release's Windows build
//               (date and file name only) and redirects to the file on GitHub.
// POST /collect site statistics without cookies (docs/assets/site.js sends
//               them with navigator.sendBeacon): page views, visits, visitors,
//               referrers, campaigns, approximate location, device, browser,
//               system, screen, language, time on page, scrolling and events.
//               Only daily totals are stored. Visitors are told apart for one
//               UTC day by a hash of a random daily salt, the IP address and the
//               browser's user agent; the salt and the hashes are deleted after
//               that day (cron), the IP address is never stored.
// POST /view    the first, simpler page counter (page views only); kept for
//               pages still cached with the old script.
// GET  /stats   moved: redirects to the dashboard at stats.neurofly.app.
// Cron          hourly: GitHub's total download count per file (GitHub page
//               downloads = GitHub total - website downloads; a secret
//               GITHUB_TOKEN makes GitHub answer reliably), and deletion of
//               past days' salts and visitor hashes.
//
// Deploy: npm run deploy:counter (wrangler.counter.toml).
//
// Schema:
//   CREATE TABLE downloads (day TEXT NOT NULL, file TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, file));
//   CREATE TABLE github_totals (day TEXT NOT NULL, file TEXT NOT NULL, total INTEGER NOT NULL, PRIMARY KEY (day, file));
//   CREATE TABLE pageviews (day TEXT NOT NULL, page TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, page));
//   CREATE TABLE stats (day TEXT NOT NULL, metric TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, sum REAL NOT NULL DEFAULT 0, PRIMARY KEY (day, metric, key));
//   CREATE TABLE visitors (day TEXT NOT NULL, id TEXT NOT NULL, last INTEGER NOT NULL, vviews INTEGER NOT NULL, PRIMARY KEY (day, id));
//   CREATE TABLE salts (day TEXT PRIMARY KEY, salt TEXT NOT NULL);

const REPO = 'neuroflyapp/neurofly';
const SITE = 'https://neurofly.app';
const NOT_A_VISITOR = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|skype|monitor|pingdom|uptime|lighthouse|headless|python-requests|go-http-client|okhttp|curl|wget/i;
const PAGE_PATH = /^\/(?:[a-z0-9-]{1,40}(?:\.html)?)?$/;
const VISIT_GAP_MS = 30 * 60 * 1000;

const page = (path) => path.replace(/\.html$/, '').replace(/^\/index$/, '/');
const token = (s, n = 40) => String(s ?? '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n);
const label = (s, n = 60) => String(s ?? '').replace(/[\u0000-\u001f<>"'`]/g, '').trim().slice(0, n);

function device(ua) {
  if (/ipad|tablet|playbook|silk|kindle|android(?!.*mobile)/i.test(ua)) return 'Tablet';
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'Handy';
  return 'Computer';
}
function browser(ua) {
  if (/edg(e|a|ios)?\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios|chromium/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'andere';
}
function system(ua) {
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'andere';
}
function screenClass(w) {
  w = Number(w);
  if (!(w > 0)) return 'unbekannt';
  return w < 576 ? '< 576 px' : w < 992 ? '576–991 px' : w < 1440 ? '992–1439 px' : w < 1920 ? '1440–1919 px' : '≥ 1920 px';
}
function refHost(ref) {
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    return h === 'neurofly.app' || h.endsWith('.neurofly.app') ? null : h.slice(0, 60);
  } catch { return '(direkt)'; }
}

async function sha256hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function dailySalt(db, day) {
  let row = await db.prepare('SELECT salt FROM salts WHERE day = ?1').bind(day).first();
  if (row) return row.salt;
  const fresh = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('INSERT OR IGNORE INTO salts (day, salt) VALUES (?1, ?2)').bind(day, fresh).run();
  row = await db.prepare('SELECT salt FROM salts WHERE day = ?1').bind(day).first();
  return row.salt;
}

async function collect(text, request, env, day) {
  if (text.length > 2000) return;
  let m;
  try { m = JSON.parse(text); } catch { return; }
  if (!m || typeof m.p !== 'string' || !PAGE_PATH.test(m.p)) return;
  const db = env.DB, p = page(m.p), now = Date.now();
  const rows = [];
  const add = (metric, key, n = 1, sum = 0) => rows.push(db.prepare(
    'INSERT INTO stats (day, metric, key, n, sum) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (day, metric, key) DO UPDATE SET n = n + excluded.n, sum = sum + excluded.sum',
  ).bind(day, metric, String(key), n, sum));

  if (m.t === 'pv') {
    const ua = request.headers.get('user-agent') || '';
    const ip = request.headers.get('cf-connecting-ip') || '';
    const id = (await sha256hex(`${await dailySalt(db, day)}|${ip}|${ua}`)).slice(0, 20);
    const seen = await db.prepare('SELECT last, vviews FROM visitors WHERE day = ?1 AND id = ?2').bind(day, id).first();
    const newVisit = !seen || now - seen.last > VISIT_GAP_MS;
    add('pv', p);
    add('hour', String(new Date(now).getUTCHours()).padStart(2, '0'));
    if (m.nf) add('404', label(m.nf, 80));
    if (!seen) {
      const cf = request.cf || {};
      add('visitors', '');
      add('country', cf.country || '??');
      if (cf.region) add('region', `${cf.country || '??'} · ${label(cf.region, 40)}`);
      if (cf.city) add('city', `${cf.country || '??'} · ${label(cf.city, 40)}`);
      add('device', device(ua));
      add('browser', browser(ua));
      add('os', system(ua));
      add('screen', screenClass(m.w));
      add('lang', token((request.headers.get('accept-language') || '').split(/[,;-]/)[0], 8) || 'unbekannt');
    }
    if (newVisit) {
      add('visits', '');
      add('bounces', '');
      add('entry', p);
      const host = m.r ? refHost(m.r) : '(direkt)';
      if (host) add('ref', host);
      if (m.us) add('utm_source', token(m.us));
      if (m.um) add('utm_medium', token(m.um));
      if (m.uc) add('utm_campaign', token(m.uc));
      rows.push(db.prepare('INSERT INTO visitors (day, id, last, vviews) VALUES (?1, ?2, ?3, 1) ON CONFLICT (day, id) DO UPDATE SET last = ?3, vviews = 1').bind(day, id, now));
    } else {
      if (seen.vviews === 1) add('bounces', '', -1);        // a second page: not a bounce after all
      rows.push(db.prepare('UPDATE visitors SET last = ?3, vviews = vviews + 1 WHERE day = ?1 AND id = ?2').bind(day, id, now));
    }
  } else if (m.t === 'end') {
    const ms = Math.round(Number(m.ms));
    if (ms > 0 && ms < 4 * 3600 * 1000) add('engaged', p, 1, Math.min(ms, 30 * 60 * 1000));
    const sc = Math.round(Number(m.sc));
    if (sc >= 0 && sc <= 100) {
      add('scroll', p, 1, sc);
      add('scrolldepth', sc >= 90 ? '90–100 %' : sc >= 75 ? '75–89 %' : sc >= 50 ? '50–74 %' : sc >= 25 ? '25–49 %' : '0–24 %');
    }
  } else if (m.t === 'ev') {
    const name = token(m.n, 30);
    if (!name) return;
    if (name === 'outbound') add('outbound', label(m.v, 60));
    else add('event', m.v ? `${name} · ${label(m.v, 50)}` : name);
  } else return;
  if (rows.length) await db.batch(rows);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const agent = request.headers.get('user-agent') || '';
    const visitor = agent !== '' && !NOT_A_VISITOR.test(agent);
    const day = new Date().toISOString().slice(0, 10);
    const fromSite = request.headers.get('origin') === SITE;
    if (url.pathname === '/collect' || url.pathname === '/view') {
      if (request.method === 'POST' && visitor && fromSite) {
        // The body is read before responding: once the response is out it can no longer be read.
        if (url.pathname === '/collect') {
          const text = await request.text();
          ctx.waitUntil(collect(text, request, env, day).catch((e) => console.error('collect', e?.message)));
        }
        else {
          const path = (await request.text()).slice(0, 64);
          if (PAGE_PATH.test(path)) ctx.waitUntil(env.DB.prepare(
            'INSERT INTO stats (day, metric, key, n, sum) VALUES (?1, ?2, ?3, 1, 0) ON CONFLICT (day, metric, key) DO UPDATE SET n = n + 1',
          ).bind(day, 'pv', page(path)).run());
        }
      }
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/stats' || url.pathname.startsWith('/stats/')) return Response.redirect('https://stats.neurofly.app/', 301);
    const m = url.pathname.match(/^\/v(\d+\.\d+\.\d+)\/?$/);
    if (!m) return Response.redirect(`${SITE}/#get`, 302);
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
    const day = new Date().toISOString().slice(0, 10);
    // Visitor hashes and their salt live for one UTC day only.
    await env.DB.batch([
      env.DB.prepare('DELETE FROM visitors WHERE day < ?1').bind(day),
      env.DB.prepare('DELETE FROM salts WHERE day < ?1').bind(day),
    ]);
    const headers = { 'user-agent': 'neurofly-download-counter', accept: 'application/vnd.github+json' };
    if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, { headers });
    if (!r.ok) return;
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
