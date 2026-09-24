# Download counter and dashboard

Two Cloudflare Workers share the D1 database `neurofly-downloads`
(jurisdiction EU), bound as `DB` in both; the schema is at the top of
`worker.js`.

## `worker.js` → Worker `neurofly-downloads` at `get.neurofly.app` (public)

The website's download button points to `https://get.neurofly.app/v<version>`;
the Worker counts the download and redirects to the release file on GitHub.

- Counted: `GET` requests from browsers, per UTC day and file. Crawlers, link
  previews, uptime checkers and `HEAD` requests are redirected without being
  counted. No IP address, cookie or identifier is stored.
- Once an hour a cron trigger (`0 * * * *`) stores GitHub's own
  `download_count` per release ZIP, so downloads started on GitHub are
  `GitHub total - website downloads`. GitHub often refuses unauthenticated
  API calls from Cloudflare's shared addresses; a secret `GITHUB_TOKEN`
  (fine-grained, no permissions) makes the cron reliable. The dashboard also
  stores the totals whenever it is opened.
- `/stats` holds no data any more; it redirects to the dashboard.
- `v0.0.0` is the test path: it is counted under
  `NeuroFly-0.0.0-win-x64.zip` and leaves the real figures untouched.
- Worker logs and traces are off; `workers.dev` and preview URLs are off.

## `stats-worker.js` → Worker `neurofly-stats` at `stats.neurofly.app` (login only)

The internal download dashboard. The whole Worker is protected by Cloudflare
Access (Zero Trust Free; Worker-level, "All traffic"; policy "NeuroFly team":
one-time code by email to contact@neurofly.app; 24-hour session). A second
Access application protects `get.neurofly.app/stats`. The Worker itself also
refuses every request without an Access token.

- `GET /` the page shell; code and styles come from
  `neurofly.app/assets/download-stats.js` and `download-stats.css`, which hold
  no data.
- `GET /data.json` both series as JSON.
- `POST /snapshot` today's GitHub totals as read in the viewer's browser
  (validated: release ZIP names only, whole numbers; a total never decreases).
- `workers.dev` and preview URLs are off (their hostname would show the account
  label).

## Deploying

The dashboard editor mangles multi-line typing, so each deployed copy is its
file with the comment lines removed and the lines joined by spaces (every
statement terminated, no comments inside code lines). After deploying, read the
script back (`/workers/scripts/<name>/content/v2`) and compare its SHA-256 with
the joined local file.

When releasing a new version, link the button to `https://get.neurofly.app/v<new version>`.
