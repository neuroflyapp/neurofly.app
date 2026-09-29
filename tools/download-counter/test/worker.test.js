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
              if (sql.includes('FROM visitors')) return { last: Date.now(), vviews: 2 };
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
  const { response, writes } = await collect({ t: 'perf', p: '/science.html', ms: 2400, ttfb: 140 });
  assert.equal(response.status, 204);
  assert.deepEqual(writes.map((row) => row.values.slice(1)), [
    ['perf_load', '/science', 1, 2400],
    ['perf_bucket', '1–3 s', 1, 0],
    ['perf_ttfb', '/science', 1, 140],
  ]);
});

test('invalid timings and other-site beacons do not write data', async () => {
  assert.equal((await collect({ t: 'perf', p: '/science', ms: -1, ttfb: 200001 })).writes.length, 0);
  assert.equal((await collect({ t: 'perf', p: '/science', ms: 50 }, 'https://other.example')).writes.length, 0);
});

test('404 aggregation never persists the missing URL', async () => {
  const { writes } = await collect({ t: 'pv', p: '/404', nf: '/reset/abc-secret-token' });
  assert.ok(writes.some((row) => row.values[1] === '404' && row.values[2] === 'Pfad'));
  assert.ok(!JSON.stringify(writes).includes('abc-secret-token'));
});

test('private dashboard rejects requests without Cloudflare Access assertion', async () => {
  const response = await dashboard.fetch(new Request('https://stats.neurofly.app/data.json'), { DB: database() });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
