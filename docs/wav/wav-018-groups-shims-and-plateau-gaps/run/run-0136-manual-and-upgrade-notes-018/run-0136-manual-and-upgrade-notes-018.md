---
type: run
run: 0136
status: completed
profile: single-document
wave: 018
---

# Run 0136: manual-and-upgrade-notes-018

Wave 018, W-9. The manual (`src/doc/README.adoc`), the tutorial and `CLAUDE.md` say what the tools do at the end of this wave, with one block that lists the breaks. No code changed.

## Scope

1. The block "What changes for a reader who knows 0.16.0" in `[[plateaus-upgrade]]`: Breaking (the group, the camel-case facet keys, the Jayway dialect, the old editor routes), each with the sentence the tool prints and what to write; then `stories generate`, the new dependencies, the delete of a plateau in the middle, *Write replaces* that refuses, the folded key and the form kept, the numbers.
2. The passages that taught what is gone or not yet built: groups (`[[manifest-kinds]]`, `[[nesting]]`, the editor's write and move rules), the Jayway warning of `[[facets]]` and of the list of warnings, the old routes and `#/plateaus`, the dependencies of a deployed application, `[[editor-plateau-delete]]` and tutorial step 10, `[[editor-replaces]]`, `[[editor-compare]]` (the key), `[[editor-rename]]` (the refused write), `[[editor-small-screen]]`, `[[plateau-limits]]`.
3. A section `[[stories-generate]]` in the commands, and the stories chapter that said the command line draws no story.
4. `CLAUDE.md` and `docs/fixtures/brightcart-spec.md`: the final state.

## Decisions

- **Release notes.** The repository keeps none in a file (no CHANGELOG, no `RELEASE`; the GitHub releases are written at the tag), so the block of the manual is the one place that lists the breaks, as it did for 0.15.0 and 0.14.0.
- **Placement.** The new block comes before "0.15.0" in the same descending order. The two stale sentences of the older blocks (the group kinds "refused: write an element of kind `group`", the camel-case spelling "still read") say what was true then and point to the new block.
- **Quoted lines.** Every `error:` line and table of the new text was run on the jar of this tree on copies in the scratchpad (a system with `kind: group` in a manifest and in `workspace.yaml`, an old header kind, `hideUnlinked`, `globalEnabled`, `directoryNameTemplate`, `jsonPath`, `anyof`, `== null`, `noneof`, `id: 010`, `.inf`, `stories generate` on `domain_plateaus` and on the layered Brightcart with `fork_tour`, an unknown `--story`). The `!= null` form and the sentence of *Write replaces* are not run here: the first is the same code as the others, the second is the editor's (run 0131, a node test).
- **#25 and #29** stay in `[[plateau-limits]]` as facts, without issue numbers and said to be not planned (the author closed them, review of the orchestrator); the pointers to `[[plateau-limits]]` for the technology map dependencies, *Write replaces* and `--output` now point to `[[using-environments]]`, `[[editor-replaces]]` and `[[manifests-folders]]`.
- **#24 and #65** are not in the manual (it never named them).

## What changed

- `src/doc/README.adoc`, `CLAUDE.md` (the paragraph that lists the manual), `docs/fixtures/brightcart-spec.md` (the row of the negative cases).

## Verification

- Identity: the 15 shipped examples of `src/doc/examples` generated with the jar of `archicode-0.16.0` and with the jar of this tree: `diff -r` empty, same exit codes (the four that exit 1 have no `workspace.yaml` of their own, as before).
- The manual builds (`asciidoctor:process-asciidoc`, `target/generated-docs/index.html`); the quoted lines render as one `code` element.
- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 1093 unit tests (2 skipped), 26 integration tests, build success. `cargo test`: 230 passed. `embed.sh --check`: clean. `node --test`: 2197 of 2197. `npx prettier --check "src/**/*.java"`: clean.

## Not verified

A real browser (no editor behaviour changed; the text of the editor passages comes from the run documents and `CLAUDE.md`); the Native job.

## Canonical impact

`CLAUDE.md` names the new anchors; nothing else.
