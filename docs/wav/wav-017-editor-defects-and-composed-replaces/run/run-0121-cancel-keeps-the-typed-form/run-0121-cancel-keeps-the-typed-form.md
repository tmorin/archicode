---
type: run
run: 0121
status: completed
wave: 017
---

# Run 0121: cancel-keeps-the-typed-form

Wave 017 (`editor-defects-and-composed-replaces`), item W-3 (phase P0). Focus: cancelling a dialog opened by saving the form of an element (`layer-confirm`, and `rename-siblings` since run 0113) gives the form back as typed, or #123 is closed with the reason that it never happened (decision T2 of the wave plan: reproduce first).

Document profile: `single-document`, as the runs of wave 016. One defect in one file of the page, with its test; a prd/tdd/pln would only copy the brief. The review passes are answered below.

## Scope

In: `src/main/resources/editor-webapp/standalone.html` (`openAppDialog`, `guardedLayerWrite`, `render`, `resetUiState`, the confirm branch of `submitAppDialog`), the new test `src/test/javascript/viewpoint-kernel/cancel-keeps-the-typed-form.test.js`, `CLAUDE.md` (one sentence in the paragraph on the rename dialog).

Out: the manual (W-9 of this wave), the kernel, the command line, a refused write (`Not written: ...`), which also redraws the form (see Findings), any other dialog.

## Reproduction (T2)

Real, and worse than the issue says. Seen in the built-in browser, on the HEAD page (the jar of `target/quarkus-app`, whose embedded page is byte for byte `standalone.html` of HEAD), `archicode editor serve` on a copy of the layered Brightcart, page Elements, *Mail provider* (`mailer`), *Edit*:

1. Typed a new id (`mailer2`), a new name (`Typed name`) and text appended to the description, clicked *Save all changes*.
2. The dialog `layer-confirm` opened ("Writing in baseline changes other plateaus", 3 plateaus inherit it). Behind it the fields already read `mailer`, `Mail provider` and `Delivers transactional mails.`: the typed values were gone **when the dialog opened**, not only on Cancel. Read with `document.getElementById('edit-id-input').value` while the dialog was up: `mailer`.
3. *Cancel*: the form was the model's, nothing typed was left, and the Save button was dimmed again.

Cause: `writeElementDraft` → `commitElementEdit` → `guardedLayerWrite` tries the write (`spec.write()` ends in `rebuildIndexAndRender`, a redraw), sees that other plateaus change, puts everything back (`restoreWriteState`, `rebuildIndexAndRender`, a second redraw) and only then opens the dialog (`openAppDialog` → `render()`, a third). A redraw gives every field afresh from the model and the page kept no copy. `rename-siblings` is opened earlier, by `commitElementWithDraft` before any write, so only the redraw of `openAppDialog` loses the values there; the harness reproduces it too (the first version of the new test, on HEAD, finds the model's values behind and after the dialog for both kinds).

## Decisions

- **D1. The page keeps what was typed while the dialog is open, as view state.** `keptElementForm` holds the reference and layer of the element in edition and, for every `input`, `textarea` and `select` of `.element-edition-form` in drawing order, a signature (id, class, the `data-index` of its relationship row, placeholder) and its value (`checked` for a checkbox or radio). So it holds whatever the form holds: id, name, description, the new-qualifier box, the new-tag key and value, the relationship rows, the `replaces` field. No model, no `modelsChanged()` (the test measures `modelVersion` across Cancel).
- **D2. Taken before the write is tried.** `openAppDialog` takes the copy for the two kinds (`layer-confirm`, `rename-siblings`), but for `layer-confirm` the form was redrawn twice by then, so `guardedLayerWrite` takes it first (`keepElementForm()`) and hands it over as `typedForm` on the dialog it opens; `openAppDialog` consumes the key. Any other dialog takes none; a form not in edition takes none.
- **D3. `render()` puts it back.** `restoreElementForm`, right after the page is drawn (before `autosizeAllTextareas`), writes the kept values into the fresh fields when the selection is still the same element in the same mode and layer, the number of fields is the same and each signature matches, and lights *Save all changes* (`draftTyped = true`, `refreshSaveAllButton`) when a value differed. It runs on every redraw while the dialog is open, and one last time when it is gone (the redraw of `closeAppDialog`: Cancel, Escape and a click beside the dialog all end there); it clears the copy itself when no dialog is open.
- **D4. A yes drops the copy before the write** (confirm branch of `submitAppDialog`): the write is the draft read before the dialog opened (`draft.apply` in the closure), never reread from the form, so what is written is unchanged and the form drawn after a rename is not given the old id back. `resetUiState` (a folder opened) drops it too.
- **D5. Not done.** A refused write (`Not written: ...`, an error of `writeElementDraft`) still redraws the form from the model; so do the other redraws a write makes. It is the same family but not what #123 asks (a dialog), and a refusal opens no dialog to cancel; reported for the wave.

## Tasks

- [x] T1. Reproduce #123 in a browser on HEAD (above).
- [x] T2. Page: D1 to D4.
- [x] T3. Test `cancel-keeps-the-typed-form.test.js` (8 tests): `layer-confirm` Cancel (the form behind the dialog and after it, the Save button lit, the copy gone), nothing written and a second Save asks the same question, Escape and a click beside the dialog, a yes still writes the typed values and keeps no copy, `rename-siblings` Cancel (id, name, description, the new-qualifier box; the element is not renamed), *Rename anyway* renames and the old id does not come back, the copy is view state (no `modelVersion` change; another element's form does not take it), another kind of dialog or a form in view mode keeps nothing. The harness has no DOM, so the test gives the page a small one (a form redrawn from the model each time `#app`'s innerHTML is assigned) and a browser that can open a folder (`render()` draws the landing card otherwise).
- [x] T4. `CLAUDE.md`.
- [x] T5. Gate commands, the file check, the browser check on the new page, one commit.

## Review pass

- KDMLLC read: one mechanism for both dialogs; the signature is the only matching rule and a mismatch restores nothing (it never writes a value into a field it cannot name). K: no new action, no new dialog. D: one copy, one restore function, called from `render()` only. C: the copy is per dialog (taken at its opening, cleared at its end), not a second source of truth for the model.
- Open questions: none left. Settled here: whether `rename-siblings` loses the typed values at all (it does, by the redraw of `openAppDialog`: the test on HEAD), and whether to keep the form or give up the redraw behind the dialog (the redraw is what draws the dialog; keeping the values is the smaller change and also keeps the page behind the dialog as typed).
- C scan against the code: `git grep -n "keptElementForm\|typedForm" -- src/main` lists the places of D1 to D4 (the declaration, `openAppDialog`, `guardedLayerWrite`, `restoreElementForm`, the confirm branch, `resetUiState`) and nothing else; the only caller that passes `typedForm` is `guardedLayerWrite`.

## Verification

- Browser (the built-in browser, `archicode editor serve` on a copy of the layered Brightcart, the jar rebuilt by the gate): the same steps on the new page. With the dialog open the form behind reads `mailer2` / `Typed name` / the description with the typed text; *Cancel*: the dialog is gone, the three fields are as typed, *Save all changes* is lit (`disabled: false`), no manifest is dirty; *Save all changes* then Escape: the same; *Save all changes* then *Write in baseline*: the element is renamed to `mailer2` with the name written, five manifests are dirty (the same files a rename of `mailer` changes), `draftTyped` is false, the copy is null. `rename-siblings` was not driven in the browser (it needs a fork of the Brightcart); it goes through the same `openAppDialog`/`restoreElementForm` and is covered by the node test.
- `./mvnw -o verify -DskipITs=false` (JDK 25, `PLANTUML_JAR`): BUILD SUCCESS, 902 unit tests and 21 integration tests, 0 failures.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 213 passed. `embed.sh --check`: "the committed WebAssembly is the one the sources build". `npx prettier --check "src/**/*.java"`: clean.
- `node --test "src/test/javascript/**/*.test.js"`: 1918 tests, 1918 pass (1910 before, plus the 8 of this run), run alone after Maven.
- The new test on the HEAD page (`git stash` of `standalone.html`): 8 fail; the Cancel, Escape, click-beside and `rename-siblings` Cancel tests fail on the behaviour (the typed values are not there behind the dialog nor after), the others on the missing `keptElementForm`.
- Files written by the editor, byte for byte: a script (`written.js`, scratchpad) drives the layered Brightcart through the page with the fake form, on HEAD and on this page, saves, and compares every file the in-memory folder holds. Three cases: a name, description and id typed on `mailer` then *Write in baseline* (`layer-confirm`, five manifests written); an id and a name typed on the fork's `commerce` then both dialogs said yes; a name typed, Cancel, saved again. The first two outputs are identical on both pages; the third differs in the one way it should: on HEAD the second save found the form as the model and wrote nothing, on this page it writes the typed name.

## Canonical impact

`CLAUDE.md` changes: one sentence after the paragraph on the rename dialog (*Rename anyway*, *Cancel*) saying both dialogs leave the form as typed on Cancel, how (`keepElementForm`, `restoreElementForm`, `typedForm`), that it is view state, and that a refused write still redraws the form. No domain invariant changes (no model, no manifest, no kernel, no command line touched). The manual says nothing on it; W-9 decides whether a line belongs in the editor chapter (`[[editor-rename]]`).

## Findings

- F1. #123 was real and larger than written: the typed values are lost when the dialog opens, so the dialog is drawn over an already reset form for `layer-confirm`, and Cancel only leaves it so. The issue's guess (that `closeAppDialog`'s `render()` is the cause) is half of it.
- F2. For **W-9**: the manual line 1495 of `src/doc/README.adoc` (*Cancelling a dialog may drop what was typed* (#123, not verified in a browser)) and the `[[plateau-limits]]` list of `CLAUDE.md` (lines 50 and 56 name #123) teach the defect; they must say it is fixed (both dialogs give the form back as typed), with the one limit that stays (a refused write redraws the form, F3). The sentence this run adds to `CLAUDE.md` already says it.
- F3. Not fixed, of the same family: any `Not written: ...` refusal of `guardedLayerWrite` and an error of `writeElementDraft` redraw the form from the model, so the typed values go with the sentence. Worth an issue if the author wants it (the same `keepElementForm`/`restoreElementForm` would carry it; it needs a rule for when the copy is dropped).
- F4. Not verified: `rename-siblings` in a real browser, the Native job (the page is not part of it), a form with a `select` or a checkbox (the form has none today; the copy handles them but nothing exercises it).
- F5. Files outside `likely_paths`: none but this run's own document.
