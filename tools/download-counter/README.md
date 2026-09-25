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

The dashboard editor mangles multi-line typing, so each deployed copy is its
file with the comment lines removed and the lines joined by spaces (every
statement terminated, no comments inside code lines). After deploying, read the
script back (`/workers/scripts/<name>/content/v2`) and compare its SHA-256 with
the joined local file. A new table is created in the D1 console before the code
that uses it is deployed.

When releasing a new version, link the button to `https://get.neurofly.app/v<new version>`.
