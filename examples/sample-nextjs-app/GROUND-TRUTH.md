# Ground truth: planted bugs

Written by the author of this app before the audit tool was run. Every bug below was put there on purpose. Anything the tool reports that is not listed here needs to be judged separately (real unplanted issue, or false positive).

Run it: `npm install && npm run dev` (port 3100), then `node ../../bin/eyeball.js --root .` (reads `frontend-audit.config.json`).

| # | Bug | Route / file | How to reproduce | Severity |
|---|-----|--------------|------------------|----------|
| 1 | Dead navigation link: "Careers" points to `/careers`, which does not exist (HTTP 404) | every page, `app/(site)/layout.js` | Click "Careers" in the header | High |
| 2 | Mobile nav cut off: header and nav clip their overflow at width 600px or less, so links after "Contact" are not reachable | every page, `app/globals.css` (`@media (max-width: 600px)`) | Open any page at 390px wide, look at the header | High |
| 3 | Form with no validation: email accepts anything, nothing is required, empty form submits | `/contact`, `app/(site)/contact/page.js` | Click "Send" with empty fields; the request is sent | Medium |
| 4 | Form with no feedback: after submit nothing changes, success or failure | `/contact` | Fill and send; the page looks identical | High |
| 5 | Low-contrast button: `#aaa` text on white, about 2.3:1 (needs 4.5:1) | `/`, "Learn more" button | Look at the button, or run any contrast checker | Medium |
| 6 | Empty page title: `<title></title>` | `/about`, `app/(site)/about/page.js` | View source, or look at the browser tab | Medium |
| 7 | Blank page: route renders nothing at all, no text, no link back | `/reports`, `app/(bare)/reports/page.js` | Open `/reports` | High |
| 8 | Layout overflow at mobile width: pricing table is fixed at 900px | `/pricing`, `.plans` in `app/globals.css` | Open at 390px; page scrolls sideways | High |
| 9 | Dead control: "Get started" button has no click handler | `/` | Click it; nothing happens | Medium |
| 10 | Duplicate requests: Subscribe button is never disabled while the request runs, so a double click sends two POSTs to `/api/subscribe` | `/newsletter`, `app/(site)/newsletter/page.js` | Double-click "Subscribe" with a valid email; the network tab shows 2 POSTs | High |
| 11 | Dead anchor (extra): "our team" links to `#team`, no element has that id | `/about` | Click the link; nothing scrolls | Low |

Not bugs, by design (a tool that flags these is wrong, or the finding is about the dev server, not the app):
- `/careers` and unknown URLs return a normal Next.js 404 page with text.
- `/newsletter` validates (`required`, `type=email`) and shows a success message. Only bug 10 applies there.
- Next.js dev mode adds its own dev indicator, HMR traffic and overlay code.
