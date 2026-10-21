---
type: run
run: 0129
status: completed
wave: 018
profile: single-document
---

# Run 0129: remove-the-compatibility-shims

Wave 018, W-2. Closes GitHub issue tmorin/archicode#128 (decisions D2 and T3 of the wave plan: the author said "break now, no legacy"). The release carries a Breaking block (W-9).

## Scope

Three shims that read an older spelling of a file or of an address are gone. A file that uses one fails with one line that says what to write.

1. The camel-case keys of `settings.facets` (`globalEnabled`, `directoryNameTemplate`, on a facet `hideUnlinked`, on an action `jsonPath`).
2. The Jayway dialect of a facet path (`@.f anyof [...]`, `@.f noneof [...]`, `@.f == null`, `@.f != null`), which the kernel rewrote with a warning.
3. The old routes of the editor.

`settings.plateaus` keeps its sentence (`WorkspaceFactory.REMOVED_KEY`, `RemovedPlateausKeyTest`, N41, M50 to M53): untouched.

## What each shim was (read first)

- Keys: `@JsonAlias` on four fields of `Settings.Facets` (`Facets`, `Facet`, `Action`); in the page `READ_SCHEMA` had an `aliases` entry for each, `readAliased(obj, camel, kebab, fallback)` read both, and `SETTINGS_MANAGED_KEYS` listed both (also `defaultSyntheticLabel`, which Java never aliased: the page read a key the command line refused, but `READ_SCHEMA` refused it first). `Patch.json_path` is another alias (a key of the plateau manifests, not of `settings.facets`) and stays: it is not a shim of this issue and a test (`PlateauTreeTest`) pins it.
- Dialect: `facet.rs` `translate_legacy` rewrote the path before `JsonPath::parse` and `apply` returned one warning per rewrite; the CLI prints them as `warning: facet <name>: deprecated facet syntax ...`. The kernel is the only evaluator of facets (the CLI through `apply_facet`, the editor through `compute`/`quiet`), so it is the only place that changes.
- Routes: `pageIdFromHash` read the first segment of the address and fell back on the keys of `PERSPECTIVES` (`map`, `elements`, `library`, `plateaus`, `environments`), plus the special cases `timeline`, `diagram`, `stories` and `applications`; `applyDiagramParamsFromHash` turned `#/diagram?vp=` into a tab.

## Decisions

- **Camel-case keys: one sentence, generated, not listed.** The sentence is the unknown-key sentence with the key to write inserted: ``unknown key `hideUnlinked`, write `hide-unlinked` (known: actions, hide-unlinked, name) at `settings.facets.customs[0].hideUnlinked` (line 7, column 27)``. The rule is the same in both tools: when the key is not known and its kebab-case form (`ManifestParser.documented`, the regexp the page copies) is a known key of the same object, the sentence says `write`. It is not tied to the four keys, so a future camel-case slip anywhere is told the same way; no key that was valid before gives a hint (the cases of `negative-cases.json` that name unknown keys are unchanged). Rejected: a table of the four keys (a second list to keep in step with the class), and a separate error class (the plan says the same sentence as an unknown key).
- **The model of the page keeps `globalEnabled`, `jsonPath`, `hideUnlinked`.** They are the names of the page's own model (and of the JSON the workspace is given to the kernel with on the Java side), not of a file; only what the page reads from a file changed (`readAliased` became `readKey`, one key, no alias).
- **Dialect: refuse, not warn; the standard form is computed.** `facet::find_legacy` keeps the existing detector and its rewrite (`legacy_at`: quotes respected, `]` and `,` inside literals), which now only produces the text to write; `refuse_legacy` returns the error and `apply` calls it before parsing. The sentence names the first use in the path: ``the facet path `P` uses `@.qualifiers anyof ['a']`, which is not JSONPath (RFC 9535) and is no longer read: write `@.qualifiers[?(@ == 'a')]` ``. One sentence, so one `error:` line in the CLI (`error: facet <name>: ...`, exit 1, nothing of the faceted views written) and the error of the view in the editor. Rejected: writing the whole corrected path (the author may have several uses in one path; the first one suffices and is exact, the next run tells the next one), and keeping a `deprecated` warning (the plan says refuse).
- **Kernel contract stays at 5.** No key and no shape of the input or of the output changed; `warnings` is still in the outputs (empty for a facet, omitted by `compute` as before). An unreadable path was already the one `{error}` of `compute`, `quiet` and `apply_facet`, a documented outcome: only which paths are unreadable changed, as it did when `functions` such as `match()` were left out. A bump would make every host that checks the version (`ViewpointKernel.CONTRACT_VERSION`, the page, the node tests) reject a kernel that reads the same shapes. The README of the kernel says what it now refuses and why the number did not move.
- **Shared cases.** `src/test/javascript/viewpoint-kernel/facet-dialect-cases.json` (next to `patch-cases.json`, which the Rust tests already `include_str!`): six refused paths with the exact sentence, five accepted look-alikes. Read by `lib.rs` (through `apply_facet_json` and `compute`), `ViewpointKernelTest` (through the Java wrapper, what the CLI calls) and `conformance.test.js` (through the page's `buildKernelInput`, what the editor sends). The CLI sentence with its `facet <name>:` prefix is pinned by `WarningsChannelTest` and `FacetOrderTest`. `negative-cases.json` N76 (it pinned that the camel-case keys were still read) now pins `globalEnabled`; N91 to N93 are `directoryNameTemplate`, `hideUnlinked` and `jsonPath`; each runs on the command line (`diff --plateau saas`) and in the editor (`fatalError`). The dialect has no case in `negative-cases.json`: a facet is not applied by `diff` or by the load of the editor, only when a view of the facet is drawn, so the shared place is the kernel.
- **Routes.** `pageIdFromHash` is a lookup of the route in `PERSPECTIVES` (the first two segments, then the first): `timeline/plateaus`, `timeline/applications`, `timeline/environments`, `timeline/elements`, `stories` (and `stories/views`, the tab is read by `libraryTabFromHash`), `files`, `settings`. Everything else, including the dropped `#/map`, `#/elements`, `#/library*`, `#/diagram`, `#/applications`, `#/timeline` alone, opens Applications and the page writes `#/timeline/applications`. `#/stories` is a current route (the page writes it): only its being reached from `#/library` goes. I also dropped `#/plateaus` and `#/environments`, which the plan does not name: they were not routes of their own but the keys of `PERSPECTIVES` that the fallback happened to match, `#/timeline/plateaus` and `#/timeline/environments` are what the page writes, and leaving two accidental routes would be a legacy. Rejected: keeping them as "short addresses" (the manual lists them, W-9 takes them out). The `#/diagram` branch of `applyDiagramParamsFromHash` (the viewpoint as a tab) is removed with the route.
- **Editor tests that used the old routes as a shortcut** (`#/map?...`, `#/elements?...`, `#/library/views`, `#/timeline?plateau=` in nine files) were moved to the current routes with the same query strings; `editor-structure.test.js` pins both the current routes and each dropped one (default page, address rewritten); `diagram.test.js` pins that a `#/diagram` link opens Applications.
- **Fixtures.** `src/test/workspaces/case_c.yaml` and the kernel test workspace (`src/test/resources/viewpoint-kernel/workspace/workspace.yaml`) were the only files with the dialect: rewritten to the form the old translator produced (so `views*` expected files are unchanged). No shipped example (`src/doc/examples`), no Brightcart file used a removed form. `src/main/resources` has none.
- **`FacetOrderTest`** tested that the warnings of the facets come out in the order of the file; there are none now. It now tests that the facets are applied in the order of the file by which one is refused first, in two orders. `WarningsChannelTest` keeps its place: the standard facets of the kernel workspace say nothing, the same workspace with one path in the old dialect is the one line.

## Verification

- `./mvnw -o verify -DskipITs=false -Dtest='!CustomRenderingTest'`: 977 unit tests (2 skipped, as before), 21 integration tests, build success. `CustomRenderingTest` is excluded for an environmental reason: it runs the command line on the git-ignored `.custom/workspace.yaml` of the author's machine when it exists, which uses the Jayway dialect, so it fails with the new one-line error until the author migrates it (the plan's "breaking by design" note); the run did not read that file.
- `cargo test`: 227 passed. `embed.sh --check`: the committed wasm is the one the sources build.
- `node --test "src/test/javascript/**/*.test.js"`: 2036 tests, 0 failures.
- `npx prettier --check "src/**/*.java"`: clean.
- Byte identity with the jar of `archicode-0.16.0`: `views generate`, `query graph` and `diff` of the 20 workspaces of `src/doc/examples` and `src/test/resources` (stdout, stderr, exit code, every written file): identical. The two files that were rewritten, compared old form on the old jar with new form on this jar: same drawings; the old jar printed 5 (kernel workspace) and 3 (`case_c`) `warning: facet ... deprecated facet syntax` lines, this one prints none; the old form on this jar is `error: facet rest-only: ...`, exit 1.

## Canonical impact

`CLAUDE.md`: the paragraph on the facets (dialect, kebab-case keys) and the one on the routes of the editor are rewritten in this run; the sentence on the `warning:` channel no longer lists facet rewrites. The manual (`src/doc/README.adoc`) is W-9's.

## Not verified

The built-in browser was not used (the node harness runs the real page and the real kernel). The native image was not built.
