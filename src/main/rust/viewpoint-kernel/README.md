# Viewpoint kernel

The algorithms behind the three viewpoints (overview, detailed, deep), the facets and the folding of boxes, as one
pure function: a graph of references and relationships goes in as JSON, the items and links of a view come out as
JSON. It knows nothing about YAML, files or rendering.

A fourth viewpoint, the **map**, is drawn by the editor (the pages Applications and Environments, one for each layer) and by the CLI (a view of `viewpoint: map`, of either layer; wave 015, run 0099): it has no focal element, every element of the layer is in
play, and a relationship is drawn between the boxes its two ends land on, so opening a box (`opened`) splits the links
that reached it among its children. `pinned` keeps the relationships that touch given elements, `hidden` leaves
elements out. Pinned on one element with nothing open it draws that element's overview, which the tests check against
the views the CLI generates.

The map of the **technology** layer also draws the applications and the dependencies between environments (wave 016, run 0114, issue #107; additive, the contract stays 5). Given the
application layer (`app_elements`), a node that hosts applications can be opened, and the applications deployed on it are boxes inside it, as the viewpoints of an element draw them
(same ids); the dependencies of the applications of an environment on those of the environments it `uses` are links, between the boxes of the applications when both are drawn and
else between the boxes the nodes land on (the dependencies inside one environment stay out, as they are "secondary" in the viewpoints of an element). `applications: false` draws the
nodes only, `relationships: false` draws no link at all (both absent or null: drawn). The application layer's map, and a technology map given no `app_elements`, are as they were.

A second, a third, a fourth, a fifth and a sixth entry point sit next to `compute`: `apply_facet` (the facets, see below), `compare`, which says what
changed between two plateaus of an architecture (see "Comparing two plateaus"), `apply_patches`, which changes the graph of a
plateau by the ordered patches of its layer (see "Applying the patches of a plateau"), and `states`, which says the seven state words of a
comparison once (see "The state words"), and `quiet`, which says which elements have nothing to draw, in one call (see "Which elements have nothing to draw"). What `compare` says can be drawn: `compute`
tells every box and link of a view what changed (see "Views of a comparison").

It is written once and runs in both places that draw views, so they cannot disagree:

| Where | How |
|---|---|
| The CLI (`views generate`) | `src/main/wasm/viewpoint_kernel.wasm` is translated to JVM bytecode when Maven builds the project (Chicory's compiler plugin), then called through `ViewpointKernel` / `KernelViewpointFactory`. Works in a native image. |
| The standalone editor | the same module, base64-encoded in `standalone.html`, instantiated by the browser. |

Maven does not need Rust: the `.wasm` is committed. Rust is only needed to change the kernel.

## Changing it

```bash
(cd src/main/rust/viewpoint-kernel && cargo test)         # rustup installs the compiler of rust-toolchain.toml
src/main/rust/viewpoint-kernel/embed.sh                   # rebuilds the .wasm and re-embeds it in standalone.html
node --test "src/test/javascript/**/*.test.js"            # the kernel vs. the views the CLI generated
./mvnw test                                               # the CLI vs. the same committed views
```

`embed.sh` writes the same build to `src/main/wasm/viewpoint_kernel.wasm` (the CLI) and to `standalone.html` (the
editor); a test fails when the two differ. Commit both.

The compiler is pinned in `rust-toolchain.toml` and the paths of the machine are remapped, so the same sources give the
same bytes everywhere: CI runs `embed.sh --check`, which rebuilds in a scratch directory and fails when the committed
`.wasm`, or the one in `standalone.html`, is not that build. To move to another Rust, change the channel, run `embed.sh`
and commit the new `.wasm` with it.

## The reference

`src/test/resources/viewpoint-kernel/` holds an invented workspace and the views the CLI generates for it, for the
workspace and for each facet. Both the Node tests and `ViewpointKernelFixtureTest` compare against those files, so a
change of behaviour, on purpose or not, is a visible diff. See its README for how to regenerate them.

## The contract

Documented at the top of `src/lib.rs`. `CONTRACT_VERSION` is returned in every answer; the CLI and the editor refuse
a kernel that speaks another version. Bump it when the shape of the input or output changes in a way a caller must
know about.

Two things worth knowing before touching the code:

- It mirrors the Java algorithms it replaces (`MetaLinkGroomer`, `Level`, …), including their quirks — for example a
  grouped link's caption is the default label unless the grouped relationships all read the same.
- The deep viewpoint follows references as paths, on purpose: the deep view of `sys` covers `sys` and `sys.…`, and
  does not pull in a sibling that merely starts with the same letters (`sys2`). The deep viewpoint of the Java it
  replaces compared references with `String.startsWith`, which did. This is an intentional divergence (the old behaviour
  was a bug); the overview, detailed and map viewpoints always compared paths.
- Each item carries the `stereotypes` of its element, for the CLI's PlantUML and for the editor: the element's
  `qualifiers` (whole, as declared), then the words of its `rendering-stereotypes` tag (a whitespace-separated list),
  once each. The caller sends `qualifiers` and `tags` with its elements; the kind and `atomic` / `composite` are the
  renderer's business, not the kernel's.
- `expandable` is not a structural guess: an item is flagged only if listing it in `expanded` (in `opened` for the map)
  changes the view, which is checked by computing the view again.
- The deep viewpoint of the technology layer shows every node inside the focal element, linked or not, and derives the dependencies between environments: a relationship between two
  deployed applications is drawn as a link between them when the environment of the first lists the second (or a node
  of it) in `uses` and does not host the destination itself. `uses` is a scope, never a link: nothing is drawn for an
  entry that no relationship rests on, and a facet that removes the relationships removes the links. Inside an
  environment the links between deployed applications stay "secondary" (the CLI does not draw them). The overview and
  detailed viewpoints of the technology layer see the same dependencies as relationships of the nodes that host the
  applications, so they group like the declared ones: an environment is linked to the environments it uses.
- Inside an environment the relationships between deployed applications are "secondary" (not drawn), unless the view is
  about a flow: a `facet` in the input, or `application_links: true` (what the CLI says for the workspace of a facet),
  draws them with their label and qualifiers, and the overview and detailed viewpoints lift them to the nodes of the
  view. `hide_unlinked` (a facet can carry it) leaves out, in the technology layer, the boxes no link goes through.
- Relationships that differ only by their tags are different relationships: the tags travel in the links
  (`tags`, and `relationships[].tags`) and are part of what makes two links, or two captions, the same.
- A JSON `null` is read as "not given" (`default_synthetic_label: null` is "uses"). A dangling reference, in any
  viewpoint, is an `error`, never a trap.
  When the map fails on an entry of `pinned`, `opened` or `hidden`, the error also has `dangling`: every entry the layer
  does not have, each once, in the order the map checks them (`error` names the first). The editor drops them all at once
  after a facet removed what they name, instead of computing again for each.
- Facets are standard JSONPath (RFC 9535, the `serde_json_path` crate), evaluated by the kernel and nowhere else:
  the CLI gives `apply_facet` the JSON of the workspace, the editor gives `compute` the elements of the view, and
  both get the same answer. A path selects nodes and the action `REMOVE` deletes them (relationships, but elements
  too: an element that goes takes with it, in the same step, what points at it or at what is inside it, a relationship,
  an entry of `uses`, an entry of `applications`; a reference that led nowhere before is left as it was). `functions` such as `length()` and `count()` are there, `match()` and `search()` (regular expressions) are not,
  to keep the module small: they are refused with an error, as is any path that does not parse or operator other than
  REMOVE. See `src/facet.rs` for the document a path is evaluated against.
- The paths written for the previous engine (Jayway) keep working, with a warning: `@.qualifiers anyof ['a']`,
  `@.qualifiers noneof ['a']` and `@.field == null` / `!= null` are rewritten to
  `@.qualifiers[?(@ == 'a')]`, `(@.qualifiers && !@.qualifiers[?(@ == 'a')])` and `!@.field` / `@.field`. Anything
  else Jayway accepted and the standard does not is an error that names the path.

## Comparing two plateaus

`compare` (`src/compare.rs`, the exported function `compare`, `compare_json` in Rust) takes the elements of two plateaus,
a `base` and a `target`, each one list per layer, in the shape `compute` already takes, and answers the same list of new,
changed and removed things to the CLI and to the editor. The rules are written at the top of `src/compare.rs` and each has
its tests there; a JS test (`src/test/javascript/viewpoint-kernel/compare.test.js`) calls it through the embedded WebAssembly.

```
input : { base:   { application: [element], technology: [element] },
          target: { application: [element], technology: [element] },             (a missing or null list is empty)
          on_one_chain: bool,                                                    (contract 5, required: see "Candidates")
          chain: [ { application: [ { reference, replaces? } ], technology: [..] } ] }   (optional, see "`chain`")
output: { version,
          elements:      [ { layer, reference, parent, parent_reference?, kind?, name?, description?, qualifiers, tags,
                             applications, uses, change, natures?, wording_only?, replaces?, replaced_by?,
                             contains_changes?, contains_more_than_wording?,
                             ...the other fields of the element } ],
          relationships: [ { layer, from, destination, label, qualifiers, tags, change, natures? } ],
          changes:       [ row ],
          counts:        { elements: { new, changed, removed, wording_only, moved?, split?, merged? },
                           relationships: { new, changed, removed } },
          candidates:    [ { layer, from, to, reasons } ],
          warnings?:     [ text ] }
        | { error }
```

- **Identity is the dotted reference**, per layer. In the target only: `new`; in the base only: `removed`. A moved, renamed
  or split element is a `removed` and a `new`, unless its author says otherwise with `replaces` (below).
- **The union.** `elements` and `relationships` hold everything the target has, plus what only the base has (kept whole, so
  that it can be drawn as removed, under its parent, which is itself in the union, removed too if the base had it alone).
  Each carries `change`: `none`, `new`, `changed`, `removed`, or for an element that replaces others `moved`, `split` or `merged`
  (always present). What is shown is the target's version, and
  the base's for a removed one. `parent` is as sent (can it contain others); `parent_reference` is read from the dotted
  reference. A field the kernel does not compare travels with the element (the other fields of the side that is shown);
  `change`, `natures`, `replaces` and the other names the union writes cannot be overridden by one.
- **Changed elements** are judged on their own properties and their own outgoing relationships, never on their children.
  The natures are a closed list, always in this order: `kind`, `name`, `description`, `qualifiers`, `tags`, `deployment`
  (`applications` and `uses`), `relationships-added`, `relationships-removed`, `relationships-changed`. `qualifiers`,
  `applications` and `uses` are compared as sets, `tags` as a map without the `rendering-*` ones, text trimmed with its
  line ends unified (an empty text is none). An element whose description is the only thing that changed has
  `wording_only: true` (and is counted apart: `counts.elements.wording_only` is a part of `changed`, not in addition to it).
  A difference in a `rendering-*` tag or in the order of a list is no change.
- **Relationships** are keyed by (layer, source, destination, label), an empty label being none. In both plateaus: `none`,
  or `changed` (natures `qualifiers`, `tags`) when those differ. When, for one (source, destination), one label was removed
  and one is new, they are one `changed` relationship with the nature `label` (the union shows the new label; the row says
  the old one); with two or more on either side they stay `removed` and `new`. Relationships that share a key (they differ
  by their tags) are matched when equal, then in order.
- **The table** `changes`: one row per changed thing, the elements then the relationships, sorted. A row is
  `{ thing: "element"|"relationship", layer, reference (the source, for a relationship), destination and label (relationship),
  kind and name (element), change, natures?, wording_only?, before?, after? }`; a `changed` row says `before` and `after` for
  the properties that differ only (the sets sorted).
- **Sorted and byte-stable.** Same input, same bytes, whatever the order of the lists. The one order that is kept is the
  one of `qualifiers`, as declared on the side that is shown, because it is the order a box is drawn in.
- **Errors**, in `{ error }` like `compute`: `dangling reference: x` (a relationship or `uses` entry that points at an
  element its own plateau does not have), `dangling application reference: x`, `duplicate reference: x`, `invalid input: ..`.
  The message says which plateau. A base relationship that ends on an element only the base has is not one.
- **`replaces`, the author's word on the identity of an element** (contract 4). An element of the target may list
  `replaces: [reference, ...]`, the references of the base that it is the new place of. It is read from the target only (a
  `replaces` on a base element is not read) and never guessed. A reference counts when the base has it, the target no longer
  does, and the element does not list it twice; any other is ignored and told in `warnings` (it is no error: the author may
  have compared with another baseline). There is no recursion, so a cycle cannot happen: an element that is replaced is not in
  the target, so it cannot replace anything. Then the element says what it is in `change`:
  - `moved`: it replaces one element that nothing else replaces (another place, another name);
  - `split`: what it replaces is replaced by others too (an element became several);
  - `merged`: it replaces several elements, or one while being in the base itself (several became one).

  It carries `replaces` (the valid references, sorted), keeps its own changes in `natures` (and the row in `before`/`after`), and
  is counted in `counts.elements.moved|split|merged`, never also as `changed` (the three counts are left out when zero, so that
  a comparison without `replaces` has the counts it had). `wording_only` is never set for them. What an element is compared
  with: its own version in the base if it had one (`merged`), the element it replaces if it is `moved`, nothing if it is
  `split` or `merged` and is new, so that only its relationships are compared. The relationships and the deployment
  (`applications`, `uses`) of what was replaced follow it when exactly one element replaces it; those of an element that was
  split are not compared (which half would own them is a guess). Elements that are replaced are not `removed`: they have no
  row and no count and are not in the union, with one exception: what a replaced element held is removed unless it is replaced
  too, and a view cannot place a removed child without its parent, so such a replaced element is in the union as `removed` with
  `replaced_by` (the elements that replace it), still without row or count. A `removed` element (a place included) says its
  `applications` and `uses` as the target does: an entry that points at an element that was replaced points at the element
  that replaced it, and one that points at an element that was split is left out, so that nothing in the union points at
  an element the union does not hold (the union can be handed to `compute`, whatever was replaced).
- **`chain`, the plateaus between the base and the target** (additive to contract 5, wave 017, issue #89; the number does not move). Each
  layer of plateaus writes `replaces` relative to the plateau it overrides, so a move made in two steps (`z` replaces `y`, which replaced
  `x`) names, between plateaus two steps apart, an element the base does not have: without help it is a `new` `z`, a `removed` `x` and a
  warning. The host, which knows the tree of plateaus, gives the plateaus the target stands on: `chain` is the list of them, oldest first,
  the last one being the plateau the target overrides and the first the base, or, for two siblings, the plateau they have in common. Only
  `reference` and `replaces` (as the layer that declared the element wrote it; an inherited element keeps its word) are read of an
  element. With two plateaus or more the kernel rewrites the `replaces` of the target before it reads them (rule 6 then applies to
  what it wrote): an entry that names an element of the plateau just above, which the target no longer has, is read through the step that
  made that element, down to the first plateau of the chain; an element is read through the step that made it only when its layer wrote the
  word (the plateau above does not say the same of it). So a move then a move is a `moved` that replaces the first element; a move then a
  split, or a split then a move of one half, is a `split`; a move then a merge is a `merged`; an element created by a layer in between and
  moved by the next one replaces nothing (it is `new`, and the entry is no mistake); an element that a layer in between removed ends its
  chain. An entry the last step cannot explain (it names nothing of the plateau above) and an entry that is not a string are left as
  written, so that rule 6 ignores them with its warning as before. An element whose `replaces` the host did not give is not rewritten.
  `warnings` and the `replaces` of the union say the composed words, not the ones the layers wrote. Without `chain`, with `null` or with a
  single plateau nothing is composed and the answer is what it was.
- **Candidates** are listed in `candidates`, never applied, never drawn: pairs (an element only the base has and nothing replaces,
  an element only the target has that replaces nothing) of the same layer and kind, with the reasons `name` (same name, ignoring
  case, and only when no other removed element and no other new element of that kind has it: a name that repeats would pair every
  removed one with every new one, wave 013, issue #60), `description` (at least 60 percent of the words in common, three words or more on each side) and `parent` (the only two
  of that kind under the same parent). Sorted by (layer, from, to). The author turns one into a `replaces` or leaves it.
- **`on_one_chain`, whether the two plateaus are one the past of the other** (contract 5, wave 014, issue #70). The host knows it from the
  tree of plateaus (one is an ancestor of the other, `baseline` of all), the kernel cannot. When it is `true`, the candidates are the above.
  When it is `false`, the two plateaus are siblings, two alternatives built on the same past, and the only two elements of a kind under one
  parent are not one thing said twice: the reason `parent` is not given, a pair that has no other reason is not listed, and a pair that has
  `name` or `description` keeps it, with that reason alone. Nothing else moves: the union, the table and the counts are those of a chain.
  **It is required.** An input without it, or with `null`, is `{ "error": "invalid input: `on_one_chain` is missing: ..." }` and no partial
  answer; anything that is not a boolean is `invalid input: ... expected a boolean`. The kernel takes no default, because neither is right
  for every caller: `true` would bring the pairs of two alternatives back to a host that forgot, `false` would hide the pairs of a chain. The
  contract number is the signal for a host written for 4, which refuses a kernel that answers `version: 5`.
- **The contract version.** `compare` itself added nothing to version 2; the views of a comparison (below) changed what `compute`
  gives, and moved the contract to 3; `replaces` (new words of `change`, `replaces`, `candidates`, `warnings`) moved it to 4;
  `on_one_chain` (a required input) moved it to 5, with `contains_changes` and `states` (below). **The elements of the union say
  `contains_changes` and `contains_more_than_wording`** (issue #96, wave 015): two keys added to the answer of `compare`, absent
  when false, which no host written for 5 can trip over, so the contract stays at 5 (see "Views of a comparison").

## Views of a comparison

`compute` draws what `compare` says. There is no second input and no new entry point: **the caller merges `change` into the
elements and the relationships it gives**, because a field like that is a free-form field of the element, and a facet, the
stereotypes and the folds already read free-form fields. Two ways of giving it were weighed:

- *`change` on the elements and the relationships (taken).* `compare`'s union elements are already drop-in elements (`reference`,
  `parent`, `applications`, `uses`, `kind`, `name`, `qualifiers`, `tags`, `change`, `natures`; `layer` and `parent_reference` are
  ignored). The one piece of glue is that `compare` lists its relationships apart, so the caller nests each one under the element
  that declares it (`relationships.filter(r => r.layer == layer && r.from == element.reference)`, ten lines in JavaScript, and
  `Comparison` does it in Java). A removed element stays whole and takes part in the layout under its parent, a removed
  relationship is a relationship.
- *The compare result as a second input* was left: it would need a second lookup in every viewpoint, its own checks, and a facet
  could not read `change` (a facet sees the elements, not a side table).

```
element      : { reference, ..., change?: "none"|"new"|"changed"|"removed"|"moved"|"split"|"merged", natures?: [text], relationships: [rel] }
relationship : { destination, label, qualifiers, tags, change?: "none"|"new"|"changed"|"removed" }
option       : only_changes?: bool
output item  : { ..., stereotypes, change?, natures?, context? }
output link  : { ..., relationships: [{ ..., change? }], change? }
```

- **Comparison or not.** As soon as one element or one relationship of the input has a `change` (it is read before the facets
  run), the view is a comparison: every item and every link says its `change` (`none` when it did not change), an item says the
  `natures` its element has, and a relationship of a link says the `change` it was given. Without any `change`, nothing is added and
  the view is what it was in version 2, byte for byte (checked on the fixtures, on the workspaces of the manual and on a real one).
  A `change` that is not one of the words (the four of version 3, and for an element `moved`, `split`, `merged`) is an `error`; `null` is not given.
- **What an item says** is the change of its own element, whatever is inside it. A box that is folded says the change of its own
  element too, not of what it hides.
- **A grouped link** says what the relationships it stands for add up to: all `new` is `new`, all `removed` is `removed`, all
  `none` is `none`, any other mixture (a new one with an unchanged one, a new one with a removed one, a changed one, a label that
  changed) is `changed`. A natural link, one relationship, says its own. What a change is does not change how links are grouped or
  captioned: two relationships that read the same still count once, whatever happened to each.
- **Computed stereotypes.** The stereotypes of an item (qualifiers, then the words of `rendering-stereotypes`) end with the state of
  its element: `new`, `changed` or `removed`, so that `styles.by-tags` gives them a look with no other work. The word is never
  twice in the list: one the author wrote by hand moves to the end. The last stereotype of a box wins, property by property, in the
  editor (a later one overrides) and in the CLI (it writes them last first, and PlantUML lets the first win), so the computed state
  has the last word over a hand-written `new` or `changed`, and over any other stereotype. The author's `new` or `changed` keep
  working on an element that did not change in the comparison: nothing is removed from the list.
- **A container with changes inside.** A container is not `changed` because a child is. When its own state is `none` and some
  element below it in the reference tree is new, changed or removed, its stereotypes end with `contains-changes`, a name of its
  own that a style can give a line, a glyph or a badge (a relationship that changed counts through the element that declares it,
  which `compare` marks `changed`). A container that is itself new, changed or removed says that, and has no marker. The
  marker is computed from the elements the view is given (after the facets), also for a box that is folded. The item also says it
  in `contains_changes: true` (contract 5): that key is the kernel's own word that it computed the state, while the stereotype
  `contains-changes` is also a word that an author may have written by hand, as a qualifier or in the `rendering-stereotypes` tag, on a
  box that holds no change. A host that has to tell the two (the CLI draws the default look of a state only for a box that has it computed, the
  editor does the same) reads the key, not the last stereotype. The key is absent when the box does not hold a change and in a view
  that does not compare.
- **The union says it too** (`compare`, issue #96; before, a host that works on the union and not on a view, such as the warning about a
  state written by hand or a tree of elements, worked the rule out again from the references). An element of the union says
  `contains_changes: true` when it did not change itself and an element below it in the reference tree (the elements listed or not, in its own layer)
  is new, changed, removed, moved, split or merged (a replaced element kept as a place for what was removed below it counts: it is `removed`);
  it is `compute`'s rule, on the whole union. `contains_more_than_wording: true` is the same question asked without the elements whose only change is
  their description (`wording_only`), and for every element, whatever it did itself: it is what a host that sets the wording-only changes aside
  (the editor's toggle: it gives those elements to `compute` as unchanged) reads, for an element that is then unchanged, in place of `contains_changes`.
  Both are absent when false. **They are not free-form fields in `compute`**: the keys are removed from the elements of the input before the
  facets run (a facet does not see them, the drawing does not depend on them), and `compute` says its own `contains_changes` on the items of what it
  draws, after the facets, as before; a free-form field of that name in the input of `compare` never reaches the union either.
- **`only_changes`** keeps, of the view as it is drawn (after the facets, `hide_unlinked` and the folds), the items and the links
  whose `change` is new, changed or removed; the ends of those links; a folded item that hides changes; the focal item (so that a
  view without changes is not empty; the map has none); and what encloses all of them. An item kept for no change of its own has
  `context: true`, so that a renderer can grey it. A link is kept only for its own change: an unchanged link between two kept
  items is left out. Without any `change` in the input nothing changed, and only the focal item and what encloses it stay.
  The facets run first, on the union, and read `change` like any field: `$..relationships[?(@.change=='removed')]`.
- **Contract version 3.** The output of `compute` gained fields (`change`, `natures`, `context` on items, `change` on links and on
  their relationships) and a stereotype; nothing of it appears without a `change` in the input. Callers check the version as before.
- **Contract version 4.** `change` of an element may also be `moved`, `split` or `merged` (what `compare` says of an element that
  replaces others): they are states like `new`, they end the stereotypes (`moved`, `split`, `merged`), make the containers above
  say `contains-changes`, and `only_changes` keeps them. A relationship says only `none`, `new`, `changed` or `removed`: the others
  are an `error` there, as is any other word. Nothing changes for an input without those words.
- **Contract version 5.** An item of a comparison says `contains_changes: true` when it holds a change and did not change itself (above). Nothing
  else about a view moves; the answer says `version: 5`.

## The state words

The seven words that a comparison puts on a box (`new`, `changed`, `removed`, `moved`, `split`, `merged` and `contains-changes`) are written
once, in the kernel, and `states` says them (contract 5, issue #34; before, the CLI wrote them twice and the editor once more, and a test
compared the lists). It takes no input (what is sent is not read) and answers

```
{ "version": 5,
  "relationship": ["new", "changed", "removed"],        (what a relationship, or an element, can be)
  "identity":     ["moved", "split", "merged"],         (what an element that replaces others can also be)
  "container":    "contains-changes",                   (the computed state of a box that did not change and holds a change: `contains_changes`)
  "states":       [the three, in that order] }
```

The CLI reads it once, on first use (`KernelStates`), and the editor when it loads the module (the four arrays of the page are filled from it and have
no word of their own). What a host keeps is the look of each word (a glyph, a line style), not the list: a test of each host fails when a state of the kernel
has no look.

## Which elements have nothing to draw

The editor greys, in its tree, the elements that a facet leaves with nothing to draw. It used to ask `compute` for the view of every element, one call each (420 ms for
the 82 elements of the largest plateau of the Brightcart fixture, issue #81: the input, with every element of the model, was read, filtered and drawn once per
element). `quiet` (`src/lib.rs`, the exported function `quiet`, `quiet_json` in Rust) answers for all of them in one call: the input is read once, the
`change`s are checked once and the facet is applied once, then the view of each element is built as `compute` builds it.

```
input : the input of compute, without `focal`, and
        focals: [ { reference, viewpoint? } ]        (the elements to ask about; the viewpoint of the input when one says none; never "map")
output: { version, quiet: [ reference ] }            (those of `focals` that have nothing to draw, in the order given)
      | { error }
```

- **Nothing to draw** is the rule the editor applied to the answer of `compute`: the view has no link that is not `secondary`. A view that cannot be built (the
  facet removed the element, or what the view needs of it, so `compute` says `dangling reference` or `unknown focal element`) is quiet when the input has a `facet`
  and is not when it has none (the element has no view, which is not the same as an empty one).
- **One error for all of them**: an input that cannot be read, a `change` that is not a word, a facet that fails and a `focals` that is missing are the `{error}`
  that `compute` gives for each of them, once. The editor reads an error through a facet as "every element is quiet", as it did.
- **Why an entry point and not an extension of `compute`.** `compute` answers with one view; a list of views would change the shape of its answer for every host,
  and `expandable` (which builds the view again for every box that could open) and the stereotypes, which `quiet` does not need, would be built for nothing. A new entry point is additive: nothing the others
  take or give changes (the views of every workspace of the repository are byte for byte those of the commit before), the number stays 5, and the answer says it.
  The command line has no use for it (it draws views, it does not grey a tree), so `ViewpointKernel.java` does not expose it.
- **The cases** are in `src/quiet_tests.rs`: the answer is compared, for the three viewpoints and for facets that remove relationships, one element, a parent and
  everything, with what one `compute` per element says. The editor's tests (`quiet-references.test.js`) do the same through the embedded module on the layered Brightcart.

## Applying the patches of a plateau

A plateau is a layer over its parent: the host adds the manifests of the layer to the graph of the parent, then hands
`apply_patches` the JSON of that graph and the ordered `patches` of the layer (`src/patch.rs`, the exported function
`apply_patches`, `apply_patches_json` in Rust). The rules are written at the top of `src/patch.rs`; the cases are in
`src/test/javascript/viewpoint-kernel/patch-cases.json`, one list read by `cargo test` (`src/patch_tests.rs`) and by a node test
(`patches.test.js`) through the embedded WebAssembly, and a Java test calls the export through Chicory.

```
input : { workspace, plateau?, patches: [ patch ] }
patch : { operator: "REMOVE" | "SET" | "ADD" | "MERGE",
          target?    (a full reference: selects exactly that element),  layer? ("application" by default, or "technology"),
          json-path? (RFC 9535, also written json_path),  expect? (a whole number, 1 or more),
          field?, where? { destination, label? }, value? }
output: { version,
          workspace,                                     (the document, patched; every other key as it was, in the same order)
          patches: [ { rank, operator, selector, matched,
                       touched: [ { layer, reference } ],                        (the elements selected, or the ones that hold the nodes selected; sorted)
                       removed?: [ { layer, reference } ],                      (REMOVE: every element that left, the subtree included)
                       dropped?: [ { layer, reference, field, entry } ] } ] }   (REMOVE: what was taken out of the elements that stay)
      | { error, patch?: { plateau?, rank, operator?, selector? } }
```

- **The rules are written at the top of `src/patch.rs`** (the header is the one statement of them). In short: the patches run in
  order, each on the result of the one before, and the first that fails ends the call (an error returns no workspace); `rank` counts
  from 1; a `target` selects one element, a `json-path` (no rewriting of the old dialect of facets) at least one node or exactly
  `expect`, and a miss is an error that names the plateau, the rank and the selector, for example
  `plateau saas: patch 2 (REMOVE target shop.cart): selects nothing, there is no element shop.cart in the application layer`.
- **`REMOVE`** takes the selected nodes out and, when an element goes, what points at it in the same step (the cascade of the facets:
  `facet.rs` has the one routine), and not the node that hosted it. **`SET`** replaces a field (a list or an object is replaced, not
  added to; a `SET` of `tags` that keeps the other tags is a `MERGE`); with `where` it replaces the fields of the one relationship
  found by `(destination, label)`. **`ADD`** appends to a list. **`MERGE`** sets the keys of an object, one level deep.
- **A patch never changes an `id` or a `parent`**, and no combination of keys is guessed: what has no meaning is an error that says
  which key. Nothing else is checked: a relationship added towards an element that does not exist is the loader's error after the
  layer, which names the layer.
- **The contract number did not move for it.** `apply_patches` is additive: nothing `compute`, `apply_facet` or `compare` take or give
  changes (the views of every workspace of the repository are byte for byte those of the commit before) and the answer says the
  version (4 when it was added, 5 since `compare` took `on_one_chain`). A host that needs it ships with a kernel that has it, as for the
  other entry points.
