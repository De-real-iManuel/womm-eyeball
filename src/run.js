// Orchestrator: pick an adapter, discover routes, filter them, hand them to the core, write reports.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { detectFramework, discoverRoutes } from "./adapters/index.js";
import { startStaticServer } from "./core/server.js";
import { crawl, filterRoutes } from "./core/routes.js";
import { auditRoutes, slug } from "./core/audit.js";
import { writeReports } from "./core/report.js";
import { toViewports } from "./config.js";

export { slug };

export async function runAudit(opts) {
  const o = { root: ".", framework: "auto", out: "frontend-audit-report", functional: true, axe: true, maxRoutes: 30, routes: [], include: [], exclude: [], ...opts };
  // `widths` (plain numbers) is the older way to say viewports; `viewports` wins when both are given.
  const viewports = o.viewports ?? (o.widths ? o.widths.map((w) => ({ name: `${w}px`, width: w, height: 900 })) : toViewports());
  const root = path.resolve(o.root);
  const framework = o.framework === "auto" ? detectFramework(root) : o.framework;
  const log = o.log ?? (() => {});
  if (o.auth) log("config 'auth' is a placeholder and is ignored in this version");

  let server = null;
  let baseUrl = o.url;
  if (!baseUrl) {
    if (framework !== "static" && !fs.existsSync(path.join(root, "index.html"))) {
      throw new Error(`Framework "${framework}" needs a running dev server. Start it, then pass --url http://localhost:<port>.`);
    }
    server = await startStaticServer(root);
    baseUrl = server.url;
    log(`serving ${root} at ${baseUrl}`);
  }
  baseUrl = baseUrl.replace(/\/$/, "");

  const out = path.resolve(o.out);
  fs.mkdirSync(path.join(out, "screenshots"), { recursive: true });
  const browser = await chromium.launch();
  try {
    let discovery = { strategy: "explicit", routes: o.routes, skipped: [] };
    if (!o.routes.length) {
      discovery = discoverRoutes(root, framework);
      if (discovery.strategy === "crawl") discovery.routes = await crawl(browser, baseUrl, o.maxRoutes);
    }
    const filtered = filterRoutes(discovery.routes, o);
    const routes = filtered.slice(0, o.maxRoutes);
    const notes = [];
    if (filtered.length < discovery.routes.length) notes.push(`${discovery.routes.length - filtered.length} route(s) removed by include/exclude patterns.`);
    if (filtered.length > routes.length) notes.push(`Route list cut to ${o.maxRoutes} (use --max-routes).`);
    for (const s of discovery.skipped) notes.push(`Skipped ${s.source}: ${s.reason}.`);
    log(`framework=${framework} strategy=${discovery.strategy} routes=${routes.length}`);

    const core = await auditRoutes({ browser, baseUrl, routes, viewports, out, functional: o.functional, axe: o.axe });
    const result = { tool: "frontend-audit-cli", version: o.version ?? "0.1.0", framework, strategy: discovery.strategy, baseUrl: server ? "(built-in static server)" : baseUrl, widths: core.widths, routes, shots: core.shots, notes: [...notes, ...core.notes], functional: o.functional, findings: core.findings };
    writeReports(out, result);
    return result;
  } finally {
    await browser.close();
    await server?.close();
  }
}
