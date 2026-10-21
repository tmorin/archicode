---
type: run
run: 0128
status: completed
wave: 018
profile: single-document
---

# Run 0128: remove-the-group-kind

Wave 018, W-1. Closes GitHub issue tmorin/archicode#114 (decisions D1 and T2 of the wave plan: the author removed the notion of group).

## Scope

A group is no kind any more. `kind: group` (nested in `elements`) and `archicode.morin.io/group` (and the old `container-group`, `solution-group`, `system-group`) in a header are one `error:` line in the command line and in the standalone editor, with the same words. Every class, rule, exception and limit that existed for a group is gone.

## What a group was (read first, as T2 asked)

- Model: four classes (`ApplicationGroup`, `ContainerGroup`, `SolutionGroup`, `SystemGroup`), the `group` entry of the four `@JsonSubTypes` interfaces, a filter in `Nesting.kindsHeldAtTheTop`, `Item.Kind.GROUP` (given to any `Parent` that was none of the known kinds, so only to a group).
- Reference: a group has an id, so a reference went through it (`shop.web.edge.gateway`, with `edge` a group); it was a real path segment, drawn nowhere as a kind of its own. The only fixtures with a group were the kernel test workspace and unit tests.
- Kernel (Rust, WebAssembly): knows no group (the host sends `kind` as text, nothing branches on `group`); no change to the Rust, the committed wasm is the one the sources build (`embed.sh --check`).
- Editor: `READ_SCHEMA` (four types, four `group` entries), `nestingKindsOfType` (group last), `indexElementRecursive` (a group inherited the level of its parent), `nestingLevelIn` (walked up through groups), `moveKindFits`, `topLevelKindsOf`, the `inheritedParent` refusal of `commitCreateChildElement`, the `ARCHICODE_KIND_MAP` refusals of *Move* (`moveRouteUnder`), `NAV_KIND_ORDER`, `MAP_KIND_ABBREVIATIONS` (`GRP`).

## Decisions

- **The sentence.** Nested: ``unknown kind `group`, a group is no kind any more: write its children in the `elements` of its parent (known: container) at `elements[0]` `` (file and place as for any unknown kind). Header: ``unrecognized `header.kind` "archicode.morin.io/group", a group is no kind any more: ... (known: ...)``, also for `container-group`, `solution-group` and `system-group`. The words are one constant in each tool (`ArchiCodeException.GROUP_IS_GONE`, `GROUP_IS_GONE` in the page). Rejected: a separate error class or a second line (the plan says one line; the existing unknown-kind path already names the file, the place and the kinds there are, so the hint is added to it, and `group` no longer appears in the list since it is no kind); a hint for every unknown kind (only `group` is known to have been one).
- **What a reference through a group becomes.** Nothing is migrated: the file fails with the sentence, and the author moves the children into the `elements` of the parent, which shortens every reference by one segment. Rejected: reading the group "for a while" (non-goal of the wave).
- **The kernel draws no box for a group.** There is none to remove; `Item.Kind.GROUP` is removed from the Java side because nothing produced it any more.
- **The kernel test workspace** (`src/test/resources/viewpoint-kernel/workspace`): `edge` (group) becomes a container and `gateway` a component, so every reference (`shop.web.edge.gateway`) is the same and the shape (four depths, links grouped under an enclosing element) is kept. The expected views (`views*/`, 78 files) are regenerated with the jar of this tree: they differ only by the kind of `edge` and `gateway` and by what that changes in the views that draw them. Rejected: dropping the nesting level (the kernel and editor tests rely on the depth).
- **Editor tests that used a group as an in-file parent for containers** (`move-editor`, `move-elsewhere`, `flow-collections-editor`): a group was the only way to put a container under a sibling block of the same file; no kind holds its own kind in the application layer. `move-editor` now moves `bakery.oven` under the system `delivery` (so the cut and paste route is the one tested, the block keeps its indentation); the flow-collection fixtures (`garden`, `bakery` twins) are written as an environment with nodes, which nest in themselves; the golden of `move-elsewhere` moves a component into a container instead (the page of `archicode-0.16.0` and this one write the same bytes for that scenario, checked by running the same scenario on the page of `HEAD`). K27 of `layer-checks-cases.json` (a group holds what its parent holds) and the tests `#79` of `editor-writes-layers` are removed, with the group variants of the 5x5 nesting matrix (`LayerLoaderTest`, `layer-checks.test.js`).
- **Hashes of `plateau-compare.test.js`** (`with Nothing the drawing is byte for byte ...`): three hashes of diagrams that draw `edge` changed (`overview shop.web.api` with and without wrap, `deep shop` with and without wrap); the other cases are unchanged. The cause is the fixture (a container and a component instead of a group and a container), not the drawing.
- **Shared cases.** `negative-cases.json`: N56 to N58 now carry the hint; N89 (nested `kind: group`) and N90 (`archicode.morin.io/group`) are new and run by `BrightcartNegativeCasesTest` and `brightcart-negative.test.js`; N21 and the missing-kind case list the kinds without `group`. `layer-checks-cases.json`: `nesting.holds` has no `group`.
- **Native image.** The twelve reflection entries of the four classes are removed from `reflect-config.json`.

## Verification

- `./mvnw -o verify -DskipITs=false`: 954 unit tests (2 skipped, as before) and 21 integration tests, build success.
- `cargo test`: 228 passed. `embed.sh --check`: the committed wasm is the one the sources build.
- `node --test "src/test/javascript/**/*.test.js"`: 2025 tests, 0 failures (it was 2040: the group variants of the matrix and three group-only tests are gone).
- `npx prettier --check "src/**/*.java"`: clean.
- Byte identity with the jar of `archicode-0.16.0` (tag, built from `git archive`): `views generate`, `query graph` and `diff` of the 20 workspaces of `src/doc/examples` and `src/test/resources` (domain examples, facet steps, Brightcart layered, the plateau fixtures, hyphen ids, the kernel workspace as it is now), copied to a scratch folder: stdout, stderr, exit code and every written file identical. Brightcart `views generate` and `diff` for each plateau (baseline, saas, inhouse, marketplace): identical. `src/test/workspaces` does not exist.
- `git grep -n -i "kind: group\|ContainerGroup\|SolutionGroup\|SystemGroup"` finds only the cases and sentences that pin the error, and this document.

## Canonical impact

`CLAUDE.md` (the paragraph on the manifest kinds, the *Move* paragraph): updated in this run. The manual (`src/doc/README.adoc`) is run W-9's: see the findings in the report of this run.

## Not verified

The built-in browser was not used (the node harness, with the real page and kernel, is the editor test). The native image was not built.
