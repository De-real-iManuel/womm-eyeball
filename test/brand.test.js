import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { banner } from "../src/banner.js";
import { loadConfig } from "../src/config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const run = (bin, args) => spawnSync(process.execPath, [path.join(here, "..", "bin", bin), ...args], { encoding: "utf8" });
const pkg = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8"));

test("package exposes plural and singular CLI commands", () => {
  assert.equal(pkg.name, "@imanueldev/eyeball");
  assert.deepEqual(pkg.bin, {
    eyeballs: "bin/eyeball.js",
    eyeball: "bin/eyeball.js",
  });
  const lock = JSON.parse(fs.readFileSync(path.join(here, "..", "package-lock.json"), "utf8"));
  assert.equal(lock.name, pkg.name);
  assert.equal(lock.version, pkg.version);
  assert.deepEqual(lock.packages[""].bin, pkg.bin);
});

test("banner uses the generated eye artwork, stays within 60 columns, and names the tool", () => {
  assert.ok(banner().split("\n").every((l) => l.length <= 60), "no line wider than 60 columns");
  assert.match(banner(), /E Y E B A L L/);
  assert.match(banner(), /FRONTEND QUALITY ASSURANCE/);
  assert.match(banner(), /Inspect what actually renders\\./);
  assert.match(banner(), /[@%#*]{3,}/, "eye artwork retains shaded detail");
  assert.doesNotMatch(banner(), /WOMM/);
  assert.ok([...banner()].every((c) => c === "\n" || (c >= " " && c <= "~")), "no color codes, no non-ASCII");
});

test("piped output carries no banner: --version is only the number, --help starts with the usage text", () => {
  assert.equal(run("eyeball.js", ["--version"]).stdout.trim(), pkg.version);
  const help = run("eyeball.js", ["--help"]);
  assert.match(help.stdout, /^eyeballs: audit/);
  assert.match(help.stdout, /Usage:\n  eyeballs \[run\]/);
  assert.equal(help.stderr, "");
});

test("old bin path still works", () => {
  assert.equal(run("frontend-audit.js", ["--version"]).stdout.trim(), pkg.version);
});

test("config: eyeball.config.json wins over the older frontend-audit.config.json name", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fa-brand-"));
  fs.writeFileSync(path.join(dir, "frontend-audit.config.json"), '{"maxRoutes":1}');
  assert.equal((await loadConfig({ dir })).config.maxRoutes, 1);
  fs.writeFileSync(path.join(dir, "eyeball.config.json"), '{"maxRoutes":2}');
  assert.equal((await loadConfig({ dir })).config.maxRoutes, 2);
});
