---
type: run
run: 0166
status: completed
wave: 023
profile: single-document
---

# Run 0166: rust-fmt-and-clippy

Single-document profile (as runs 0164 and 0165: the wave plan holds the requirements and the design). Wave 023, W-3, issue #160 step 3, Q1, T3, T8, T9, T4, V-D.

## Scope and decisions

- **Toolchain.** `src/main/rust/viewpoint-kernel/rust-toolchain.toml` (the file lives in the kernel folder, not at the root) gains `components = ["rustfmt", "clippy"]`. The channel stays 1.97.1. The brief said the components were already installed; they were not (`cargo fmt` said so), rustup installed them from the file on first use.
- **Measured before any change.** `cargo fmt --check`: 7 files differ (`change_tests.rs`, `compare.rs`, `facet.rs`, `lib.rs`, `patch.rs`, `patch_tests.rs`, `quiet_tests.rs`), 545 hunks; `cargo clippy --all-targets`: 18 distinct warnings (16 in the library, 2 more in the tests): `missing_safety_doc` 8, `type_complexity` 3, `bool_assert_comparison` 2, `doc_lazy_continuation` 1, `needless_lifetimes` 1, `redundant_closure` 1, `explicit_auto_deref` 1, `manual_inspect` 1.
- **Formatting first.** `cargo fmt` over the 7 files (+5144 / -1090 lines), then checked: `cargo test` 240 passed before and after. One spot is not formatter output: `patch.rs` `check` had a match arm with a string literal too long for rustfmt, which made `cargo fmt` not idempotent (a second run changed it again). The message became a `const WHAT` and `format!("unsupported operator {other}: {WHAT}")`; the resulting text is the same (`PatchTests` pin it). After it a second `cargo fmt` is a no-op.
- **Clippy, all fixed, none allowed.** `missing_safety_doc`: a real `# Safety` section on `dealloc`, `compute`, `apply_facet`, `compare`, `quiet`, `apply_patches`, `states`, `result_ptr` (documentation only). `type_complexity`: three aliases (`RelationshipOrder`, `PairsOfElements` in `compare.rs`, `ReadsTheSame` in `lib.rs`). `needless_lifetimes` (`group`), `redundant_closure` (`all(keep)`), `explicit_auto_deref` (`layer`), `manual_inspect` (`map_err` that returned its error becomes `inspect_err`), `bool_assert_comparison` (`assert!`), `doc_lazy_continuation` (a blank doc line ends the list). No logic was edited. **`#[allow(clippy::...)]` added: 0** (T9: nothing to list). The two existing `#[allow(static_mut_refs)]` are rustc lints, not clippy, and were not touched.
- **CI.** Two steps in the `Build` job of `ci-build.yaml`, before the check of the WebAssembly: "Check the format of the viewpoint kernel" (`cargo fmt --check`) and "Lint the viewpoint kernel" (`cargo clippy --all-targets -- -D warnings`), both from `src/main/rust/viewpoint-kernel`. CLAUDE.md "Build & Test" gains the two commands.
- **The `.wasm` moved.** Yes: sha256 `3b26706b...` before, `4f968036...` after (794741 bytes after). Expected: rustfmt moves line numbers and the module carries panic locations. `embed.sh` re-embedded both copies (`src/main/wasm/viewpoint_kernel.wasm` and the base64 block of `standalone.html`); `embed.sh --check` exits 0.

## T4: the checks fail on a wrong file

- `printf '\nfn   wrong( a:i32 )->i32{a}\n' >> src/facet.rs; cargo fmt --check`: exit 1. Restored; `cargo fmt --check` exit 0.
- `pub fn seeded(v: &Vec<i32>) -> usize { v.len() }` appended to `src/facet.rs`; `cargo clippy --all-targets -- -D warnings`: exit 101 (`ptr_arg`). Restored (identical to the backup); exit 0.

## Verification

- `./mvnw -o verify -DskipITs=false` (JDK 25): exit 0, 1380 unit tests (2 skipped, as before), 39 integration tests, 0 failures.
- `cargo test`: exit 0, 240 passed. `cargo fmt --check`: exit 0. `cargo clippy --all-targets -- -D warnings`: exit 0. `embed.sh --check`: exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: exit 0, 2576 tests, 0 failures (run after the Maven build, never together).
- `npx prettier --check "src/**/*.java"`: exit 0.

## V-C

`scripts/byte-identity.sh --no-build` on a `target/quarkus-app` built after the re-embed, no exception needed by this run: exit 0; workspaces: 20; commands compared: 332; identical: 330; accepted by the exceptions: 1 (the harness's own self-check workspace, the W-2 sentence); unexpected: 0; self-check: ok.

## Canonical impact

Canonical text changed: CLAUDE.md ("Build & Test", the two kernel commands) and `ci-build.yaml` (two steps). `rust-toolchain.toml` and the committed `.wasm` moved (the toolchain components; the bytes, by the line numbers). No architecture-level impact: no component, contract or flow changed, and the kernel computes what it computed.
