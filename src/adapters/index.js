// Adapter registry. An adapter is { name, detect(root, {pkg, deps}) -> boolean, discover(root) -> {strategy, routes, skipped} | null }.
// discover() returning null means "no routes folder here": the generic crawl fallback takes over.
// To add a framework: write an adapter and add it to ADAPTERS (order = detection priority).
import next from "./next.js";
import { sveltekit, nuxt, angular, vite, staticHtml, crawlFallback } from "./generic.js";
import { readPackage } from "./fs-routes.js";

const ADAPTERS = [next, sveltekit, nuxt, angular, vite, staticHtml];
export const FRAMEWORKS = [...ADAPTERS.map((a) => a.name), "unknown"];

export function detectFramework(root) {
  const pkg = readPackage(root);
  const ctx = { pkg, deps: { ...pkg.dependencies, ...pkg.devDependencies } };
  return ADAPTERS.find((a) => a.detect(root, ctx))?.name ?? "unknown";
}

export function discoverRoutes(root, framework) {
  const adapter = ADAPTERS.find((a) => a.name === framework);
  return adapter?.discover(root) ?? crawlFallback();
}
