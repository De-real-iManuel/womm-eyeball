import { parseArgs } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FRAMEWORKS, detectFramework, discoverRoutes } from "./adapters/index.js";
import { SEVERITIES, severityRank } from "./core/findings.js";
import { runAudit } from "./run.js";
import { loadConfig, toViewports } from "./config.js";
import { banner, showBanner } from "./banner.js";

const HELP = `eyeballs: audit a running frontend in a real browser

Usage:
  eyeballs [run] [options]     audit routes, write report.md + findings.json + screenshots
  eyeballs detect [--root .]   print the detected framework
  eyeballs routes [--root .]   print the routes found from project files

Options:
  --config <file>      config file (default: eyeball.config.json or frontend-audit.config.json in --root, if present)
  --url <url>          running app, e.g. http://localhost:3000 (omit for plain HTML: a local server is started)
  --cdp <endpoint>     connect to an existing Chromium browser via CDP (also: EYEBALL_CDP_URL)
  --root <dir>         project folder (default .)
  --framework <name>   auto | ${FRAMEWORKS.join(" | ")} (default auto)
  --routes <a,b,c>     audit exactly these routes (skips discovery)
  --include <a,b,c>    only audit routes matching these patterns (* = one segment, ** = any depth)
  --exclude <a,b,c>    skip routes matching these patterns
  --widths <a,b,c>     viewport widths in px (overrides config viewports; default 390,820,1440)
  --out <dir>          report folder (default ./frontend-audit-report)
  --max-routes <n>     route limit (default 30)
  --no-functional      skip clicking and form checks
  --no-axe             skip the axe-core accessibility scan
  --fail-on <level>    exit 1 if any finding is at or above Critical | High | Medium | Low
  -v, --version        print version
  -h, --help           print this help

Flags override the config file. Config keys: url, root, framework, routes, include, exclude, viewports, maxRoutes, out, functional, axe, auth (auth is a placeholder, ignored).

Exit codes: 0 ok, 1 findings at or above --fail-on, 2 usage or runtime error.
`;

export async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      url: { type: "string" },
      cdp: { type: "string" },
      config: { type: "string" },
      root: { type: "string" },
      framework: { type: "string" },
      routes: { type: "string" },
      include: { type: "string" },
      exclude: { type: "string" },
      widths: { type: "string" },
      out: { type: "string" },
      "max-routes": { type: "string" },
      "no-functional": { type: "boolean" },
      "no-axe": { type: "boolean" },
      "fail-on": { type: "string" },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"));
  if (values.help) return (process.stdout.isTTY && console.log(`${banner()}\n`), console.log(HELP), 0);
  if (values.version) return (showBanner(), console.log(pkg.version), 0);

  const cmd = positionals[0] ?? "run";
  const rootFlag = values.root ?? ".";
  if (cmd === "detect") return console.log(detectFramework(path.resolve(rootFlag))), 0;
  if (cmd === "routes") {
    const fw = (values.framework ?? "auto") === "auto" ? detectFramework(path.resolve(rootFlag)) : values.framework;
    const d = discoverRoutes(path.resolve(rootFlag), fw);
    console.log(`framework: ${fw}\nstrategy: ${d.strategy}${d.strategy === "crawl" ? " (links are followed in the browser at run time)" : ""}`);
    d.routes.forEach((r) => console.log(r));
    d.skipped.forEach((s) => console.log(`skipped ${s.source}: ${s.reason}`));
    return 0;
  }
  if (cmd !== "run") throw new Error(`unknown command "${cmd}". Try --help.`);

  showBanner();
  // Precedence: flag, then config file, then built-in default. Paths from the config resolve against its folder.
  const loaded = await loadConfig({ dir: rootFlag, file: values.config });
  const cfg = loaded?.config ?? {};
  const fromCfg = (p) => (p === undefined ? undefined : path.resolve(loaded.dir, p));
  const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const asRoute = (r) => (r.startsWith("/") ? r : `/${r}`);

  const framework = values.framework ?? cfg.framework ?? "auto";
  if (framework !== "auto" && !FRAMEWORKS.includes(framework)) throw new Error(`--framework must be auto or one of: ${FRAMEWORKS.join(", ")}`);
  let viewports = toViewports(cfg.viewports);
  if (values.widths) {
    const widths = list(values.widths).map(Number);
    if (!widths.length || widths.some((w) => !Number.isInteger(w) || w < 200 || w > 1999)) throw new Error("--widths needs whole numbers from 200 to 1999");
    viewports = widths.map((w) => ({ name: `${w}px`, width: w, height: 900 }));
  }
  const failOn = values["fail-on"];
  if (failOn && !SEVERITIES.includes(failOn)) throw new Error(`--fail-on must be one of: ${SEVERITIES.join(", ")}`);
  const maxRoutes = values["max-routes"] !== undefined ? Number(values["max-routes"]) : (cfg.maxRoutes ?? 30);
  if (!Number.isInteger(maxRoutes) || maxRoutes < 1) throw new Error("--max-routes must be a positive whole number");
  const out = values.out !== undefined ? values.out : (fromCfg(cfg.out) ?? "frontend-audit-report");

  const result = await runAudit({
    url: values.url ?? cfg.url,
    cdpUrl: values.cdp ?? process.env.EYEBALL_CDP_URL ?? cfg.cdpUrl,
    root: values.root ?? fromCfg(cfg.root) ?? (loaded ? loaded.dir : "."),
    framework,
    routes: (values.routes ? list(values.routes) : (cfg.routes ?? [])).map(asRoute),
    include: (values.include ? list(values.include) : (cfg.include ?? [])).map(asRoute),
    exclude: (values.exclude ? list(values.exclude) : (cfg.exclude ?? [])).map(asRoute),
    viewports,
    out,
    functional: values["no-functional"] ? false : (cfg.functional ?? true),
    axe: values["no-axe"] ? false : (cfg.axe ?? true),
    auth: cfg.auth,
    maxRoutes,
    version: pkg.version,
    log: (m) => console.error(`[eyeball] ${m}`),
  });
  const count = (s) => result.findings.filter((f) => f.severity === s).length;
  console.log(`Audited ${result.routes.length} route(s) at ${result.widths.join("/")} px. ${SEVERITIES.map((s) => `${count(s)} ${s}`).join(", ")}.`);
  console.log(`Report: ${path.join(path.resolve(out), "report.md")}`);
  if (failOn && result.findings.some((f) => severityRank(f.severity) <= severityRank(failOn))) return 1;
  return 0;
}

