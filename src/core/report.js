import fs from "node:fs";
import path from "node:path";
import { SEVERITIES } from "./findings.js";

// Page-controlled text (link labels, console messages) lands in the report: neutralize markdown and HTML so it cannot add links, images or tags.
const esc = (s) => String(s ?? "").replace(/\r?\n/g, " ").replace(/[\\|`\[\]<>]/g, "\\$&");

export function writeReports(out, r) {
  fs.writeFileSync(path.join(out, "findings.json"), JSON.stringify(r, null, 2));
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, r.findings.filter((f) => f.severity === s).length]));
  const lines = [
    "# Frontend audit report",
    "",
    `Framework: ${r.framework} (routes found by: ${r.strategy}). Widths: ${r.widths.join(", ")} px. Functional checks: ${r.functional ? "on" : "off"}.`,
    "",
    `Findings: ${SEVERITIES.map((s) => `${counts[s]} ${s}`).join(", ")}.`,
    "",
  ];
  const byRoute = [...new Set([...r.routes, ...r.findings.map((f) => f.route)])];
  for (const route of byRoute) {
    const list = r.findings.filter((f) => f.route === route);
    lines.push(`## ${esc(route)}`, "");
    const shotLinks = Object.entries(r.shots[route] ?? {}).map(([w, f]) => `[${w}px](${f})`);
    if (shotLinks.length) lines.push(`Screenshots: ${shotLinks.join(", ")}`, "");
    if (!list.length) {
      lines.push("No findings.", "");
      continue;
    }
    lines.push("| ID | Severity | Kind | Rule | Width | Finding | Evidence |", "|---|---|---|---|---|---|---|");
    for (const f of list) {
      const evidence = [esc(f.measured), f.screenshot ? `[screenshot](${f.screenshot})` : "", f.stubbed ? "(stubbed server response)" : ""].filter(Boolean).join(" ");
      lines.push(`| ${f.id} | ${f.severity} | ${f.category} | ${esc(f.rule)} | ${f.width ?? "-"} | ${esc(f.message)} | ${evidence} |`);
    }
    lines.push("");
  }
  lines.push(
    "## Notes and limits",
    "",
    ...r.notes.map((n) => `- ${esc(n)}`),
    "- Findings marked stubbed used a fake server response. Every non-GET request is answered by a stub and never reaches your server.",
    "- Not checked: logged-in pages, hover and focus-visible states, animation, keyboard-only flow, external links, production-build differences.",
    "- Automated checks find a subset of problems. Read the screenshots too.",
    "",
  );
  fs.writeFileSync(path.join(out, "report.md"), lines.join("\n"));
}
