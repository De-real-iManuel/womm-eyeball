// Finding model. Severity: Critical (page or data unusable), High (user cannot finish a task,
// or a serious accessibility failure), Medium (visible defect), Low (polish).
export const SEVERITIES = ["Critical", "High", "Medium", "Low"];

export function severityRank(s) {
  return SEVERITIES.indexOf(s);
}

// axe impact -> severity. critical and serious both map to High; the tool never marks a finding Critical on axe alone.
export function fromAxeImpact(impact) {
  return { critical: "High", serious: "High", moderate: "Medium", minor: "Low" }[impact] ?? "Low";
}

export class Findings {
  #list = [];
  add(f) {
    const key = [f.rule, f.route, f.width ?? "", f.message].join("|");
    if (this.#list.some((x) => x.key === key)) return;
    this.#list.push({ key, category: "visual", ...f });
  }
  sorted() {
    return this.#list
      .map(({ key, ...rest }) => rest)
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.route.localeCompare(b.route))
      .map((f, i) => ({ id: `F-${String(i + 1).padStart(3, "0")}`, ...f }));
  }
}
