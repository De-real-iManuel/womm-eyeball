// Functional UX checks for one route: dead controls, broken links, form behavior.
// Safety: every non-GET request the page makes is answered by a stub and never reaches the server.
// GET requests are real. Findings that depend on a stub carry stubbed: true.

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
export const STUB_DELAY_MS = 400;

/** Installs the stub on a browser context. Returns a recorder. */
export async function installStub(context) {
  const rec = { calls: [], mode: "200" };
  await context.route("**/*", async (route) => {
    const req = route.request();
    const method = req.method();
    if (method === "GET" || method === "HEAD") return route.continue();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    rec.calls.push({ method, url: req.url(), at: Date.now() });
    await delay(STUB_DELAY_MS);
    const nav = req.isNavigationRequest();
    return route.fulfill({
      status: rec.mode === "500" ? 500 : 200,
      headers: CORS,
      contentType: nav ? "text/html" : "application/json",
      body: nav ? "<!doctype html><title>stub</title><p>stubbed response</p>" : rec.mode === "500" ? '{"error":"stub"}' : "{}",
    });
  });
  return rec;
}

const signature = (page) =>
  page.evaluate(() =>
    [
      location.pathname + location.search, // not the hash: href="#" changes it without doing anything
      Math.round(scrollY),
      document.body ? document.body.innerText.length : 0,
      document.querySelectorAll("*").length,
      [...document.querySelectorAll("[aria-expanded],[aria-pressed],[aria-checked],details,dialog")]
        .map((e) => `${e.getAttribute("aria-expanded")}${e.getAttribute("aria-pressed")}${e.getAttribute("aria-checked")}${e.open ?? ""}`)
        .join(","),
    ].join("|"),
  );

const bodyText = (page) => page.evaluate(() => (document.body ? document.body.innerText : "").slice(0, 8000));

/** Runs in the page: describes clickable controls and links. */
function listControls() {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !e.closest("[hidden],[aria-hidden='true'],.sr-only");
  };
  const label = (e) => ((e.textContent || e.getAttribute("aria-label") || e.value || "").trim().replace(/\s+/g, " ").slice(0, 40));
  const controls = [];
  const links = [];
  document.querySelectorAll("button,[role=button],a[href]").forEach((e, index) => {
    if (!vis(e) || e.disabled || e.getAttribute("aria-disabled") === "true") return;
    const isLink = e.tagName === "A";
    const href = isLink ? e.getAttribute("href").trim() : null;
    const inForm = !!e.closest("form");
    const type = e.getAttribute("type");
    const isSubmit = e.tagName === "BUTTON" && inForm && (type === null || type === "submit");
    if (isSubmit) return; // handled by the form checks
    const placeholderLink = isLink && (href === "" || href === "#" || /^javascript:/i.test(href));
    if (isLink && !placeholderLink) {
      links.push({ href: e.href, raw: href, label: label(e) });
    } else {
      controls.push({ index, label: label(e) || e.tagName.toLowerCase(), kind: isLink ? `link href="${href}"` : "button" });
    }
  });
  return { controls, links };
}

export async function functionalChecks(page, context, rec, { baseUrl, route, add, shot }) {
  const url = baseUrl + route; // route is checked by the caller (isSafeRoute); never resolve it against baseUrl
  const origin = new URL(baseUrl).origin;
  const consoleHits = [];
  page.on("console", (m) => m.type() === "error" && consoleHits.push(m.text()));
  page.on("pageerror", (e) => consoleHits.push(String(e.message)));
  let requests = 0;
  page.on("request", () => requests++);
  let popups = 0;
  page.on("popup", () => popups++);
  const reload = async () => {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  };

  await reload();
  const { controls, links } = await page.evaluate(listControls);

  // A. Links: placeholder targets are in `controls`; real ones are fetched.
  const seen = new Set();
  for (const link of links.slice(0, 60)) {
    if (link.raw.startsWith("#")) {
      const id = decodeURIComponent(link.raw.slice(1));
      const found = await page.evaluate((i) => !!(document.getElementById(i) || document.getElementsByName(i)[0]), id);
      if (!found) add({ rule: "dead-anchor", severity: "Medium", message: `Link "${link.label}" points to #${id}, which does not exist`, measured: `href="${link.raw}"` });
      continue;
    }
    if (!/^https?:/i.test(link.href) || new URL(link.href).origin !== origin) continue; // external, mailto, tel: not checked
    const target = link.href.split("#")[0];
    if (seen.has(target)) continue;
    seen.add(target);
    try {
      const res = await context.request.get(target, { failOnStatusCode: false, timeout: 10000 });
      if (res.status() >= 400) add({ rule: "broken-link", severity: "High", message: `Link "${link.label}" leads to an error page`, measured: `GET ${new URL(target).pathname} -> HTTP ${res.status()}` });
    } catch (err) {
      add({ rule: "broken-link", severity: "High", message: `Link "${link.label}" could not be loaded`, measured: err.message.slice(0, 100) });
    }
  }

  // B. Dead controls: click, then look for any effect.
  for (const c of controls.slice(0, 40)) {
    const handle = (await page.locator("button,[role=button],a[href]").nth(c.index).elementHandle().catch(() => null));
    if (!handle) continue;
    const before = await signature(page);
    const reqBefore = requests;
    const errBefore = consoleHits.length;
    const popBefore = popups;
    try {
      await handle.scrollIntoViewIfNeeded({ timeout: 2000 });
      await handle.click({ timeout: 3000 });
    } catch {
      continue; // not clickable (covered, detached): not evidence of a dead control
    }
    await delay(450);
    const after = await signature(page).catch(() => "navigated");
    const changed = after !== before || requests > reqBefore || consoleHits.length > errBefore || popups > popBefore;
    if (!changed) {
      add({ rule: "dead-control", severity: "Medium", message: `Clicking ${c.kind} "${c.label}" does nothing`, measured: "no navigation, DOM change, request, popup or console output within 450ms" });
    } else if (consoleHits.length > errBefore) {
      add({ rule: "click-error", severity: "High", message: `Clicking "${c.label}" raises an error`, measured: consoleHits[consoleHits.length - 1].slice(0, 160) });
    }
    if (page.url() !== url) await reload();
  }

  // C. Forms
  await reload();
  const formCount = await page.locator("form").count();
  for (let i = 0; i < Math.min(formCount, 3); i++) {
    await checkForm(page, rec, i, { route, add, reload, shot });
  }
}

async function fillForm(form) {
  await form.evaluate((f) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest("[hidden],[aria-hidden='true'],.sr-only"); };
    const setVal = (e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); };
    f.querySelectorAll("input,textarea,select").forEach((e) => {
      if (!vis(e) || e.disabled) return;
      const t = (e.getAttribute("type") || "text").toLowerCase();
      if (e.tagName === "SELECT") { const o = [...e.options].find((x) => x.value); if (o) setVal(e, o.value); }
      else if (t === "checkbox") { if (e.required && !e.checked) e.click(); }
      else if (t === "radio") { if (e.required && !e.checked) e.click(); }
      else if (["hidden", "submit", "button", "file"].includes(t)) return;
      else setVal(e, { email: "audit@example.com", tel: "5550100", url: "https://example.com", number: "1", password: "Audit-test-1!" }[t] ?? "audit test");
    });
  });
}

async function checkForm(page, rec, index, { route, add, reload, shot }) {
  const formSel = page.locator("form").nth(index);
  const submit = () => formSel.locator("button[type=submit],button:not([type]),input[type=submit]").first();
  const fieldCount = await formSel.locator("input:not([type=hidden]):visible,textarea:visible,select:visible").count();
  const name = `form #${index + 1}`;
  if ((await submit().count()) === 0) return;

  // 1. Empty submit
  await reload();
  if (fieldCount > 0) {
    const textBefore = await bodyText(page);
    await submit().click({ timeout: 3000 }).catch(() => {});
    await delay(500);
    const feedback = await formSel.evaluate((f) => ({
      invalid: f.querySelectorAll(":invalid").length,
      aria: f.querySelectorAll("[aria-invalid='true']").length,
      alerts: document.querySelectorAll("[role=alert],[role=status],[aria-live]").length && [...document.querySelectorAll("[role=alert],[role=status],[aria-live]")].some((e) => e.textContent.trim()),
    }));
    const changed = (await bodyText(page)) !== textBefore;
    if (!feedback.invalid && !feedback.aria && !feedback.alerts && !changed) {
      add({ rule: "no-validation-feedback", severity: "Medium", message: `${name}: submitting it empty shows no message`, measured: "no :invalid fields, no aria-invalid, no alert text, no text change", stubbed: true });
    }
  }

  // 2. Filled, double click, stubbed 200
  await reload();
  rec.mode = "200";
  const callsBefore = rec.calls.length;
  const textBefore = await bodyText(page);
  await fillForm(formSel);
  await submit().dblclick({ timeout: 3000 }).catch(() => {});
  await delay(150);
  const early = await bodyText(page);
  await delay(STUB_DELAY_MS + 1200);
  const late = await bodyText(page);
  const sent = rec.calls.slice(callsBefore);
  if (sent.length >= 2) {
    add({
      rule: "duplicate-submit",
      severity: "High",
      message: `${name}: a double click sends the same request ${sent.length} times`,
      measured: `${sent.length} x ${sent[0].method} ${new URL(sent[0].url).pathname} within ${sent[sent.length - 1].at - sent[0].at}ms`,
      stubbed: true,
      screenshot: await shot(`${route}-form${index + 1}-double`),
    });
  }
  if (sent.length > 0 && early === textBefore && late === textBefore) {
    add({ rule: "no-submit-feedback", severity: "Medium", message: `${name}: nothing visible changes after a successful submit`, measured: "page text identical before, 150ms and ~1.5s after the (stubbed) 200 response", stubbed: true });
  }

  // 3. Filled, one click, stubbed 500
  await reload();
  rec.mode = "500";
  const failBefore = await bodyText(page);
  const c2 = rec.calls.length;
  await fillForm(formSel);
  await submit().click({ timeout: 3000 }).catch(() => {});
  await delay(STUB_DELAY_MS + 1200);
  if (rec.calls.length > c2 && (await bodyText(page)) === failBefore) {
    add({ rule: "no-error-feedback", severity: "Medium", message: `${name}: nothing visible changes when the server answers 500`, measured: "page text identical before and after the (stubbed) 500 response", stubbed: true });
  }
  rec.mode = "200";
}
