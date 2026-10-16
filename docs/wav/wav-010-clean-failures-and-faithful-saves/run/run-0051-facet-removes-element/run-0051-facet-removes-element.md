---
type: run
run: 0051
status: completed
wave: 010
---

# Run 0051: Facet removes element

Wave 010 (`clean-failures-and-faithful-saves`), item W-2 (phase P1). Focus: hide an element with a facet without the views failing on what
pointed at it. Document profile: `single-document` (the scope arrives settled by the wave plan, decision D-1(a), and by issue #46); this
file carries scope, decisions, canonical impact, verification and findings.

## Scope

1. A facet action that removes an element (`operator: REMOVE`, a path that selects elements) removes, in the same step, what pointed at it
   (D-1(a), #46): the relationships whose `destination` is the element or an element inside it, the entries of `uses` of an environment
   that name it, and the entries of `applications` of a node that name it. Views of the facet are then written; they no longer end in
   `dangling reference`.
2. The rule lives in the kernel's `apply` (`facet.rs`), the only place a facet is evaluated, so the CLI (`apply_facet`, the JSON of the
   workspace) and the editor (`compute` with a `facet`, the elements of the view) get the same answer.
3. A facet that works today gives exactly the same result; a workspace without such a facet generates the same files.
4. Tests: cargo, a Java test on a copy of `domain_plateaus`, a JS test of the editor; the manual's facet section.

Not in scope, not done: telling the author which relationships were dropped (see D4), a contract bump (none needed), any change to
`compare` (its own `dangling reference` checks are about a plateau and are untouched).

## Reproduction (before the change)

On a copy of `src/doc/examples/domain_plateaus` with four facets in `settings.facets.customs` (`by-id`:
`$.application..elements[?(@.id == 'catalog')]`; `changed`, `moved`, `split`: the same with `@.change == '...'`), the jar built from `HEAD`:
`views generate` stopped with `error: dangling reference: shop.catalog` and exit 1 (the id-based facet), `views generate --baseline as-is`,
`--plateau as-is` and `--plateau to-be` the same; the facet folders were left half written. `split` alone worked: it removes `shop.cart` and
`shop.checkout`, which nobody points at. Note on the issue's `changed` variant: in the example `shop.web` is itself `changed`, so that facet
removes the catalog **and** the web site, and what it leaves dangling is the customer's link to `shop.web` (and the shop's), not only the
web site's link to the catalog.

## Decisions

- **D1. Where: after each action, from what disappeared.** `apply` computes the references of the elements of the two layers (the
  `application` and `technology` trees of the document, a reference being the ids from the root joined by `.`, as the CLI and the editor
  build them) before and after an action, only when the action selected something. The references that were there and are not any more are
  the removed ones; the dependent entries are taken out of every element of the document. Per action, not once at the end, so that the next
  action reads what the previous one left (a path that selects on `@.relationships` does not see a link that the previous action cut). Alternative
  rejected: dropping in the Java after the kernel answers, which would have left the editor with the crash.
- **D2. What counts as a reference to an element.** A `relationships[].destination` is a reference of the layer of the element that
  declares it; `uses` entries are references of the technology layer; `applications` entries (of a node) are references of the application
  layer. A name from the other layer is never confused with it (a technology node called `shop` and a removed application `shop`).
  What was removed is a set of references, so the **children** of a removed element go with it (they are nested in the document) and a link
  to one of them is dropped as well as a link to the element itself. A relationship that comes from a removed element goes with its
  element; a relationship from a removed element to another removed element does too, with no special case. A relationship from a kept
  element to the parent of a removed child stays.
- **D3. What stays as it was.** A reference that already led nowhere before the action is not in the removed set, so it is not touched and
  is still `dangling reference: x` (kernel test `a_reference_that_led_nowhere_before_the_facet_is_left_alone`). The focal element of a view
  removed by the facet is still an error in the editor (the diagram says the facet removed it) and, in the CLI, the views of a removed element
  (generated per element, or a `view.*.yaml` manifest about it) are skipped as they were for `split`: checked, exit 0, nothing written for it.
  A list that loses its last entry is left as `[]`, as removing the last relationship already did.
- **D4. No warning.** The warnings channel (run 0049) prints things the author should fix (the old dialect, a malformed `replaces`, a state
  word that disagrees). Dropping the links of an element the facet removes is what the author asked for, and it would print on every
  generation, for every facet that hides an element, which is noise against the point of a facet ("a facet exists to hide things", D-1).
  The manual says what happens instead. If an author later wants to see it, a `--verbose` line is the place; nothing was filed, no one asked.
- **D5. No contract bump.** The shape of the input and of the output of the three entry points is the same; an input that worked gives the
  same output byte for byte (the proof below), and an input that returned `dangling reference` now returns a view. The comment of the
  contract in `lib.rs` says so.

## Canonical impact

None to the architecture model (no `CI-arc` or `CI-dom` packet: this run has no TDD). `CLAUDE.md`'s architecture paragraph on facets gained
one sentence (an action that removes an element removes what points at it, silently); the manual's facet section and the editor's facet
paragraph say it; `src/main/rust/viewpoint-kernel/README.md` and the contract comment in `lib.rs` too.

## Review passes

- **KDMLLC (inline).** K: one rule (a set difference of references, then a `retain` per list), two small functions and a struct in
  `facet.rs`, no option and no new input field; the facet path that does not remove an element does not even compute the references.
  D: the CLI and the editor share the code, there is no second copy in the Java or in `standalone.html`; the new manual text is one block.
  M: relationships, `uses`, `applications`, children, two removed elements pointing at each other, a pre-existing dangling reference, two
  actions in a row, the other layer, a path that removes only relationships (must be a no-op), the CLI document and the editor's elements
  each have a test. L: no warning (D4), no `--verbose`. U: the rule is stated at the top of `facet.rs`, in the manual and in `CLAUDE.md`.
  C: below.
- **C scan.** The old test `a_facet_can_remove_an_element_and_what_points_at_it_is_then_dangling` asserted the crash as a feature: it is
  the behaviour D-1 replaces, and is rewritten (`..._goes_with_it`); the focal-element half of it is kept. The wave plan says "the `uses` of
  environments": covered, and `applications` of a node added because it is the same kind of reference (`dangling application reference`).
  The wave plan says no kernel contract bump: held. The manual said "facets effectively remove certain elements and relationships" and its
  examples only relationships: now has the element example. The editor's tree greys an element whose diagram is an error through a
  facet (`quietReferencesThroughFacet`): an element that used to be greyed only because it pointed at a removed element is now drawn
  without that link, and greyed only if it has nothing left to draw (JS test). The issue's claim "`@.change == 'changed'` removes `shop.catalog`,
  which `shop.web` points at": true, and it removes `shop.web` too (see Reproduction). Claim of the gate P1 ("the facet of #46 gives the outcome chosen
  in D-1, views written"): met.

## Verification

Run from `/home/tibo/git-perso/archicode`, JDK 25, offline.

- `./mvnw -o -q verify` exits 0: 319 tests, 0 failures, 0 errors, 1 skipped (the PlantUML-jar test of run 0050 without `PLANTUML_JAR`). New:
  `FacetRemovesElementTest` (3: the id-based facet, the three facets of the comparison, and the plain and comparison views being the same
  with and without the facets).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 168 passed (160 before; 8 new, 1 rewritten). `embed.sh` run, then
  `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build", exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 850 passed, 0 failed (845 before; `facet-removes-element.test.js` adds 5: the diagram
  through the id-based facet in the three viewpoints, the comparison facets, the focal element removed, the tree, the "nothing to show" panel).
- `npx prettier --check "src/**/*.java"`: clean.
- **Reproduction after the change** (scratchpad copy of `domain_plateaus`, the four facets): `views generate`, `--baseline as-is`,
  `--plateau as-is`, `--plateau to-be` all exit 0; `shop_web-overview` in `views-to-be-by-id` has the `pays with` link and none to the catalog;
  `customer-overview` through `changed` and `warehouse_picking-overview` through `moved` have no link; the plain views keep every link.
- **Byte-identity against a jar of `HEAD`** (`git archive HEAD`, `./mvnw -o package -DskipTests`, in the scratchpad; the new jar copied from
  `target` after the Rust change). 17 workspaces, each copied once per jar: the 14 `workspace.yaml` of the repository (the 9 examples of
  `src/doc/examples` (domain_application, domain_technology, domain_viewpoint_views, domain_workspace, domain_plateaus, facet_example_step_1
  to 4), `plateau-comparison`, `plateau-comparison/replaces`, `plateau-state-tags`, `hyphen-ids`, `viewpoint-kernel/workspace`) and 3 of mine:
  `domain_plateaus` plus facets that already worked (`split`, a relationships-only facet, a facet that selects nobody), the same plus the
  id-based facet (the crash), and the example plain. 133 command runs per jar (`views generate`, `query graph`, `query views -f json`,
  `query schemas`; for the plateau workspaces `diff` in four forms, `views generate --baseline`, `views generate --plateau` and `query graph --plateau`
  for each plateau). Results: exit codes and stderr identical in 129 of 133; the 4 that differ are the four commands of the crashing copy
  (exit 1 with `dangling reference: shop.catalog` before, exit 0 after). Generated trees: **0 differing files** in all 17 workspaces; the
  crashing copy has 269 files more, the facet views the crash prevented. Stdout identical in 132 of 133; the other one is `query schemas` on
  `domain_plateaus`, whose properties come out in another order from one run to the next with the unchanged `HEAD` jar alone (filed by run 0050
  as #49; equal as JSON with sorted keys).
- The editor page was not looked at in the built-in browser: nothing it shows changed (the embedded WebAssembly changed, and one sentence of the
  manual's facet paragraph); the JS tests exercise the diagram functions and the empty-diagram message with the new kernel.

## Not verified

- Nothing was run on a real workspace (only the invented fixtures and the examples of the repository), so how many existing facets hit the
  crash, and whether any of them relied on it as a "this element must not be hidden" check, is unknown (nothing in the repository does).
- The cost on a very large workspace with a facet that selects elements: the references of both layers are collected twice per matching
  action (a walk of ids, cheaper than the query itself). Not measured on any workspace larger than the fixtures.
- The native image (the Java side is untouched; the new kernel is the same wasm file the JVM and native builds embed, no native build was made).
- The editor in a real browser (see above): no screenshot, light or dark.

## Follow-ups

- No issue filed. #46 is fixed by this run; closing it belongs to the wave's pull request.
