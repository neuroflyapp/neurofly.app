import test from 'node:test';
import assert from 'node:assert/strict';
import counter from '../worker.js';
import dashboard from '../stats-worker.js';

function database() {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() { writes.push({ sql, values }); return {}; },
            async first() {
              if (sql.includes('FROM salts')) return { salt: 'local-test-salt' };
              if (sql.includes('FROM visitors')) return null;
              return null;
            },
          };
        },
      };
    },
    async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); },
  };
}

async function collect(body, origin = 'https://neuro-cause.com') {
  const db = database(), pending = [];
  const request = new Request('https://get.neurofly.app/collect', {
    method: 'POST',
    headers: { origin, 'user-agent': 'Mozilla/5.0' },
    body: JSON.stringify(body),
  });
  const response = await counter.fetch(request, { DB: db }, { waitUntil(promise) { pending.push(promise); } });
  await Promise.all(pending);
  return { response, writes: db.writes };
}

test('navigation timings are summed only as daily page aggregates', async () => {
  const { response, writes } = await collect({ t: 'perf', c: 1, p: '/science.html', ms: 2400, ttfb: 140 });
  assert.equal(response.status, 204);
  assert.deepEqual(writes.map((row) => row.values.slice(1)), [
    ['perf_load', '/science', 1, 2400],
    ['perf_bucket', '1–3 s', 1, 0],
    ['perf_ttfb', '/science', 1, 140],
  ]);
});

test('invalid timings and other-site beacons do not write data', async () => {
  assert.equal((await collect({ t: 'perf', c: 1, p: '/science', ms: -1, ttfb: 200001 })).writes.length, 0);
  assert.equal((await collect({ t: 'perf', c: 1, p: '/science', ms: 50 }, 'https://other.example')).writes.length, 0);
});

test('404 aggregation never persists the missing URL', async () => {
  const { writes } = await collect({ t: 'pv', p: '/404', nf: '/reset/abc-secret-token' });
  assert.ok(writes.some((row) => row.values[1] === '404' && row.values[2] === 'Pfad'));
  assert.ok(!JSON.stringify(writes).includes('abc-secret-token'));
});

test('baseline pageview never writes a visitor fingerprint or detailed dimensions', async () => {
  const { writes } = await collect({ t: 'pv', p: '/science', r: 'https://example.org/private',
    us: 'secret-campaign', w: 800 });
  assert.deepEqual(writes.map((row) => row.values[1]), ['pv', 'hour']);
  assert.ok(!JSON.stringify(writes).includes('private'));
  assert.ok(!JSON.stringify(writes).includes('secret-campaign'));
});

test('detail beacon keeps audience breakdown separate from pageviews', async () => {
  const { writes } = await collect({ t: 'detail', c: 1, p: '/science', r: 'https://example.org/post' });
  const metrics = writes.filter((row) => row.values.length >= 5).map((row) => row.values[1]);
  assert.ok(metrics.includes('visits'));
  assert.ok(!metrics.includes('pv'));
  assert.ok(!metrics.includes('hour'));
});

test('audience breakdowns are accepted without a consent flag (own measurement is not consent-based)', async () => {
  const { writes } = await collect({ t: 'detail', p: '/science', r: 'https://example.org/post', w: 1280 });
  const metrics = writes.map((row) => row.values[1]);
  assert.ok(metrics.includes('visits'));
  assert.ok(metrics.includes('screen'));
  assert.ok(!JSON.stringify(writes).includes('203.0.113.'));
});

test('core web vitals are summed per page and rated by the published thresholds', async () => {
  const { writes } = await collect({ t: 'vital', p: '/', lcp: 1800, cls: 300, inp: 240 });
  assert.deepEqual(writes.map((row) => row.values.slice(1)), [
    ['vital_lcp', '/', 1, 1800], ['vital_rating', 'LCP gut', 1, 0],
    ['vital_cls', '/', 1, 300], ['vital_rating', 'CLS schlecht', 1, 0],
    ['vital_inp', '/', 1, 240], ['vital_rating', 'INP mittel', 1, 0],
  ]);
  assert.equal((await collect({ t: 'vital', p: '/', lcp: -5, cls: 99999, inp: 0 })).writes.length, 0);
});

test('sections seen are counted per page, other events by name', async () => {
  const seen = await collect({ t: 'ev', p: '/', n: 'seen', v: 'support' });
  assert.deepEqual(seen.writes.map((row) => row.values.slice(1, 3)), [['section', '/#support']]);
  const donate = await collect({ t: 'ev', p: '/', n: 'donate' });
  assert.deepEqual(donate.writes.map((row) => row.values.slice(1, 3)), [['event', 'donate']]);
});

test('private dashboard rejects requests without Cloudflare Access assertion', async () => {
  const response = await dashboard.fetch(new Request('https://stats.neurofly.app/data.json'), { DB: database() });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

async function download(path, agent = 'Mozilla/5.0') {
  const db = database(), pending = [];
  const request = new Request(`https://get.neuro-cause.com${path}`, { headers: { 'user-agent': agent } });
  const response = await counter.fetch(request, { DB: db }, { waitUntil(promise) { pending.push(promise); } });
  await Promise.all(pending);
  return { status: response.status, location: response.headers.get('location'), writes: db.writes };
}

test('release links count one download and redirect to the Windows ZIP or, from 2.4.0, the Android APK', async () => {
  const win = await download('/v2.4.0');
  assert.equal(win.status, 302);
  assert.equal(win.location, 'https://github.com/neuroflyapp/neurofly/releases/download/v2.4.0/NeuroCause-2.4.0-win-x64.zip');
  assert.deepEqual(win.writes.map((w) => w.values[1]), ['NeuroCause-2.4.0-win-x64.zip']);
  const apk = await download('/v2.4.0/android');
  assert.equal(apk.location, 'https://github.com/neuroflyapp/neurofly/releases/download/v2.4.0/NeuroCause-2.4.0-android.apk');
  assert.deepEqual(apk.writes.map((w) => w.values[1]), ['NeuroCause-2.4.0-android.apk']);
  const none = await download('/v2.3.0/android');
  assert.equal(none.location, 'https://neuro-cause.com/#get');
  assert.equal(none.writes.length, 0);
  const bot = await download('/v2.4.0/android', 'neurocause-probe-bot');
  assert.equal(bot.status, 302);
  assert.equal(bot.writes.length, 0);
});
