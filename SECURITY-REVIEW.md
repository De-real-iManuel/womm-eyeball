# Security review (stage 3)

Scope: SSRF, secret exposure, unsafe browser execution, dependencies. Method: read all of `src/`, reproduce each suspicion with a one-line script before fixing it, pin each fix with a test in `test/security.test.js`.

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | A route such as `//evil.com` (from `--routes`, config, or a same-origin link like `http://app//evil.com` met by the crawler) was resolved with `new URL(route, baseUrl)` and sent the browser to another host, for example an internal address or a cloud metadata endpoint | High | Fixed: `isSafeRoute` drops such routes (noted in the report); functional checks use `baseUrl + route` |
| 2 | Link check used `href.startsWith(origin)`, so `http://example.com.evil.net/` counted as same-origin and was fetched | Medium | Fixed: compares `new URL(href).origin` |
| 3 | Built-in static server crashed the whole run on a malformed URL such as `/%` (uncaught `URIError`) | Medium | Fixed: answers 400 |
| 4 | Built-in static server served `.env`, `.git/` and `node_modules/` from the project root, and accepted any Host header (DNS rebinding) | Medium | Fixed: dotfiles and `node_modules` give 404; Host must be `127.0.0.1:<port>` |
| 5 | Report put page-controlled text (link labels, console errors) into `report.md` unescaped, so a page could add links, tracking images or HTML | Medium | Fixed: `[ ] < > \` | \\` are escaped in page text; tool's own screenshot links kept |
| 6 | `--url` is not restricted. Any http(s) address works, including private ranges and metadata endpoints. Redirects off the target origin are followed | Low (CLI, the user picks the target) | Not changed: this is the tool's job. If it is ever run as a service or in CI on untrusted input, add an allow-list of hosts |
| 7 | Clicks and link checks send real GET requests. A button or link that deletes or logs out on GET will do so. Non-GET requests are stubbed and never leave the browser. WebSockets are not stubbed | Medium (by design) | Documented: audit dev or staging, not production |
| 8 | `eyeball.config.mjs` / `.js` is imported, so a config file inside an untrusted checkout runs code when the tool is started there | Medium | Not changed (accepted design in stage 1). Prefer the `.json` form; do not run the tool in a repository you do not trust |
| 9 | Reports and screenshots show whatever the page shows. Auditing a logged-in app would put personal data in them | Medium (future) | Documented: do not commit or share the report folder. The `auth` config field is a no-op, and its value is never logged or written |
| 10 | Chromium runs with its default sandbox (no `--no-sandbox`); downloads go to a temp folder that is deleted on close; no extra browser permissions granted | OK | No change |
| 11 | No string is built into code run in the page; all page scripts are fixed and take data only as arguments | OK | No change |
| 12 | Dependencies: `npm audit` reports 0 vulnerabilities (2 direct dependencies, both pinned exactly: playwright 1.65.1, @axe-core/playwright 4.14.0). Chromium is downloaded by `npx playwright install chromium` from Playwright's own CDN | OK | No change |

Not checked: a full `npm ls` of the transitive tree (it timed out on this host), the Chromium build itself, and behavior on non-Windows systems.
