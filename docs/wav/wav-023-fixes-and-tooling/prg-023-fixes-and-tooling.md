---
type: prg
status: active
date: 2026-10-24
related:
  - docs/wav/wav-023-fixes-and-tooling/wav-023-fixes-and-tooling.md
wave: 023
---

# Progress Log: fixes-and-tooling

## Log

- 2026-10-24: wave 023 planned (11 runs, 0 `hard_judgment`, serialized). Backlog reviewed after wave 022; scope is #158, #159 and #160. The author asked that the findings of the tools be fixed, not baselined (T8), and for line coverage above 90 % at a high quality (T10, Q5, Q6). The Java tool waits for D1 after W-7; W-11 is the only run that needs the answer.
- 2026-10-24: wave 023 started on branch `wave-023-fixes-and-tooling` (plan commit `360d1af`), the plan `status` is `in-progress`. Order: W-1 to W-10 serialized, concurrency 1, then W-11 after D1. All runs `standard` (`run-management:run-executor`, default model, effort medium).
- 2026-10-24: batch 1 dispatch: W-1 `view-without-properties-and-mistake-sweep` (run 0164, P0, `standard`), alone. W-2 follows (serialized: `KernelViewpointFactory`, `standalone.html`, `negative-cases.json`).
- 2026-10-24: plan amended by the author's request while W-1 runs: the JavaScript tests are two suites, unit/integration and e2e, both in this wave (T11); two runs added, W-12 `e2e-framework-choice` (a trial-based choice of the framework, Q7) and W-13 `e2e-suite` (Q8), in a new phase P4 before the Java analysis, which becomes P5. 13 runs, 0 `hard_judgment`. W-11 is executed last.
- 2026-10-24: W-1 (run 0164, `standard`) verified from disk: status `completed`, profile `single-document`, nothing outside `likely_paths`. Change: `KernelViewpointFactory.create` treats a missing `properties` as empty (view and story step), the sentence is now ``the view %s has no element: write the reference of one in `properties.element` `` (the T1 exception, also for `properties: {}`); `ViewWithoutPropertiesTest` (per viewpoint, story step, map), `MistakeSweepTest` + empty `known-traces.json` (V-A: 8,611 mutated workspaces over 20 workspaces, zero failures after the fix; the sweep fails with the fix reverted), a node test that the editor already says `This view has no element.`. Gate set rerun by the orchestrator: `./mvnw verify -DskipITs=false` BUILD SUCCESS (1370 unit, 2 skipped; 39 integration), `cargo test` 240, `embed.sh --check` exit 0, Prettier Java clean, node 2566 of 2566. **Not verified yet**: V-C (byte identity against the 0.19.0 jar) was not run by W-1; W-2 builds the reusable harness and runs it over the cumulative P0 change, and the P0 gate waits for it.
- 2026-10-24: W-1 committed. Dispatching W-2 (run 0165, `dangling-reference-names-its-source`; no dependency, serialized after W-1: `KernelViewpointFactory`, `standalone.html`, `negative-cases.json`), `standard` (`run-management:run-executor`, default model, effort medium), concurrency 1.
- 2026-10-24: W-2 (run 0165, `standard`) verified from disk: status `completed`, profile `single-document`. Change: `workspace/DanglingReferences` is the one place that words a dangling relationship `destination`, `uses` entry and hosted application with the element, the file and the key (``error: `shop.web` has a relationship towards `nowhere`, which does not exist, in `manifests/shop.yaml` at `relationships[0].destination` ``); a layered workspace keeps the ``in the plateau `p`, `` prefix and the count, a plain one has neither (the editor used to say ``in the plateau `baseline`, `` for a workspace with no plateau and no longer does); failures stay where they were raised (T2: `LayerLoader`, `GetGraphQuery.collect`, `KernelViewpointFactory`), the editor says the same in `layerProblemsOf`; V-B cases `dangling-reference-cases.json` D01 to D10 read by `DanglingReferenceCasesTest` and `dangling-references.test.js`; pinned sentences updated in `layer-checks-cases.json` and `negative-cases.json`; manual, guide and golden, `reflect-config.json`, CLAUDE.md. V-C harness `scripts/byte-identity.sh` (+ `byte-identity-exceptions.txt`, a self-check). Out of `likely_paths`: `cli/GetGraphQuery.java` (the `query graph` raise point), `docs/fixtures/brightcart-spec.md` (rewritten by `generate.mjs`), `guide.md` and `reflect-config.json` (listed by the run). Gate set rerun by the orchestrator: `./mvnw verify -DskipITs=false` exit 0 (1380 unit, 2 skipped; 39 integration), `cargo test` 240, `embed.sh --check` exit 0, Prettier Java clean, node 2576 of 2576. The run reports V-C 330 of 330 identical over the cumulative W-1 + W-2 change; the orchestrator reruns it as part of the P0 gate (next entry).


## Findings

- Wave 022 left two defects alone because its rule was byte identity (#158, #159); both are fixed here, so their error sentences are the exceptions to T1.
- `rust-toolchain.toml` has `profile = "minimal"`: neither `rustfmt` nor `clippy` is installed for 1.97.1 (`cargo fmt --version` fails on this machine), so no Rust format or lint has ever run.
- A `cargo fmt` moves line numbers, and the panic locations of the kernel are in the compiled `.wasm`; the run that formats the Rust must re-embed and say whether the bytes moved (W-3).

- The only Java coverage report that exists (`target/jacoco-report`) counts the `@QuarkusTest` classes alone: 47 % of instructions, 32 % of branches. A plain `jacoco-maven-plugin` agent added on the command line fails against Quarkus' `FacadeClassLoader`, so the real figure is unknown until W-8 sets the measure up.
- The sweep of W-1 takes 183 s inside `verify` (1,190 mutated workspaces, the richest manifest of each kind); the full one (8,611) takes 459 s and is behind `-Darchicode.sweep.all=true`. The test profile logs at DEBUG for `io.morin.archicode`, which slowed an in-process loop from about 8 to about 20 minutes; the sweep silences it. W-8 owns the cost of the Java suite (move the sweep to an integration test or sample less).
- The command line and the editor have never said the same words for a view with no element (`the view v has no element: write ...` against `This view has no element.`). Left as it was by W-1; W-2 touches the editor's words for dangling references and may align this one in the same cases file.
- Any run that moves an error sentence regenerates the Brightcart description (`node src/test/resources/brightcart/generate.mjs`), which rewrites `docs/fixtures/brightcart-spec.md` and `variants/`; expect it outside `likely_paths`.
- The CLI's `has no element` and the editor's `This view has no element.` are still two voices (W-1, W-2); aligning them touches every view problem and many pinned tests. Not done; the call is the author's, to be filed as an issue at the close of the wave.

## Lessons Learnt

- A background job started with `&` inside a background command dies with it; start the script itself as the background command. Two gate runs writing one log are unreadable: one run, one log, the exit code captured.
- Carried from wave 022: write the dispatch entry of the next run in its own commit; kill a stale test run by PID, never `pkill -f` from the shell that holds the name; a time-limit assertion in a generated test is a flake.
