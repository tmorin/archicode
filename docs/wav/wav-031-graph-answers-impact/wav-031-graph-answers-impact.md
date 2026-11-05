---
type: wave
wave: 031
status: completed
date: 2026-11-01
related:
  - docs/wav/wav-031-graph-answers-impact/wbc-031-graph-answers-impact.md
  - docs/wav/wav-029-archicode-self-model/wav-029-archicode-self-model.md
  - src/test/javascript/architecture/impact-questions.json
  - scripts/byte-identity.sh
---

# Wave 031 — The graph answers impact questions

## Purpose

`archicode query views` marks every view `saved: true` or `saved: false`; `archicode query graph` lists the deployments of a workspace; `archicode query impact <reference>` returns the elements a change reaches, so no client walks the graph itself. The impact oracle calls the command for its questions, `CLAUDE.md` points to it, the manual and the guide say it, and `scripts/byte-identity.sh` accepts a declared change of standard output.

## Non-Goals

- No `deployments` entries among `relationships`, and no change to `element.applications` (the author refused it).
- No `derived_dependencies` of the kernel (application-to-application links between environments): another question.
- No change to the editor: it does not read `query views` or `query graph`.
- No `saved` field on `View` (it would move the manifest schema and the golden of the workspace schema).
- No new question beyond the two on deployment (#189) in the oracle.
- No toolbar, no documentation rewrite, no CI filter (#194, #193, #195, #192 are other waves).

## Decision Prerequisites

None open: the shape of the three outputs is decided on #184, #189 and #187. One question is recorded below as an open question.

## Open questions

- **Q1 (answered by the author, 2026-11-02: yes, as recommended). `--through deployments` of `query impact` is part of this wave.** #189 and #187 say the command crosses deployments "later, through an explicit option"; this wave makes both exist, so the option is the last task of W-3: the two oracle questions on deployment (Q08, Q09) then use the command and the walk in test code can go.

## Wave Manifest

```yaml
wave_manifest:
  wave: 031
  slug: graph-answers-impact
  status: completed
  sources:
    - '#184'
    - '#189'
    - '#187'
  phases:
    - id: P1
      name: Declared changes of the outputs
      gate:
        criteria:
          - 'with the application built (`./mvnw -o package -DskipTests -DskipITs`), `java -jar target/quarkus-app/quarkus-run.jar query views -w docs/architecture/.archicode.yaml` prints a boolean `saved` on every entry, true on exactly the 5 saved views of docs/architecture/manifests/views and false on every other, and `-q ''$[?(@.saved==true)]''` prints only those 5'
          - 'the same `query views` command on src/doc/examples/domain_workspace/.archicode.yaml and on a workspace made by `archicode init` prints `saved` on every entry too, and a test covers a saved view named like a derived id (both entries kept)'
          - '`java -jar target/quarkus-app/quarkus-run.jar query graph -w docs/architecture/.archicode.yaml` has a top-level `deployments` list that holds {"node":"github.actions","application":"archicode.commandline"} and {"node":"github.actions","application":"archicode.editor"}, and the output for a workspace made by `archicode init` has no `deployments` key'
          - '`scripts/byte-identity.sh` exits 0 and its output shows that an undeclared change of standard output is reported by the self-check and a declared one is accepted (the base jar is built by the script itself from the tag archicode-0.19.0 into ~/.cache/archicode-byte-identity/archicode-0.19.0; JAVA_HOME must be a JDK 25)'
          - '`./mvnw test` exits 0, and `grep -c ''has("name")'' src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java` prints 0'
          - 'src/test/javascript/architecture/impact-questions.json holds 9 questions, Q08 and Q09 asking about deployment, each with an exact expect list, and ArchitectureImpactTest passes'
          - 'the manual (src/doc/README.adoc) says `saved` in its section on `query views` and `deployments` in its section on `query graph`, and `./mvnw test -Dtest=ManualExamplesTest` exits 0'
    - id: P2
      name: The traversal in the tool
      gate:
        criteria:
          - '`java -jar target/quarkus-app/quarkus-run.jar query --help` lists `impact`, and `java -jar target/quarkus-app/quarkus-run.jar guide` names the command, every option of it and the containment rule; `./mvnw test -Dtest=GuideTest` exits 0 with src/test/resources/guide/golden.md regenerated'
          - 'ArchitectureImpactTest answers Q01 to Q07 through `query impact`, and the `expect` lists of Q01 to Q07 in src/test/javascript/architecture/impact-questions.json equal those of the commit ff3bacd (`git diff ff3bacd -- src/test/javascript/architecture/impact-questions.json` shows no changed line inside Q01 to Q07)'
          - '`query impact nowhere -w docs/architecture/.archicode.yaml` prints one line starting `error:` on the error output and exits 1; `--depth 0` and `--depth -1` are refused the same way'
          - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json names the class of the new command, and an integration test next to src/test/java/io/morin/archicode/it/AgentWalkIT.java runs `query impact` on the packaged jar'
          - 'the section `agents` of src/site/index.html and src/site/llms.txt (next to its line "Work with an agent") name `archicode query impact`; both exist since wave 030'
          - 'CLAUDE.md tells to run `archicode query impact` and no longer tells to follow the relationships by hand; `git diff` of CLAUDE.md for the wave touches only that paragraph'
          - 'src/doc/README.adoc has a section for `query impact`, and `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run format:check`, `npm run lint` all exit 0, and `npm run sample:build` leaves `git status --short` unchanged'
  runs:
    - id: W-1
      slug: views-saved-marker-and-stdout-harness
      phase: P1
      depends_on: []
      run: 0219
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/GetViewsQuery.java'
        - 'src/test/java/io/morin/archicode/cli/GetViewsQueryTest.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureModelTest.java'
        - 'scripts/byte-identity*'
        - 'src/test/CLAUDE.md'
        - 'src/doc/README.adoc'
        - 'src/test/resources/**'
      focus: 'tell a saved view from a derived one in the output, and let the byte-identity harness accept a declared change of standard output'
    - id: W-2
      slug: graph-deployments
      phase: P1
      depends_on: [W-1]
      run: 0220
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/GetGraphQuery.java'
        - 'src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java'
        - 'src/test/java/io/morin/archicode/brightcart/BrightcartStableOutputTest.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureGraph.java'
        - 'src/test/java/io/morin/archicode/doc/ArchitectureImpactTest.java'
        - 'src/test/javascript/architecture/impact-questions.json'
        - 'scripts/byte-identity*'
        - 'src/doc/README.adoc'
        - 'src/test/resources/**'
      focus: 'ask which applications a node hosts, and which nodes an application runs on, from the output of query graph'
    - id: W-3
      slug: query-impact
      phase: P2
      depends_on: [W-2]
      run: 0221
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/workspace/Impact*.java'
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/main/resources/guide/**'
        - 'src/test/resources/guide/**'
        - 'src/test/java/io/morin/archicode/**'
        - 'src/test/javascript/architecture/**'
        - 'src/main/java/io/morin/archicode/workspace/CLAUDE.md'
        - 'src/doc/README.adoc'
        - 'src/site/**'
        - 'CLAUDE.md'
      focus: 'ask "what does a change to X touch" with one command and the same answer for every client'
```

## Phase P1 — Declared changes of the outputs

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-1 | `views-saved-marker-and-stdout-harness` | — | tell a saved view from a derived one in the output, and let the harness accept a declared change of standard output | `saved: true\|false` on every entry of `query views`, built in `GetViewsQuery` from two lists (saved, derived) before `-q`, so it holds in JSON, YAML, TOML, a custom template and with JSONPath; no field on `View`; a saved view named like a derived id keeps both entries; the sort order unchanged; `ArchitectureModelTest.shouldListFourOrFiveSavedViews` moves from `has("name")` to the marker; `scripts/byte-identity.sh` learns a declared change of standard output (a file like `byte-identity-new-files.txt`, with its self-check); the manual's "Query views" and the upgrade notes; goldens in the same commit. If the harness change proves too heavy, the author's fallback is a `--saved` option alone, which leaves the default output byte for byte | the gate of P1 for `saved`, the harness and `ArchitectureModelTest` |
| W-2 | `graph-deployments` | W-1 | ask which applications a node hosts from the output of `query graph` | top-level `deployments: [{"node","application"}]` beside `elements` and `relationships`, sorted by node then in the order written, omitted when empty (a workspace with no deployment prints the same bytes); declared in the harness with the mechanism of W-1; `GetGraphQueryTest` pins the shape, the order and the empty case; `BrightcartStableOutputTest` goldens move; `ArchitectureGraph` reads `deployments`; the oracle crosses it only for a question that asks (`"through": ["deployments"]`), and gets Q08 and Q09 (the applications affected when `github.pages` is down; where `archicode.editor` is deployed and what shares those nodes); the manual's "Query graph" | the gate of P1 for `deployments` and the oracle |

**Gate:** the seven criteria of P1 in the manifest.

## Phase P2 — The traversal in the tool

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-3 | `query-impact` | W-2 | ask "what does a change to X touch" with one command | `workspace/Impact` as a plain Java class (no Picocli, no CDI, like `Fold`) and `cli/ImpactQuery` thin, built on a graph builder shared with `query graph`; `archicode query impact <reference> [--direction in\|out\|both] [--depth n] [--qualifier Q]...` (repeatable, any of) with `--plateau` through the mixin; containment (a reached element covers its descendants by reference prefix, `ref` or `ref.`, and the start and its descendants are left out; said in the manual); each element once at its shortest distance; `--depth` unbounded by default, 0 or negative refused; an unknown reference one `error:` line; JSON `{start, direction, depth, reached: [{reference, distance, via: {source, destination, qualifiers, label}}]}` sorted by distance then reference, `via` the first path found; `ArchitectureImpactTest` answers its seven questions through the command and keeps the old walk as a second oracle for one run; `GuideTest` and its golden, `reflect-config.json`, an integration test beside `AgentWalkIT`, the manual, the pointer in `CLAUDE.md`, the section `agents` of `src/site/index.html` and `src/site/llms.txt` (they exist since wave 030), and the how-to "Work with an agent" of the manual, `docs/architecture` kept true (`npm run sample:build` if it changes); `--through deployments` as the last task (Q1 answered yes), which lets Q08 and Q09 of the oracle use the command | the gate of P2 |

**Gate:** the seven criteria of P2 in the manifest.

## Dependency View

```
W-1 --> W-2 --> W-3
```

A straight line: W-2 uses the harness mechanism W-1 builds; W-3 is built on the graph W-2 completes, and the author ordered it after #189.

## Risks

- **Overlap W-1, W-2 and W-3:** they list the same documents (`src/doc/README.adoc`), the same test resources, and W-1 and W-2 the same harness files. Each pair is joined by a `depends_on`, so none shares a batch. No verdict is needed; if a dependency is ever removed, the verdict is `serialize`.
- **Goldens move in many places.** `query views` and `query graph` are run by about 31 and many more test call sites, and by `scripts/byte-identity.sh` on every workspace. The change that adds a key must keep each golden and each declared change in the same commit. A test that asserts on a whole output breaks where an id assertion would not.
- **The harness compares with the jar of 0.19.0.** Its base is built from a tag, so the run needs git, the offline Maven repository and a JDK 25 (the shell's `java` may be 21: `export JAVA_HOME=$(ls -d ~/.sdkman/candidates/java/25* | head -1)`). The gate names the folder the script keeps its base in and says the script rebuilds it.
- **Containment is a product rule.** A reached element covers its descendants and the start is left out: W-3 says it in the manual and pins it with cases; a different rule would change the seven answers, which the gate holds to the commit `ff3bacd`.
- **The native image.** A new command needs `reflect-config.json`; the gate checks the file, the Native job of CI proves the image. The wave's pull request does not run the native build on a branch the way a tag does (see the CI notes): the runs say so if it is not proved.
- **`likely_paths` of W-3 are wide** (`src/main/java/io/morin/archicode/cli/**`); with nothing in the same batch this costs nothing.

## Completion Criteria

- Both gates hold.
- The three issues #184, #189 and #187 are closed by the wave's pull request (or the progress log says why one stays open, as for the fallback `--saved`).
- `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run format:check` and `npm run lint` pass.
- `scripts/byte-identity.sh` passes with every changed output declared.
- `query impact --through deployments` answers Q08 and Q09 of the oracle (Q1).
