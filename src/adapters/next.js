// Next.js adapter: detects a Next.js project and lists its routes from the app/ or pages/ folder.
import fs from "node:fs";
import path from "node:path";
import { exists, fileRoutes } from "./fs-routes.js";

const PAGE_EXT = /\.(tsx|jsx|ts|js|mdx)$/;
const appDir = (root) => ["app", "src/app"].map((d) => path.join(root, d)).find(exists);
const pagesDir = (root) => ["pages", "src/pages"].map((d) => path.join(root, d)).find(exists);
const hasConfig = (root) => fs.readdirSync(root).some((n) => /^next\.config\.(js|mjs|cjs|ts)$/.test(n));

export default {
  name: "next",
  /** package.json lists next, or a next.config file sits beside an app/ or pages/ folder. */
  detect(root, { deps }) {
    if (deps.next) return true;
    try {
      return hasConfig(root) && Boolean(appDir(root) || pagesDir(root));
    } catch {
      return false;
    }
  },
  discover(root) {
    const app = appDir(root);
    if (app) return { strategy: "files", ...fileRoutes(app, (n) => /^page\.(tsx|jsx|ts|js|mdx)$/.test(n), () => "") };
    const pages = pagesDir(root);
    if (pages) {
      return {
        strategy: "files",
        ...fileRoutes(
          pages,
          (n, rel) => PAGE_EXT.test(n) && !n.startsWith("_") && rel[0] !== "api" && !/^(404|500)\./.test(n),
          (n) => n.replace(PAGE_EXT, "").replace(/^index$/, ""),
        ),
      };
    }
    return null; // no routes folder: caller falls back to the generic crawl
  },
};
