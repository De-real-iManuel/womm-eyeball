# Contributing to eyeball

Thanks for helping. Small, focused changes are easiest to review.

## Run the tests locally

```bash
git clone <your fork>
cd <your clone>
npm install
npx playwright install chromium
npm test
```

Requires Node 20 or newer. The tests start a real headless Chromium and a local server on 127.0.0.1, so allow a few minutes and free memory. A run is green when the summary shows `fail 0`. To run one file: `node --test test/config.test.js`.

Where things live:

| Path | What it holds |
|---|---|
| `src/cli.js`, `bin/eyeball.js` | flags, config merge, banner |
| `src/config.js` | config file loading and validation |
| `src/run.js` | orchestrator: adapter, routes, core, report |
| `src/adapters/` | framework detection and route discovery |
| `src/core/` | route walking, screenshots, checks, reports. No framework code here. |
| `test/` | tests; `test/fixtures/` holds the seeded-bug pages |

## Add a framework adapter

An adapter answers two questions: "is this project that framework?" and "which routes does it have?". Everything else (screenshots, checks, reports) is the core and needs no change.

1. Create `src/adapters/<name>.js` exporting an object (see `src/adapters/next.js`):

   ```js
   export default {
     name: "myframework",
     // root: project folder. ctx: { pkg, deps } from package.json (deps merges dependencies and devDependencies).
     detect(root, { pkg, deps }) { return Boolean(deps["my-framework"]); },
     // Return { strategy: "files", routes: ["/", "/about"], skipped: [{ source, reason }] },
     // or null when there is no routes folder: the generic link-crawl fallback is used then.
     discover(root) { /* ... */ },
   };
   ```
2. Register it in `src/adapters/index.js` (the `ADAPTERS` array; order is detection priority). `--framework` accepts the new name automatically.
3. Reuse `fileRoutes`, `walk` and `readPackage` from `src/adapters/fs-routes.js` for folder-based routing. Routes that need a parameter value (`[id]`) go into `skipped` with a reason, not into `routes`.
4. Add tests in `test/detect.test.js` style: build a small temporary project, assert detection and the exact route list, including a skipped dynamic route.
5. Add a row to the framework table in `README.md`. Say honestly how it was tested. Do not write "supported" for something only unit-tested on fixtures.

If your framework has no routes folder to read, you do not need an adapter: the link-crawl fallback already works for it.

## Rules

1. **Every new check needs a seeded bug.** Add the bug to `test/fixtures/seeded-site/` and a test in `test/e2e.test.js`. If the check can fire on correct pages, add the correct case to `clean.html`: that page must keep producing zero findings.
2. **No false positives for the sake of coverage.** A noisy check is worse than a missing one. Prefer measured evidence (a number, a request count, a status code).
3. **Never send real requests that change data.** All non-GET requests are stubbed in `src/core/functional.js`. Keep it that way. The test `safety: no POST ever reached the server` must pass.
4. **Text from the audited page is untrusted.** Anything from the page that goes into a report must go through the escaping in `src/core/report.js`. Routes must stay on the target origin (`isSafeRoute`).
5. **No project-specific content.** Fixtures and examples use made-up pages only. No real paths, company names, tokens or screenshots.
6. **No new dependency without a reason** in the pull request: what it does, its license, and why Node or an existing dependency cannot do it.
7. Keep the CLI standalone: no dependence on any particular editor, agent or hosting tool.
8. Document user-visible changes in `README.md`.

## Code style

- ES modules, Node 20+, no build step, no TypeScript.
- Match the surrounding code: 2-space indent, double quotes, semicolons, small functions.
- Comments explain why, not what. A known shortcut gets a comment of the form `shortcut: <the limit>, <when to upgrade>`.
- New logic with a branch, loop or parser gets a small test.

## Pull requests

- One topic per pull request, with a short description of what changed and why.
- Say what you ran. "Tests pass" means `npm test` printed `fail 0` for you.
- Do not include report output, screenshots of real apps, or `.env` files.
- A maintainer reviews, may ask for changes, and merges. Be patient: this is a small project.
- Licensing of contributions: by submitting a contribution you agree it is licensed under Apache-2.0 (see `LICENSE`, section 5).

## Reporting a bug or false positive

Include: the command, the framework, a minimal HTML snippet that reproduces it, and the expected vs actual finding.

## Security

Do not post secrets or private URLs in issues. Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).