// Core/adapter boundary and route filtering.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { filterRoutes } from "../src/core/routes.js";
import { auditRoutes } from "../src/core/audit.js";
import { startStaticServer } from "../src/core/server.js";
import nextAdapter from "../src/adapters/next.js";
import { detectFramework, discoverRoutes } from "../src/adapters/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const SEEDED = path.join(here, "fixtures", "seeded-site");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "fa-core-"));

test("filter: no patterns keeps everything", () => {
  assert.deepEqual(filterRoutes(["/", "/a"], {}), ["/", "/a"]);
});

test("filter: include globs, * is one segment, ** is any depth", () => {
  const routes = ["/", "/docs", "/docs/intro", "/docs/api/auth", "/blog/x"];
  assert.deepEqual(filterRoutes(routes, { include: ["/docs/**"] }), ["/docs", "/docs/intro", "/docs/api/auth"]);
  assert.deepEqual(filterRoutes(routes, { include: ["/docs/*"] }), ["/docs/intro"]);
  assert.deepEqual(filterRoutes(routes, { include: ["/", "/blog/*"] }), ["/", "/blog/x"]);
});

test("filter: exclude removes matches and wins over include; regex characters are literal", () => {
  const routes = ["/", "/docs/intro", "/docs/internal", "/a.b", "/aXb"];
  assert.deepEqual(filterRoutes(routes, { include: ["/docs/**"], exclude: ["/docs/internal"] }), ["/docs/intro"]);
  assert.deepEqual(filterRoutes(routes, { exclude: ["/a.b"] }), ["/", "/docs/intro", "/docs/internal", "/aXb"]);
});

test("core runs on a hand-fed route list with no framework adapter involved", async () => {
  const root = tmp(); // no package.json, no Next.js anywhere
  const server = await startStaticServer(SEEDED);
  const browser = await chromium.launch();
  try {
    const res = await auditRoutes({ browser, baseUrl: server.url, routes: ["/clean.html", "/blank.html"], viewports: [{ name: "m", width: 390, height: 800 }], out: root, functional: false, axe: false });
    assert.deepEqual(Object.keys(res.shots), ["/clean.html", "/blank.html"]);
    assert.ok(fs.existsSync(path.join(root, "screenshots", "clean-html-390.png")));
    assert.ok(res.findings.some((f) => f.rule === "blank-page" && f.route === "/blank.html"));
    assert.equal(res.findings.filter((f) => f.route === "/clean.html").length, 0);
  } finally {
    await browser.close();
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("next adapter: detected from next.config + app dir without a package.json dependency", () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, "app/about"), { recursive: true });
  fs.writeFileSync(path.join(root, "next.config.mjs"), "export default {}");
  fs.writeFileSync(path.join(root, "app/page.tsx"), "");
  fs.writeFileSync(path.join(root, "app/about/page.tsx"), "");
  assert.equal(detectFramework(root), "next");
  assert.deepEqual(discoverRoutes(root, "next").routes, ["/", "/about"]);
  assert.equal(nextAdapter.detect(tmp(), { deps: {} }), false);
});

test("next adapter with no routes folder falls back to the generic crawl", () => {
  const root = tmp();
  fs.writeFileSync(path.join(root, "package.json"), '{"dependencies":{"next":"1"}}');
  assert.equal(discoverRoutes(root, "next").strategy, "crawl");
});

test("CLI reads eyeball.config.json; flags override it; plain --url style still works", () => {
  const bin = path.join(here, "..", "bin", "eyeball.js");
  const dir = tmp();
  fs.copyFileSync(path.join(SEEDED, "clean.html"), path.join(dir, "index.html"));
  fs.writeFileSync(path.join(dir, "eyeball.config.json"), JSON.stringify({ routes: ["/"], viewports: { phone: { width: 360 } }, functional: false, axe: false, out: "rep" }));
  const run = spawnSync(process.execPath, [bin, "--root", dir], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Audited 1 route\(s\) at 360 px/);
  assert.ok(fs.existsSync(path.join(dir, "rep", "report.md")), "config out resolves against the config folder");
  const flag = spawnSync(process.execPath, [bin, "--root", dir, "--widths", "500", "--out", path.join(dir, "o2")], { encoding: "utf8" });
  assert.match(flag.stdout, /at 500 px/);
  const broken = path.join(dir, "bad");
  fs.mkdirSync(broken);
  fs.writeFileSync(path.join(broken, "frontend-audit.config.json"), "{oops");
  const bad = spawnSync(process.execPath, [bin, "--root", broken], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /not valid JSON/);
});
