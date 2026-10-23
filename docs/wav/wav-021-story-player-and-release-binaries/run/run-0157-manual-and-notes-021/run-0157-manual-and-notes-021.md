---
type: run
run: 0157
status: completed
profile: single-document
wave: 021
---

# Run 0157: manual-and-notes-021

Wave 021, W-6 (phase P2). The manual (`src/doc/README.adoc`), `CLAUDE.md` and the presentation page say what the tools do at the end of wave 021: the story player (it replaces the wave 020 reading mode, which never shipped, so the manual no longer tells it), the quotes and comments the save keeps, `archicode --version`, and the native programs of the release page. Documentation only: no code, example or fixture changes.

Profile `single-document`: the work is the sentences; the five runs' "For the manual" sections say which ones, and every claim below was checked against the code, the scripts, the workflow and the tests, not against the reports. The review passes are answered below.

## Scope and decisions

1. **Install** (new `[[install]]`, `=== Install`, under "Availability, License, and Deliverables"; the two sentences of that section that said "Maven Artifact and an OCI Image" now name the native programs first): the three files and `SHA256SUMS`; `sha256sum --check --ignore-missing`, `chmod +x`, `--version`; macOS with `grep ... | shasum -a 256 --check`; the quarantine (`xattr -d com.apple.quarantine`, files fetched by `curl` or `gh` are not marked); glibc 2.34 and macOS 15.0 (from the log of the rehearsal run 39933427051, `GLIBC_2.34` on both Linux targets, `minos 15.0`); no Windows, no Intel Mac; no Graphviz, no PlantUML, no Java (the main code has no renderer: `grep` finds no `plantuml`, `ProcessBuilder` or image output; `views generate` writes `.puml` text). The 7-day workflow artifact of a pull request is for contributors, so it is in `CLAUDE.md` (the Build & Test paragraph), not the manual.
2. **`--version`** (new `[[version]]`, `=== Print the version`, in Commands before the errors): one line `archicode <version>`, `-V`, exit 0, no workspace read, top command only (`archicode views --version` is a usage error, exit 2: run).
3. **The player** (`[[editor-story-player]]`, replacing `[[editor-reading-mode]]`, which is gone with every reference to it): what *Play* opens and what it holds, plateau and comparison said not chosen with "(from the editor)", zoom and pan with nothing clickable, the key, a step that cannot be drawn, the editor untouched, full screen (button only where the browser has it; a refusal says so), the keys and the rule that leaves them alone (Escape also from the step menu), the `play=<story>&step=n` address and its history. The bar of *Show on diagram* is told as it is (title, "Step n of N", plateaus, words, *Edit text*, *Edit story*, *Back to this step*, *Leave story*; no *Previous*, *Next* or list). The tutorial sentence on Stories, the Stories-side sentence on *Play*, the paragraph "A step told at a plateau" and the key table (".In the story player") are rewritten.
4. **The small screen** (`[[editor-small-screen]]`): the table row and the two paragraphs about the player. They say what was looked at (the packaged jar served on a copy of `domain_plateaus`, in the built-in browser of the desktop app, 360 px, dark scheme, `scrollWidth` 360; the wide light window on the first build, before the cap of the key went from 30 to 24 percent) and what was not (a real phone, a screen reader, the File System Access picker, full screen in a real browser, a finger on the diagram). `[[plateau-limits]]` says the same for the phone. The dark theme is no longer listed as unchecked for the player at 360 px, and the 375 px number of the reading mode is gone.
5. **The save**: the paragraph "Changes stay in memory" (`[[editor-elements]]`) gets the rule (a value that comes back on a line that is new keeps its quotes and so does a key; a comment stays on its own line; removing the first of two alike items removes the first; a comment between the lines of a removed item stays). `[[plateau-limits]]`: `- |` is added to the layouts written again entirely, and a bullet says the three cases L2 to L4 (a comment on an item that is itself a list; a block scalar on the second key of a list-item map written as a quoted text; a list holding a list in brackets written in brackets as a whole). The manual names no issue number anywhere, so none is named (#154 and #155 are in `CLAUDE.md`). `[[editor-writing]]` still said "a flow list or map that an edit changes becomes a block", stale since wave 020: now "stays in brackets on its line when it fits".
6. **`[[upgrade-0-18]]`** (the anchor keeps its name: the release notes link to `/docs/#upgrade-0-18`): the item "A story can be read" is now "A story can be played" (the player; nothing of the editor changes; the bar lost *Previous*, *Next* and the list); the other four items are as they were; three new items: the save keeps quotes and comments, `--version`, native programs on the release page. "after 0.18.0", no version number invented (the examples of `--version` say `<version>`).
7. **`CLAUDE.md`**: the runs had already edited their paragraphs; read as a whole they hold. Changed: the sentence on what the manual says (waves 018 to 021; #149, #150, #151, #153 fixed; #154 and #155 open bugs whose cases are in the limits; #143, #134, #135, #65 (now `plateau fold`), #24, #144 open; "the manual gives no issue number"; "five layouts"; the pointers `[[install]]`, `[[version]]`, `[[editor-story-player]]`, `[[editor-elements]]`, `[[plateau-limits]]`; the anchor `upgrade-0-18` keeps its name), the Build & Test paragraph (where a contributor finds the artifact), and two clauses in the stories paragraph that told the wave 020 reading mode (removed: `CLAUDE.md` says nothing about it now).
8. **`src/site/index.html`**: the card "Or generate the views with Docker" gets one sentence and a link to `docs/#install` (`site.test.js` checks the anchors).

## Claims corrected against the code

- W-5's report says `grep archicode-<version>-macos-arm64 SHA256SUMS | shasum -a 256 --check` for macOS: used as written (macOS `shasum` has no `--ignore-missing`; the Linux line uses it).
- W-2's report says a "page with no story" leaves a `play=` closed: the test is a workspace with no story at all; the address does not look at the page (a link opens the player on any page). The manual says "a workspace that has no story".
- The wave plan and W-4's notes say the version is a resource: it is `quarkus.application.version`, baked by Quarkus (`VersionProvider`); the manual says only "the version the program was built from".
- W-5's report left the glibc and macOS minimum "to fill from the rehearsal": read from the log of run 39933427051 (`gh run view --log`): `GLIBC_2.34` (linux-amd64 and linux-arm64), `minos 15.0` (macos-arm64).
- W-3's L1: run on the page (`rows`/`items` sample in the scratchpad): a `- |` list item makes any save write the emitter's text, the trailing comment of an unrelated key is lost and the item becomes `"one\ntwo\n"`. #150 and #151 samples reproduce as fixed (quotes of a key and a value kept; removing the first of two alike items keeps `# row c` on `[c, d]`).
- The orchestrator's text, "the Native job has no `if:`", is why a pull request run keeps the artifact; `CLAUDE.md` already said it.
- `archicode --help` from the jar prints `Usage: <main class> [-hV] ...`, not `archicode`: the manual lists the options and does not quote the usage line. `-V` and `--version` print `archicode 0.19.0-SNAPSHOT` from the jar built from this tree.

## Review passes (the trio's, answered here)

- **KDMLLC.** KISS/DRY: each fact is told once where it belongs (install, version, player, save, limits) and pointed at from the release block; the keys are told in the player's paragraph and in the key table (different purposes, as for the wave 020 mode). MECE: install (getting it), version (the option), editor-stories (the bar, the player), editor-small-screen (measures), plateau-limits (what stays), upgrade (what moved). LEAN: no essay appended to `CLAUDE.md` (a few clauses changed or removed). LUCID: sentences the tools print are quoted as run (`The browser did not give full screen.`, `archicode <version>`). CONSISTENT: the names of the buttons are the page's (*Play*, *Show on diagram*, *Full screen*, *Close*, *Key*, *Fit*, *Center*).
- **Open questions.** Where install belongs: a `===` under the Availability section (it already named the deliverables). Issue numbers in the manual: none (it names none). The contributor artifact: `CLAUDE.md`. The title of the 0.18 block: unchanged, the author's call at the cut. The root `README.md` (docker and jar instructions) is outside `likely_paths` and unchanged; it could mention the binaries when 0.19.0 is cut.
- **C scan against the repository.** `grep -i "reading mode\|read=1\|editor-reading-mode\|\*Read\*"` over `src/doc`, `src/site`, `README.md`, `CLAUDE.md` prints nothing. Every `<<...>>` the new text uses resolves (the generated page has `id="install"`, `id="version"`, `id="editor-story-player"` and an `id` for every `href="#..."`; `editor-reading-mode` is gone). The player claims were read against `openStoryPlayer`, `closeStoryPlayer`, `renderStoryPlayerHtml`, `handleStoryPlayerKeydown`, `handleHashChange`, `storyPlayerAddress`, `togglePlayerFullscreen`, `handleStoryPlayerWheel`, `renderStoryBarHtml` and `renderStoryStepMenuHtml` and the tests of `story-player-modal.test.js`.
- **Canonical impact.** The manual, `CLAUDE.md` and one sentence of the presentation page are the deliverable. No `dom` packet, no `arc` item.

## Tasks

- [x] read the progress log, the five run documents and the wave plan
- [x] verify each claim against the code, the scripts, the workflow, the rehearsal log and the jar
- [x] install, version, player, small screen, save, limits, upgrade block
- [x] `CLAUDE.md`, `src/site/index.html`
- [x] the manual builds; the verification set after the last edit of an `.adoc`
- [x] byte identity of the examples against the jar of `archicode-0.18.0`

## Verification

On the final tree, after the last edit of an `.adoc`, one at a time: `./mvnw -o asciidoctor:process-asciidoc`: exit 0, no message but the 18 `Could not load PlantUML` errors of diagrams the run did not touch (the offline build cannot load the PlantUML engine); no unresolved-reference warning, every `href="#..."` of the generated page has its `id`. `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false`: 1356 unit tests (0 failures, 2 skipped; `ManualExamplesTest` 1 and `ShippedFilesTest` 6 pass) and 30 integration tests, BUILD SUCCESS; `cargo test`: 240 passed; `embed.sh --check`: the committed wasm is the one the sources build; `node --test`: 2562 of 2562; `npx prettier --check "src/**/*.java"`: clean. `site.test.js` passes with the new link.

Byte identity (P2 gate, third criterion): no example, fixture or code changed (`git status` is `CLAUDE.md`, `src/doc/README.adoc`, `src/site/index.html`, plus the wave files of the orchestrator). Still compared, with the jar of the tag `archicode-0.18.0` and the jar built from this tree, each on a copy of the example in the scratchpad: `domain_plateaus` (`views generate`, `stories generate`, `diff`, `query graph`, all with `--plateau to-be`) and `domain_technology_map` (`views generate`, `query graph`): standard output, error output, exit codes and every file written (123 files) identical (`diff -r`).

## What changed

- `src/doc/README.adoc`, `CLAUDE.md`, `src/site/index.html`. Nothing else: no example, no code, no fixture.

## Not verified

A real browser for the editor statements (they come from the code, the node tests and the runs' documents); the Native job and the first real run of the release job (the release of 0.19.0; the rehearsal is the evidence); full screen in a real browser; a real phone, a screen reader, the File System Access path; `docker run ... --version` on an image of this tree (the image runs the same jar; none was pulled or built); the text was read, not proofread by a second person.
