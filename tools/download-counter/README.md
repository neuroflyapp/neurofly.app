# Page and download counter, statistics dashboard

Two Cloudflare Workers share the D1 database `neurofly-downloads`
(jurisdiction EU), bound as `DB` in both; the schema is at the top of
`worker.js`. The dashboard is reached through the public links hub at
`neuro-cause.com/login/`; its protected destination is `stats.neurofly.app`.

## `worker.js` → Worker `neurofly-downloads` at `get.neurofly.app` (public)

The website's download button points to `https://get.neurofly.app/v<version>`;
the Worker counts the download and redirects to the release file on GitHub.

- Counted: `GET` requests from browsers, per UTC day and file. Crawlers, link
  previews, uptime checkers and `HEAD` requests are redirected without being
  counted. No IP address, cookie or identifier is stored.
- `POST /collect` receives basic pageviews from `neuro-cause.com` with no
  visitor identifier or personal-detail columns; it stores daily page/hour
  totals and coarse 404 types. Visitors can opt out; Global Privacy Control
  is honoured. After explicit statistics consent, the site also sends a
  separate `detail` beacon and selected interaction/performance aggregates.
  Only requests with `Origin: https://neuro-cause.com` and a browser user
  agent count. `POST /view` is retained for old cached clients; the current
  site does not use it.
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
count, sum). Only the consented detail tier uses `visitors` and `salts` for
per-day pseudonyms; both are emptied by the hourly cron once the UTC day is
over. Basic pageviews neither read nor write those tables. The website exposes
an independent opt-out for its own measurement and honours Global Privacy
Control; Clarity and detailed own statistics start only after explicit consent.
Navigation load time and request-to-first-byte time are summed by page and
reported as averages, not labelled as Core Web Vitals. Missing 404 paths are
stored only as coarse types to avoid retaining accidental tokens or addresses.
The performance beacon is feature-gated in `docs/assets/site.js` until this
Worker version is deployed; enable `CONFIG.performanceTelemetry` afterward.

## Deployment state (29 September 2026)

The previously committed website and dashboard UI changes are on `main`.
The new basic/detail separation on branch `privacy/consent-tier-stats` **must
be deployed as a unit**: deploy `worker.js` first, verify baseline requests no longer create
visitor hashes, then publish `docs/` via GitHub Pages. Until this happens, the
live Worker still has the old collection behaviour; do not publish the revised
privacy notice alone. Wrangler OAuth login succeeded, but the next Cloudflare
CLI check was blocked by the local approval/usage limit. `CONFIG.performanceTelemetry`
remains `false`; enable it only after the matching Worker is deployed.

When releasing a new version, link the button to `https://get.neurofly.app/v<new version>`.
