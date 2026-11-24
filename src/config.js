// Per-app config file: eyeball.config.json (or .mjs / .js exporting the same object as default).
// The older frontend-audit.config.* names are still read.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FRAMEWORKS } from "./adapters/index.js";

export const CONFIG_NAMES = ["eyeball", "frontend-audit"].flatMap((n) => ["json", "mjs", "js"].map((e) => `${n}.config.${e}`));

export const DEFAULT_VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
};

const KEYS = ["url", "root", "framework", "routes", "include", "exclude", "viewports", "maxRoutes", "out", "functional", "axe", "auth"];
const isStrings = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");

/** Throws a message naming the file and the bad key. Returns the config when valid. */
export function validateConfig(c, file = "config") {
  const bad = (m) => {
    throw new Error(`${file}: ${m}`);
  };
  if (!c || typeof c !== "object" || Array.isArray(c)) bad("must be an object");
  for (const k of Object.keys(c)) if (!KEYS.includes(k)) bad(`unknown key "${k}" (allowed: ${KEYS.join(", ")})`);
  for (const k of ["url", "root", "out"]) if (c[k] !== undefined && typeof c[k] !== "string") bad(`"${k}" must be a string`);
  if (c.url !== undefined && !/^https?:\/\//.test(c.url)) bad(`"url" must start with http:// or https://`);
  if (c.framework !== undefined && c.framework !== "auto" && !FRAMEWORKS.includes(c.framework)) bad(`"framework" must be auto or one of: ${FRAMEWORKS.join(", ")}`);
  for (const k of ["routes", "include", "exclude"]) if (c[k] !== undefined && !isStrings(c[k])) bad(`"${k}" must be an array of strings`);
  if (c.maxRoutes !== undefined && !(Number.isInteger(c.maxRoutes) && c.maxRoutes >= 1)) bad(`"maxRoutes" must be a positive whole number`);
  for (const k of ["functional", "axe"]) if (c[k] !== undefined && typeof c[k] !== "boolean") bad(`"${k}" must be true or false`);
  if (c.viewports !== undefined) {
    if (!c.viewports || typeof c.viewports !== "object" || Array.isArray(c.viewports) || !Object.keys(c.viewports).length) bad(`"viewports" must be an object like {"mobile": {"width": 390, "height": 844}}`);
    for (const [name, v] of Object.entries(c.viewports)) {
      if (!v || !Number.isInteger(v.width) || v.width < 200 || v.width > 1999) bad(`viewport "${name}": width must be a whole number from 200 to 1999`);
      if (v.height !== undefined && !(Number.isInteger(v.height) && v.height >= 200 && v.height <= 1999)) bad(`viewport "${name}": height must be a whole number from 200 to 1999`);
    }
  }
  // "auth" is a documented placeholder: any value is accepted and ignored for now.
  return c;
}

/**
 * Loads a config. With `file` given, a missing file is an error. Without it, the first
 * of CONFIG_NAMES in `dir` is used, and null is returned when none exists.
 * @returns {Promise<{config: object, file: string, dir: string} | null>}
 */
export async function loadConfig({ dir = ".", file } = {}) {
  const found = file ? path.resolve(file) : CONFIG_NAMES.map((n) => path.resolve(dir, n)).find((p) => fs.existsSync(p));
  if (!found) return null;
  if (!fs.existsSync(found)) throw new Error(`config file not found: ${found}`);
  let raw;
  if (/\.json$/.test(found)) {
    try {
      raw = JSON.parse(fs.readFileSync(found, "utf8").replace(/^\uFEFF/, ""));
    } catch (e) {
      throw new Error(`${found}: not valid JSON (${e.message})`);
    }
  } else {
    try {
      raw = (await import(pathToFileURL(found).href)).default;
    } catch (e) {
      throw new Error(`${found}: could not be loaded (${e.message})`);
    }
  }
  return { config: validateConfig(raw, found), file: found, dir: path.dirname(found) };
}

/** Named viewports (config) to the list the core takes. Height defaults to 900. */
export function toViewports(viewports = DEFAULT_VIEWPORTS) {
  return Object.entries(viewports).map(([name, v]) => ({ name, width: v.width, height: v.height ?? 900 }));
}
