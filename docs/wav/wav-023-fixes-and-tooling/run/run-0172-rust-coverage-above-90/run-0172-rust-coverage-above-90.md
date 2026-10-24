---
type: run
run: 0172
status: completed
wave: 023
profile: single-document
---

# Run 0172: rust-coverage-above-90

Single-document profile (as runs 0164 to 0171: the wave plan holds the requirements and the design). Wave 023, W-9, Q5, T8 to T10, V-D, V-E, V-G, V-H. Line coverage of the viewpoint kernel (`src/main/rust/viewpoint-kernel`) measured by `cargo llvm-cov`, above 90 % and enforced in CI; Java twin: run 0171.

## Result

| | before (the 240 tests, counted as `cargo llvm-cov` counts them) | before (true: production code only, 240 tests) | after (268 tests, production code only) |
|---|---:|---:|---:|
| lines | 98.28 % (130 of 7,571 missed) | **97.37 %** (96 of 3,649 missed) | **99.26 %** (27 missed) |
| functions | 95.54 % | 95.66 % | 98.26 % |
| regions | 98.52 % | 97.12 % | 98.94 % |

The floor CI enforces is **90 % of the lines** (`--fail-under-lines 90`, Q5). The kernel was already above it with the tests it had; what this run adds is the measure being true, the floor being enforced, the ABI being tested natively and 28 tests that assert.

## The measure was inflated, in a way the brief half expected

`cargo llvm-cov` counts every file of the crate that is not a test file by name. Three of the kernel's source files (`compare.rs`, `facet.rs`, `lib.rs`) ended in an inline `#[cfg(test)] mod tests { ... }` (5,400 lines of tests in all, all run), so 3,922 of the 7,571 lines the tool counted were test code: 98.28 % with them, 97.37 % without. The difference matters less for today's figure than for the floor: with the tests inline, the production code could fall a long way before `--fail-under-lines 90` failed (3,922 lines of tests that always run are a free credit of 52 points on the total). The seeded drop below shows the floor with the production code alone.

The separate test files of the kernel (`change_tests.rs`, `patch_tests.rs`, `quiet_tests.rs`) were not in the report: `cargo-llvm-cov` 0.9.1 leaves out files that end in `_tests.rs` by itself (the five files of the report were the four sources). So the fix is the convention the crate already had for three of its test modules: the three inline modules are moved, as they are (dedented, `use super::*;` kept), to `compare_tests.rs`, `facet_tests.rs` and `lib_tests.rs`, and the module declares them with `#[cfg(test)] #[path = "compare_tests.rs"] mod tests;` (a `#[path]` and not a `mod compare_tests;` of the crate root, so that the tests keep reaching the private items of their module). The command says the rule once more, with `--ignore-filename-regex '_tests\.rs$'` (an exclusion written in the command with its reason, T9; it is also what the tool does without it).

Nothing else distorts the figure. The entry points of the WebAssembly (`alloc`, `dealloc`, `compute`, `apply_facet`, `compare`, `quiet`, `apply_patches`, `states`, `result_ptr`, 41 lines of `lib.rs`) were not run by `cargo test` (the hosts call them: the Java and node conformance tests do); they are in the figure and are now run natively (below), not excluded. There is no `main`, no generated code and no binding layer in the kernel (`crate-type = ["cdylib", "rlib"]`, no `wasm-bindgen`). No line is excluded.

Does the move change the `.wasm`? No: the code before the test module is the same text on the same lines (the move replaces the module, at the end of each file, by three lines), a test module is not compiled into the release build, and `embed.sh --check` passes (794,741 bytes, the committed ones). `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` pass on the moved files.

## The figure by file

| file | lines before (true) | lines after | missed before -> after | functions before -> after |
|---|---:|---:|---:|---:|
| `compare.rs` | 99.22 % (1,020) | 99.80 % | 8 -> 2 | 99.15 % -> 99.15 % |
| `facet.rs` | 95.71 % (606) | 98.35 % | 26 -> 10 | 96.05 % -> 98.68 % |
| `lib.rs` | 96.48 % (1,536) | 99.41 % | 54 -> 9 | 94.01 % -> 98.62 % |
| `patch.rs` | 98.36 % (487) | 98.77 % | 8 -> 6 | 94.00 % -> 94.00 % |
| **all** | **97.37 %** (3,649) | **99.26 %** | **96 -> 27** | **95.66 % -> 98.26 %** |

`cargo test` goes from 240 to 268 tests (all 268 pass; 25 consecutive runs of the whole suite with no failure, the ABI tests share one buffer and take turns).

## Tests added (T10: each asserts what the code returns, writes or says)

| file | tests | what they pin |
|---|---:|---|
| `abi_tests.rs` (new, 5) | 5 | the C ABI the hosts call, driven like a host does (`alloc`, write, call, read `len` bytes at `result_ptr`, `dealloc`): each of the five JSON entry points answers the very bytes of the function it wraps and a version-5 answer with no error; what each did (the facet removed the first element and nothing else, the patch set the name, the comparison found the new element, `quiet` names the element with nothing to draw); an input that is not UTF-8 is `{"error":"input is not UTF-8"}` and an empty one the JSON error; `states` reads nothing (not even a text) and says the seven words; a buffer of `alloc` holds what was written, for lengths 0, 1 and 4,096. They take turns (`RESULT` is one buffer per module, as for a host). |
| `patch_tests.rs` (+5) | 5 | MERGE with a boolean, a number, a text, a list: the sentence names what it was given; a `where` with a value that is no object; MERGE and ADD on a field that is a number, a boolean or a text name its kind; a path that selects outside the elements is refused with the path; a workspace that is a list is refused before any patch. |
| `compare_tests.rs` (+7) | 7 | numbers and booleans where a text is expected are compared as the JSON they are and say so in `before` and `after`; a node whose applications and uses both change has one `deployment` nature; a free-form field is written with its keys in order inside lists too; the entries of `replaces` that say nothing (blank, a number, null, a list) are left out and the padded copy counts once, also in a chain, where each of the five is told as a warning; a replaced element the middle plateau still had is followed to the first plateau; a word a layer inherited is explained by the layer that wrote it (and a word written anew on an element the middle plateau had is a split). |
| `facet_tests.rs` (+9) | 9 | the earlier dialect told with the standard form of each of its shapes (`anyof`, empty `anyof`, `noneof`, empty `noneof`, `== null`, `!= null`, a field name with `_`, `-` and digits, a path that ends there or has spaces after) and what only looks like it is read as the standard path it is (an unclosed list, an item that is not a quoted text, a name that starts with null, the words in a text, `$.tags == null`); a technology view with no application; an empty layer is the empty document; a facet that takes away a `destination` or an `id` is the error of the view with its sentence; what is in the list of elements and is no element is left where it is and the cascade runs round it; a facet cannot remove the workspace, and an operator is `REMOVE`; `$..[0]` on a workspace (an element and the first item of other lists) still cleans up after the element, by the paths that cannot take the fast path; the document of a view leaves out what an element has empty. |
| `lib_tests.rs` (+2) | 2 | two applications whose boxes would have one id (`e.a_b` hosting `c`, `e.a` hosting `b_c`) are numbered `e_a_b_c` and `e_a_b_c_2` in the technology map, and in the deep viewpoint in the order of the nodes of the view. |

Nothing was written to run a line: the table is read as the review of T10. Probes that print and panic were used to learn the output of a case, then replaced by the assertion on the sentence or the value.

## What is not covered (27 lines), and why none is excluded or deleted

Deleting any of them would change the `.wasm` (and the brief allows only dead code shown unused). Each is a guard for a state the entry points cannot reach, left as a safeguard:

- `compare.rs` 317: `note` is always called with a nature (`Some`), the arm for `None` is never taken.
- `facet.rs` 69, 76, 80, 82, 92: `remove_at` given a path that is not in the document (the paths come from the query on that document, longest first; the whole-workspace path is refused before). 233: `RefCounts::release` of a reference that is not counted (needs stale counts). 282: the name guard of a nested path in the fast path `subtrees_of`. 754-755: an entry of `uses` that is not a text after a facet (a facet can only remove, so it cannot make one).
- `lib.rs` 1176: a derived dependency whose two ends fold into the same box. 1445, 1488, 1495, 1598, 1637: a lookup that cannot fail after the lookup before it succeeded (`hosts.get(to_app)` after `deployed_application_of`; the dangling application check of the second loop, made before; `item_of` for both ends).
- `patch.rs` 168: the word for `null` in `kind` (a null `value` is "no value" before it is named). 335, 361: `element_of` and `node_at_mut` given a path that starts with an index (the workspace is checked to be an object first).

## Enforcement (V-E: the floor has teeth) and CI

The step, in the `Build` job after "Lint the viewpoint kernel" and before the check of the committed WebAssembly:

- "Install cargo-llvm-cov": `taiki-e/install-action@v2.87.26` (published 2026-10-06, 18 days old), `tool: cargo-llvm-cov@0.9.1` (2026-09-06): the prebuilt binary, whose checksum is in the manifest of the action at that tag (checked: `manifests/cargo-llvm-cov.json` at `v2.87.26` has the hashes of `0.9.1`). No compilation, no server of ours, no secret (the action uses the token of the run for the GitHub API, as `actions/checkout` does).
- "Cover the viewpoint kernel": `cd src/main/rust/viewpoint-kernel`, `cargo llvm-cov --ignore-filename-regex '_tests\.rs$' --fail-under-lines 90 || { echo "::error::..."; exit 1; }` (the tool exits 1 without a word below the floor; the `::error::` line says it in the log). `llvm-tools-preview` is a component of `rust-toolchain.toml` (rustup installs it with the compiler on first use, as it does `rustfmt` and `clippy`); the compiler stays 1.97.1 and `embed.sh --check` passes.

Seen to fail (T4, V-E), locally, with the command of the step:

| seeded fault | result |
|---|---|
| floor raised to 99.9 | exit 1, the table above it (99.26 %) |
| the tests of `compare.rs`, `facet.rs` and `lib.rs` (and `abi_tests.rs`) taken out of the build, 70 tests left (a seeded drop) | 79.99 % of the lines, exit 1 |
| the step run through `bash -e` as CI runs it, floor 99.9 | exit 1 (and the `::error::` line) |
| restored | 99.26 %, exit 0; `git diff` shows the three files as they were |

Cost: the cold run of the step (nothing built for instrumentation) is 8.5 s on this machine (8 cores), 11.8 s pinned to two cores; the warm run is 8 s (the tests take 0.13 s; the rest is building the dependencies and the crate with instrumentation, in `target/llvm-cov-target`). The install of the prebuilt binary is seconds. Expect 20 to 40 s on a runner for the two steps (not measured on a runner: the pull request is the proof). No change to the cache: the `Build` job does not cache `target/` of the kernel today.

## V-H: mutation score (cargo-mutants on a scratch copy, nothing committed)

`cargo-mutants` 27.1.0 (`cargo install --locked --version 27.1.0`; `binstall` cannot read its edition-2024 manifest), on a copy of the kernel in the scratchpad (the two JSON files the tests include were copied beside it and the paths changed in the copy; `-j 4 --timeout 60`). Every file of the kernel with production code was mutated: 1,016 mutants, 945 viable. Score = killed (caught + timeouts) / viable:

| file | viable mutants | killed | score | missed |
|---|---:|---:|---:|---:|
| `patch.rs` | 83 | 83 | **100 %** | 0 |
| `facet.rs` | 213 | 203 | **95.3 %** | 10 |
| `compare.rs` | 270 | 254 | **94.1 %** | 16 |
| `lib.rs` | 379 | 356 | **93.9 %** | 23 |
| **all** | **945** | **896** | **94.8 %** | **49** |

(`cargo-mutants` ran four passes: the first, on `facet.rs` and `patch.rs`, found 15 survivors in `facet.rs`; the tests were strengthened where the survivors were in code this run tested; the whole of `facet.rs`, `compare.rs` and `lib.rs` was mutated again, 929 mutants in 35 minutes, and the figure above merges the later passes over the functions that were re-run. Nothing could not be finished.)

The ABI functions are `unsafe fn` and `cargo-mutants` does not mutate them (one mutant, `alloc`, caught); so seven hand-made mutants of `respond`, the five wrappers, `states` and `dealloc` were applied to the copy: six are killed by `abi_tests.rs` (the answer, the error text, the wrapped function, the seven words); the seventh, `dealloc` that no longer frees, is a leak, and no test can see it.

Weak spots, named (survivors that remain):

- `facet.rs`: the fast path `subtrees_of` (7 mutants: replacing it by `None` gives the same output by the slow path, so they are equivalent, an optimization; the tests assert both paths agree, they cannot tell which ran), `References::is_empty`, the guard `*i < a.len()` of `remove_at` (unreachable), `literals` (`&&` to `||`, equivalent for any input `closing_bracket` lets through).
- `compare.rs`: `says_something` (2), the arithmetic of the composed chain in `compose` and `stands_for` (`last - 1` to `last / 1`, 6: the chain tests do not tell the plateau above from the target when both hold the element and say the same), `entries` (2), `close_descriptions` (5, the bounds of the distance between descriptions). These are the code of waves 016 and 017; this run's chain tests killed the survivors they could (`entries` and `compose` were 17 survivors before the late tests, 10 after).
- `lib.rs`: the equality and order of `QSet` and `Rel` (5: they feed sets whose order no output shows), `level_down` (2), `mark_expandable` (3), `groom` (2), `open_down` (3 timeouts), `apps_above` (3), a few `&&` in `keep_the_flow`, `keep_changes` and `local_dependencies`.

A package with high line coverage and a low score from tests written here: none. The lowest score is 93.9 % (`lib.rs`), over code whose tests are older than this run.

## Gates run before the end

`cargo test` (kernel): 268 passed. `(cd src/main/rust/viewpoint-kernel && cargo fmt --check && cargo clippy --all-targets -- -D warnings)`: exit 0. `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0 (the `.wasm` did not move: 794,741 bytes, sha256 the same as `HEAD`; nothing in `src/main/wasm` or `standalone.html` changed). The coverage command: exit 0, 99.26 %. `./mvnw verify -DskipITs=false` (JDK 25): exit 0, 1492 unit tests (2 skipped, as before), 39 integration tests, the Java coverage floors hold. `npm run format:check` and `npm run lint`: exit 0. `npm run test:unit`: 2576 of 2576. `scripts/byte-identity.sh --no-build`: 20 workspaces, 332 commands compared, 330 identical, 1 accepted by the exceptions file (the harness's self-check), **0 unexpected** (the kernel's production code is untouched, so this is the expected result; the V-D conformance tests of the Java and node suites pass with the `.wasm` as committed).

## Findings of the run (for the wave, not written into its files)

1. **Inline test modules inflate a coverage figure, and the floor with it.** Any Rust file of this repository that ends in `mod tests { ... }` counts its own lines: 98.28 % against 97.37 % here. The wave's node floor (W-10) has the same trap in another form: the figure must be of the page's script and not of the tests.
2. `cargo-mutants` does not mutate `unsafe fn`, which is the whole C ABI of the kernel: its tests were checked by hand (seven mutants) and a leak in `dealloc` is invisible to any test.
3. `cargo binstall` 1.x cannot read the manifest of `cargo-mutants` 27.1.0 (edition 2024): install it with `cargo install --locked`. The coverage tool is installed in CI by `taiki-e/install-action` and needs `cargo install --locked cargo-llvm-cov --version 0.9.1` (or `cargo binstall`) on a machine.
4. No bug in the kernel's behaviour was found. Two behaviours that tests pinned and the author may want to look at, not changed: a `replaces` entry on an element of the target that the plateau above still holds (`w` replaces `y`, while `y` stays) is told as "is not an element of the base plateau, ignored" and `w` is `new`; and five invalid entries of one `replaces` give five identical warnings (de-duplication happens in the host).
5. Dead code shown unused: none deleted (the source is unchanged but for the test modules moving out): the 27 uncovered lines are guards, listed above.

## Not verified

- The CI run on a real runner: the step names, the install by `taiki-e/install-action@v2.87.26` with the checksum of the manifest, and the time of the two steps (the pull request is the proof). The install was checked as far as the manifest at the tag goes, and `cargo-llvm-cov` 0.9.1 itself was installed locally with `cargo binstall` (the same prebuilt file the action downloads).
- The mutation score of `Option`-heavy paths the tests of the kernel reach only through the host (the Java and node conformance suites mutate nothing here).

## Canonical impact

Canonical text changed: CLAUDE.md "Build & Test" (the coverage command with its floor, the CI step it is, the install, and one paragraph: where the kernel's unit tests live, why they are out of the source files, what stays uncovered), `.github/workflows/ci-build.yaml` (two steps in `Build`), `src/main/rust/viewpoint-kernel/rust-toolchain.toml` (`llvm-tools-preview`). No architecture-level impact: no component, contract or flow changed; the kernel's production code is untouched (`embed.sh --check` and the byte-identity sweep show it), its test modules moved to `src/*_tests.rs`.
