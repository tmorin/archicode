---
type: run
run: 0120
status: completed
wave: 017
---

# Run 0120: remove-buttons-address-the-file

Wave 017 (`editor-defects-and-composed-replaces`), item W-2 (phase P0). Focus: the Remove button of a qualifier, an application and a use removes the item it sits on, whatever the list holds (GitHub issue #120).

Document profile: `single-document`, as the runs of wave 016. The change is one helper and three handlers in the page; a prd/tdd/pln would only copy the brief. The review passes are answered below.

## Scope

In: `src/main/resources/editor-webapp/standalone.html` (the three `remove-*` handlers and one helper), a new node test `src/test/javascript/viewpoint-kernel/remove-buttons-address-the-file.test.js`, `CLAUDE.md` (one sentence).

Out: the manual (`src/doc/README.adoc` line 1493 teaches the defect: W-9), the command line (it never had the defect: it reads no form), relationships (fixed in run 0108, #105), `remove-replaces` (the `replaces` list is not filtered: the record holds it as the file does).

## The defect, reproduced on HEAD

Since run 0092 (#80) the page leaves an item with no value out of `qualifiers`, `applications` and `uses` of a record. The form draws one pill per item with a value and numbers the Remove button by that pill (`data-index`, the place among the pills drawn); the handler spliced `node.<list>` at that number, and `node.<list>` is the list the edit is made on, which may still hold the items with no value. A manifest `qualifiers: [null, a, ~, b, c, null]` draws `a`, `b`, `c` (0, 1, 2); Remove on `c` (2) spliced place 2 of the file's list, which is `~`, and `c` stayed. The new test `remove-buttons-address-the-file.test.js` fails on HEAD (6 of its 7 tests: the three Removes, the layered one, the helper's and the one that reads the file written; run against the page of HEAD) and passes after the fix; the test that has no item with no value passes before and after.

## Decisions

- **D1. The button keeps the place among the pills drawn; the handler counts.** The issue proposed either keeping the places of the items in the record (as `fileIndex` for a relationship, #105) or counting the items with no value before the index. The first was tried and fails in a workspace with plateaus: the edit of an element of a layered workspace is made on a clone of the node the plateau *resolves* (`planLayerElementEdit`, `resolvedNodeOf`), whose lists do not hold the items with no value, while the record of an element a plateau declares is read from the file; a place in the file then points beyond the resolved list and the edit changes nothing (the layered test caught it). So `withoutNthPresent(list, n)` removes the `n`th item that has a value, in whichever list the edit is made on: the same item in the manifest's list and in the resolution's. The items with no value stay where they are. No new key on the record.
- **D2. One helper, three handlers.** `remove-qualifier`, `remove-application` and `remove-use` call it; `remove-use` still takes the key out when the list is empty. Nothing else changes: not the markup, not the other handlers, no `modelsChanged()` needed (the commit is the one every edit made).
- **D3. A list with no item with no value is written as before.** `withoutNthPresent` of such a list is `splice(n, 1)` of its copy, the same list the handler built.

## Tasks

- [x] T1. Reproduce on HEAD: `remove-buttons-address-the-file.test.js` (the real click, `handleAppClick`, on a list `[null, a, ~, b, c, null]`; for applications and uses likewise; in a workspace with plateaus, drawn at the root and at a plateau that inherits the list).
- [x] T2. Fix: `withoutNthPresent` and the three handlers.
- [x] T3. `CLAUDE.md`: the sentence that said the buttons still address the file by the position drawn.
- [x] T4. Gate commands, the byte-identity of a click on a list with no item with no value, one commit.

## Review pass

- KDMLLC read: one decision (D1) that says why the issue's first proposal was not taken; D2 and D3 only narrow.
- Open questions: none. Settled here: whether the resolved node of a plateau holds the items with no value (it does not: the layered test is the proof).
- C scan against the code: `git grep -n "splice(index, 1)" -- src/main/resources/editor-webapp/standalone.html` finds `remove-replaces` and `remove-relationship` only; the first is a list the record keeps whole, the second is addressed by `fileIndex` (#105). The claim of `CLAUDE.md` about the buttons agrees with the handlers.

## Verification

- `./mvnw -o verify -DskipITs=false` (JDK 25, `PLANTUML_JAR`): BUILD SUCCESS, 902 unit tests and 21 integration tests, 0 failures (the page is not read by the Java tests but by the packaged build).
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 213 passed. `embed.sh --check`: the committed WebAssembly is the one the sources build (the kernel is not touched).
- `node --test "src/test/javascript/**/*.test.js"`: 1910 tests, 1910 pass (1903 before, plus the 7 of the new file). A first run, started while Maven was building, failed one test, `quiet-references.test.js` #81 (a 100 ms budget, measured at 122 to 127 ms under that load); alone it passes (8 of 8), and the whole suite re-run with nothing else running passes.
- `npx prettier --check "src/**/*.java"`: clean (no Java file is touched).
- Reproduction: the new test file run against the page of HEAD (`git show HEAD:`, a copy of the harness reading it): 6 of 7 fail, the seventh (no item with no value) passes; against this change 7 of 7 pass.
- Byte-identity of a list with no item with no value (page of HEAD against this change, same harness): the real click on every qualifier, application and use pill of the examples and fixtures that load in the harness (`domain_manifest_folders`, the layered Brightcart, `plateau-comparison`, `replaces-large-pair`: 313 clicks) gives the same files marked modified with the same SHA-1 of the text to save (5 of them are written at once in a workspace with no plateau; the others open the `layer-confirm` dialog, which writes nothing until it is answered, in both pages); and a manifest `qualifiers: [a, b, c] # three`, Remove on `b`, gives the same text from both pages (a block sequence, as before).

## Not verified

- The editor in a browser (the node harness drives the real handler with the DOM it has; nothing in the markup changed).
- The Native job: no Java class is added or removed, `reflect-config.json` is untouched.

## Canonical impact

`CLAUDE.md` changes: the paragraph on how both tools read what is empty or odd said the Remove button of a qualifier, an application and a use still addressed the file by the position drawn (#120); it now says what the handler does. The manual (`src/doc/README.adoc`, the list of limits, line 1493) and the `[[plateau-limits]]` list at the end of the *Layered plateaus* paragraph of `CLAUDE.md` still name #120 as open: W-9 removes both. No domain invariant changes.

## Findings

- F1. For **W-9**: `src/doc/README.adoc` line 1493 (*The Remove buttons of a qualifier, an application and a use address the file by the position in the list drawn (#120)*) goes; `CLAUDE.md` line 56 still lists #120 in `[[plateau-limits]]`.
- F2. A list written as a flow sequence (`qualifiers: [a, b, c]`) is rewritten as a block sequence by the line-preserving save when a Remove changes it, with or without items with no value. This is the writer's behaviour before this run (checked: the same text comes out of the page of HEAD), not a defect of this one; not filed.
