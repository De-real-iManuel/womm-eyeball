// Minimal static file server on 127.0.0.1, used when the project is plain HTML and no --url is given.
// shortcut: no range requests, no caching headers, no SPA fallback. Upgrade if a build output needs them.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

export function startStaticServer(root, { onRequest } = {}) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    onRequest?.(req);
    // Host check blocks DNS rebinding: only the address we handed out is accepted.
    if (req.headers.host !== `127.0.0.1:${server.address().port}`) return void res.writeHead(403).end("Forbidden");
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      return void res.writeHead(400).end("Bad request"); // malformed %-escape must not crash the run
    }
    // Never serve dotfiles (.env, .git) or node_modules, even though they sit under the project root.
    if (urlPath.split(/[\\/]/).some((s) => s.startsWith(".") && s !== "" || s === "node_modules")) return void res.writeHead(404).end("Not found");
    let file = path.resolve(base, "." + urlPath);
    if (file !== base && !file.startsWith(base + path.sep)) {
      res.writeHead(403).end("Forbidden"); // path traversal guard
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file) || req.method !== "GET") {
      res.writeHead(req.method === "GET" ? 404 : 405, { "content-type": "text/plain" }).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
