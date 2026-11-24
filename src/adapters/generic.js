// Generic adapters: other file-routed frameworks, static HTML, and the crawl fallback any adapter can reuse.
import path from "node:path";
import { exists, fileRoutes, walk } from "./fs-routes.js";

/** Fallback: the runner follows same-origin links from "/" in the browser. */
export const crawlFallback = () => ({ strategy: "crawl", routes: ["/"], skipped: [] });

export const sveltekit = {
  name: "sveltekit",
  detect: (root, { deps }) => Boolean(deps["@sveltejs/kit"]),
  discover: (root) => ({ strategy: "files", ...fileRoutes(path.join(root, "src/routes"), (n) => n === "+page.svelte", () => "") }),
};

export const nuxt = {
  name: "nuxt",
  detect: (root, { deps }) => Boolean(deps.nuxt),
  discover(root) {
    const dir = ["pages", "app/pages"].map((d) => path.join(root, d)).find(exists);
    if (!dir) return null;
    return { strategy: "files", ...fileRoutes(dir, (n) => n.endsWith(".vue"), (n) => n.replace(/\.vue$/, "").replace(/^index$/, "")) };
  },
};

export const angular = { name: "angular", detect: (root, { deps }) => Boolean(deps["@angular/core"]), discover: () => null };
export const vite = { name: "vite", detect: (root, { deps }) => Boolean(deps.vite || deps["react-scripts"]), discover: () => null };

export const staticHtml = {
  name: "static",
  detect: (root) => exists(path.join(root, "index.html")),
  discover(root) {
    const routes = new Set();
    for (const file of walk(root)) {
      if (!file.endsWith(".html")) continue;
      const rel = path.relative(root, file).split(path.sep).join("/");
      routes.add(rel === "index.html" ? "/" : rel.endsWith("/index.html") ? "/" + rel.slice(0, -10) : "/" + rel);
    }
    return { strategy: "files", routes: [...routes].sort(), skipped: [] };
  },
};
