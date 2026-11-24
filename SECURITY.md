# Security policy

## Reporting a vulnerability

Email **De-real-iManuel@hotmail.com** (subject: "eyeball security"). You can also send a direct message to X/Twitter **@De_real_Manuel**, but please do not post details publicly. Do not open a public issue for a vulnerability.

Include: what you found, how to reproduce it, the version (`eyeball --version`), and your operating system and Node version. Reports are answered on a best-effort basis. No response time is promised yet.

## What has been reviewed

A review was done on version 0.1.0 of the source. The full table is in [SECURITY-REVIEW.md](SECURITY-REVIEW.md). Fixed during the review:

- Routes such as `//host` could send the browser to another host (for example an internal address). They are now rejected.
- The same-origin link check could be fooled by lookalike hostnames.
- The built-in static server crashed on a malformed URL, served dotfiles and `node_modules`, and accepted any Host header.
- Text from the audited page could add links, images or HTML to `report.md`.

Also checked and found fine: Chromium keeps its default sandbox, no code is built from page text, and `npm audit` reported 0 vulnerabilities on the two direct dependencies (both pinned).

## What is NOT guaranteed

Read this before pointing eyeball at anything you care about.

- **`--url` accepts any http(s) address**, including private network ranges and cloud metadata endpoints, and redirects off the target are followed. This is by design for a local tool. If you run eyeball as a service or on input you do not control, put a host allow-list in front of it.
- **JavaScript config files run code.** `eyeball.config.mjs` and `.js` are imported, and are found automatically in `--root`. Running eyeball in a checkout you do not trust can execute that checkout's code. Use `eyeball.config.json`, or pass `--config` explicitly.
- **GET requests are real.** Only non-GET requests are replaced by fake responses. A link or button that deletes data on GET will do it. WebSocket traffic is not stubbed. Audit local or staging environments, not production.
- **Reports and screenshots contain what the page shows**, including personal data if a page shows it. Do not commit or share the report folder for such apps.
- The audited page's own JavaScript runs in headless Chromium. Chromium's sandbox is the barrier, and eyeball cannot promise it holds against browser vulnerabilities. Keep Playwright up to date.
- Not covered by the review: the full transitive dependency tree (an `npm ls` check timed out on the review machine), the Chromium binary, and non-Windows systems.
- No signed releases and no npm provenance.

## Supported versions

Only the latest version on the default branch. Eyeball is at 0.1.0.