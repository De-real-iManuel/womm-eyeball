import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, validateConfig, toViewports, DEFAULT_VIEWPORTS } from "../src/config.js";

const dirWith = (name, content) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "fa-config-"));
  if (name) fs.writeFileSync(path.join(d, name), content);
  return d;
};

test("config: valid file loads, with its folder", async () => {
  const dir = dirWith("frontend-audit.config.json", JSON.stringify({ url: "http://localhost:3000", include: ["/docs/**"], exclude: ["/admin"], viewports: { phone: { width: 360 } }, auth: { cookie: "todo" } }));
  const loaded = await loadConfig({ dir });
  assert.equal(loaded.config.url, "http://localhost:3000");
  assert.equal(loaded.dir, dir);
  assert.deepEqual(toViewports(loaded.config.viewports), [{ name: "phone", width: 360, height: 900 }]);
});

test("config: missing file is null when searching, an error when named", async () => {
  const dir = dirWith();
  assert.equal(await loadConfig({ dir }), null);
  await assert.rejects(loadConfig({ file: path.join(dir, "nope.json") }), /config file not found/);
});

test("config: malformed JSON and bad values give a message naming the file", async () => {
  const bad = dirWith("frontend-audit.config.json", "{ not json");
  await assert.rejects(loadConfig({ dir: bad }), /not valid JSON/);
  assert.throws(() => validateConfig({ urll: "x" }, "f.json"), /f\.json: unknown key "urll"/);
  assert.throws(() => validateConfig({ url: "localhost:3000" }), /"url" must start with http/);
  assert.throws(() => validateConfig({ include: "/a" }), /"include" must be an array of strings/);
  assert.throws(() => validateConfig({ viewports: { x: { width: 10 } } }), /width must be a whole number/);
  assert.throws(() => validateConfig({ framework: "rails" }), /"framework" must be/);
});

test("config: .mjs config works and defaults give mobile, tablet, desktop", async () => {
  const dir = dirWith("frontend-audit.config.mjs", 'export default { maxRoutes: 5 };');
  assert.equal((await loadConfig({ dir })).config.maxRoutes, 5);
  assert.deepEqual(toViewports().map((v) => v.name), Object.keys(DEFAULT_VIEWPORTS));
});
