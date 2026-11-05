---
type: wave
wave: 033
status: proposed
date: 2026-11-05
related:
  - docs/wav/wav-033-import-structurizr-and-plateau-matrix/wbc-033-import-structurizr-and-plateau-matrix.md
  - docs/wav/wav-032-help-name-and-stylesheet-tests/wav-032-help-name-and-stylesheet-tests.md
  - docs/wav/wav-028-fold-and-browser-menu/run/run-0206-n-plateaus-design/run-0206-n-plateaus-design.md
---

# Wave 033 — Import a Structurizr workspace and the matrix of N plateaus

## Purpose

A Structurizr JSON export becomes an ArchiCode workspace with one command, which loads in the command line and in the editor and lists what it dropped. The plateaus of one path of the tree have a generated table, lineages by plateaus plus a Span, that the command line writes and a test pins.

## Non-Goals

- No LikeC4 importer (#134), no shared model of the two importers, no DSL input, no editor action for the import.
- No deployment, views, styles, documentation or properties in the import: they are reported as dropped (#135 v1).
- No page for the matrix (the editor follows in a later wave), no relationships in it, no transient row, no change of the kernel, no change of `gap.json` or `gap.md`.
- No change of an existing command's output on a shipped workspace (`scripts/byte-identity.sh` stays green with no new exception).

## Decision Prerequisites

None: the shape of both is decided on #135 and #24 (comments of 2026-10-31). The names of the matrix command and file are settled by the design of W-2, as the author's decision says.

## Open questions

- If the check of a per-path licence notice on the Big Bank sample finds a notice that forbids the file, the run falls back to a hand-written minimal workspace modelled on the documented schema, says so in its document and in the report to the author (compatibility with a real export is then unproved). Proposed default, to confirm by the author; the decision of 2026-10-31 accepts the file and asks only for the check.

## Wave Manifest

```yaml
wave_manifest:
  wave: 033
  slug: import-structurizr-and-plateau-matrix
  status: proposed
  sources:
    - '#135'
    - '#24'
  phases:
    - id: P1
      name: The importer and the matrix file
      gate:
        criteria:
          - 'the folder src/test/resources/structurizr/ holds a JSON file whose name contains `big-bank`, the Apache-2.0 licence text and a provenance text that holds `github.com/structurizr/structurizr` and a 40-hex commit SHA (the folder does not exist on the starting repository)'
          - 'with the application built (`./mvnw -o package -DskipTests -DskipITs`, JAVA_HOME a JDK 25), `java -jar target/quarkus-app/quarkus-run.jar import structurizr <that file> --output <an empty folder of the scratchpad>` exits 0, prints at least one warning line per dropped part present in the sample (views, deployment), and `java -jar target/quarkus-app/quarkus-run.jar query graph -w <that folder>/.archicode.yaml` exits 0 with as many elements as the sample has people, softwareSystems, containers and components together (18 by the review on #135; count them with jq on the sample)'
          - 'the same command given a `.dsl` file, and given a non-empty output folder, each exits 1 with one line starting `error:` and no stack trace, and the non-empty folder is unchanged (`git status` or a listing before and after)'
          - 'a test of src/test/java/io/morin/archicode/it runs the import on the packaged application and a test of the editor (node suite or end-to-end spec, named in the run document) loads the imported output; `grep -c io.morin.archicode.cli.Import src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` prints at least 2 (0 on the starting repository)'
          - 'the file src/test/resources/brightcart/matrix-cases.json exists (it does not on the starting repository) and a Java test reads it; the Span column of the table for the path baseline, inhouse, marketplace on the layered Brightcart has the counts that `diff --plateau marketplace --against baseline` prints for the same pair (+38 ~3 -6 and "11 moved, 2 split, 1 merged" by run 0206)'
          - 'the command that writes the table is in the manual, its generated listing of [[command-reference]] holds it and `./mvnw test -Dtest=CommandReferenceTest` exits 0; asking for a path that holds two siblings of a forked tree (saas and inhouse of the layered Brightcart) is one `error:` line, exit 1; `git diff --stat -- src/main/rust src/main/wasm src/test/resources/brightcart/expected` prints nothing and the existing gap.json and gap.md goldens are unchanged'
          - '`./mvnw test-compile pmd:check` and `./mvnw verify -DskipITs=false` exit 0 (the Native job of CI proves the native image), `scripts/byte-identity.sh` exits 0 with scripts/byte-identity-exceptions.txt unchanged, and `npm run test:unit`, `npm run format:check` and `npm run lint` exit 0 with `npm run editor:build` and `npm run sample:build` leaving `git status --short` unchanged (docs/architecture models the new commands)'
  runs:
    - id: W-1
      slug: structurizr-json-import
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java'
        - 'src/main/java/io/morin/archicode/cli/Import*.java'
        - 'src/main/java/io/morin/archicode/importer/**'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/it/**'
        - 'src/test/java/io/morin/archicode/importer/**'
        - 'src/test/resources/structurizr/**'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'docs/architecture/**'
        - 'src/main/resources/editor-webapp/samples/**'
      focus: 'bring a Structurizr model into ArchiCode with one command and read what was left out'
    - id: W-2
      slug: plateau-matrix-file
      phase: P1
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/ArchiCode.java'
        - 'src/main/java/io/morin/archicode/cli/PlateauGroup.java'
        - 'src/main/java/io/morin/archicode/cli/*Matrix*.java'
        - 'src/main/java/io/morin/archicode/rendering/**'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/java/io/morin/archicode/it/**'
        - 'src/test/java/io/morin/archicode/rendering/**'
        - 'src/test/resources/brightcart/matrix-cases.json'
        - 'src/doc/README.adoc'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
        - 'docs/architecture/**'
        - 'src/main/resources/editor-webapp/samples/**'
      focus: 'read in one table where each element of a path of plateaus came from and went'
```

## Phase P1 — The importer and the matrix file

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-1 | `structurizr-json-import` | — | bring a Structurizr model in with one command | `ImportGroup` in `cli/ArchiCode.java` like `PlateauGroup`; a thin command; a reader of the JSON (people, systems, containers, components, relationships with `linkedRelationshipId` skipped, ids resolved before writing); manifests built as `Manifest` objects and written with `FoldFiles` all-or-nothing to an empty folder; a report with `Warnings` for every drop and every rewritten id (D11); `.dsl` refused with the current export command (first task: verify it) ; the sample, its Apache-2.0 text and its provenance (first task: per-path notice); goldens of the output; loaded by the CLI and by the editor in a test; classes in `reflect-config.json`; the manual and the model of ArchiCode | gate 1 to 4, 7 |
| W-2 | `plateau-matrix-file` | — | one table for a path of plateaus | design settles the command and file names beside `gap.*`; rows are lineages through `replaces`, one column per plateau, a Span column from one `compare` of first and last with `chain`; no row without change; a path through siblings refused; `matrix-cases.json` derived from `diff` per pair plus the span, read by a Java test; one `*IT`; the manual and the model of ArchiCode | gate 5 to 7 |

**Gate:** the seven criteria of P1 in the manifest.

## Risks

- **Overlap W-1 and W-2:** both edit `cli/ArchiCode.java`, `reflect-config.json`, `src/doc/README.adoc`, `src/main/java/io/morin/archicode/CLAUDE.md`, `src/test/java/io/morin/archicode/it/**`, `docs/architecture/**` and the generated sample. Verdict: `serialize`; the order is free, and the second run starts from the repository the first leaves. At most one run is dispatched at a time.
- **The Structurizr export command is unverified.** The Java CLI the ticket names is archived; if there is no documented way to produce the JSON, the `.dsl` sentence cannot name one and the value of the importer for a DSL-only user drops. The run states what it found; it does not invent a command.
- **A third-party file in the repository.** The licence scope was read for the root of the monorepo only; see the open question.
- **Adding commands changes `--help` of the top command and the manual's generated listing.** `HelpIT`, `CommandReferenceTest` and the README block move together in the same commit of each run.
- **The matrix's cost in the browser is not in this wave** (the page follows); the file reads `diff`'s cases, so no browser measurement is promised.
- **The native image.** Reflection entries are the usual failure of a new command; a pull request on a branch does not run the Native job, so the runs say whether it was proved.

## Completion Criteria

- The gate of P1 holds.
- #135 and #24 are closed by the wave's pull request, except that #24 stays open or gets a new title for the page (the author's second run) and #134 is moved to `ready` when #135 is merged.
- `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run format:check` and `npm run lint` pass.
