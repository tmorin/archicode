---
type: run
run: 0082
status: completed
wave: 014
---

# Run 0082: Editor writes layers

Wave 014 (`layered-plateaus`), item W-8 (phase P2). Focus: edit a plateau and its changes from the editor, and have only the intended lines written.

Document profile: `single-document`, as runs 0075 to 0081. The one design fork that needs a recorded decision, which operator an edit becomes (`SET`, `ADD`, `MERGE`, `SET` with `where`) and what happens to a patch the plateau already has, is a decision with a rejected alternative, written below; a TDD would restate it and a pln would restate a short task list. The review passes are kept (KDMLLC, C scan, open questions) and answered in this file. There is no prd, tdd or pln: the task list below is the plan, and its state is the state of the run.

## Scope

In (the W-8 row of the plan, the third criterion of the gate of P2, and the brief):

- A plateau is created (a successor) and has its name, horizon and parent edited, written in its manifest of kind `archicode.morin.io/plateau`; the band says _writing in: <plateau>_.
- An element added in a plateau is a manifest whose header says `plateau: <plateau>`; so are a new view and a new story (run 0081 noted they were written with no header).
- A field of an inherited element is a patch of the plateau; a second edit of the same target and field changes that patch; a value a patch set is edited in that patch; removing an inherited element is a `REMOVE`; `MOVE` and a rename of an inherited element are refused with one sentence.
- A patch written by hand with a free `json-path` is shown (origin text) and not edited field by field: the editor refuses with a sentence that names the patch.
- Editing baseline, or any plateau that other plateaus stand on, asks first and lists the plateaus it changes.
- Every write goes through the line-preserving save and is kept only if the resolution (the kernel's `apply_patches` over the chain) gives back the edited value; otherwise one sentence and nothing is written.
- The read-only rule of run 0080 (`writesRefused`, `WRITE_ACTIONS`) is lifted for the plateau being written, action by action; what this run does not support stays refused (below).
- A workspace with no plateau, and one that lists `settings.plateaus`, save exactly as before.

Out: deleting a plateau (#93), a patch that takes a field out (#94), the old selector and *Compare to* (W-10), removing `settings.plateaus` (W-9).

## The design fork: what an edit of a field becomes

The page holds, for each plateau, its resolved graph (run 0080). An edit is made, as ever, by a mutator function over the content node of an element (`commitElementEdit(reference, mutatorFn, layer)`). In a layered plateau that function cannot be run on the manifest of an inherited element: it is the file of another plateau.

- (a) **Try the mutator on a copy of the element as the plateau resolves it, take the fields it changed, and write each where it belongs** (`planLayerElementEdit`): the field goes to the manifest that declares the element when the plateau declares it and no patch of the plateau sets the field and the file says what the resolution says; to a patch of the plateau otherwise. The operator is chosen from the value the field has now and the value it must have (`patchFor`). Chosen: every writer of the page already goes through `commitElementEdit` (six callers), so the rule is in one place; the resolution is the kernel's, so what is written is checked against it.
- (b) Write a patch for each call of each writer (a different code for qualifiers, tags, relationships, applications, uses, replaces and the form). Rejected: seven writers, seven operator choices, and each has to know what the plateau already sets.

**The operator** (`patchFor`; the value the field has now is `before`, the one it must have `after`; each case is a test of `editor-writes-layers.test.js`):

| the edit | operator |
|---|---|
| a text, a number, a list that loses or reorders items | `SET` of the whole value |
| a list that gains items at its end (qualifiers, relationships, applications, uses, replaces) | `ADD` (the item, or the list of items) |
| one relationship changed in place, found by (destination, label) among the relationships it had | `SET` with `where` and the fields that changed |
| an object (tags) that keeps every key it had | `MERGE` of the keys that are new or changed |
| an object that loses a key | `SET` of the whole object |
| a list or an object emptied | `SET` of `[]` or `{}` |
| a scalar taken out | refused: a patch sets a value (#94) |

A relationship that is removed or reordered is a `SET` of the list (the kernel has no operator for one entry). `where` finds the relationship by the destination and label it had, and a label absent is none.

**What happens to a patch the plateau already has** (`writePatchChange`):

- none on (target, field): one is added at the end of the patches;
- one `SET` of the whole value: it says the new value, and is taken out when the field is back to what the plateau above gives it (the value without that patch is resolved again with `resolveLayerStep`);
- one `ADD`, `MERGE` or `SET` with `where`: it is changed when the edit is of its kind (the items an `ADD` has gain the new one; the `where` of a relationship that was relabeled is still found), taken out when the field is back to its base, and otherwise a patch for the edit is added at the end;
- several (a relationship added, another relabeled): none is rewritten; the last one takes an edit of its kind (`absorbIntoPatch`), else a patch is added at the end.

A new patch is always written at the end of the patches, never between two: the line-preserving save keeps a comment above the line below it, so a patch put in the middle would take the comment of the next one (found by a test, run 0082). A flow list or map that an edit changes becomes a block, as everywhere in the editor.

**The rule that makes it safe** (`guardedLayerWrite`): the write is made on the manifests in memory, every plateau is resolved again, and it is kept only if (1) the plateau written gives back the value that was edited, (2) no plateau that resolved is refused now and no new mistake appears in the tree or in a plateau, (3) the plateaus other than the one written whose graph changed are listed and the author said yes. Otherwise `snapshotWriteState` puts back every manifest (text, content, mark), the list of files, the removals and the marks of what is modified, and one sentence says why.

## Decisions

Given by the wave plan: D1 to D5, A1 to A9. None of the assumptions failed when tried (A3: `target` selects one node, which is how patches are found again; A4: the operators above are the ones the kernel has; A9: a patch of a plateau may touch what the plateau adds, and an element a plateau declares whose field a patch of that plateau sets is edited in that patch). Decided here (none contradicts the plan; each is pinned by a test of `editor-writes-layers.test.js`):

- **D1. A write goes to the plateau drawn; a workspace that is not layered is not touched by any of it.** `writingPlateau()` is null for a workspace with no plateau, one with `settings.plateaus`, and one whose plateaus are blocked by a mistake of the tree; every new rule starts with it.
- **D2. A write is refused only for what cannot be written, per action.** `readOnlyPlateauMessage()` is now null unless the kernel refused the patches of the plateau (no graph to edit). `WRITE_ACTIONS` stays the list of the clicks that write; `layerActionRefusal` says which are not available outside baseline: only `legacy-move` (it writes the views and stories of workspace.yaml as manifests of baseline).
- **D3. Views and stories belong to the plateau that declares them.** A new one says `plateau:`; editing, removing or adding a step to one another plateau declares is refused (`entryWriteRefusal`: a patch cannot change a view or a story, #86). They are not asked about when edited in a plateau that has plateaus on top of it: they change no resolved graph, and the Stories page says whose they are.
- **D4. Where a new manifest goes.** In the folder of a manifest the plateau already has (of the same layer for an element), which is a folder the command line reads; else the first folder of `manifests.paths`. A new plateau manifest is `plateau.<id>.yaml` in that first folder.
- **D5. A plateau that exists through headers only gets a manifest when it is written** (a patch, a name): `ensurePlateauManifest`.
- **D6. A rename or a move of an element a plateau declares works as in baseline, and the patches follow it** (`rewritePatchReferences`: the `target` of a patch, the relationship it finds with `where` or adds, the references an `applications` or `uses` patch lists), as do the `replaces` entries that name it (layered workspaces only). A `json-path` is not rewritten; a plateau it no longer selects in is refused by the rule above.
- **D7. Deleting an element a plateau declares takes out the patches of that plateau that name it** (`prunePatchesNaming`), since they would no longer resolve; a patch of another plateau that names it makes the delete refused, with the plateau and the patch.
- **D8. Creating a child of an inherited element is a manifest of the plateau with `header.parent`;** a child of an element the plateau declares is written in the file of its parent, as before. A `group` child of an inherited element is the `<level>-group` kind.

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet; the repository declares no register for it). `CLAUDE.md` carries the rule for the next reader (the paragraph of the band).

## Shipped files

CLAUDE.md asks the plan to name the test that loads each shipped form. This run ships no workspace, fixture or example. The layered Brightcart (`src/test/resources/brightcart/layered/`, loaded by the editor in `editor-writes-layers.test.js`, `editor-reads-layers.test.js`, `brightcart-layered.test.js`, `shipped-files.test.js`) is the workspace of its tests, copied in memory; what the editor writes on it (a new plateau manifest, patches, a new element, view and story) was also loaded by the command line (below: `plateau list`, `diff`). The page, `standalone.html`, is loaded by every node test.

## Tasks

- [x] T1. Read the plan, runs 0075 to 0081, the kernel's `apply_patches`, the layered fixture, the writers of the page.
- [x] T2. The guard: `writingPlateau`, `snapshotWriteState`, `layerDigest`, `judgeLayerWrite`, `guardedLayerWrite`, the dialog of the plateaus a write changes (`hard_judgment`, inline: it decides what is written and what is refused).
- [x] T3. The operator of an edit and the patch the plateau already has (`patchFor`, `writePatchChange`, `absorbIntoPatch`, `planLayerElementEdit`, `commitLayeredElementEdit`) (inline).
- [x] T4. Remove, create, move, rename in a layered plateau (`commitDeleteElement`, `commitCreateTopLevelElement`, `commitCreateChildElement`, `validateMove`, `rewriteInboundReferences`) (inline).
- [x] T5. Views and stories (`createManifestEntry`, `entryWriteRefusal`, the writers of stories and views).
- [x] T6. Plateaus: `commitPlateauCreate`, `commitPlateauEdit`, the form, the band (`bandWritingHtml`) and the Timeline page.
- [x] T7. `editor-writes-layers.test.js`, the two tests of `editor-reads-layers.test.js` that said read-only.
- [x] T8. The manual (*Writing in a plateau*), `CLAUDE.md`.
- [x] T9. The page driven in the built-in browser on a copy of the layered Brightcart, compared with the command line.
- [x] T10. Review pass (a `general-purpose` sub-agent, standard tier, read-only) and its fixes.
- [x] T11. The gate commands, the tests that fail on the old page, one commit.

Routing (Delegation Policy): T2 to T6 are `hard_judgment` and stay inline (they write the author's files). T7 and T8 are standard and were not dispatched: they are written from facts T2 to T6 settle. The review of T10 is the one dispatch.

## Review passes, answered

- **KDMLLC, C scan and defect hunt (a `general-purpose` sub-agent at the standard tier, read-only, on the diff, the plan, the kernel's rules and the tests; it also ran three randomised batteries of edits on the layered Brightcart, each time reloading the saved files and comparing every plateau's graph with the one in memory; 12 findings, one S1).** Applied:
  - **1 (S1)** deleting an element a plateau declares deleted the files of a plateau beside it that declares the same reference (and pruned its links), and the dialog listed that plateau as one that inherits it. A write now rewrites only the files of the plateau drawn and of the plateaus that stand on it (`writeScopeHas`, used by the delete, the rename, the move and the saved views and stories). Test: two plateaus beside each other that both declare `foo` and `foo.kid`.
  - **2 (S2)** the same scope made the rename and the move of such an element impossible (the plateau beside it was rewritten and then refused): fixed by 1, same test.
  - **3 (S2)** deleting an element that an `ADD applications` or `uses` patch of the plateau names was always refused: `prunePatchesNaming` also takes the references out of those lists (and takes the patch out when nothing is left to add). Test: `discovery.search` in marketplace.
  - **4 (S3)** a plateau that did not resolve after an edit was told as "has no element": it says the kernel's sentence now. **5 (S3)** a rename together with a field a patch of the plateau sets is refused up front, in one sentence. **7 (S3)** a `SET` with `where` that says what the relationship already says (relabeled and relabeled back) is taken out also when the plateau has several patches on the field. **12 (S3)** a plateau that was already refused is not compared by the wording of its sentence.
  - **8 (S3)** `Write replaces` is not under the guard (it writes the key on the new element, as in run 0080): `CLAUDE.md` says so instead of claiming otherwise. **9 (S3)** after the author says yes to a create or a move, the new element is the selection and the moved one is unfolded, as after the click (`afterConfirm`).
  - **10 (S3)** the tests that could not fail are replaced: the move of an element a plateau declares (with the plateaus that stand on it written and no other), the dead comparisons, and a refusal that happens after the manifests were changed (the delete that the guard refuses) compares the text, the content, the marks, the removals and the settings before and after.
  - **Not changed.** **6** a field set by a hand-written `json-path` patch is refused even to add a tag it does not touch: that is the rule of the plan. **11** a rename rewrites a flow `value: [...]` of a patch as a block: that is what the line-preserving save does with a flow collection an edit changes. The text typed in a form is lost when the author says no to the dialog of the plateaus an edit changes (the form is drawn again from the model): said under *Not verified*.
- **C scan.** The sentences of the refusals are the ones the tests pin; the manual (*Writing in a plateau*) was read against the code: the table of operators is `patchFor`, the list of refusals is the list of the tests, and `<<editor-writing>>` is the anchor the band, the Timeline page and the move section point at. The plan's A3, A4 and A9 held. No rule of the plan was set aside.
- **Open questions.** The plan leaves none to this run. Raised and settled: which operator an edit becomes (the fork above), whether views and stories ask first (D3: no), where a new manifest goes (D4), what a rename does to the patches that name the element (D6). Left to the author: deleting a plateau (#93) and a patch that takes a field out (#94).

## Refused, and not supported

- `legacy-move` (*Move to manifests*) outside baseline: one sentence.
- Rename or move of an inherited element: one sentence each (at the click and in the dialog).
- A scalar of an inherited element taken out (#94), a field a hand-written `json-path` patch sets, a view or story of another plateau, a plateau whose kernel refuses its patches: one sentence each.
- Deleting a plateau (#93), writing a patch with a free `json-path` or an `expect`: not offered (Files).

## Findings

- **F1. For W-10: the interfaces.** `writingPlateau()` (the plateau a write goes to, null when the workspace is not layered), `readOnlyPlateauMessage()` (now only a plateau the kernel refuses), `layerActionRefusal(action)`, `LAYER_UNSUPPORTED_ACTIONS`, `guardedLayerWrite(spec)` (`{ plateau, write, verify, confirmed, again, afterConfirm, summary }`), `commitElementEdit(reference, fn, layer, { live, confirmed, afterConfirm, allowReadOnly, record })`, `commitDeleteElement(ref, layer, affected, { confirmed })`, `commitCreateTopLevelElement(spec, { confirmed, afterConfirm })`, `commitPlateauCreate(spec)` and `commitPlateauEdit(spec)` (`{ id, name, horizon, parent }`), `openPlateauDialog('create' | 'edit', id)`, `bandWritingHtml()`, the dialog kinds `layer-confirm` and `plateau-form`, `writeScopeHas(mf)`. W-10 removes the old selector and *Compare to*: nothing here reads them.
- **F2. The file W-9 and W-10 convert.** A new plateau manifest is written as `plateau.<id>.yaml` in the first folder of `manifests.paths`, and new elements, views and stories in the folder of a manifest the plateau already has; the layered Brightcart keeps one folder per plateau, so its new files land in `saas/application/`, `baseline/application/` and so on.
- **F3. New files have no final line break.** Every manifest the editor creates (an element, a view, a story, and now a plateau) is written by `serializeManifestFile`, which does not end with a line break; it was so before this run, and it is left alone (a hand-written file keeps its own ending).
- **F4. A comment above a patch.** The line-preserving save keeps a comment above the line below it; a patch inserted between a patch and the comment of the next one took that comment (a test of this run found it). New patches are therefore written at the end of the list only.
- **F5. Filed:** #93 (delete a plateau), #94 (a patch cannot take a field out). Nothing else out of scope was found.
- **F6. Outside `likely_paths`:** `src/doc/README.adoc` (the section *Writing in a plateau*, and the sentences it replaces), `CLAUDE.md` (the paragraph of the band), and the run's own document. Inside: the page, `editor-writes-layers.test.js` (new), `editor-reads-layers.test.js` (two tests re-aimed: the read-only test, and a baseline edit that now asks first). No Java, Rust or wasm file changed: the views of the command line are unaffected, and no differential check of them was run (none needed).

## Verification

With `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` and `PLANTUML_JAR=/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`, on the final tree (the gate commands ran after the last edit of the page, the tests, the manual and `CLAUDE.md`; this document and the commit came after).

- `./mvnw -o verify`: BUILD SUCCESS, 685 tests, 0 failures, 0 errors, 0 skipped (the same 685 as before: no Java file changed; the manual builds with its new section). `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 182 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (712646 bytes)". `node --test "src/test/javascript/**/*.test.js"`: 1477 tests, 1477 pass (1428 before: +49 in `editor-writes-layers.test.js`; `editor-reads-layers.test.js` keeps its 51). `npx prettier --check "src/**/*.java"`: clean.
- **The tests fail on the old page.** With the page of `HEAD` in place (restored, `cmp` identical), 39 of the 42 tests that `editor-writes-layers.test.js` had then fail (the 3 that pass are guards: a workspace with no plateau and one with `settings.plateaus` save as before, and a refusal that happens before anything is written); the test of `editor-reads-layers.test.js` that now says a plateau the kernel refuses is not written fails too. The tests added after the review were written against the fixed page.
- **What an edit writes, in bytes** (the tests compare the files of an in-memory copy of the layered Brightcart before and after "Save all changes"):

  | edit in `saas` (the layered Brightcart) | files written | lines |
  |---|---|---|
  | name of `shop.web` (inherited, no patch on it) | `saas/plateau.yaml` | four lines added at the end: `- operator: SET`, `target: "shop.web"`, `field: name`, `value: "Shop front"` |
  | the same name again | the same file | the `value:` line only (one patch, not two) |
  | description of `shop.web` (a SET of `saas` is there) | `saas/plateau.yaml` | one line changed: its `value:` |
  | name put back to what baseline gives it | none | the patch goes; the file is as it was |
  | tags that gain a key | `saas/plateau.yaml` | `MERGE` with the key (five lines added) |
  | a qualifier added where `saas` SETs the list; a relationship added where it has an `ADD` | `saas/plateau.yaml` | the `value:` of that patch, now a block with the new item (the flow line goes, nothing else) |
  | a relationship relabeled | `saas/plateau.yaml` | `SET` with `where` (destination, label) and the changed field, at the end; relabeled again: its `value:` line |
  | an element `saas` declares (`commerce-saas`) | `saas/application/commerce-saas.yaml` | the line of the field |
  | an inherited element removed (`psp`) | `saas/plateau.yaml` | `- operator: REMOVE` and `target: "psp"` (and `layer: technology` for a node); no file goes |
  | an element `saas` declares removed | its manifest goes; `saas/plateau.yaml` loses the patches that named it; the nodes that hosted it lose the entry | |
  | a new system | `saas/application/app.<id>.yaml` | `plateau: saas` in its header |
  | a new child of an inherited element | `saas/application/app.shop.<id>.yaml` | `plateau: saas`, `parent: shop` |
  | a new story, a new view | `saas/.../story.<id>.yaml`, `view.<id>.yaml` | `plateau: saas` |
  | a new plateau over `saas` | `plateau.<id>.yaml` | `id`, `name`, `horizon`, `override: saas` |
  | the name of a plateau | its `plateau.yaml` | the `name:` line; a horizon where there was none goes between the name and the patches |
  | a field of baseline | the file that declares it | the line; the plateaus that inherit it are listed first, and nothing is written until the author says yes |

- **Refused, each with one sentence and each a test** (the sentence is in the test): a rename or a move of an inherited element (at the click and in the dialog); a text an inherited element has taken out; a field a hand-written `json-path` patch sets (names the patch); a rename and a patch-set field in one edit; a story or a view another plateau declares; `Move to manifests` outside baseline; a plateau id that is empty, not valid, taken, or a parent that does not exist or would be itself; a write after which a plateau that resolved no longer does (a delete of `shop.web` or a rename with a patch of another plateau on it that is not followed), with the plateau and the patch; an edit the resolution does not give back (a stubbed `patchFor` that writes the wrong value). After each, every file, its mark and the lists are as they were (tests compare them).
- **The tools against each other** (the counts of the Changes panel and of the Timeline page, read from the page, and `archicode diff --plateau <id>` on the files the editor wrote on a copy of `layered/` served by `editor serve`): after a name edit in `saas`, a `REMOVE` of `psp` in `saas`, a name edit in baseline (asked first, then written) and a new plateau `pilot` over `saas`, all made with the page's own buttons and saved:

  | plateau | page: elements new/changed/removed, relationships | `archicode diff`: elements, relationships |
  |---|---|---|
  | saas | 3/7/12, 4/1/12 | 3/7/12, 4/1/12 |
  | inhouse | 17/5/1, 17/1/6 | 17/5/1, 17/1/6 |
  | marketplace | 21/12/5, 18/1/3 | 21/12/5, 18/1/3 |
  | pilot | 0/0/0, 0/0/0 | 0/0/0, 0/0/0 |

  `archicode plateau list` lists the five plateaus, `pilot` over `saas` from `plateau.pilot.yaml`. `git diff --no-index` between the pristine fixture and the served copy shows only: the `name:` line of `baseline/application/shop.yaml`, the new `plateau.pilot.yaml`, and the six lines added at the end of `saas/plateau.yaml` (a `SET` of the name of `shop.web` and a `REMOVE` of `psp`).
- **The page in the built-in browser** (`editor serve --port 0` on a copy of the layered Brightcart in the scratchpad, never the folder of the repository; the page was driven with its own buttons by `click()` and read, since the pane's pointer clicks fail while it is not drawn): the band said _writing in: ..._ with *New plateau* and *Edit plateau*; an edit of an inherited name, a second edit of it, a removal with its confirmation (which says it adds a `REMOVE` patch), an edit of baseline (the dialog listed `inhouse`; saas, which sets the name itself, was not listed), the form of a new plateau (its parent list, the new plateau drawn), the edit form of a plateau; the refusals of a tag edited under a hand-written `json-path` patch and of the move of an inherited element read in the top bar; the counts above read in dark and light; no console error. **Looked at** (a screenshot at 0.6 scale came back once): the band with its controls and the Timeline page with its buttons, light. **Not seen**: the dialogs (the form of a plateau, the plateaus a write changes), and anything in dark: the screenshots timed out.
- **Not verified.** The dialogs and the dark theme by eye; the 360 px layout with the new buttons in the band (not measured); other browsers; the File System Access API on a real folder (served mode only); the text typed in a form when the author says no to the dialog of the plateaus an edit changes (it is lost: the form is drawn again from the model); a workspace of thousands of elements (the guard resolves every plateau twice per write: 2 to 5 ms a plateau on the Brightcart, not measured above that); TOML and JSON Plateau manifests (the editor does not read them); Windows; the native image.

## Issues

Filed: #93 (delete a plateau), #94 (a patch cannot take a field out). Not closed: #72 (W-9 and W-10 remain), #27.
