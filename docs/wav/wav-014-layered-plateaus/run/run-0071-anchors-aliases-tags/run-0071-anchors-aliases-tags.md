---
type: run
run: 0071
status: completed
wave: 014
---

# Run 0071: Anchors, aliases and tags

Wave 014 (`layered-plateaus`), item W-14 (phase P0). Focus: keep the anchors, aliases and tags of a manifest, in the editor and on the command line (issue tmorin/archicode#74).
Document profile: `single-document` (the scope is settled by the wave plan; what the run decides is which forms the save can carry). This file carries scope, decisions, canonical impact, review passes, tasks, verification and findings. There is no pln: the task list below is the plan, and its state is the state of the run.

## Scope

1. The command line reads an alias as the value of its anchor (`description: *n` gave `n`).
2. The editor reads an anchor, an alias and a tag (before: the file was listed as unreadable, left out of the model and never written), and the line-preserving save writes them back as they were written under the rule of waves 010 and 011 (a result is accepted only if re-reading it gives the emitter's value).
3. A rename (and a move) reaches the references of such a file.
4. What cannot be carried safely keeps the fallback (the emitter's text) and is filed.

## Decisions

- **D1. The command line expands aliases in the parser, not in a pass over the text.** Jackson's YAML parser reports an alias as a string holding the anchor's name, and gives subclasses one hook, `YAMLParser.getEvent()` (since 2.18, "to work around the lack of anchor and alias support"). `AliasExpandingYamlParser` keeps the events of each anchored node as they go by and replays them in place of the alias event (an alias inside an anchored node, and an alias of an alias, work because the replayed events go through the same recording). `AliasExpandingYamlFactory` hands it out; the two YAML mappers of `MapperFactory` use it, so every YAML file the command line reads (manifests, `workspace.yaml`, the queries) reads aliases the same way. An alias with no anchor is `found undefined alias `n`` with the line and column of the reader, named with the file as any other reader error. Tags and anchors are read as before (Jackson ignores an anchor, and takes a tag on a scalar as `!!str`, `!!int`, `!!float`, `!!bool`, `!!null`, any other as a text).
- **D2. The editor reads the three forms the way the Java side does.** An alias is a copy of the anchored node (the model is a plain tree), a tag applies to a scalar (`!!str 12` is the text `12`, `!!int "12"` the number, `!!bool yes` the boolean; any other tag leaves the text; `!!binary` and a bad number are errors) and to nothing else. An anchor or a tag on a key, an alias with its own anchor, two anchors on a node, and an alias with no anchor are errors that name the line.
- **D3. The save takes the three forms out of the text, runs the aligner that exists, and puts them back, each only if the text still says what the edit says.** `openYamlDecorations` uses the notes the reader leaves (where each token is) and rewrites the lines in the layout the emitter writes: the anchor and the tag leave their line (a tag that changed the reading, `!!str 12`, leaves the emitter's token, `"12"`), an alias becomes the node as the emitter writes it (a scalar on the line, a map or a list as a block under its key). Each such line carries a mark in its comment (`\u0002n\u0003`), which every edit of a line keeps. `closeYamlDecorations` then, for each entry: a line the edit did not change goes back to the line of the file; a line it changed gets its anchor and tag inserted before its value (only if it still is the same key at the same column); an alias goes back when its line (or its block, for a map or a list) is still what it expanded to, or, when an edit changed it, when the text with the alias in place still reads as the edit. The check for every entry is the rule of wave 010: serialise what the text reads as, compare with the emitter's text of the new value. So an alias whose anchor was edited becomes the value it has; an alias and its anchor edited to the same value stay an alias and an anchor. `moveBlockInText` returns null for such a file (the ordinary patch follows).
- **D4. What is not carried keeps the fallback, filed as #78:** an anchor, an alias or a tag inside brackets (`[&a one, *a]`), a tag that changes a text over several lines, and the layouts the aligner does not follow with or without an anchor. The file is then written as the emitter writes it; it reads back as the edit.
- **D5. A merge key (`<<: *base`) is a key named `<<`** in both tools (neither merges); the command line refuses it as an unknown property. A decision about the model, listed in #78.
- **D6. The pins of the old behaviour are replaced, not kept.** `anchors-tags-save.test.js` pinned "unreadable, never written, rename leaves the reference behind, move refused": it now pins the opposite. The pins of `yaml.test.js` that used an anchor, an alias or a tag as an example of what the parser cannot read use what it still cannot read (an alias with no anchor, an anchor on a key, a bad `!!int`).

## Canonical impact

None to the architecture model (no TDD, no `CI-arc` or `CI-dom` packet): one parser and one factory on the command line, a reader and a save in the editor's page, the manual's sentence about the save.

## Review passes

- **KDMLLC (inline).** K: the command line adds one factory and one parser, no pass over the text; the editor's save reuses the aligner as it is and adds an open and a close step around it. D: the Java and the node tests read the same texts (the block of `AnchorsAliasesTagsTest` and the `READ` table); the rule "accepted only if it reads back" is the one function `says` of `closeYamlDecorations`, the same as `patchYamlTextAt`. M: each form is one case of the `READ` table and one of the save tests; the unsupported ones are listed once (D4, #78). L: no option, no setting. U: every refusal names the line (editor) or the file and the line (command line). C: the wave plan's W-14 scope and exit evidence are covered one for one (below).
- **C scan.** The wave plan says "a rename of a reference reaches the references in such files": true because the editor now reads the file; pinned by two tests (a quoted reference with an anchor, an alias that follows its anchor). The gate says "an alias as the value it points at, not as its name": pinned by `AnchorsAliasesTagsTest` (failing on `25471b3`: expected `Bakery`, was `n`).

## Tasks

- [x] T1. Read the wave plan, #74, run 0067 (the pin and D6), `ManifestParser`, `MapperFactory`, the reader and the save in `standalone.html`.
- [x] T2. Command line: `AliasExpandingYamlParser`, `AliasExpandingYamlFactory`, `MapperFactory`; `AnchorsAliasesTagsTest` (5 tests; 4 fail on `25471b3`).
- [x] T3. Editor reader: anchors, aliases, tags (D2), with the notes the save needs.
- [x] T4. Editor save: `openYamlDecorations`, `closeYamlDecorations` (D3), the safety in `moveBlockInText`.
- [x] T5. `anchors-tags-save.test.js` rewritten (21 tests, all 21 fail on the page of `25471b3`); `yaml.test.js` and `flow-collections-editor.test.js` pins updated.
- [x] T6. The manual's sentence; #78 filed.
- [x] T7. The gate commands on the final tree, byte-identity of the views, one commit.
- [x] T8. `reflect-config.json`: the four classes of the new reader are registered (`NativeReflectionConfigTest` asks for every class of the package; it failed on the first `verify` and passes now).

## Verification

With `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` and `PLANTUML_JAR=/home/tibo/git-perso/plantuml-libs/.workdir/.cache/plantuml-1.2024.7.jar`, on the final tree.

- Gate (#74), the command line. `AnchorsAliasesTagsTest` (5 tests) with `MapperFactory` of `25471b3`: 4 fail (`expected: <Bakery> but was: <n>`; a reference through an alias cannot be built; an alias with no anchor was read as the text `n`, no error), the fifth (a tag) already passed and pins what must not change; with the new factory all 5 pass. Through the jar: `description: *n` gives `"description":"Bakery"` with the new jar and `"n"` with the jar of `25471b3`; an alias with no anchor is `error: ` + the file + `found undefined alias `n` at `content` (line 7, column 14)`, exit 1, no stack trace.
- Gate (#74), the editor. `anchors-tags-save.test.js`: 21 tests, **all 21 fail on the page of `25471b3`** (the page swapped in and restored, `cmp` identical) and pass on the new page: the reader (15 forms), the refusals (11), the save by form (an anchor kept, an alias kept or written as its value, a tag kept, a map and a list alias, CRLF), the forms that keep the fallback, a random-edit property (3 texts x 60 rounds: the text written reads back as the edit and no mark is left), and the editor on a folder (read, edit and save only the intended lines, rename and move reach the file, the fallback file reads back).
- `./mvnw -o verify`: BUILD SUCCESS, 457 tests, 0 failures, 0 errors, 0 skipped (452 before: +5). The first run failed on `NativeReflectionConfigTest` (every class of the package must be in `reflect-config.json`), fixed (T8) and run again.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 175 passed. `src/main/rust/viewpoint-kernel/embed.sh --check`: "the committed WebAssembly is the one the sources build (658369 bytes)", exit 0. `node --test "src/test/javascript/**/*.test.js"`: 1084 pass, 0 fail (1067 before: +17). `npx prettier --check "src/**/*.java"`: clean.
- **No-change proof for the save** (scratchpad `cmp/compare.js`): the page of `25471b3` against the working tree, `patchYamlText` on the **310** tracked YAML files of the repository, the six edits of run 0055 (no edit; set a number and a boolean; drop the last key; drop the first item of every list; set a string and add a key; append `-x` to the first string): **1860 results, 1860 byte-identical, 0 files unreadable by the old page**. None of the 310 holds an anchor, an alias or a tag (grep), so none goes through the new code.
- **Byte-identity of the views on the command line** (scratchpad `identity.sh`): the jar built from `git archive 25471b3` outside the repository against the jar of the working tree, on the **18** `workspace.yaml` of the repository (`src/doc/examples/*` 9, `src/test/resources/*` 8 and `src/test/resources/viewpoint-kernel/workspace`), each copied to the scratchpad, with `views generate` and `query graph`: every generated file, every standard output and every exit code identical. One stderr differs: the five facet warnings of `src/test/resources/viewpoint-kernel/workspace` are printed in another order. Same five sentences; the order is set by identity hash codes, not by this run (the jar of `25471b3` itself prints them in three orders under `-XX:hashCode=0`, `1` and `5`), see F3.

## Findings

- **F1. `yaml.test.js` and `flow-collections-editor.test.js` used an anchor as their example of "a file the editor cannot read".** Four cases of the first (a plain anchor, a tag, the `workspace.yaml` and the manifest that "cannot be read") and one of the second now use what the reader still refuses or what the save still does not follow (an alias with no anchor, an anchor on a key, a bad `!!int`, an anchor inside curly brackets).
- **F2. The save needed no change to the aligner.** The three forms are taken out of the text and put back around it (D3), so `patchYamlLines`, `locateEmittedLines`, `openFlowLists` and `markKeyColumnLists` are untouched; the only edit near them is the rename of `patchYamlText` to `patchYamlTextPlain` and a new `patchYamlText` in front. The mark is `\u0002`, not `\u0001`, because `markKeyColumnLists` refuses a text that has `\u0001`.
- **F3. The order of the warnings of facets on the error output is not stable** (identity hash codes decide it, in the jar of `25471b3` as in this one). Stdout and the files are not concerned; a test that compares stderr between two builds would flap. Not filed by this run; for the wave to decide.
- **F4. `NativeReflectionConfigTest` asks for every class of `io.morin.archicode`**, including the nested classes of a parser that has nothing to do with reflection: `reflect-config.json` (outside the run's `likely_paths`) gained four entries.
- **F5. Not seen:** the editor in a browser (the pane was not used; the page was driven in the node harness with the in-memory folder), and the cost of the save on a very large manifest with many aliases (`closeYamlDecorations` re-reads the whole text once per entry; the corpus here is a few lines).
- **F6. Filed as #78:** brackets, a tag on a multi-line text, the layouts the aligner does not follow, an anchor or a tag on a key (read by the command line, refused by the editor), the merge key, `!!binary` and the hexadecimal forms of `!!int`.
