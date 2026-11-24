// Helpers shared by adapters that read routes from a project's folder layout.
import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".nuxt", ".svelte-kit", "dist", "build", "out", "coverage"]);
export const exists = (p) => fs.existsSync(p);

export function walk(dir) {
  const files = [];
  if (!exists(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...walk(path.join(dir, entry.name)));
    } else {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

export function readPackage(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return {};
  }
}

const isDynamic = (seg) => /^\[.*\]$/.test(seg);

/** Turns directory segments into a URL path. Returns null when the route needs a parameter value. */
function toRoute(segments, skipped, source) {
  const kept = [];
  for (const seg of segments) {
    if (/^\(.*\)$/.test(seg) && !seg.startsWith("(.")) continue; // route group
    if (seg.startsWith("@") || seg.startsWith("(.")) {
      skipped.push({ source, reason: "parallel or intercepting route" });
      return null;
    }
    if (isDynamic(seg)) {
      skipped.push({ source, reason: "dynamic segment needs a sample value (use --routes)" });
      return null;
    }
    kept.push(seg);
  }
  return "/" + kept.join("/");
}

export function fileRoutes(base, test, stripName) {
  const routes = new Set();
  const skipped = [];
  for (const file of walk(base)) {
    const rel = path.relative(base, file).split(path.sep);
    const name = rel[rel.length - 1];
    if (!test(name, rel)) continue;
    const segs = rel.slice(0, -1);
    const stem = stripName(name);
    if (stem) segs.push(stem);
    const route = toRoute(segs, skipped, rel.join("/"));
    if (route) routes.add(route);
  }
  return { routes: [...routes].sort(), skipped };
}
