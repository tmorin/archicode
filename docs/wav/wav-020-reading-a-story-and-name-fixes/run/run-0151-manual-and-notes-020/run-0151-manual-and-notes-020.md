---
type: run
run: 0151
status: completed
profile: single-document
wave: 020
---

# Run 0151: manual-and-notes-020

Wave 020, W-6 (phase P2). The manual (`src/doc/README.adoc`) and `CLAUDE.md` say what the tools do at the end of wave 020: the name of a facet, the workspace file that cannot be read, the brackets of the save, the list of the steps and the reading mode of a story, with one block of what changes for a reader who knows 0.18.0. Documentation only: no code, example or fixture changes.

Profile `single-document`: the work is the sentences, and the runs' "For the manual" sections already say which ones. The review passes are answered below.

## Scope and decisions

1. **The facets** (`[[facets]]`): a note, "The name of a facet is the name of a folder", after the note on the keys: what is refused (empty, `.`, `..`, `/`, `\`, a control character, `< > : " | ? *`, a trailing dot or space), that Windows device names are not looked at, that a name is never rewritten, the one `error:` line (per facet, in the order of the file), "every command that loads the workspace" with `plateau list` and `editor serve` named as the two that do not look at facets, the editor and *Add facet* (also one sentence in `[[editor-facets]]`).
2. **The unreadable workspace file**: the `error:` line next to the others in `[[errors-and-warnings]]` with a paragraph on the two ways to have no file (and that a wrong file says what is wrong); in `[[editor-open]]` the card "Can't open this workspace", when it says "could not be read" (a file that cannot be had) and what it shows otherwise (the sentence of the command line, no hint), and the note of the list of remembered folders.
3. **The save** (`[[editor-elements]]`, the paragraph "Changes stay in memory"): the sentence "a change to it writes it as a block" replaced by the rule (in brackets again, on its line, the comment after the bracket, quotes, words and spacing kept, one line when it fits, the width rule 100 to 120 columns or the width it had, `[]`/`{}` when emptied) and the four cases that stay a block. `[[plateau-limits]]` gets a bullet for them (it did not list this).
4. **Stories** (`[[editor-stories]]`): the list of the steps in the paragraph of the bar (title rule, "cannot be shown", one-step story has none, the address stays `story=`/`step=`); a new anchor `[[editor-reading-mode]]` with three paragraphs (what the mode shows, hides and never does and how to leave; the keys and the rule that none acts while a control has the focus; the address, `read=1`, not a document, a bad `read=1`, a hand-typed address). *Leave story* is said to be the editing bar's. A sentence in the tutorial step on Stories (*Read* shows the four steps of `migration`), one in the paragraph on the Stories side of `[[editor-stories]]` (*Read* beside *Play*), a group of keys in `[[editor-keyboard]]`, and, in `[[editor-small-screen]]`, a row of the table, a paragraph on the mode and a sentence in the "does not say" paragraph. The phone stays "not planned": `[[plateau-limits]]` says the mode was made to fit and not tried on a phone.
5. **A block `[[upgrade-0-18]]`** ("What changes for a reader who knows 0.18.0") before `[[upgrade-0-17]]`: the facet name first (Breaking), the stack trace, the card, the brackets, the reading mode. It says the release that carries it has no number in the manual yet (no version invented). "this block and the two that follow" in the 0.17.0 block became "the ones that follow" (there were already four).
6. **`CLAUDE.md`**: the runs had already edited the paragraphs of the workspace file, the facets, the save and the stories; they read right as a whole. Left to fix: the sentence on what the manual says, which listed waves 018 and 019 only. It now says wave 018, 019 or 020, names #142 and #145 to #147 as fixed and #143, #134, #135, #65, #24, #144 and #149 as open (the manual names none of them), points at `[[upgrade-0-18]]`, and lists where each wave-020 change is told.

## Claims corrected against the reports

- W-2's report says the editor's card for a file read and found wrong "shows its own sentence"; the code (`landingScreenConfig`) shows `AppState.fatalError`, and for a manifests path or a facet name that error begins with the heading "Could not read the plateaus of .archicode.yaml:" (cases N94 and following). The manual says "the sentence the command line prints for it, as it is, without *could not be read* and without the hint"; the heading line is the editor's and is not quoted.
- W-1's report says "the editor also refuses the names in *Add facet*": checked in `validateFacetName` (it trims the name first and shows the reason as the inline error of the field); a trailing space cannot be typed into it, so the manual does not list that case for *Add facet*.
- W-5's first note of W-4 ("`ref=` is not set by any step") was corrected by W-5; not in the manual.
- W-3: "a long list stays a block once it is one" is in the manual as "a block in the file is never turned into brackets" (checked in `bracketChangedFlows`, which acts only on collections `openFlowLists` found in brackets).
- 0.18.0 behaviour for `a/b`, which the reports say "loaded": measured with the jar of the tag: it writes the views in `views-a/b`, a folder inside a folder, exit 0. The manual says so.
- The sentence the reports give for the unreadable file was run with the jar of this tree on a copy of `facet_example_step_3` with mode 000: ``error: the workspace file `<path>` cannot be read: permission denied``. The facet sentence was run on the same copy with `name: "a/b"`: `views generate` and `query graph` print it (exit 1), `plateau list` lists the plateaus (exit 0).
- The 375 px numbers (28 to 347) are the orchestrator's, the 360 px ones (28 to 332, `scrollWidth` 360) the executor's of W-5; the manual quotes the 375 one in its table and says the mode was measured at both. The manual says the dark theme is not covered for the mode.

## Review passes (the trio's, answered here)

- **KDMLLC.** KISS/DRY: each fact is told once where it belongs and pointed at from the release block; the keys appear in the editor-keyboard group and in the mode's paragraph (the table of keys and the explanation differ in purpose). MECE: facets (rule), errors (command line), editor-open (card), editor-elements (save), editor-stories (menu, mode), small-screen (measures), limits (what stays), upgrade (what moved). LEAN: no essay appended to `CLAUDE.md`; one sentence changed. LUCID: the sentences the tools print are quoted as run. CONSISTENT: names of the buttons (*Read*, *Edit*, *Add facet*) are the ones of the page.
- **Open questions.** The release number: not invented ("after 0.18.0"). Whether to document the editing layout's missing comparison for a link to a step told `against` (W-5's finding): one sentence in the address paragraph says what happens, no promise. The two defects W-3 found (the quotes lost by the unstyled retry; a comment dropped with a line the aligner drops) are not in the manual: it has no sentence that matches them, and the orchestrator files them.
- **C scan against the repository.** Grepped the manual, `CLAUDE.md`, `README.md` and `src/site/index.html` for `#142`, `#143`, `#145` to `#147`, `#134`, `#135`, `#65`, `#24`, `#144`, `#149`, `importer`, `plateau merge`, `matrix of`: the manual and the site name none; `CLAUDE.md` names #142 and #145 to #147 as history (wave 020 runs) and, now, the open ones. `README.md` and the site mention neither stories nor facet names nor the save: unchanged. Every anchor the new text uses exists (`facets`, `editor-facets`, `stories-generate`, `errors-and-warnings`, `editor-open`, `editor-elements`, `editor-stories`, `editor-reading-mode`, `editor-small-screen`, `plateau-limits`, `upgrade-0-17`, `upgrade-0-18`): the build resolves them (no unresolved-reference warning).
- **Canonical impact.** `CLAUDE.md` (one sentence) and the manual are the deliverable. No `dom` packet, no `arc` item.

## Tasks

- [x] read the progress log and the five run documents
- [x] verify each claim against the code (`FacetNames`, `WorkspaceFileException`, `landingScreenConfig`, `bracketedLine`/`bracketWidth`, `renderStoryStepMenuHtml`, `renderReadingShellHtml`, `handleReadingKeydown`, `currentRouteHash`, the `.reading-*` CSS) and, for the sentences, with the jars of the tag and of this tree
- [x] write the facets note, the error line and the card, the save, the stories and the small screen, the keyboard, the limits
- [x] the block `[[upgrade-0-18]]`
- [x] `CLAUDE.md`
- [x] the manual builds; the gate set after the last edit of an `.adoc`

## Verification

On the final tree, after the last edit of an `.adoc`, one at a time: `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 1347 unit tests (0 failures, 2 skipped; `ManualExamplesTest` 1 and `ShippedFilesTest` 6 pass) and 27 integration tests, BUILD SUCCESS; `cargo test`: 240 passed; `embed.sh --check`: the committed wasm is the one the sources build; `node --test`: 2553 of 2553; `npx prettier --check "src/**/*.java"`: clean.

`./mvnw -o asciidoctor:process-asciidoc`: exit 0, no message but 18 `Could not load PlantUML` errors for diagrams the run did not touch (the offline build cannot load the PlantUML engine; the lines they name, 537, 645, 737, 776 and the `.puml` includes of the examples, are outside the edits). The new anchors and references are in the generated page.

Byte identity (P2 gate, second criterion): no example, fixture or code changed (`git diff` is `CLAUDE.md` and `src/doc/README.adoc`, plus the wave files of the orchestrator). Still compared, with the jar of the tag `archicode-0.18.0` and the jar built by the run above: `domain_plateaus` (`views generate`, `stories generate`, `diff`, `query graph`, all with `--plateau to-be`: 86 files) and `domain_technology_map` (`views generate`, `query graph`: 25 files): the output (standard and error, exit code 0) and every file written are identical (`diff -r`, `cmp`).

## What changed

- `src/doc/README.adoc`, `CLAUDE.md`. Nothing else: no example, no code, no fixture.

## Not verified

A real browser (the editor statements come from the code, the node harness and the runs' documents); the Native job; the text was read, not proofread by a second person; the 360 px look (a person should look at the reading mode on a phone).
