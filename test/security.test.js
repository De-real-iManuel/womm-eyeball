// Fixes from the security review. Each test pins one finding.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { isSafeRoute } from "../src/core/routes.js";
import { startStaticServer } from "../src/core/server.js";
import { writeReports } from "../src/core/report.js";

const get = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    const u = new URL(url);
    http.get({ host: u.hostname, port: u.port, path: u.pathname + u.search, headers }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    }).on("error", reject);
  });

test("routes must stay on the target origin", () => {
  for (const ok of ["/", "/a", "/a/b?x=1"]) assert.equal(isSafeRoute(ok), true, ok);
  for (const bad of ["//evil.com", "/\\evil.com", "evil.com", "http://evil.com", "", "/a\nb", null]) assert.equal(isSafeRoute(bad), false, String(bad));
});

test("static server: malformed %-escape, dotfiles, node_modules and wrong Host header are refused; normal files work", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-sec-"));
  fs.writeFileSync(path.join(root, "index.html"), "<p>hi</p>");
  fs.writeFileSync(path.join(root, ".env"), "SECRET=1");
  fs.mkdirSync(path.join(root, "node_modules"));
  fs.writeFileSync(path.join(root, "node_modules", "x.js"), "1");
  const server = await startStaticServer(root);
  try {
    assert.equal(await get(server.url + "/"), 200);
    assert.equal(await get(server.url + "/%"), 400);
    assert.equal(await get(server.url + "/.env"), 404);
    assert.equal(await get(server.url + "/node_modules/x.js"), 404);
    assert.equal(await get(server.url + "/", { host: "evil.example" }), 403);
    assert.equal(await get(server.url + "/"), 200, "server still alive after the bad requests");
  } finally {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("report: page-controlled text cannot inject links, images or HTML", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "fa-sec-rep-"));
  const evil = 'x ![t](http://evil.example/p.png) <img src=x onerror=1> [c](http://evil.example)';
  writeReports(out, { framework: "static", strategy: "files", widths: [390], functional: true, routes: ["/"], shots: {}, notes: [], findings: [{ id: "F1", severity: "Low", category: "functional", rule: "dead-control", route: "/", message: `Clicking button "${evil}" does nothing`, measured: evil, screenshot: "screenshots/a.png" }] });
  const md = fs.readFileSync(path.join(out, "report.md"), "utf8");
  assert.ok(!/(^|[^\\])\[t\]\(/.test(md) && !/(^|[^\\])\[c\]\(/.test(md), "no live markdown link from page text");
  assert.ok(!/(^|[^\\])</.test(md), "every < is escaped, so no raw HTML tag");
  assert.ok(md.includes("[screenshot](screenshots/a.png)"), "the tool's own screenshot link is kept");
  fs.rmSync(out, { recursive: true, force: true });
});