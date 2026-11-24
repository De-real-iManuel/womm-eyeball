// Framework-agnostic core: given a browser, a base URL and a route list, capture screenshots and run checks.
// It knows nothing about Next.js or any other framework; adapters only produce the route list.
import path from "node:path";
import { Findings } from "./findings.js";
import { visualChecks } from "./visual.js";
import { functionalChecks, installStub } from "./functional.js";
import { isSafeRoute } from "./routes.js";

export const slug = (route) => route.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "home";

/**
 * @param {object} o
 * @param {import("playwright").Browser} o.browser
 * @param {string} o.baseUrl         no trailing slash
 * @param {string[]} o.routes        paths such as "/" or "/pricing"
 * @param {{name:string,width:number,height:number}[]} o.viewports
 * @param {string} o.out             report folder; screenshots go to <out>/screenshots
 * @returns {{shots, findings, notes}}
 */
export async function auditRoutes({ browser, baseUrl, routes: requested, viewports, out, functional = true, axe = true }) {
  const findings = new Findings();
  const notes = [];
  const shots = {};
  let routes = requested;
  const unsafe = routes.filter((r) => !isSafeRoute(r));
  if (unsafe.length) notes.push(`Skipped ${unsafe.length} route(s) that do not stay on the target origin (they must start with a single "/"): ${unsafe.slice(0, 3).map((r) => JSON.stringify(r)).join(", ")}.`);
  routes = routes.filter(isSafeRoute);
  const sorted = [...viewports].sort((a, b) => a.width - b.width);
  const widths = sorted.map((v) => v.width);
  for (const route of routes) {
    shots[route] = {};
    for (const { width, height } of sorted) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const consoleSeen = new Map();
      const failed = new Map();
      const add = (f) => findings.add({ route, width, ...f });
      page.on("console", (m) => m.type() === "error" && consoleSeen.set(m.text().slice(0, 140), (consoleSeen.get(m.text().slice(0, 140)) ?? 0) + 1));
      page.on("pageerror", (e) => add({ rule: "page-error", category: "functional", severity: "Medium", message: "Uncaught JavaScript error", measured: String(e.message).slice(0, 160) }));
      page.on("response", (r) => {
        const u = new URL(r.url());
        if (r.status() >= 400 && u.origin === new URL(baseUrl).origin && r.request().resourceType() !== "document") failed.set(`${r.status()} ${u.pathname}`, 1);
      });
      try {
        const res = await page.goto(baseUrl + route, { waitUntil: "load", timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
        if (res && res.status() >= 400) add({ rule: "route-status", category: "functional", severity: "High", message: `Route answers HTTP ${res.status()}`, measured: route });
        const file = `${slug(route)}-${width}.png`;
        await page.screenshot({ path: path.join(out, "screenshots", file) });
        shots[route][width] = `screenshots/${file}`;
        const found = await visualChecks(page, width, { axe: axe && (width === widths[0] || width === widths[widths.length - 1]) });
        for (const f of found) add({ ...f, screenshot: shots[route][width] });
      } catch (err) {
        add({ rule: "load-error", category: "functional", severity: "High", message: "Page failed to load", measured: err.message.slice(0, 160) });
      }
      for (const [msg, n] of consoleSeen) add({ rule: "console-error", category: "functional", severity: "Low", message: `Console error${n > 1 ? ` (x${n})` : ""}`, measured: msg });
      for (const k of failed.keys()) add({ rule: "failed-request", category: "functional", severity: "Medium", message: "Page asset or API request failed", measured: k });
      await context.close();
    }

    if (functional) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const rec = await installStub(context);
      const page = await context.newPage();
      const add = (f) => findings.add({ route, category: "functional", ...f });
      const shot = async (name) => {
        const file = `${slug(name)}.png`;
        await page.screenshot({ path: path.join(out, "screenshots", file) }).catch(() => {});
        return `screenshots/${file}`;
      };
      try {
        await functionalChecks(page, context, rec, { baseUrl, route, add, shot });
      } catch (err) {
        add({ rule: "functional-error", severity: "Low", message: "Functional checks stopped early", measured: err.message.slice(0, 160) });
      }
      await context.close();
    }
  }

  // Unknown URL: a blank 404 leaves the visitor stranded.
  const ctx404 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p404 = await ctx404.newPage();
  const res404 = await p404.goto(`${baseUrl}/__frontend-audit-404-probe__`, { waitUntil: "load", timeout: 30000 }).catch(() => null);
  if (res404 && res404.status() >= 400) {
    const text = (await p404.evaluate(() => document.body?.innerText ?? "")).trim();
    if (!text) findings.add({ route: "/__frontend-audit-404-probe__", rule: "blank-404", category: "functional", severity: "High", message: "Unknown URL gives a blank page", measured: `HTTP ${res404.status()}, no visible text` });
  } else if (res404) {
    notes.push("Unknown URL answered HTTP 200 (SPA fallback or catch-all); the 404 page was not judged.");
  }
  await ctx404.close();

  return { shots, findings: findings.sorted(), notes, widths };
}
