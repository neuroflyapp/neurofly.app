# Page and download counter, statistics dashboard

Two Cloudflare Workers share the D1 database `neurofly-downloads`
(jurisdiction EU), bound as `DB` in both; the schema is at the top of
`worker.js`. The dashboard is reached through `neurofly.app/login`
(`docs/login/index.html` forwards to `stats.neurofly.app`).

## `worker.js` → Worker `neurofly-downloads` at `get.neurofly.app` (public)

The website's download button points to `https://get.neurofly.app/v<version>`;
the Worker counts the download and redirects to the release file on GitHub.

- Counted: `GET` requests from browsers, per UTC day and file. Crawlers, link
  previews, uptime checkers and `HEAD` requests are redirected without being
  counted. No IP address, cookie or identifier is stored.
- `POST /view` counts page views: `docs/assets/site.js` sends the page's path
  with `navigator.sendBeacon` on every page of neurofly.app. Stored per UTC day
  and page (`/science.html` and `/science` both count as `/science`, `/` is the
  home page); no IP address, cookie or identifier, nothing in the browser, so it
  needs no cookie consent. Only requests with `Origin: https://neurofly.app`
  and a browser user agent count.
- Once an hour a cron trigger (`0 * * * *`) stores GitHub's own
  `download_count` per release ZIP, so downloads started on GitHub are
  `GitHub total - website downloads`. GitHub often refuses unauthenticated
  API calls from Cloudflare's shared addresses; a secret `GITHUB_TOKEN`
  (fine-grained, no permissions) makes the cron reliable. The dashboard also
  stores the totals whenever it is opened.
- `/stats` holds no data any more; it redirects to the dashboard.
- `v0.0.0` is the test path: it is counted under
  `NeuroFly-0.0.0-win-x64.zip`, which the dashboard ignores. Probes should send
  a bot user agent (for example `neurofly-probe-bot`), which is never counted.
- Worker logs and traces are off; `workers.dev` and preview URLs are off.

## `stats-worker.js` → Worker `neurofly-stats` at `stats.neurofly.app` (login only)

The internal dashboard: page views and downloads. The whole Worker is protected
by Cloudflare Access (Zero Trust Free; Worker-level, "All traffic"). The login
method is the Cloudflare account ("Sign in with: Cloudflare"); the reusable
policy "NeuroFly team" allows the listed email addresses, and a login counts
for 24 hours. A second Access application protects `get.neurofly.app/stats`.
The Worker itself also refuses every request without an Access token.

- `GET /` the page shell; code and styles come from
  `neurofly.app/assets/download-stats.js` and `download-stats.css`, which hold
  no data.
- `GET /data.json` page views, website downloads and GitHub totals as JSON.
- `POST /snapshot` today's GitHub totals as read in the viewer's browser
  (validated: release ZIP names only, whole numbers; a total never decreases).
- `workers.dev` and preview URLs are off (their hostname would show the account
  label).

## Deploying

With wrangler (logged in once with `npx wrangler login`), from this folder:

    npm install
    npm run deploy:counter    # worker.js       -> neurofly-downloads (wrangler.counter.toml)
    npm run deploy:stats      # stats-worker.js -> neurofly-stats     (wrangler.stats.toml)

The configs carry the custom domains, the hourly cron, the D1 binding and
`workers_dev`/`preview_urls` off; the Access protection of neurofly-stats is an
Access application and is not touched by a deploy. New tables go first:
`npx wrangler d1 execute neurofly-downloads --remote --command "CREATE TABLE …"`.
Test locally with `npx wrangler dev -c wrangler.counter.toml --local` (a local
D1 copy; create the tables there with `--local`).

Site statistics (`POST /collect`) keep daily totals in `stats` (metric, key,
count, sum); `visitors` and `salts` hold the per-day visitor hashes and salt and
are emptied by the hourly cron once the UTC day is over.

When releasing a new version, link the button to `https://get.neurofly.app/v<new version>`.
