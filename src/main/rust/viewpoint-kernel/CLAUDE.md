# The viewpoint kernel

Rust compiled to WebAssembly, shared by the command line and the editor. Moved from the root `CLAUDE.md` with its wording unchanged; the root file says where each area lives.

Viewpoint kernel (Rust compiled to WebAssembly, shared by the CLI and the standalone editor — see `src/main/rust/viewpoint-kernel/README.md`):

```bash
cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml
cargo fmt --check --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml     # rustfmt (`cargo fmt` writes); CI step "Check the format of the viewpoint kernel"
cargo clippy --all-targets --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml -- -D warnings   # every finding is fixed, none baselined; CI step "Lint the viewpoint kernel"
(cd src/main/rust/viewpoint-kernel && cargo llvm-cov --ignore-filename-regex '_tests\.rs$' --fail-under-lines 90)   # line coverage of the kernel by `cargo test`: 90 % is the floor CI enforces (step "Cover the viewpoint kernel", after "Lint the viewpoint kernel"); needs `cargo install --locked cargo-llvm-cov --version 0.9.1` locally (CI: a prebuilt binary of that version, taiki-e/install-action; `llvm-tools-preview` comes with rust-toolchain.toml)
src/main/rust/viewpoint-kernel/embed.sh                  # after changing the Rust: rebuilds the .wasm into editor-webapp/assets/ and reassembles the page
```

Maven needs no Rust: `src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm` is committed (one copy: the CLI translates it, the editor fetches it beside the page).

The kernel's unit tests are in `src/main/rust/viewpoint-kernel/src/*_tests.rs` (`compare_tests.rs`, `facet_tests.rs`, `lib_tests.rs`, `abi_tests.rs` and the older `change_tests.rs`, `patch_tests.rs`, `quiet_tests.rs`), declared in the module they test with `#[cfg(test)] #[path = "..."] mod tests;`, so that the figure of `cargo llvm-cov` counts production code only (a test module inside a source file counts its own lines, which inflates the figure and, with it, how far the code can drop before the floor fails: 98.3 % with the tests inline, 97.4 % of the production code before this run). A new test goes in one of these files, asserts what the entry point returns or the sentence it says, and does not touch `RESULT` outside `abi_tests.rs` (the C ABI shares one buffer: that file's tests take turns). What stays uncovered is guards for states the entry points cannot reach (a `let ... else` after a check, the arm of a `match` the types leave open), left in place because deleting them would move the `.wasm`.
