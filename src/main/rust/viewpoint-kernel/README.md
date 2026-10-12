# Viewpoint kernel

The algorithms behind the three viewpoints (overview, detailed, deep), the facets and the folding of boxes, as one
pure function: a graph of references and relationships goes in as JSON, the items and links of a view come out as
JSON. It knows nothing about YAML, files or rendering.

A fourth viewpoint, the **map**, is used by the editor only: it has no focal element, every element of the layer is in
play, and a relationship is drawn between the boxes its two ends land on, so opening a box (`opened`) splits the links
that reached it among its children. `pinned` keeps the relationships that touch given elements, `hidden` leaves
elements out. Pinned on one element with nothing open it draws that element's overview, which the tests check against
the views the CLI generates.

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
- Facets are standard JSONPath (RFC 9535, the `serde_json_path` crate), evaluated by the kernel and nowhere else:
  the CLI gives `apply_facet` the JSON of the workspace, the editor gives `compute` the elements of the view, and
  both get the same answer. A path selects nodes and the action `REMOVE` deletes them (relationships, but elements
  too). `functions` such as `length()` and `count()` are there, `match()` and `search()` (regular expressions) are not,
  to keep the module small: they are refused with an error, as is any path that does not parse or operator other than
  REMOVE. See `src/facet.rs` for the document a path is evaluated against.
- The paths written for the previous engine (Jayway) keep working, with a warning: `@.qualifiers anyof ['a']`,
  `@.qualifiers noneof ['a']` and `@.field == null` / `!= null` are rewritten to
  `@.qualifiers[?(@ == 'a')]`, `(@.qualifiers && !@.qualifiers[?(@ == 'a')])` and `!@.field` / `@.field`. Anything
  else Jayway accepted and the standard does not is an error that names the path.
