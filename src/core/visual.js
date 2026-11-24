// Visual and accessibility checks for one loaded page at one width.
import AxeBuilder from "@axe-core/playwright";
import { fromAxeImpact } from "./findings.js";

/** Runs inside the page. Returns plain objects only. */
function measureInPage(width) {
  const out = [];
  const de = document.documentElement;
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !e.closest("[hidden],[aria-hidden='true'],.sr-only");
  };
  const name = (e) => {
    if (e.id) return `#${e.id}`;
    const cls = typeof e.className === "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
    const text = (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24);
    return `${e.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`;
  };

  // 1. Horizontal overflow
  if (de.scrollWidth > de.clientWidth + 1) {
    const culprits = [...document.body.querySelectorAll("*")]
      .filter((e) => visible(e) && e.getBoundingClientRect().right > de.clientWidth + 1)
      .slice(0, 3)
      .map(name);
    out.push({
      rule: "horizontal-overflow",
      severity: width <= 480 ? "High" : "Medium",
      message: "Page scrolls sideways",
      measured: `scrollWidth ${de.scrollWidth}px > viewport ${de.clientWidth}px; widest: ${culprits.join(", ") || "unknown"}`,
    });
  }

  // 2. Blank page
  const hasMedia = [...document.querySelectorAll("img,svg,canvas,video,input,button,iframe")].some(visible);
  if ((document.body?.innerText ?? "").trim().length === 0 && !hasMedia) {
    out.push({ rule: "blank-page", severity: "High", message: "Page renders nothing visible", measured: "no text and no visible media or controls" });
  }

  // 3. Small tap targets (touch widths only; inline text links are exempt)
  if (width <= 820) {
    const small = [...document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,[role=button]")].filter((e) => {
      if (!visible(e)) return false;
      if (e.tagName === "A" && getComputedStyle(e).display === "inline") return false;
      const r = e.getBoundingClientRect();
      return r.width < 44 || r.height < 44;
    });
    if (small.length) {
      out.push({
        rule: "small-tap-target",
        severity: "Low",
        message: `${small.length} control(s) under 44x44 CSS px`,
        measured: small.slice(0, 4).map((e) => `${name(e)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`).join("; "),
      });
    }
  }

  // 4. Inconsistent spacing inside a group of same-class siblings (padding and radius)
  const groups = new Map();
  for (const e of document.body.querySelectorAll("*")) {
    if (typeof e.className !== "string" || !e.className.trim() || !visible(e)) continue;
    // Same parent element, same tag, same first class token ("card" and "card odd" are one group).
    const parentGroups = groups.get(e.parentElement) ?? groups.set(e.parentElement, new Map()).get(e.parentElement);
    const key = `${e.tagName}.${e.className.trim().split(/\s+/)[0]}`;
    if (!parentGroups.has(key)) parentGroups.set(key, []);
    parentGroups.get(key).push(e);
  }
  const allGroups = [...groups.values()].flatMap((m) => [...m.entries()]);
  for (const [, els] of allGroups) {
    if (els.length < 3) continue;
    for (const prop of ["padding", "borderRadius"]) {
      const values = els.map((e) => getComputedStyle(e)[prop]);
      const counts = {};
      values.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
      const mode = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      if (counts[mode] <= els.length / 2) continue; // no clear majority
      const odd = els.filter((_, i) => values[i] !== mode);
      if (odd.length === 0) continue;
      out.push({
        rule: "inconsistent-spacing",
        severity: "Medium",
        message: `${prop === "padding" ? "Padding" : "Border radius"} differs inside a group of ${els.length} like elements`,
        measured: `${els.length - odd.length} use ${mode}; ${odd.map((e) => `${name(e)} uses ${getComputedStyle(e)[prop]}`).join("; ")}`,
      });
    }
  }

  // 5. Clipped text (overflow hidden without an ellipsis)
  const clipped = [...document.body.querySelectorAll("*")].filter((e) => {
    const cs = getComputedStyle(e);
    return visible(e) && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== "ellipsis" && e.scrollWidth > e.clientWidth + 1 && (e.textContent || "").trim() && e.children.length === 0;
  });
  if (clipped.length) {
    out.push({ rule: "clipped-text", severity: "Medium", message: `${clipped.length} element(s) cut text off`, measured: clipped.slice(0, 3).map(name).join("; ") });
  }
  return out;
}

export async function visualChecks(page, width, { axe }) {
  const results = await page.evaluate(measureInPage, width);
  if (axe) {
    try {
      const report = await new AxeBuilder({ page }).analyze();
      for (const v of report.violations) {
        results.push({
          rule: `axe:${v.id}`,
          category: "a11y",
          severity: fromAxeImpact(v.impact),
          message: v.help,
          measured: `${v.nodes.length} node(s). ${v.nodes.slice(0, 2).map((n) => `${n.target.join(" ")}: ${(n.any[0]?.message || n.none[0]?.message || "").slice(0, 120)}`).join(" | ")}`,
          helpUrl: v.helpUrl,
        });
      }
    } catch (err) {
      results.push({ rule: "axe:error", category: "a11y", severity: "Low", message: `axe-core could not run: ${err.message.slice(0, 120)}`, measured: "" });
    }
  }
  return results;
}
