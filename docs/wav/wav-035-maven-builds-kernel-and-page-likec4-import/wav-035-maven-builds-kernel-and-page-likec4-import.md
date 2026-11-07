---
type: wave
wave: 035
status: proposed
date: 2026-11-07
related:
  - docs/wav/wav-035-maven-builds-kernel-and-page-likec4-import/wbc-035-maven-builds-kernel-and-page-likec4-import.md
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/wav-034-diagrams-assets-likec4-matrix-page.md
  - docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/tdd-0229-likec4-json-import.md
---

# Wave 035 — Maven builds the kernel and the page, and the LikeC4 importer

## Purpose

On a clean checkout with `rustup` and Node installed, `./mvnw` builds the viewpoint kernel from its Rust, bundles CodeMirror and ELK, assembles the editor page and its samples, and puts them in the jar and the website; none of these generated files is committed, the bytes are those the committed files had, and the editor still opens from a disk, offline. `archicode import likec4 <model.json> --output <folder>` writes a workspace from a LikeC4 JSON export, with a report of what it dropped.

## Non-Goals

- No change of the kernel's Rust, of `src/main/editor` beyond the paths and the loading of the files the build moves, of `plateau matrix`, `gap.*` or `matrix-cases.json`.
- No change of a command's output on a shipped workspace: `scripts/byte-identity.sh` stays green with `scripts/byte-identity-exceptions.txt` unchanged (`import likec4` is a command that did not exist: the script compares only what an earlier jar can write).
- No LikeC4 DSL input (a `.c4` file is refused with the export command), no editor action for the import, no views, no deployment (the decisions on #134).
- No rest of #24 (relationships, a transient row, all-against-baseline, the time of `compare` in the browser): the author has decided none of it, so no run can be written. #24 is delivered as far as it was decided; its label `ready` and its title are stale and the author closes or retitles it.
- No tag and no release: the website and the five native binaries change on the next tag, which the author decides.
- No GitHub Actions cache or release asset to carry the `.wasm`: rejected in #207 (the build is reproducible, there is nothing to fetch).

## Decision Prerequisites

- **The LikeC4 sample (gates P3).** The sample is the JSON that `likec4 export json` writes for the MIT example `cloud-system` of `github.com/likec4/likec4`. Run 0229 of wave 034 installed `likec4@1.60.0` with `--ignore-scripts` and cloned the repository at its tag without trouble; only `likec4 export json` was refused by the session's permission system. Before launching, the author either allows that one command for the run, or runs it once in a scratch folder (below) and says where the JSON is. If neither, the run of P3 stops at its first task with the reason, as the plan of run 0229 says, and invents nothing; P1 and P2 are not blocked. With `run-management` 3.3.0 or later, a run that is then `cancelled` and that no live run depends on does not block the closing of the wave (nothing depends on W-3), so the wave closes with P1 and P2 and #134 stays open; a `superseded` run would still block.

```bash
mkdir -p /tmp/likec4-sample && cd /tmp/likec4-sample
npm install --ignore-scripts likec4@1.60.0
git clone --depth 1 --branch v1.60.0 https://github.com/likec4/likec4
npx likec4 export json --skip-layout --project cloud-system -o cloud-system.json likec4/examples/cloud-system
```

## Open questions

Each has a proposed default, to confirm; none blocks the start.

- How Maven runs `cargo` and `npm` (the exec plugin, the frontend plugin, or a plugin for each), and in which phases. Default: the run's design reads the plugins' current versions and picks the one that fails with one clear line when the tool is missing.
- The baseline for the tests and the CI step that compare with the page of an earlier tag (`git show archicode-X:...`) once no tag holds a page. Default: the page inside the released jar of the tag, or a release asset; for tags before this wave, the committed page stays reachable by `git show`.
- Where the author gets a page to open from a disk without building. Default: the build's folder after `./mvnw package` or `npm run editor:build`, and the website's `/editor/`; the gate requires the built folder to open from a disk (the third test of `editor-offline.spec.js`).
- Whether `ci-build.yaml` installs Rust and Node in every job that runs `./mvnw`, or the jobs share a cache. Default: install in each, cache `~/.cargo` and `target`; the run reports the time added to each job.

## Wave Manifest

```yaml
wave_manifest:
  wave: 035
  slug: maven-builds-kernel-and-page-likec4-import
  status: proposed
  sources:
    - '#207'
    - '#134'
  phases:
    - id: P1
      name: Maven builds the kernel
      gate:
        criteria:
          - '`git ls-files | grep -c viewpoint_kernel.wasm` prints 0 (1 on the starting repository, commit 7742b07)'
          - 'with JAVA_HOME a JDK 25, `rm -rf target && ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true` exits 0, and the file `editor-webapp/assets/viewpoint_kernel.wasm` inside the jar of `target/quarkus-app/lib/main` or `target/quarkus-app/app` (the run names which) is byte-identical to `git show 7742b07:src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm`; a second clean build gives the same SHA-256'
          - 'with a PATH that holds `java` and the Maven wrapper but neither `cargo` nor `rustup`, `./mvnw -o validate` or the first phase that builds the kernel exits non-zero and prints one `[ERROR]` line that names `rustup`, with no stack trace of a plugin'
          - '`grep -rn "Maven needs no Rust" --include=CLAUDE.md .` prints nothing (2 hits on the starting repository), and `grep -c "committed" src/main/rust/viewpoint-kernel/CLAUDE.md` prints no line that says the `.wasm` is committed'
          - 'the step "Check the committed WebAssembly is the one the Rust builds" of `.github/workflows/ci-build.yaml` is gone or reads the build (`grep -c` of that exact name prints 0 or the step no longer runs `embed.sh --check`; it is 1 on the starting repository), and the document of the run lists each job of that file that runs `./mvnw` with the step that makes `cargo` available in it, each of which the gate agent finds in the file'
          - '`./mvnw test-compile pmd:check`, `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run editor:check`, `npm run format:check` and `npm run lint` exit 0 with `npm ci` and the Maven build run first, `scripts/byte-identity.sh` exits 0 with `scripts/byte-identity-exceptions.txt` unchanged, and `npm run editor:build` leaves `git status --short` unchanged'
    - id: P2
      name: Maven builds the editor page
      gate:
        criteria:
          - '`git ls-files src/main/resources/editor-webapp` prints nothing (8 files on the starting repository), and `git ls-files | grep -c viewpoint_kernel` prints 0'
          - 'with JAVA_HOME a JDK 25, `rm -rf target node_modules && ./mvnw package -Dmaven.test.skip -Dplugin.asciidoctor.skip=true` exits 0 (Maven runs `npm ci` itself) and the jar holds `editor-webapp/standalone.html`, `assets/codemirror.js`, `assets/elk.js`, `assets/viewpoint_kernel.js`, `samples/brightcart.yaml` and `samples/archicode.yaml`'
          - 'the built `codemirror.js`, `elk.js` and `viewpoint_kernel.js` are byte-identical to the files of the same names under `src/main/resources/editor-webapp/assets/` at commit 7742b07 (`git show 7742b07:<path>`), and the built `standalone.html` is too unless the document of the run names the change of `src/main/editor` that explains the difference'
          - 'the built folder opens from a disk and offline: `npx playwright test src/test/e2e/editor-offline.spec.js --project=chromium` and `--project=firefox` exit 0, including its third test (page opened from a disk, no `import(`, classic scripts), reading the page from the folder of the build, and `npm run test:unit` exits 0 (it includes `remote-import.test.js`)'
          - 'the step "Assemble website" of `.github/workflows/ci-build.yaml` copies the page, the assets and the samples from the folder of the build and compares them with `cmp`: `sed -n "/Assemble website/,/Publish website/p" .github/workflows/ci-build.yaml | grep -c "src/main/resources/editor-webapp"` prints 0 (at least 6 on the starting repository)'
          - 'no CLAUDE.md says that the page, the bundles, the kernel or the samples are committed: `grep -n "committed" CLAUDE.md src/main/editor/CLAUDE.md src/main/rust/viewpoint-kernel/CLAUDE.md | grep -E "standalone|assets|wasm|bundle|sample|page"` prints nothing (at least 4 lines on the starting repository), and the manual (`src/doc/README.adoc`) says how to get the page'
          - '`npm run test:unit`, `npm run test:coverage`, `npm run format:check`, `npm run lint`, `./mvnw test-compile pmd:check` and `./mvnw verify -DskipITs=false` exit 0, `scripts/byte-identity.sh` exits 0 with `scripts/byte-identity-exceptions.txt` unchanged, `ratchet.max` in `src/main/editor/layers.json` is at most 99 (it is 99), and `git diff 7742b07 HEAD -- scripts/editor-coverage-floor.json` shows no number lower than before'
    - id: P3
      name: The LikeC4 importer
      gate:
        criteria:
          - '`src/test/resources/likec4/` holds a JSON file, the MIT licence text and a provenance text that names `github.com/likec4/likec4`, the version of the tool, the command run and a 40-hex commit SHA (the folder does not exist on the starting repository); the JSON has no `views` the importer does not read, and the file is the vendor tool''s output, not written by hand'
          - 'on the packaged application (`java -jar target/quarkus-app/quarkus-run.jar`), `import likec4 <the sample> --output <an empty folder>` exits 0 and prints one `warning:` line for each dropped part the sample holds, with `--map kind=kind` for each kind it names; `query graph` on the output prints as many elements as the sample''s `elements` minus the number the report says were dropped'
          - 'a `.c4` input, a non-empty output folder, and the sample with a kind that has no target and no `--map` are each one `error:` line, exit 1, no stack trace (the last names the kinds to map); `--map kind=kind` for each named kind then exits 0'
          - 'a test of `src/test/java/io/morin/archicode/it` (`LikeC4ImportIT` or the name the run gives) runs the import on the packaged application, a test loads the output with the command line and another in the editor''s node suite, and `grep -c LikeC4 src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json` prints at least 1 (0 on the starting repository)'
          - '`import structurizr` writes the same bytes and the same warnings as before: `StructurizrImportIT` and the Java tests of the Structurizr importer pass with their goldens unchanged (`git diff 7742b07 HEAD --stat -- src/test/resources/structurizr` prints nothing)'
          - '`./mvnw test-compile pmd:check`, `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run test:coverage`, `npm run format:check` and `npm run lint` exit 0, `scripts/byte-identity.sh` exits 0 with `scripts/byte-identity-exceptions.txt` unchanged, `CommandReferenceTest` lists `import likec4`, and `npm run sample:build` and the build of the page leave `git status --short` unchanged (the model of ArchiCode under `docs/architecture` names the new classes, and `ArchitectureDriftTest` passes)'
  runs:
    - id: W-1
      slug: kernel-built-by-maven
      phase: P1
      depends_on: []
      run: null
      delegation: hard_judgment
      delegation_reason: 'changes the build of the released jar and of the three native binaries (the other two targets are proved only by a tag run)'
      likely_paths:
        - 'pom.xml'
        - 'src/main/rust/viewpoint-kernel/embed.sh'
        - 'src/main/rust/viewpoint-kernel/CLAUDE.md'
        - 'src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm'
        - 'scripts/build-editor.mjs'
        - 'scripts/check-editor.mjs'
        - 'scripts/editor-coverage.mjs'
        - 'src/test/javascript/viewpoint-kernel/harness.js'
        - 'src/test/**'
        - '.github/workflows/ci-build.yaml'
        - '.github/CLAUDE.md'
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/doc/README.adoc'
      focus: 'build the repository from a clean checkout with Rust installed and get the same kernel bytes, with no .wasm committed'
    - id: W-2
      slug: editor-page-built-by-maven
      phase: P2
      depends_on: [W-1]
      run: null
      delegation: hard_judgment
      delegation_reason: 'changes the files the live hosted editor serves and what the jar holds (the website step is proved only by a tag run)'
      likely_paths:
        - 'pom.xml'
        - 'package.json'
        - 'scripts/**'
        - 'src/main/editor/**'
        - 'src/main/resources/editor-webapp/**'
        - 'src/main/java/io/morin/archicode/cli/EditorHttpServer.java'
        - 'src/test/**'
        - '.github/workflows/ci-build.yaml'
        - '.github/CLAUDE.md'
        - 'CLAUDE.md'
        - 'src/main/editor/CLAUDE.md'
        - 'src/test/CLAUDE.md'
        - 'src/doc/README.adoc'
        - '.gitignore'
      focus: 'open the editor from the folder a clean build writes, from a disk and offline, with no generated editor file committed'
    - id: W-3
      slug: likec4-json-import
      phase: P3
      depends_on: []
      run: null
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/importer/**'
        - 'src/main/java/io/morin/archicode/cli/ImportLikeC4Command.java'
        - 'src/main/java/io/morin/archicode/cli/ImportGroup.java'
        - 'src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json'
        - 'src/test/resources/likec4/**'
        - 'src/test/java/**'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
        - 'docs/architecture/**'
        - 'src/main/java/io/morin/archicode/CLAUDE.md'
      focus: 'bring a LikeC4 model in with one command and see what was dropped'
```

## Phase P1 — Maven builds the kernel

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-1 | `kernel-built-by-maven` | — | the same kernel bytes from a clean build, none committed | Maven runs the Rust build (the toolchain of `rust-toolchain.toml`, the `RUSTFLAGS` remap of `embed.sh`, `cargo build --release --target wasm32-unknown-unknown`) before the Chicory plugin; its output is Chicory's input and is put in the jar under `editor-webapp/assets/`; `build-editor.mjs`, the node harness and the coverage script read the `.wasm` from where the build writes it; the committed `.wasm` leaves the repository; one `[ERROR]` line when `rustup` is missing; the jobs of `ci-build.yaml` that run `./mvnw` get Rust and a cache; the Kernel job keeps its tests, clippy and coverage and loses its comparison of a committed file; the `CLAUDE.md` rules ("Maven needs no Rust") and the manual follow, with no history in them | gates 1 to 6 of P1 |

**Gate:** the six criteria of P1 in the manifest.

## Phase P2 — Maven builds the editor page

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-2 | `editor-page-built-by-maven` | W-1 | the page, its bundles, its kernel script and its samples built, never committed | Maven runs `npm ci` and the editor build (`build-editor.mjs`, `build-sample.mjs`: the bundles, `viewpoint_kernel.js` from the `.wasm` of W-1, the page, the samples) into `target/`, and the jar and the website take them from there; `src/main/resources/editor-webapp/` leaves the repository and the `.gitignore` says so; the fourteen Java readers, the node harness, the coverage script, the lint extraction and the job `Page` read the build's output; the tests that compare with the page of an earlier tag read the baseline named in the run's document; the page opened from a disk keeps working from the build's folder; the manual and the `CLAUDE.md` files say how to get the page | gates 1 to 7 of P2 |

**Gate:** the seven criteria of P2 in the manifest.

## Phase P3 — The LikeC4 importer

| # | Slug | Depends on | Focus | Scope | Exit evidence |
|---|------|------------|-------|-------|---------------|
| W-3 | `likec4-json-import` | — | `archicode import likec4 <model.json> --output <folder> [--map kind=kind]... [--project id]` | the starting point is the design of run 0229 (`docs/wav/wav-034-…/run/run-0229-likec4-json-import/`): a reader, a mapper and a service in `importer/`, a command `ImportLikeC4Command` in `ImportGroup`; the output side and the id rule that the Structurizr importer already holds are moved out of its classes; the sample generated once with the vendor tool and committed with its licence and provenance; goldens, one `*IT`, one editor test, `reflect-config.json`, the manual and the model of ArchiCode | gates 1 to 6 of P3 |

**Gate:** the six criteria of P3 in the manifest.

## Dependency View

```
P1  W-1 --> P2  W-2 --> P3  W-3
```

Only W-2 depends on W-1 (the page build writes `viewpoint_kernel.js` from the `.wasm` that W-1 builds). W-3 depends on neither; it comes last because it is the only run that waits on an input from outside, and because its tests read the page and the harness that W-2 moves.

## Risks

- **Overlaps, all with the verdict `serialize`; launch with `--max-parallel-runs 1`.** W-1 and W-2 share `pom.xml`, `ci-build.yaml`, the build scripts, the harness and the `CLAUDE.md` files; W-2 and W-3 share `src/test/**`, `src/doc/README.adoc` and `docs/architecture/**` with its generated sample.
- **The native binaries and the website are proved only by a tag run.** W-1 puts Rust in the jobs of three native targets (`ubuntu-24.04`, `ubuntu-24.04-arm`, `macos-15`) and W-2 changes what `Assemble website` copies; a pull request runs one native target and no website step, so the hand-off says what is unproved until a tag. Both runs are `hard_judgment` for that reason.
- **Time and cache.** A Rust build in every job that builds the jar adds minutes; W-1 reports the time of each job before and after and caches `~/.cargo` and `target`.
- **Reproducibility across machines.** The gate compares the built `.wasm` and the bundles with the committed bytes on one machine; the three native runners and a contributor's laptop are covered by the pinned toolchain and the remapped paths, which `embed.sh --check` has proved in CI so far. A byte that differs on macOS stops W-1.
- **The page opened from a disk.** The author uses `standalone.html` from `file://` and the files beside it are classic scripts; W-2 must not make the folder of the build differ from today's (the gate runs the disk test on it).
- **Past the tag.** The tests that compare with `git show archicode-X:…` have no page to compare with after W-2 for the tags cut after it; their baseline is an open question, settled in W-2's design.
- **The sample of W-3.** See Decision Prerequisites: the run stops at its first task without it. The author then cancels W-3 (not `superseded`): the wave closes with P1 and P2 merged, the gate of P3 is not required, and #134 stays open with the sample as its one open step. The workflow is generated with `run-management` 3.3.0 or later (a failed verification of a run is no longer read as verified).
- **Cost.** Wave 033 (two runs) used about 92 agents and 6.9 million tokens; three runs of the default profile, two of them wide, may use about 10 million. This is what the author is asked to approve.

## Completion Criteria

- The gates of P1, P2 and P3 hold; or, when W-3 is cancelled for want of the sample, the gates of P1 and P2 hold, W-3 is `cancelled` in the manifest and the gate of P3 is not evaluated.
- #134 (unless W-3 was cancelled: then it stays open) and #207 are closed by the wave's pull request; #24 is closed or retitled by the author (see Non-Goals).
- `./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run format:check` and `npm run lint` pass; the Native job and the three browser jobs of the pull request pass.
