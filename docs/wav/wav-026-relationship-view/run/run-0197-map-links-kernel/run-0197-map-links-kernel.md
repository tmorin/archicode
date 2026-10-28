---
type: run
run: 0197
status: completed
profile: TDD+pln
wave: 026
---

# Run 0197 map-links-kernel

Run of wave 026 (relationship view), manifest id W-3.

## Sentences and exit codes, as built

The command line's `links` property of a saved Map view (issue #143; DEC-1, DEC-5, DEC-6 of the TDD). Each sentence below is quoted from `src/test/java/io/morin/archicode/cli/MapLinksTest.java`, which pins it word for word; the kernel and the adapter produce the same text (`src/main/rust/viewpoint-kernel/src/lib.rs`, `src/main/java/io/morin/archicode/viewpoint/kernel/MapLinks.java`, `src/main/java/io/morin/archicode/cli/ViewInPlateau.java`). The examples are the values of the test; the `error:` lines are one line each, and an `error:` line ends the command with exit code 1.

### Errors (exit 1, nothing written for the view)

An entry that is not a mapping with `source`, `destination` and optionally `label` (DEC-1). The shape is pinned as a prefix and a suffix, the entry itself between them (`shouldSayTheShapeOfAnEntryAsOneErrorLine`):

```
error: the view links_view: `links[0]` is a mapping with `source`, `destination` and optionally `label`, and <entry> is not one
```

An entry that names no relationship, with a label (DEC-5, `shouldSayAnEntryThatNamesNoRelationshipAsOneErrorLine`):

```
error: the view links_view: `links[1]` names a relationship from `shop.web` to `shop.api` with the label `reads`, which does not exist
```

An entry that names no relationship, with no label (DEC-5, `shouldSayAnEntryWithNoLabelThatNamesNoRelationshipWithoutALabel`):

```
error: the view links_view: `links[0]` names a relationship from `customer` to `shop.web` with no label, which does not exist
```

An unknown end, the sentence `pinned` gives (DEC-5, `shouldSayAnUnknownEndLikeAPinnedElementThatIsNotThere`):

```
error: the view links_view: dangling reference: nowhere
```

`links` given to a map of `layer: technology` (DEC-6 (c), `shouldRefuseLinksInTheMapOfTheTechnologyLayer`):

```
error: the view links_view: links is read in the map of the application layer only
```

The place of an entry is `links[n]`, counted from 0 in the manifest's list (DEC-1, DEC-5).

### Warnings (exit 0, the view is drawn or skipped)

Only in a workspace with plateaus or a facet, when an entry names a relationship the plateau drawn lacks (DEC-5, `shouldWarnOfALinkThePlateauLacksAndDrawTheRest`). The warning is printed on the error output, the view is drawn without that link and the other entries are kept:

```
warning: the view `links_view` is drawn without the link `partner -> shop.web`, which the plateau `baseline` does not have
```

When none of the entries is in the plateau drawn, the view is skipped: no `plantuml` folder is written for it under `views-baseline` (`shouldSkipAViewNoneOfWhoseLinksIsInThePlateau`). The skip warning:

```
warning: skip `links_view`: none of its links is in the plateau `baseline`
```

The same view is drawn in the plateau that has the relationship (`views-to-be`, exit 0).

### Exit codes

| Case | Exit code |
|---|---|
| Entry of the wrong shape (DEC-1) | 1 |
| Entry that names no relationship, with or without a label (DEC-5) | 1 |
| Unknown end, `dangling reference: x` (DEC-5) | 1 |
| `links` in a map of `layer: technology` (DEC-6 (c)) | 1 |
| Plateau warning for a missing link (DEC-5) | 0 |
| View skipped in a plateau (DEC-5) | 0 |

### Limit until W-5 (ASM-3)

The editor does not send `links` to the kernel until the wave's editor run (W-5). Until then a saved view that has `links` is drawn by the editor as the whole map, and the editor's save drops the key (`canonicalViewProperties` in `src/main/editor/application/view-recipe.js` keeps a list of the known keys). No shipped file has `links` (DEC-9), so no shipped view is affected. This limit is checked by reading that function and by the node suite staying green; it ends with W-5.

## Verification

Stage 11, 2026-10-28, rerun here on JDK 25.0.4 and read back from the files; every command exited 0.

- Kernel: `cargo test` 299 passed, `cargo fmt --check`, `cargo clippy --all-targets -D warnings`, `cargo llvm-cov --fail-under-lines 90` (99.29 % of the lines of `lib.rs`, 98.96 % in all), `embed.sh --check` (the committed `.wasm` and page block are the ones the sources build).
- Red first: the new Rust cases (`lib_tests.rs`, `map-links-cases.json`) run against the `lib.rs` of the parent of 3793c38 fail (`a_label_matches_only_that_label_after_trimming`, `an_end_inside_a_closed_box`, `an_empty_source` and the others of the links); the Java `MapLinksTest` was committed red in 3793c38 before the adapter (its message says so; the red Java run itself was not logged then and was not rerun here).
- Java: `./mvnw test-compile pmd:check`, `./mvnw clean install -DskipITs=true`, `./mvnw verify -DskipITs=false` (39 integration tests, 0 failures, jacoco floors included).
- Page: `npm run editor:check` (99 upward pairs, max 99), `npm run lint`, `npm run format:check`, `npm run test:unit` (exit 0). `expected-boxes.json` is not in `git status`.
- `scripts/byte-identity.sh`: 20 workspaces, 332 commands, 330 identical, 1 accepted by the exceptions, 0 unexpected, self-check ok.
- No manifest under `src` (yaml, yml, toml, json) starts a line with `links:`; the kernel contract number is still 5.
- Acceptance criteria re-read in the code: `MapLinks` (shape, existence, union), `KernelViewpointFactory.mapLinks` (forwarded only when entries remain, filtered only in a plateau or facet workspace), `ViewInPlateau.linksCanBeDrawn` (warning and skip), the guide row and `golden.md`, `[[map-links]]` in the manual, the paragraph of CLAUDE.md. Each sentence quoted above appears once in `MapLinksTest.java`.
- Stage 11 found `format:check` failing on `GenerateStoriesCommand.java` and `MapLinks.java` (Prettier layout only); `npx prettier --write` on both, then `format:check` and the Maven runs above were done after it. The untracked `jacoco-quarkus.exec` at the root (a test-run leftover, not ignored) was deleted.

The changes of tasks 005 to 010 are in the working tree, uncommitted; the commit is a step outside this workflow.

Review pass: dispatched. The Stage 5 review of the TDD and the Stage 9 consistency check were done by leaf agents in fresh contexts, and tasks 001 to 010 were each verified by an agent other than the one that built them (see the prg).

## Canonical impact

None. No canonical register is declared in this repository (`docs/CLAUDE.md` does not exist, the wave names no `docs/bkg` or `docs/ana` register), as the Canonical Impact section of the TDD says.

Files outside likely_paths: src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json (the entry for `MapLinks`, needed by the native image)
