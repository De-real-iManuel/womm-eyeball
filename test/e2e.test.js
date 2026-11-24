// Runs the real CLI path (runAudit + a real Chromium) against fixtures with seeded bugs.
// Each seeded bug has its own test. clean.html must produce zero findings (no false positives).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runAudit } from "../src/run.js";
import { startStaticServer } from "../src/server.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const SEEDED = path.join(here, "fixtures", "seeded-site");
const VITE = path.join(here, "fixtures", "vite-like");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "fa-e2e-"));

let result;
let server;
let nonGetRequestsSeenByServer = [];
const find = (rule, route, width) => result.findings.filter((f) => f.rule === rule && f.route === route && (width === undefined || f.width === width));

before(async () => {
  // Own server so the test can see every request that reaches it.
  server = await startStaticServer(SEEDED, { onRequest: (req) => req.method !== "GET" && nonGetRequestsSeenByServer.push(req.method + " " + req.url) });
  result = await runAudit({ url: server.url, root: SEEDED, framework: "static", out: path.join(out, "seeded") });
});
after(async () => {
  await server.close();
  fs.rmSync(out, { recursive: true, force: true });
});

test("discovers every html page of the static fixture", () => {
  assert.equal(result.framework, "static");
  assert.deepEqual(result.routes, ["/", "/about.html", "/blank.html", "/clean.html"]);
});

test("seed 1: low-contrast button is reported (axe color-contrast)", () => {
  assert.ok(result.findings.some((f) => f.rule === "axe:color-contrast" && f.route === "/" && /#aaaaaa|2\.\d+/.test(f.measured)), "color-contrast finding with a measured ratio");
});

test("seed 2: overflowing box is reported at 390 and not at 1440", () => {
  assert.equal(find("horizontal-overflow", "/", 390).length, 1);
  assert.equal(find("horizontal-overflow", "/", 1440).length, 0);
  assert.equal(find("horizontal-overflow", "/", 390)[0].severity, "High");
});

test("seed 3: card with off-scale padding is reported with both values", () => {
  const f = find("inconsistent-spacing", "/")[0];
  assert.ok(f, "finding exists");
  assert.match(f.measured, /24px/);
  assert.match(f.measured, /7px/);
});

test("seed 4: broken link (HTTP 404) and placeholder link", () => {
  const broken = find("broken-link", "/")[0];
  assert.ok(broken);
  assert.match(broken.measured, /missing\.html -> HTTP 404/);
  assert.ok(find("dead-control", "/").some((f) => /Learn more/.test(f.message)), "href=# link does nothing");
});

test("seed 5: button with no handler is a dead control", () => {
  assert.ok(find("dead-control", "/").some((f) => /Do something/.test(f.message)));
});

test("seed 6: form double-submits; also gives no feedback", () => {
  const dup = find("duplicate-submit", "/")[0];
  assert.ok(dup, "duplicate-submit reported");
  assert.match(dup.measured, /2 x POST \/api\/subscribe/);
  assert.equal(dup.stubbed, true);
  assert.equal(find("no-submit-feedback", "/").length, 1);
  assert.equal(find("no-error-feedback", "/").length, 1);
  assert.equal(find("no-validation-feedback", "/").length, 1);
});

test("seed 7: missing <title> (axe)", () => {
  assert.ok(find("axe:document-title", "/about.html").length >= 1);
});

test("seed 8: anchor to a missing id", () => {
  assert.equal(find("dead-anchor", "/about.html").length, 1);
});

test("seed 9: uncaught JavaScript error", () => {
  assert.ok(find("page-error", "/about.html").some((f) => /undefinedFunctionCall/.test(f.measured)));
});

test("seed 10: blank page", () => {
  assert.ok(find("blank-page", "/blank.html").length >= 1);
});

test("no false positives: the correctly built page has zero findings", () => {
  const onClean = result.findings.filter((f) => f.route === "/clean.html");
  assert.deepEqual(onClean.map((f) => `${f.rule}: ${f.message} [${f.measured}]`), []);
});

test("safety: no POST ever reached the server under test", () => {
  assert.deepEqual(nonGetRequestsSeenByServer, []);
});

test("reports and screenshots are written", () => {
  const dir = path.join(out, "seeded");
  assert.ok(fs.existsSync(path.join(dir, "report.md")));
  assert.ok(fs.existsSync(path.join(dir, "findings.json")));
  assert.ok(fs.existsSync(path.join(dir, "screenshots", "home-390.png")));
  assert.ok(fs.existsSync(path.join(dir, "screenshots", "clean-html-1440.png")));
  assert.match(fs.readFileSync(path.join(dir, "report.md"), "utf8"), /duplicate-submit/);
});

test("other framework: a vite project is detected and its routes are found by crawling", async () => {
  const res = await runAudit({ root: VITE, framework: "auto", out: path.join(out, "vite"), functional: false, axe: false, widths: [1024] });
  assert.equal(res.framework, "vite");
  assert.equal(res.strategy, "crawl");
  assert.deepEqual(res.routes, ["/", "/pages/a.html", "/pages/b.html", "/pages/c.html"]);
});

test("CLI binary runs end to end and --fail-on sets the exit code", () => {
  const bin = path.join(here, "..", "bin", "eyeball.js");
  const run = spawnSync(process.execPath, [bin, "--root", SEEDED, "--out", path.join(out, "cli"), "--no-functional", "--no-axe", "--widths", "390", "--fail-on", "High"], { encoding: "utf8" });
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stdout, /Audited 4 route\(s\)/);
  const version = spawnSync(process.execPath, [bin, "--version"], { encoding: "utf8" });
  assert.equal(version.status, 0);
});
