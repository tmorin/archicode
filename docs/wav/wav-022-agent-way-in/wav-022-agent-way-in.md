---
type: wave
wave: 022
status: completed
date: 2026-10-23
related:
  - docs/wav/wav-022-agent-way-in/wbc-022-agent-way-in.md
  - docs/wav/wav-021-story-player-and-release-binaries/wav-021-story-player-and-release-binaries.md
  - docs/wav/wav-021-story-player-and-release-binaries/prg-021-story-player-and-release-binaries.md
  - CLAUDE.md
---

# Wave 022 — An Agent's Way In

## Purpose

When this wave is done, an agent that has only the `archicode` binary (jar or native) can create and keep up a workspace without being taught: `archicode query schemas manifest` describes the content of every kind of manifest (keys, shapes, required keys, enums, the nesting of kinds, the id rules), `archicode guide` prints a versioned guide generated from that schema and from the command list, and `archicode init` writes a workspace that loads in the command line and in the editor. Each of the three is proved against the code and against a corpus of files by tests that do not read the wave's own text, and a walk from an empty folder shows they are enough. The editor's save no longer writes the emitter's text for a file that holds `- |` and keeps a block scalar when the first key of a list item changes. The manual and `CLAUDE.md` say what the tools do.

## Non-Goals

- Does not build `validate` (every problem, with file, path and sentence, `--format json`, exit codes for valid, invalid and warnings): it changes the stop-at-first-error load (D10 of wave 021). The guide says so: the first error is the only one.
- Does not build edit commands (`archicode edit ...`), an MCP server, a skill file for an agent, or a way to write a plateau, a view or a story from the command line: `init` writes the first workspace and nothing more.
- Does not publish the guide on the site (`llms.txt`, `AGENTS.md`): `archicode guide` is the way in; publishing its output is a later, small decision.
- Does not change the dialect of the JSON Schemas (see Q1) nor what `query schemas workspace` prints, beyond keys the run adds to say what the schema lacked (listed by the run).
- Does not change what `views generate`, `stories generate`, `query graph`, `query views`, `diff` and `plateau list` write, nor the editor, apart from W-5 (the save).
- Does not build the view on relationships (#143, wave 023), the importers (#134, #135), `plateau fold` (#65) or the matrix of plateaus (#24). L3 and L4 of #155 (a list of lists) stay pinned limits.
- Does not cut a release, and does not close #144: the PR closes #154 and the wave comments on #144 and #155 (the rewrite of #155 is the author's).

## Decision Prerequisites

None open. The scope is the author's decision of 2026-10-23 (D10 of wave 021, on #144: schema, guide, `init`, in this order). The points below are open questions with a default; none blocks the first run.

## Open questions

- **Q1. The dialect of the manifest schema.** `query schemas` uses `jackson-module-jsonSchema` (an older dialect: `"required": true` on the property, `"type": "any"`, no `oneOf`). Default: keep it, so `workspace` stays byte for byte and no dependency is added; an agent reads JSON and does not need IDE validation. If the author wants IDE integration (the manual's promise) a modern dialect is a separate, later change that would move the `workspace` output. The run says what it could not express in this dialect (for example a content that depends on `header.kind`).
- **Q2 (resolved, 2026-10-23).** 0.19.0 was cut before the wave started (tag `archicode-0.19.0`, the release job ran for real: a transient 502 on the macOS job was re-run, the three binaries are on the release page). T1's base is that tag; the new block of the manual (W-6) is `upgrade-0-19`, for a reader who knows 0.19.0.
- **Q3. Which of the guide's sections are generated and which are text.** Default (T4): the kinds, nesting, keys, commands and options are generated; the conventions an agent cannot guess (ids, references, plateaus, views, stories, the check loop, the exit codes, the error line) are a resource text, tested against the code (V4). W-2 may find that a generated paragraph is better as text, or the reverse, and says so.
- **Q4. A cold-agent trial in the gate.** V6(b) uses one sub-agent in an empty folder. It costs one agent's session and is not deterministic; the gate asks for the recorded run, not for a pass rate. The author may drop it, in which case the scripted walk (V6(a)) is the whole of V6.

## Plan decisions

- **T1. Byte-identity base.** A jar built from `git archive` outside the repository, of the tag `archicode-0.19.0`. `views generate`, `stories generate`, `query graph`, `query views`, `diff`, `plateau list` and `query schemas workspace` on every shipped workspace give the same output, exit codes and files as the base jar; the `--help` of every command but the top command is identical (the top command gains `guide` and `init`). The editor's save writes the bytes of the base page for every edit but the shapes W-5 changes.
- **T2. Derived, not written.** No schema, list of kinds, nesting rule or command list is typed by hand in the guide or the schema. The content schema is generated from `ManifestKind.getType()` and the classes; the nesting from `Parent#elementType()` and `Nesting`; the commands from the Picocli spec. A hand-written statement that the code can give is a defect of the run.
- **T3. Shape of `query schemas manifest`.** The TDD of W-1 chooses (the envelope with the content of every kind, or `--kind <kind>`, or an object keyed by kind) with these constraints: with no option it describes every kind; `content` is no longer `any`; the output is deterministic (the sorted writer of `GetSchemasQuery`); the schema says the nesting (which kind goes under which `header.parent`, and in `elements`), the id rule (`[a-z0-9_-]`, no dot), the reference form, `plateau`, `replaces`, and `settings` for `workspace` if the run finds them missing. What the schema cannot say (a reference declared twice, a dangling reference, a plateau cycle) is listed, one line each, in the test table of V3 and in the guide.
- **T4. The guide.** `archicode guide` prints Markdown to the standard output, loads no workspace, reads nothing outside the application (a resource in the jar and in the native image: `quarkus.native.resources.includes`), and has the version as its first line. It is self-sufficient: it does not rely on the manual, which is published for the latest release only. A size budget, fixed by the run and held by a test (proposed: 30 KB, about 8k tokens), keeps it readable in one go. Its examples are files of the corpus (V3).
- **T5. `init`.** `archicode init [FOLDER]` (default: the current folder) writes `.archicode.yaml` and the smallest manifests that load and draw (a person, a system with a container, a relationship, a view), and the `.gitignore` line for the generated views. It never overwrites: a folder that already holds `.archicode.yaml` is one `error:` line, exit 1, nothing written; it prints what it wrote and the two commands to run next. Content as simple as possible (the rule of the importers' decisions). Its output is a form the repository ships, so the rule of `CLAUDE.md` applies: loaded by both tools in a test.
- **T6. The validation architecture** below is part of the plan: each run names which checks it adds, and the gates are written from it.
- **T7. All six runs are serialized, concurrency 1**, as in the last four waves: every run shares `CLAUDE.md`, W-1 to W-4 share `cli/ArchiCode.java`, `reflect-config.json`, `application.properties` and the tests of the schema and the guide.
- **T8. The save (W-5).** #154 (`- |` as a list item) and L2 of #155 (the first key of a list-item map changes) are fixed in `standalone.html` by the rules of wave 021 (the line-preserving save; the fallback stays where a fix is not safe); the generator of wave 021 (`save-generator.js`, seeded) gains the two shapes, the 'known limit' tests of #154 and L2 turn into passing tests, the ones of L3 and L4 stay.
- **T9. Draft PR early.** The pull request is opened as a draft from W-2 on (the first run that adds a native resource), so the `Native` job proves the guide and `init` in the native image while the next run is written (lesson of wave 021).

## Validation architecture

The risk of the wave is not that a command fails; it is that a schema, a guide and a scaffold are *plausible and wrong*, and that nobody notices because the author of the wave wrote both the claim and the check. So every deliverable is checked from at least one side its author does not control: the Java classes, the editor's table, the shipped corpus, the process boundary, a reader who was not taught.

**One corpus, many oracles.** `ManifestCorpus` (a test helper, written by W-1 in `src/test/java/io/morin/archicode/`, beside `ShippedFilesTest`, which already enumerates the shipped examples) lists every file the repository ships or generates, each with its expected verdict:

- C1. the shipped examples (`src/doc/examples/*`) and fixtures (the layered Brightcart, the bookshop, the converted plateau fixtures): positives;
- C2. the cases of `negative-cases.json` (an altered copy of the layered Brightcart each): negatives, each tagged *structural* (unknown key, wrong kind, wrong shape, missing key) or *semantic* (dangling reference, declared twice, cycle, a plateau that does not resolve);
- C3. the output of `init` (from W-3);
- C4. every manifest and `.archicode.yaml` block in the guide (from W-2).

**The oracles**, each independent of the others:

| # | Oracle | What it holds | Fails when |
|---|---|---|---|
| V1 | Schema against the classes | Every property, required flag and enum of the content classes of `ManifestKind` is in the schema and the schema has nothing else; the schema is a golden file (`src/test/resources/schemas/`) so any change shows in review; two runs and two builds give the same bytes | a class gains a key and the schema is hand-edited or stale; the output is not deterministic |
| V2 | Schema against the editor | `EditorReadSchemaTest` is extended: the keys, required keys, enums and nesting of the new schema equal those of `READ_SCHEMA` (the classes, the editor and the schema agree three ways) | the editor and the schema disagree about a key or a kind |
| V3 | Schema against the loader, on the corpus | Every positive of C1, C3, C4 conforms to the schema (a checker in the test for the subset of the dialect the generator emits, since Q1 keeps it); every *structural* negative of C2 is rejected by it; every *semantic* negative is listed in a table with the reason it is not expressible, and the same table is in the guide | the loader accepts what the schema rejects or the reverse; a negative is neither rejected nor listed |
| V4 | Guide against the code | Every command and option of the Picocli spec is in the guide, every `ManifestKind` and its nesting is in the guide, every `bash` block that names `archicode` runs on a copy of a corpus workspace and exits as the guide says, the first line is the version of the pom, two runs give the same bytes, the guide is the same from any folder, it is under its size budget | a command is added and the guide does not say it; an example in the guide does not run or load |
| V5 | Process boundary, jar and native | `*IT` classes in `src/test/java/io/morin/archicode/it` run `query schemas manifest`, `guide` and `init` as a process on the jar and on the native runner (the Native job) and compare the output with the golden files; every new class is in `reflect-config.json` (`NativeReflectionConfigTest`) and every new resource in `quarkus.native.resources.includes` | the native image lacks a resource or a class; the output differs between the jar and the native runner |
| V6 | A reader who was not taught | (a) Scripted walk, an IT: from an empty folder, using only what the tools print, `guide`, then `init`, then a manifest for a new element written from the guide's example, `views generate`, a deliberate mistake whose `error:` line names what to write, a plateau with one patch, `diff`; every step's output and exit code asserted. (b) One cold-agent trial by the orchestrator at the gate of P1: a fresh `general-purpose` sub-agent in an empty folder, given the binary and a task (a small shop: a person, two systems, relationships, a plateau, a view), told not to read the repository or the manual; the run records the commands it ran, which printed text it relied on, the failures, and the gaps it found, fixed or filed | the walk needs a fact the tools do not print; the trial cannot get from nothing to a workspace that `views generate` draws and `query graph` reads |
| V7 | Byte identity | T1: the sweep of every command over the shipped workspaces against the base jar (368 commands, 15511 files in wave 021), and `--help` of the existing commands; for W-5 the 4890 edits over the 399 shipped YAML files against the base page | an existing output moves |

Which run adds what:

| Run | Adds | Uses |
|---|---|---|
| W-1 | `ManifestCorpus` (C1, C2), V1, V2, V3, the IT of the schema (V5) | V7 |
| W-2 | C4, V4, the IT of the guide (V5) | V1, V3, V7 |
| W-3 | C3, the IT of `init` (V5), the quick-start line of the guide | V3, V4, V7 |
| W-4 | V6 (a) and (b); fixes to the guide or the schema that V6 finds | V1 to V5, V7 |
| W-5 | the generator's two shapes; V7 for the page | the generated test of wave 021 |
| W-6 | the manual's examples are in C1 (already enumerated) | V7 |

A check is not run only on the final tree: each run runs the gate set and its own oracles before it completes, and the orchestrator reruns them (as in wave 021).

## Wave Manifest

```yaml
wave_manifest:
  wave: 022
  slug: agent-way-in
  status: completed
  sources: []
  phases:
    - id: P0
      name: A schema to write from
      gate:
        criteria:
          - '`archicode query schemas manifest` no longer has `"type": "any"` for `content`, describes the content of each of the ten kinds of `ManifestKind` with its keys, required keys, enums and shapes, and says the nesting of kinds, the id rule and the reference form; two runs and a jar and a native build print the same bytes, equal to the golden file (V1, V5)'
          - 'the properties, required flags and enums of the schema equal those of `READ_SCHEMA` and of the classes (`EditorReadSchemaTest` extended, V2)'
          - 'every positive file of `ManifestCorpus` conforms to the schema, every structural negative of `negative-cases.json` is rejected, and every semantic negative is in the table of what the schema cannot say (V3)'
          - '`query schemas workspace` and every other command listed in T1 are byte-identical to the base jar (V7)'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P1
      name: A way in, proved
      gate:
        criteria:
          - '`archicode guide` prints the guide from the jar and from the native runner (the `Native` job of the CI run of the pull request, `GuideIT`), the same bytes as the golden file, first line `archicode guide` plus the version of the pom, under its size budget; every command of the Picocli spec, every kind and its nesting are in it (V4, V5)'
          - 'every `bash` block of the guide that runs `archicode` is run in a test and exits as written; every manifest block of the guide is in the corpus and conforms to the schema (V3, V4)'
          - '`archicode init` in an empty folder writes `.archicode.yaml` and the manifests of T5, which the command line loads and draws (`views generate` exit 0) and the editor loads in a node test; in a folder that holds `.archicode.yaml` it writes nothing and prints one `error:` line, exit 1; from the jar and from the native runner (`InitIT`, V5)'
          - 'the scripted walk of V6(a) passes on the jar and on the native runner; the cold-agent trial of V6(b) is recorded in the progress log (commands, printed text relied on, failures, gaps fixed or filed) and its workspace is drawn by `views generate` and read by `query graph`, both exit 0'
          - 'the commands of T1 other than `guide`, `init` and `query schemas manifest` are byte-identical to the base jar and `--help` differs only in the top command (V7); every new class is in `reflect-config.json` and every new resource in `quarkus.native.resources.includes`'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
    - id: P2
      name: The save and the manual
      gate:
        criteria:
          - 'the generated test of the save (seed 154, at least 2000 cases) passes with the shapes of #154 and L2 added, fails on the page of the base for those shapes, and the tests that pinned #154 and L2 as limits pass as fixes while those of L3 and L4 still pin their limit; 4890 edits over the shipped YAML files write the bytes of the base page except the shapes fixed (V7)'
          - 'the manual builds; it tells `query schemas manifest` (what the schema says and what it cannot), `guide` and `init`, in the new upgrade block `upgrade-0-19`; the limits no longer list #154 and L2 of #155 and keep L3 and L4, #143, #134, #135, #65 and #24 (`#144`: the first three steps are built, `validate`, the edit commands and the MCP server are not)'
          - 'every example the manual ships is loaded by both tools; the views of every example are byte-identical to the base jar'
          - '`./mvnw -o verify -DskipITs=false`, `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`, `src/main/rust/viewpoint-kernel/embed.sh --check`, `node --test "src/test/javascript/**/*.test.js"` and `npx prettier --check "src/**/*.java"` pass'
  runs:
    - id: W-1
      slug: manifest-content-schema
      phase: P0
      depends_on: []
      run: 0158
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/GetSchemasQuery.java'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'src/main/java/io/morin/archicode/resource/**'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/resources/schemas/**'
        - 'CLAUDE.md'
      focus: 'an agent can write any manifest from `query schemas manifest`: the content of each kind, the nesting, the id rules, derived from the classes and checked against the editor and the corpus (#144)'
    - id: W-2
      slug: guide-command
      phase: P1
      depends_on: [W-1]
      run: 0159
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/guide/**'
        - 'src/main/resources/application.properties'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/resources/guide/**'
        - 'CLAUDE.md'
      focus: '`archicode guide` prints a versioned guide generated from the schema and the command list, in the jar and the native image, with examples that the tests load and run (#144)'
    - id: W-3
      slug: init-command
      phase: P1
      depends_on: [W-2]
      run: 0160
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/init/**'
        - 'src/main/resources/guide/**'
        - 'src/main/resources/application.properties'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: '`archicode init` writes a workspace that loads in both tools and is drawn, and the guide tells how to start with it (#144)'
    - id: W-4
      slug: agent-walk
      phase: P1
      depends_on: [W-3]
      run: 0161
      delegation: standard
      likely_paths:
        - 'src/test/java/io/morin/archicode/it/**'
        - 'src/main/resources/guide/**'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/manifest/**'
        - 'CLAUDE.md'
      focus: 'a walk from an empty folder, scripted and with one cold agent, shows that the schema, the guide and `init` are enough, and fixes what it finds missing (#144)'
    - id: W-5
      slug: save-block-scalar-in-list
      phase: P2
      depends_on: []
      run: 0162
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/**'
        - 'CLAUDE.md'
      focus: 'the save keeps the comments of a file that holds `- |` and keeps a block scalar when the first key of a list item changes (#154, #155 L2)'
    - id: W-6
      slug: manual-and-notes-022
      phase: P2
      depends_on: [W-4, W-5]
      run: 0163
      delegation: standard
      likely_paths:
        - 'src/doc/**'
        - 'src/site/**'
        - 'CLAUDE.md'
      focus: 'the manual and CLAUDE.md say what the tools do at the end of wave 022'
```

## Phase P0 — A schema to write from

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0158 | `manifest-content-schema` | — | the manifest schema an agent can write from (#144) | T2, T3: generate the content schema of each `ManifestKind` from its class, the nesting from `Parent#elementType()` and `Nesting`, the id and reference rules, `plateau`, `replaces`; check that `workspace` says `settings`, the facets and the styles, and add what it lacks (listed); `ManifestCorpus` (C1, C2, each negative tagged structural or semantic) and the checker for the subset of the dialect; V1, V2, V3; golden file; `QueryGroup` unchanged apart from the option if T3 chooses one; report what the dialect cannot express (Q1) and how the polymorphic `elements` came out | the five criteria of P0; `NativeReflectionConfigTest` and the IT of `query schemas manifest` pass; the table of what the schema cannot say is in the test |

**Gate:** the five criteria of P0 in the manifest.

## Phase P1 — A way in, proved

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-2 | 0159 | `guide-command` | W-1 | `archicode guide` (#144) | T4: a `GuideCommand` on the top command; the guide is built from the schema of W-1, the Picocli spec and a resource text; in the native image; golden file; budget; V4 and the IT; the draft pull request is opened (T9) | the first three criteria of P1 for the guide; the `Native` job of the CI run proves the guide |
| W-3 | 0160 | `init-command` | W-2 | `archicode init` (#144) | T5: an `InitCommand`; the files it writes are resources; C3; loaded by the CLI and by the editor in a node test; the guide's quick-start line; `InitIT` | the third criterion of P1 |
| W-4 | 0161 | `agent-walk` | W-3 | the walk from nothing (#144) | V6: the scripted walk as an IT, then the cold-agent trial run by the orchestrator against the built jar; every gap it finds is a fix in the guide, the schema or `init`, or an issue; the sweep of V7 | the fourth and fifth criteria of P1 |

**Gate:** the six criteria of P1 in the manifest.

## Phase P2 — The save and the manual

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-5 | 0162 | `save-block-scalar-in-list` | — | #154 and #155 L2 | T8: `locateEmittedLines` and the header test that three functions share want a key before `: \|`; the key that takes the dash line of an item map keeps a block scalar after it; the generator gains the two shapes; the pinned limits of the two become passing tests | the first criterion of P2; closes #154 and, with L3 and L4 left, the rewrite of #155 is proposed to the author |
| W-6 | 0163 | `manual-and-notes-022` | W-4, W-5 | the manual and `CLAUDE.md` | the three commands under the commands reference (and the section on schemas, with what the schema cannot say), the upgrade block `[[upgrade-0-19]]` (a reader who knows 0.19.0), the save's limits, the notes of `CLAUDE.md`, the open issues | the last three criteria of P2 |

**Gate:** the four criteria of P2 in the manifest.

## Dependency View

```
P0:  W-1
P1:  W-1 ──> W-2 ──> W-3 ──> W-4
P2:  W-5 (no edge)        W-6 <── (W-4, W-5)
     no run is hard_judgment; every run is serialized
```

## Risks

- **Overlaps, all `serialize`.** The runs are dispatched one at a time, W-1 to W-6. Pairs that share paths: W-1 to W-4 (`cli/**`, `reflect-config.json`, `application.properties`, the tests of the schema and the guide), W-2 to W-4 (`src/main/resources/guide/**`), W-5 and W-6 with nothing before them but `CLAUDE.md`, every run (`CLAUDE.md`).
- **The edges are real, the chain is a choice.** W-2 generates from the schema of W-1; W-3 edits the guide W-2 creates (its quick-start line) and the author ordered guide before `init`; W-4 uses all three. W-5 shares no file with W-1 to W-4 and could run beside them, but it stays serialized (T7): the repository's timing tests (`performance-budget`, `quiet-references`) fail under load when two builds run together.
- **W-1 may find the elements are awkward to describe.** The elements are interfaces whose `elements` are polymorphic by `kind`, which the generator describes by their getters (the reason the output is sorted). If the generator cannot give a usable content schema for a nested element, the run says exactly what, and builds the nesting from `Nesting` and the kinds table rather than hand-writing: if that is not enough it stops and reports, and the author decides (T2 allows no hand-written schema). This is the one place the wave may not reach its end as planned, and it is the first run.
- **The dialect (Q1).** A content that depends on `header.kind` has no `oneOf` in the generator's dialect. The default keeps the dialect and puts the kinds side by side; a more expressive schema would move `query schemas workspace`, which T1 forbids unless the author chooses it.
- **The corpus is the oracle, so it must be right.** If a negative is mistagged as structural, V3 asks the schema for something it cannot say. The run tags each case by reading the loader's message (`unknown key`, `wrong shape`, `unrecognized`, `missing` are structural) and lists the rest.
- **The guide drifting in a way no test sees.** V4 covers commands, kinds, examples, the version and the budget; the resource text of the conventions (ids, plateaus, stories) is not generated. Its claims that the code can answer are tested by running the examples; the rest is judged by the cold-agent trial (V6(b)), which is why it is in the gate and not a nicety.
- **The cold-agent trial is not repeatable.** It gives evidence, not a pass rate; the gate asks for the record and that the workspace it ends with is valid. A trial that fails is a gap to fix or file, not a reason to retry until it passes.
- **Native image.** Resources and classes are the usual miss (wave 019 to 021: `reflect-config.json`, `quarkus.native.resources.includes`). Each run that adds either names it in its exit evidence, and the draft pull request lets the `Native` job prove it early (T9).
- **W-5 touches the save.** A wrong splice loses an author's text. The generated test and the base-page comparison of wave 021 are the guard; the block fallback stays wherever the fix is not safe.

## Completion Criteria

The three gates in the manifest hold on the final tree; the progress log records the base of T1, the cold-agent trial, and the deferred items as issues (the gaps the trial found that are not fixed, the dialect if the author wants IDE validation, the publication of the guide on the site); `CLAUDE.md` lists #154 and L2 of #155 as fixed, keeps #144 open with its remaining steps (`validate`, edit commands, MCP) and keeps #143, #134, #135, #65 and #24 open; the PR closes #154 and does not close #144 or #155. Not verified by anyone, to be named in the final log: a real IDE using the schema, an agent client other than the one used for the trial, and the next release.

### Outcome (2026-10-24)

All three gates held. Exceptions and what was not verified: a real IDE using the schema, an agent client other than the one used for the trial (a `general-purpose` sub-agent with only the binary), and a screen of the editor in a browser for W-5 (the save is checked by the generated test and by the comparison with the page of 0.19.0, not by eye). The deferred items are filed as issues (the saved overview view with no `properties` that ends in a NullPointerException; the dangling-reference sentence that names no file). Q1 (dialect) kept, Q2 resolved (0.19.0 cut first), Q3 answered in the guide (kinds, nesting, commands and options generated; conventions as text), Q4 kept (the trial found five gaps in the text, all fixed).
