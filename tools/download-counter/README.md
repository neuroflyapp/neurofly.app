# Download counter

`worker.js` runs as the Cloudflare Worker `neurofly-downloads` at
`get.neurofly.app`. The website's download button points to
`https://get.neurofly.app/v<version>`; the Worker counts the download and
redirects to the release file on GitHub.

- Counted: `GET` requests from browsers, per UTC day and file. Crawlers, link
  previews, uptime checkers and `HEAD` requests are redirected without being
  counted. No IP address, cookie or identifier is stored.
- Once an hour a cron trigger (`0 * * * *`) stores GitHub's own
  `download_count` per release ZIP, so downloads started on GitHub are
  `GitHub total - website downloads`.
- `GET /stats` returns both series as JSON.
- Storage: D1 database `neurofly-downloads` (jurisdiction EU), bound as `DB`;
  the schema is at the top of `worker.js`. Worker logs and traces are off.
- `v0.0.0` is the test path: it is counted under
  `NeuroFly-0.0.0-win-x64.zip` and leaves the real figures untouched.

When releasing a new version, link the button to `https://get.neurofly.app/v<new version>`.
