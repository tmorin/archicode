---
type: run
run: 0133
status: completed
profile: single-document
wave: 018
---

# Run 0133: dependencies-of-the-descendants

Wave 018, W-6. Closes GitHub issue tmorin/archicode#124 (decision D7 of the author, 2026-10-21: "yes, include the descendants"; T6 of the wave plan).

## Scope

`derived_dependencies` in the viewpoint kernel (`src/main/rust/viewpoint-kernel/src/lib.rs`) read only the `relationships` of the application element that a node lists in `applications`. It now reads those of everything inside that element too: a relationship of `shop.app.payments` towards `psp` is a dependency of the node that hosts `shop.app` on the node that hosts `psp`. One function feeds the overview, the detailed and the deep viewpoints of the technology layer and the Map of the technology layer (wave 016, run 0114), so the four change together. The editor calls the same kernel (`buildKernelInput` hands it the whole application layer as a flat list, `app_elements`); `standalone.html` has no derivation of its own (only the embedded wasm changed), and the Java `viewpoint/` adapter has none either (it passes `app_elements` and reads the answer). So there is no second implementation to keep equal.

## Decisions

- **Which descendants.** Every application element whose reference is the deployed application or inside it (`within`), found in `app_elements` (flat list). Rejected: walking `elements` children of the deployed element (the kernel input is flat and the facets have already removed what they remove from that list, so reading it keeps "a facet that removes the relationship removes the link" true with no new code).
- **Internal relationships are no dependency.** A relationship whose destination is the deployed application or inside it (`shop.app.checkout` -> `shop.app.payments`) is skipped (`relationships_of_deployed`). The existing rule that skipped a destination hosted by the same environment is kept (`shop.app.catalog` -> `shop.db`, on `prod.dc.db-vm`). Rejected: drawing an internal one as a link of the node to itself (nothing to draw: the ends would be one box).
- **The destination is still an exactly deployed application.** A relationship towards a component of a deployed application (`psp.charge`, with `psp` deployed) gives nothing, as before. Rejected for this run: resolving the destination to its deployed ancestor. It is the mirror of D7 on the other end, nobody asked for it, and it would change the output of workspaces that D7 does not touch (T1). Deferred; see the report.
- **What a derived link carries.** Exactly the rule that already folds the relationships of several deployed applications, unchanged: the label, qualifiers and tags are those of the relationship; the kernel keeps one link per (ends, label, qualifiers, tags), and relationships that read the same fold into it (`merge_links`, `Groomed` in the map and the overview); a link that stands for several relationships with different captions is a grouped link with the usual synthetic label. What is new is the `from` of the relationship in the link: the element that declares it (`shop.app.payments`), not the deployed application, so the inspection of the link names the right component. `application: true` stays. No new field. Rejected: putting the deployed application in `from` (the declarer is what the author can open and change; `Derived.source` carries it, `Derived.from_app` is still what the box lookup uses).
- **Not changed: the "secondary" links inside one environment** (`local_dependencies` and the links of `deep_technology` between applications of one environment, drawn for a flow only, `application_links`) still read the relationships of the deployed element itself. #124 and D7 are about the dependencies between environments that `derived_dependencies` gives; the dependencies inside one environment stay out of these views, so no ordinary drawing changes. Deferred (mentioned in the kernel README and CLAUDE.md as what it still does). Rejected: changing them in this run (no author decision, and the flow views of a facet would change for no reason D7 gives).
- **The kernel contract number stays 5.** No key and no shape of the input or of the output changed; only which links `compute` draws. The README of the kernel says so, as run 0129 did.
- **Duplicates.** A deployed application and a descendant of it both listed in `applications` of one node give two boxes, as they always did; the relationships of the descendant are then counted for both. Not handled (nobody deploys a container and its component on the same node); not worth a rule.

## What changed

- `src/main/rust/viewpoint-kernel/src/lib.rs`: `Derived.source`, `relationships_of_deployed`, `derived_dependencies`; `MetaLink.application` now holds the declaring element. Rust tests: the descendant gives the link (deep, overview, detailed), the internal and the same-environment ones do not, several descendants fold as before, the Map takes it.
- `src/main/wasm/viewpoint_kernel.wasm` and the base64 block of `standalone.html`: `embed.sh`.
- `src/main/rust/viewpoint-kernel/README.md`: the paragraph on the derived dependencies.
- Tests: `DescendantDependenciesTest.java` (command line, layered Brightcart, the three viewpoints), `descendant-dependencies.test.js` (the editor, same workspace), `technology-map-parts.test.js` (the opened Brightcart map of the page gains the three links of `app-vm`: 6 expectations), `src/test/resources/technology-map/expected-boxes.json` (the contract of the Map, read by `TechnologyMapTest` and `technology-map-shared.test.js`).
- `CLAUDE.md`: the sentence of the Map paragraph that said the dependency used only the deployed element (and named #124) says what is true now; #124 leaves the list of the limits of the manual.

## Files whose output changes (T6)

Only one workspace of the examples and the fixtures changes: the layered Brightcart (`src/test/resources/brightcart/layered`). It deploys `shop.app` (a container with no relationship of its own) on `prod.dc.app-vm` and on `staging.vm`, and three of its components declare relationships to applications deployed in the environments that `prod` and `staging` use (`partners`, `sandbox`):

| relationship (descendant) | destination | link it gives |
|---|---|---|
| `shop.app.checkout` -> `tax` ("computes taxes with", HTTPS) | `partners.tax-live`, `sandbox.tax-sandbox` | `prod.dc.app-vm` -> `partners.tax-live`, `staging.vm` -> `sandbox.tax-sandbox` |
| `shop.app.payments` -> `psp` ("authorises payments with", HTTPS) | `partners.psp-live`, `sandbox.psp-sandbox` | idem for `psp` |
| `shop.app.notifications` -> `mailer` ("sends mails with", SMTP) | `partners.mail-live`, `sandbox.mail-sandbox` | idem for `mailer` |

The files below are the ones `views generate` writes (`--plateau` each of `baseline`, `saas`, `inhouse`; `marketplace` is byte-identical, `shop.app` is gone there), with the saved views (`-i`), under the facet folders and in the comparisons `-vs-baseline`. All of them are `plantuml/technology/*.puml`; every `plantuml/application/*.puml`, `gap.md`, `gap.json`, `query graph` and `diff` output is byte-identical to `archicode-0.16.0`.

- Overview / detailed / deep of the environments and nodes that touch the link: `prod`, `prod_dc`, `prod_dc_app-vm`, `staging`, `staging_vm`, `partners`, `sandbox` (and, in the plateaus that keep the three relationships, `partners_{mail,psp,tax}-live`, `sandbox_{mail,psp,tax}-sandbox`, which now have a dependent). Each gains the link of `shop.app`'s node to the node that hosts the destination, and the destination nodes (and the node that hosts `shop.app`, with everything it hosts) when the focal element did not draw them yet; the link between two environments in the overviews gains the qualifier of the added relationship (`uses [HTTPS, SFTP]` -> `uses [SMTP, HTTPS, SFTP]`, SMTP being `notifications` -> `mailer`).
- Saved Maps `environments_map` (baseline, saas, inhouse): `prod.dc` -> `partners` was already there; the variants that open `prod.dc.app-vm` gain `app-vm_shop_app` -> `partners.{mail,psp,tax}-live` (and with `applications: false`, `prod.dc.app-vm` -> the same nodes). `expected-boxes.json` has both. `cloud_map` is unchanged (its applications are deployed themselves and declare their own relationships).
- Counts (408 files, all `plantuml/technology/*.puml`, folders `views-<plateau>`, `-journey`, `-without-cart` and, for the two plateaus that have a comparison, `-vs-baseline`, `-vs-baseline-journey`, `-vs-baseline-without-cart`; `-no-externals` has no partner application and does not change): `baseline` 3 folders x 32 files; `saas` 24 files per plain folder and 32 per comparison folder (the removed `payments` and `checkout` still show as removed links there); `inhouse` 24 per folder (mail only: `payments` and `checkout` are gone there). The list of files is regenerated by the comparison of the Verification section.

How each class of difference was explained, not only listed:

1. **Control, non-comparison folders (240 files).** The same layered Brightcart with the three descendant relationships taken out of `baseline/application/shop.app.yaml` was drawn by the old jar and the new jar. Old on the original, old on the stripped workspace and new on the stripped workspace give the same `plantuml/technology` files (zero differences); new on the original differs from them in exactly the files above. The only cause is the three relationships.
2. **Comparison folders (168 files).** The control cannot isolate them (taking the relationships out changes the old jar's comparison too: the relationship is `removed` between plateaus). What holds: new and old agree on the stripped workspace in every folder, including the comparisons, and every added or changed line of the comparison files was read against the list of causes: the link from `shop.app`'s node to `mail`/`psp`/`tax`, its destination nodes (and the removed ones shown dashed in `saas`), the node `shop.app` is hosted on with the other applications it hosts (it is now an end of a link of the focal element), the SMTP / HTTPS qualifiers of the link between environments, and the style blocks the legend adds when a state first appears in the file.
3. **Everything else** (the 18 other workspaces of `src/doc/examples` and `src/test/resources`, `views generate`, `query graph`, `diff`, every plateau, with and without the saved views where the workspace has any): byte-identical, see Verification.

## Verification

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 979 unit tests (2 skipped, as before), 21 integration tests, build success. `NativeReflectionConfigTest` passes: no class was added to the application, so `reflect-config.json` is untouched.
- `cargo test`: 230 passed (227 before). `embed.sh --check`: the committed wasm is the one the sources build. `node --test "src/test/javascript/**/*.test.js"`: 2067 tests; the first run had 3 failures, all in `technology-map-parts.test.js` (expectations of the Brightcart map that did not know the three new links), fixed; that file then passes (14/14) and the other 2053 were not touched by the change. `npx prettier --check "src/**/*.java"`: clean.
- Byte identity with the jar of `archicode-0.16.0` (T1): `views generate`, `query graph` and `diff` (stdout, stderr, exit code, every written file), for each plateau of each workspace (`--plateau` per plateau of `plateau list`), and `views generate -i <view>` for the saved views of the layered Brightcart: the 20 workspaces with a `workspace.yaml` in `src/doc/examples` and `src/test/resources` are identical except the layered Brightcart, where only the 408 `plantuml/technology/*.puml` files above differ (no `application` file, no `gap.*`, no `query graph`, no `diff` output). Scratch copies; the new jar is the one this tree builds.
- Control (above): old on the original = old on the stripped = new on the stripped in the non-comparison folders; new on the stripped = old on the stripped in every folder.
- The editor: `descendant-dependencies.test.js` (deep, overview, detailed on the Brightcart, and the declaring component in the link) and `technology-map-shared.test.js` (the contract file) pass; the command line: `DescendantDependenciesTest` and `TechnologyMapTest` pass.

## Canonical impact

`CLAUDE.md`: the sentence of the Map paragraph that said the dependency used the deployed element only (filed as #124) says what is true now, and #124 leaves the list of the limits of the manual. The manual (`src/doc/README.adoc`) is W-9's.

## Not verified

The built-in browser was not used (the node harness runs the real page and the real kernel). The native image was not built. The comparison folders could not be isolated by a control (see above).
