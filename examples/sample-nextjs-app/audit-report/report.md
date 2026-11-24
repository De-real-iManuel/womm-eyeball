# Frontend audit report

Framework: next (routes found by: files). Widths: 390, 820, 1440 px. Functional checks: on.

Findings: 0 Critical, 15 High, 11 Medium, 10 Low.

## /

Screenshots: [390px](screenshots/home-390.png), [820px](screenshots/home-820.png), [1440px](screenshots/home-1440.png)

| ID | Severity | Kind | Rule | Width | Finding | Evidence |
|---|---|---|---|---|---|---|
| F-001 | High | a11y | axe:color-contrast | 390 | Elements must meet minimum color contrast ratio thresholds | 1 node(s). .ghost: Element has insufficient color contrast of 2.32 (foreground color: #aaaaaa, background color: #ffffff, font size: 12.0pt [screenshot](screenshots/home-390.png) |
| F-002 | High | a11y | axe:color-contrast | 1440 | Elements must meet minimum color contrast ratio thresholds | 1 node(s). .ghost: Element has insufficient color contrast of 2.32 (foreground color: #aaaaaa, background color: #ffffff, font size: 12.0pt [screenshot](screenshots/home-1440.png) |
| F-003 | High | functional | broken-link | - | Link "Careers" leads to an error page | GET /careers -> HTTP 404 |
| F-016 | Medium | functional | dead-control | - | Clicking button "Learn more" does nothing | no navigation, DOM change, request, popup or console output within 450ms |
| F-017 | Medium | functional | dead-control | - | Clicking button "Get started" does nothing | no navigation, DOM change, request, popup or console output within 450ms |
| F-027 | Low | visual | small-tap-target | 390 | 8 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/home-390.png) |
| F-028 | Low | visual | small-tap-target | 820 | 8 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/home-820.png) |

## /about

Screenshots: [390px](screenshots/about-390.png), [820px](screenshots/about-820.png), [1440px](screenshots/about-1440.png)

| ID | Severity | Kind | Rule | Width | Finding | Evidence |
|---|---|---|---|---|---|---|
| F-004 | High | a11y | axe:document-title | 390 | Documents must have <title> element to aid in navigation | 1 node(s). html: Document does not have a non-empty <title> element [screenshot](screenshots/about-390.png) |
| F-005 | High | a11y | axe:document-title | 1440 | Documents must have <title> element to aid in navigation | 1 node(s). html: Document does not have a non-empty <title> element [screenshot](screenshots/about-1440.png) |
| F-006 | High | functional | broken-link | - | Link "Careers" leads to an error page | GET /careers -> HTTP 404 |
| F-018 | Medium | functional | dead-anchor | - | Link "our team" points to #team, which does not exist | href="#team" |
| F-029 | Low | visual | small-tap-target | 390 | 6 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/about-390.png) |
| F-030 | Low | visual | small-tap-target | 820 | 6 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/about-820.png) |

## /contact

Screenshots: [390px](screenshots/contact-390.png), [820px](screenshots/contact-820.png), [1440px](screenshots/contact-1440.png)

| ID | Severity | Kind | Rule | Width | Finding | Evidence |
|---|---|---|---|---|---|---|
| F-007 | High | functional | broken-link | - | Link "Careers" leads to an error page | GET /careers -> HTTP 404 |
| F-008 | High | functional | duplicate-submit | - | form #1: a double click sends the same request 2 times | 2 x POST /api/contact within 0ms [screenshot](screenshots/contact-form1-double.png) (stubbed server response) |
| F-019 | Medium | functional | no-validation-feedback | - | form #1: submitting it empty shows no message | no :invalid fields, no aria-invalid, no alert text, no text change (stubbed server response) |
| F-020 | Medium | functional | no-submit-feedback | - | form #1: nothing visible changes after a successful submit | page text identical before, 150ms and ~1.5s after the (stubbed) 200 response (stubbed server response) |
| F-021 | Medium | functional | no-error-feedback | - | form #1: nothing visible changes when the server answers 500 | page text identical before and after the (stubbed) 500 response (stubbed server response) |
| F-031 | Low | visual | small-tap-target | 390 | 8 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/contact-390.png) |
| F-032 | Low | visual | small-tap-target | 820 | 8 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/contact-820.png) |

## /newsletter

Screenshots: [390px](screenshots/newsletter-390.png), [820px](screenshots/newsletter-820.png), [1440px](screenshots/newsletter-1440.png)

| ID | Severity | Kind | Rule | Width | Finding | Evidence |
|---|---|---|---|---|---|---|
| F-009 | High | functional | broken-link | - | Link "Careers" leads to an error page | GET /careers -> HTTP 404 |
| F-010 | High | functional | duplicate-submit | - | form #1: a double click sends the same request 2 times | 2 x POST /api/subscribe within 0ms [screenshot](screenshots/newsletter-form1-double.png) (stubbed server response) |
| F-033 | Low | visual | small-tap-target | 390 | 8 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/newsletter-390.png) |
| F-034 | Low | visual | small-tap-target | 820 | 8 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/newsletter-820.png) |

## /pricing

Screenshots: [390px](screenshots/pricing-390.png), [820px](screenshots/pricing-820.png), [1440px](screenshots/pricing-1440.png)

| ID | Severity | Kind | Rule | Width | Finding | Evidence |
|---|---|---|---|---|---|---|
| F-011 | High | visual | horizontal-overflow | 390 | Page scrolls sideways | scrollWidth 924px > viewport 390px; widest: a "Newsletter", a "About", a "Careers" [screenshot](screenshots/pricing-390.png) |
| F-012 | High | functional | broken-link | - | Link "Careers" leads to an error page | GET /careers -> HTTP 404 |
| F-022 | Medium | visual | horizontal-overflow | 820 | Page scrolls sideways | scrollWidth 924px > viewport 820px; widest: table.plans "PlanSeatsSupportPriceFre", thead "PlanSeatsSupportPrice", tr "PlanSeatsSupportPrice" [screenshot](screenshots/pricing-820.png) |
| F-035 | Low | visual | small-tap-target | 390 | 6 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/pricing-390.png) |
| F-036 | Low | visual | small-tap-target | 820 | 6 control(s) under 44x44 CSS px | a "Home" 43x21; a "Pricing" 48x21; a "Contact" 55x21; a "Newsletter" 76x21 [screenshot](screenshots/pricing-820.png) |

## /reports

Screenshots: [390px](screenshots/reports-390.png), [820px](screenshots/reports-820.png), [1440px](screenshots/reports-1440.png)

| ID | Severity | Kind | Rule | Width | Finding | Evidence |
|---|---|---|---|---|---|---|
| F-013 | High | visual | blank-page | 390 | Page renders nothing visible | no text and no visible media or controls [screenshot](screenshots/reports-390.png) |
| F-014 | High | visual | blank-page | 820 | Page renders nothing visible | no text and no visible media or controls [screenshot](screenshots/reports-820.png) |
| F-015 | High | visual | blank-page | 1440 | Page renders nothing visible | no text and no visible media or controls [screenshot](screenshots/reports-1440.png) |
| F-023 | Medium | a11y | axe:landmark-one-main | 390 | Document should have one main landmark | 1 node(s). html:  [screenshot](screenshots/reports-390.png) |
| F-024 | Medium | a11y | axe:page-has-heading-one | 390 | Page should contain a level-one heading | 1 node(s). html:  [screenshot](screenshots/reports-390.png) |
| F-025 | Medium | a11y | axe:landmark-one-main | 1440 | Document should have one main landmark | 1 node(s). html:  [screenshot](screenshots/reports-1440.png) |
| F-026 | Medium | a11y | axe:page-has-heading-one | 1440 | Page should contain a level-one heading | 1 node(s). html:  [screenshot](screenshots/reports-1440.png) |

## Notes and limits

- Findings marked stubbed used a fake server response. Every non-GET request is answered by a stub and never reaches your server.
- Not checked: logged-in pages, hover and focus-visible states, animation, keyboard-only flow, external links, production-build differences.
- Automated checks find a subset of problems. Read the screenshots too.
