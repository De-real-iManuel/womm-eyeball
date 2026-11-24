// Framework-agnostic route helpers: same-origin link crawl and include/exclude filtering.

/** A route is a path on the target origin: one leading slash, never "//host" or "/\host" (those resolve to another host). */
export const isSafeRoute = (r) => typeof r === "string" && /^\/(?![\/\\])/.test(r) && !/[\r\n]/.test(r);

/** Follows same-origin links from "/" in the browser. Works for any app. */
export async function crawl(browser, baseUrl, limit) {
  const origin = new URL(baseUrl).origin;
  const seen = new Set(["/"]);
  const queue = ["/"];
  const page = await browser.newPage();
  while (queue.length && seen.size < limit) {
    const route = queue.shift();
    try {
      await page.goto(new URL(route, baseUrl).href, { waitUntil: "load", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.href));
      for (const h of hrefs) {
        const u = new URL(h, baseUrl);
        if (u.origin !== origin) continue;
        const r = u.pathname.replace(/\/$/, "") || "/";
        if (isSafeRoute(r) && !seen.has(r) && seen.size < limit) {
          seen.add(r);
          queue.push(r);
        }
      }
    } catch {
      /* unreachable page: skip */
    }
  }
  await page.close();
  return [...seen].sort();
}

/** Glob to RegExp: "*" is one path segment, "**" crosses "/". A trailing "/**" also matches the folder itself. */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i++;
    } else if (c === "*") re += "[^/]*";
    else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re.replace(/\/\.\*$/, "(?:/.*)?")}$`);
}

/** Keeps routes that match any include pattern (all when none) and no exclude pattern. Exclude wins. */
export function filterRoutes(routes, { include = [], exclude = [] } = {}) {
  const inc = include.map(globToRegExp);
  const exc = exclude.map(globToRegExp);
  return routes.filter((r) => (!inc.length || inc.some((re) => re.test(r))) && !exc.some((re) => re.test(r)));
}
