---
title: 'TDD: the editor has no console error on load (#166)'
type: tdd
status: draft
owner: tmorin
date: 2026-10-26
run: 0178
wave: 024
related:
  - docs/wav/wav-024-fixes-and-editor-modules/wav-024-fixes-and-editor-modules.md
  - docs/wav/wav-024-fixes-and-editor-modules/wbc-024-fixes-and-editor-modules.md
---

# Technical Design: the editor has no console error on load (#166)

# Summary

A browser that opens the editor asks for `/favicon.ico`; `archicode editor serve` answers 404, and a full Chromium reports that as a console error on every load. The e2e fixture `pageErrors` carries an exception for it. This design removes the cause in two places (the page declares an icon; the server answers `/favicon.ico` with a non-404 status) and removes the exception. It is the run W-1 of wave 024, phase P1.

# Scope

In scope: `src/main/java/io/morin/archicode/cli/EditorHttpServer.java`, the `<head>` of `src/main/resources/editor-webapp/standalone.html`, `src/test/e2e/fixtures.js`, `EditorHttpServerTest`, `EditorServeIT`, and the sentence about the exception in `CLAUDE.md`.

Out of scope: the teardown flake of the E2E job (W-10, same fixture file, another change), any other route of the server, a real icon design, the hosted editor (#162).

# PRD Traceability

This is a TDD+pln run: there is no PRD, so traceability to requirement IDs is incomplete. The requirements are sourced from the wave plan instead and named here as `W1-n`:

- `W1-1` (wave P1 gate): `npm run test:e2e` passes with no exception for `/favicon.ico` left in `src/test/e2e/fixtures.js`.
- `W1-2` (wave P1 gate): `archicode editor serve` answers `GET /favicon.ico` with a status that is not 404, asserted by `EditorServeIT`.
- `W1-3` (wave row W-1): a person opening the editor sees no console error on load (#166).
- `W1-4` (wave row W-1): the sentence of `CLAUDE.md` that records the exception goes with it.

All four are addressed. None is partial or unresolved.

# Technical Goals

- TG-1: no `console.error` on load in Chromium, Firefox, with the exception removed (`W1-1`, `W1-3`).
- TG-2: `GET /favicon.ico` on the local server is not a 404 (`W1-2`).
- TG-3: nothing else the server or the page does changes.

# Non-Goals

- A designed icon for the editor beyond reuse of the one the presentation page already has.
- Serving static files, or a route table: one path is special-cased.
- Adding a rule to the e2e fixture that generalises the old exception.

# Assumptions

- ASM-1: Chromium requests `/favicon.ico` only when the page declares no `<link rel="icon">`; with the link it does not. Validated by the e2e run with the exception removed and a request log check (see Observability).
- ASM-2: a 204 answer to `/favicon.ico` is not reported by Chromium as a console error (only failed or 4xx/5xx subresource loads are). Validated by the same e2e run in Chromium (the full browser, not the headless shell).
- ASM-3: the e2e suite, `ServeEditorCommandTest` and the node suite do not assert the content of the `<head>` beyond what they read by id or by name. To be checked by running them (`npm run test:unit`).

# Constraints

- CON-1: the page is one file, `standalone.html`, kept out of Prettier until #161; the edit is a single line in `<head>`. No external request: the icon is a `data:` URI (the page makes none today).
- CON-2: the same file is served by `editor serve`, copied to the website at `/editor/` and loaded by the node tests; the line must be valid in all three.
- CON-3: JaCoCo floors (0.90 lines, instructions, branches) apply to `src/main/java`; the new branch needs tests that assert the status and headers (T10 of wave 023).
- CON-4: PMD runs on `src/main/java` and `src/test/java`; no `@SuppressWarnings` or `NOPMD`.
- CON-5: the token and host rules of `handleRoot` stay as they are: the host check comes first.

# Current State

- `EditorHttpServer.handleRoot` (context `/`) answers 403 for a foreign host, then 404 `not found` for any path other than `/` and `/index.html`, then 405 for a method other than GET, then checks the token or session cookie, then serves the page. `/favicon.ico` therefore gets 404 (`EditorHttpServerTest` line 104 pins 404 for `/other`).
- `standalone.html` has no `<link rel="icon">`. `src/site/index.html` has one: an inline SVG `data:` URI (a green rounded square with a triangle).
- `src/test/e2e/fixtures.js`, fixture `pageErrors`, skips a console error whose location ends with `/favicon.ico`, with a comment saying to remove it when #166 is fixed. `CLAUDE.md` (End-to-end suite paragraph) records the same exception.
- `EditorServeIT` starts the packaged application and checks the page and the 403 without a token.

# Proposed Design

DEC-1 — Both the page and the server answer the icon question
- Decision: add `<link rel="icon" href="data:image/svg+xml,...">` to the `<head>` of `standalone.html`, with the same SVG as `src/site/index.html`; and make `handleRoot` answer `/favicon.ico` with `204 No Content` for GET and HEAD.
- Rationale: the wave gate requires the server answer (`W1-2`), which also covers a client that never parses the page (a probe, a bookmark manager, a browser tab opened before the page loads). The link is one line, makes the tab show an icon, and fixes the hosted copy at `/editor/` (where the server's answer does not exist), so #162 does not meet the same error.
- Alternatives considered: only the link (browsers stop asking, but the gate and non-browser clients still see 404); only the 204 (no icon in the tab, hosted editor unfixed); serving a real `favicon.ico` file from a resource (a binary resource to add to `quarkus.native.resources.includes`, for no gain).
- Tradeoffs: two places say "icon"; both are one line and tested. The SVG is copied from the site page (a duplicate of 300 characters); sharing it would need an assembly step the page does not have until W-5 (RFC-001).
- Linked PRD IDs: `W1-1`, `W1-2`, `W1-3`.

DEC-2 — 204, no token, no cookie
- Decision: the icon route is answered before the token check, with no body; the response carries `Cache-Control: public, max-age=86400` (not `no-store`, which is for the page). Any method but GET and HEAD gets 405, as for `/`.
- Rationale: the answer holds nothing, so there is nothing to protect; the browser's icon request carries the session cookie only by chance. The host check still runs first, so a foreign `Host` gets the same 403.
- Alternatives considered: 404 with the token (what it is now); 200 with the SVG at `/favicon.ico` (makes the server hold a second copy of the icon).
- Tradeoffs: a client can tell the server is an ArchiCode editor from the 204; the 403/404 of `/` told as much already.
- Linked PRD IDs: `W1-2`.

DEC-3 — The exception goes, nothing replaces it
- Decision: delete the `favicon.ico` branch and its comment from `pageErrors` in `src/test/e2e/fixtures.js`, and the sentence about it in `CLAUDE.md`.
- Rationale: `W1-1`; keeping the branch would hide a regression of this fix.
- Alternatives considered: keep it as a safety net (rejected: it is the thing #166 asked to remove).
- Tradeoffs: none; the teardown flake (W-10) is a different change to the same fixture, so W-1 touches only this branch to keep the two diffs apart.
- Linked PRD IDs: `W1-1`, `W1-4`.

Component diagrams are not needed: no relationship between components changes; the flow is one branch.

# Repository Impact

- IMP-1 — Server route
  - Path(s): `src/main/java/io/morin/archicode/cli/EditorHttpServer.java`
  - Change type: modify
  - Why impacted: `handleRoot` answers `/favicon.ico` (DEC-1, DEC-2) after the host check and before the path check.
  - Linked PRD IDs: `W1-2`
  - Risks / notes: keep the method check order of `/` (405 for other methods); the class javadoc line about what the server serves gets the icon.
- IMP-2 — Page head
  - Path(s): `src/main/resources/editor-webapp/standalone.html`
  - Change type: additive
  - Why impacted: one `<link rel="icon">` after the `<title>`.
  - Linked PRD IDs: `W1-3`
  - Risks / notes: not formatted by Prettier; the `%`-encoding of the SVG must be that of the site page; `scripts/byte-identity.sh` and the node comparison tests are not affected (they compare generated views and the save).
- IMP-3 — Unit tests of the server
  - Path(s): `src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java`
  - Change type: additive
  - Why impacted: GET and HEAD give 204 with no body and the cache header, with no token; POST gives 405; a foreign host gives 403; `/other` stays 404.
  - Linked PRD IDs: `W1-2`
  - Risks / notes: keeps the JaCoCo branch floor.
- IMP-4 — Packaged test
  - Path(s): `src/test/java/io/morin/archicode/it/EditorServeIT.java`
  - Change type: modify
  - Why impacted: `servesTheEditorAndStops` also asserts `GET /favicon.ico` is 204 (not 404), on the jar and the native runner; and that the served page contains `rel="icon"`.
  - Linked PRD IDs: `W1-2`
  - Risks / notes: no new class, so no `reflect-config.json` change.
- IMP-5 — E2E fixture
  - Path(s): `src/test/e2e/fixtures.js`
  - Change type: remove
  - Why impacted: the exception (DEC-3).
  - Linked PRD IDs: `W1-1`
  - Risks / notes: the fixture then fails any console error; any other error that was hidden behind the old branch would appear (none known).
- IMP-6 — Project notes
  - Path(s): `CLAUDE.md`
  - Change type: modify
  - Why impacted: the End-to-end paragraph says the fixture excepts `/favicon.ico` and that the server answers 404; it now says neither, and says the server answers 204 and the page declares an icon.
  - Linked PRD IDs: `W1-4`
  - Risks / notes: none.

# Canonical Impact

Not applicable — no canonical registers declared (`docs/CLAUDE.md` does not exist in this repository).

# Data Model and Contracts

- CTR-1 — HTTP surface of `editor serve`
  - Current contract: every path but `/`, `/index.html` and `/api/fs/*` is 404.
  - Proposed contract: `/favicon.ico` is also answered: GET and HEAD give 204, no body, `Cache-Control: public, max-age=86400`, no token or cookie needed; other methods give 405; a host not allowed gives 403 as for every route.
  - Affected files: `EditorHttpServer.java`, `EditorHttpServerTest.java`, `EditorServeIT.java`.
  - Migration or compatibility notes: additive; no client relied on the 404.
  - Linked PRD IDs: `W1-2`
- CTR-2 — Page head
  - Current contract: no icon link.
  - Proposed contract: one `<link rel="icon" href="data:image/svg+xml,...">`; no new request.
  - Affected files: `standalone.html`.
  - Migration or compatibility notes: additive; the page is otherwise byte for byte as it was.
  - Linked PRD IDs: `W1-3`

No file format, schema, manifest, kernel contract or command line output changes.

# Interfaces and Behavior

- IF-1: a browser opening `http://127.0.0.1:<port>/?token=...` shows the icon in the tab and logs nothing on the console.
- IF-2: `curl -i http://127.0.0.1:<port>/favicon.ico` prints `204 No Content`.
- Error states: unchanged (403 foreign host, 405 wrong method, 404 any other path).

# Flows and Processing Logic

- FLOW-1 — Load of the editor in a browser
  - Trigger: the person opens the printed address.
  - Steps: the browser gets `/` (token, 200, the page); it parses `<head>`, finds the `data:` icon and does not request `/favicon.ico`.
  - Branches / failure paths: a browser that requests `/favicon.ico` anyway (before parsing, or a client that ignores the link) gets 204 and shows no icon; a foreign `Host` gets 403 on both routes.
  - Final output / rendered result: no console error; the tab icon is the triangle.
  - Linked PRD IDs: `W1-1`, `W1-3`

# Reliability, Performance, and Scalability

One extra comparison on the path for each request; no state. The cache header spares repeated requests.

# Security and Privacy

The route answers nothing and reads nothing; the host check (DNS rebinding guard) runs first, so it adds no reachable surface. No external request is made: the icon is inline, which keeps the page free of third-party loads.

# Observability and Verification

- `./mvnw test-compile pmd:check` (PMD on sources and tests).
- `./mvnw verify` (unit tests, JaCoCo floors; `EditorHttpServerTest`).
- `./mvnw verify -DskipITs=false` (`EditorServeIT` on the jar; the Native job runs it on the runner).
- `npm run test:unit` (ASM-3: the node suite loads the page).
- `npm run test:e2e` after `./mvnw package`, in Chromium and Firefox, with the exception removed (`W1-1`). To check ASM-1 and ASM-2 in the full Chromium, run one spec with a request log for `/favicon.ico` (`page.on('request')`) and confirm there is none, then confirm the console is empty with the `<link>` removed and the 204 in place.
- Negative check: put the old 404 back and see `pageErrors` fail the e2e (the suite shown to fail).

# Deployment and Rollout

Code-only change, in the jar, the native runner and (via the tag) the website copy of the editor. No migration. Rollback is a revert. This section is planning guidance, not authority to deploy.

# Risks and Tradeoffs

- RISK-1: a console error hidden by the old exception appears in another spec. Mitigation: run the whole e2e suite; fix or record the finding.
- RISK-2: the full Chromium does report a 204 for the icon. Mitigation: ASM-2 check above; the fallback is the link alone (the browser stops asking) and a 404-free server answer of 200 with the SVG.
- RISK-3: the `data:` SVG is mis-encoded in the page and the icon shows broken. Mitigation: copy the site's string unchanged; open the page once in a browser.

# Open Questions

- Q-1: none that block the run. The choice between the link and the 204 is resolved by DEC-1 (both).

# Deferred Work

- DEF-1: one source for the icon shared by the site page and the editor, once the editor is assembled from parts (W-5, RFC-001).
- DEF-2: a designed icon, if the author wants one.

# File Placement and Frontmatter

Saved as `docs/wav/wav-024-fixes-and-editor-modules/run/run-0178-editor-favicon/tdd-0178-editor-favicon.md`, with `type: tdd`, `run: 0178`, `wave: 024`.
