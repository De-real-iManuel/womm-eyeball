import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectFramework, discoverRoutes } from "../src/detect.js";

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-detect-"));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

test("next app router: groups stripped, dynamic and parallel routes skipped", () => {
  const root = project({
    "package.json": '\uFEFF{"dependencies":{"next":"1"}}', // BOM must be tolerated
    "src/app/page.tsx": "",
    "src/app/privacy/page.tsx": "",
    "src/app/(marketing)/pricing/page.tsx": "",
    "src/app/blog/[slug]/page.tsx": "",
    "src/app/@modal/login/page.tsx": "",
    "src/app/api/hello/route.ts": "",
  });
  assert.equal(detectFramework(root), "next");
  const d = discoverRoutes(root, "next");
  assert.deepEqual(d.routes, ["/", "/pricing", "/privacy"]);
  assert.equal(d.skipped.length, 2);
});

test("next pages router: _app, api and 404 are not routes", () => {
  const root = project({
    "package.json": '{"dependencies":{"next":"1"}}',
    "pages/index.tsx": "",
    "pages/about.tsx": "",
    "pages/_app.tsx": "",
    "pages/404.tsx": "",
    "pages/api/x.ts": "",
    "pages/docs/index.tsx": "",
  });
  assert.deepEqual(discoverRoutes(root, "next").routes, ["/", "/about", "/docs"]);
});

test("sveltekit and nuxt file routes", () => {
  const sk = project({ "package.json": '{"devDependencies":{"@sveltejs/kit":"2"}}', "src/routes/+page.svelte": "", "src/routes/about/+page.svelte": "", "src/routes/[id]/+page.svelte": "" });
  assert.equal(detectFramework(sk), "sveltekit");
  assert.deepEqual(discoverRoutes(sk, "sveltekit").routes, ["/", "/about"]);
  const nx = project({ "package.json": '{"dependencies":{"nuxt":"3"}}', "pages/index.vue": "", "pages/contact.vue": "" });
  assert.equal(detectFramework(nx), "nuxt");
  assert.deepEqual(discoverRoutes(nx, "nuxt").routes, ["/", "/contact"]);
});

test("plain HTML folder is static; vite uses crawl", () => {
  const html = project({ "index.html": "", "a/index.html": "", "b.html": "" });
  assert.equal(detectFramework(html), "static");
  assert.deepEqual(discoverRoutes(html, "static").routes, ["/", "/a/", "/b.html"]);
  const vite = project({ "package.json": '{"devDependencies":{"vite":"5"}}', "index.html": "" });
  assert.equal(detectFramework(vite), "vite");
  assert.equal(discoverRoutes(vite, "vite").strategy, "crawl");
});
