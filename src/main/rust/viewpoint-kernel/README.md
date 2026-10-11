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
rustup target add wasm32-unknown-unknown                  # once
cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml
src/main/rust/viewpoint-kernel/embed.sh                   # rebuilds the .wasm and re-embeds it in standalone.html
node --test "src/test/javascript/**/*.test.js"            # the kernel vs. the views the CLI generated
./mvnw test                                               # the CLI vs. the same committed views
```

`embed.sh` writes the same build to `src/main/wasm/viewpoint_kernel.wasm` (the CLI) and to `standalone.html` (the
editor); a test fails when the two differ. Commit both.

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
- Facets are Jayway JSONPath in the CLI. The kernel understands only the shape every documented facet has (removing
  relationships that match a filter on `qualifiers` or `label`) and answers `unsupported facet action: …` for anything
  else instead of guessing. The CLI itself still applies facets with Jayway before the kernel sees the workspace.
