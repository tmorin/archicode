---
type: run
run: 0063
status: completed
wave: 012
---

# Run 0063: Brightcart editor look

Wave 012 (`brightcart-fixture`), item W-4 (phase P3). Focus: know what the editor does on a realistic four-plateau project, and have the document say what is verified and what is not.
Document profile: `single-document` (the scope arrives settled by the wave plan; the work is a look, a few issues and a document, one sequence). This file carries scope, decisions, canonical impact, review passes, tasks,
verification and findings.

## Scope

Serve the editor (`archicode editor serve`) on a copy of `src/test/resources/brightcart/folders` outside the repository, drive it in the built-in browser in light and dark: open each plateau, *Compare to* between the pairs of
section 10, read the Changes panel against `archicode diff`, one *Write replaces* and one *Move* then reverted, *Changes only*, the time of a render of the largest plateau. Each defect or surprise becomes a GitHub issue with a
reproduction on the fixture. Update `docs/fixtures/brightcart-spec.md` (sections 1, 4, 11, 12, 13, 15 and the front matter). No change to the editor.

## Decisions

- **D1. The look is DOM-level, not visual.** The browser pane was hidden for the whole session (`tabs_context`: "The Browser pane is currently hidden"; `requestAnimationFrame` never fired; every screenshot timed out). The
  counts, texts, structure and computed colours were read from the page; nothing is claimed as seen. The document says so (section 12 and 13) and keeps "a look at the screen is still to do".
- **D2. Copies, not the repository.** The server ran on a scratchpad copy of `folders/`; *Write replaces* and *Move* were saved to that copy, read back (`diff -ru` against the repository, `archicode diff` on the saved copy), and
  the copy was made again from the repository (`diff -r`: identical) after each. The repository's `src/test/resources/brightcart/folders` was never written.
- **D3. Four issues, grouped by subject, none fixed here.** None is a few-lines fix in the editor page: #68 needs a kernel contract decision or a pruning that asks the kernel what a facet removes; #69 is a layout choice;
  #70 a heuristic; #71 a panel feature. They are filed, not fixed (the wave plan: "or a fix with a test if it is a few lines").
- **D4. The brightcart README is corrected** (one sentence, E1 "stops today"): it was false after run 0062. Outside `likely_paths`, reported.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet): a document and a README sentence.

## Review passes

- **KDMLLC (inline).** K: one table and a list in section 12, one bullet per limit in section 13. D: the numbers are those of `expected/`, quoted once in the table of results; the E1 entry says the cause once. M: section 12
  says what is verified and what the look showed, section 13 what is not. L: no new section. U: each limit says what was and was not done. C: see the C scan.
- **C scan.** Wave plan W-4 against what exists: *each plateau opened* (done, both themes); *Compare to between the pairs of section 10* (P1, P2, P3, P5, P6 and the mirror of P1, counts equal to `diff`; P4 has no pair);
  *Write replaces* and *Move* done and reverted (D2); *Changes only* (done); *time of a render* (done, JS side only, D1); *issues with a reproduction on the fixture* (#68 to #71); *sections 12 and 13 updated* (results a tool
  verifies, E1 fixed with its commit, what the look showed, the limits that remain). The gate's wording "which results a tool now verifies (P1, P2, P3, P5 by `diff`...)" is met and extended to P6 (the tool's reading).
  Claim "the facet `without-cart` selects nothing in `saas`" corrected to "in the elements, not in the bytes" (run 0061 F4).

## Tasks

- [x] T1. Read the wave plan, the document, the fixture README and expected/, runs 0060 to 0062, the manual's editor sections.
- [x] T2. Rebuild the jar, serve the editor on a copy, open the four plateaus in both themes.
- [x] T3. Compare to the pairs; read the Changes panel against `diff`; candidates, warnings; Deep views; facets.
- [x] T4. *Write replaces* and *Move*, saved and read back, reverted.
- [x] T5. *Changes only*; timings.
- [x] T6. File the issues (#68 to #71).
- [x] T7. Update the document and the README.
- [x] T8. The five commands on the final tree (see Verification).

## Verification

On the final tree (documents and one README sentence changed; no Java, Rust or JS touched), JDK 25, `PLANTUML_JAR=plantuml-1.2024.7.jar`, 2026-10-17:

- `./mvnw -o verify`: BUILD SUCCESS, 412 tests, 0 failures (integration tests skipped by default), 8 min 55 s.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 173 passed, 0 failed.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (655569 bytes)", exit 0.
- `node --test "src/test/javascript/**/*.test.js"`: 970 tests, 970 pass, 0 fail (the flaky test of #66 did not fail).
- `npx prettier --check "src/**/*.java"`: clean.
- `node src/test/resources/brightcart/generate.mjs` after the README edit: `git status` shows only the README changed (the generated files are byte for byte the committed ones).
- The look: the server (pid 780529, port 48123) was stopped by pid; the browser tab was closed; the viewport and colour scheme emulation were reset.

NOT verified: nothing was seen on a screen (D1); the native image was not built; other browsers; the published editor page; the Library page of a view or a story (the fixture has none); the saves of all 122 files by the editor in
the browser (they are read by the node tests, not by the look).

## Findings

- **F1. #68** an element opened (*Unfold all*), pinned or hidden on the Map and removed by a facet turns the Map into `dangling reference: <ref>`: the kernel's `map` checks `opened`, `pinned` and `hidden` against the elements
  left after the facet; the editor passes its lists unchanged. The command line is not affected.
- **F2. #69** the header does not wrap with four plateaus of ordinary names; the document is 1274 px wide, so `Compare to` is off screen below about 1275 px.
- **F3. #70** between two sibling plateaus (P5) the candidates with the single reason `parent` propose the two node pairs that are alternatives (`commerce-live` and `tax-live`); the same pair is a real swap in P1.
- **F4. #71** the panel of a removed node lists no applications; and, a consequence of run 0062's decision, the *Before* of `staging.vm` in P2 lists `commerce.cart-store` (the replacing element), as `diff` does
  (`applications: -commerce.cart-store`).
- **F5. For the wave.** Issue #67 is still open on GitHub (the commit says `Fixes #67`; it closes when the branch merges). The editor and the command line agree on every count read (P1, P2, P3, P5, P6, the mirror of P1, the
  warnings 7 and 1, the 2 candidates of P5). The editor's *Compare to* list needs an `input` event, not only `change`, when driven from a script (a test-harness remark, not a defect).
