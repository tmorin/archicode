---
type: run
run: 0161
status: completed
wave: 022
profile: single-document
---

# Run 0161: agent-walk

Wave 022, W-4 (decisions T2, T6, T9; validation oracle V6(a) and the sweep V7; P1 gate; GitHub issue tmorin/archicode#144, "tested the way an agent uses it"). Focus: a walk from an empty folder shows that the schema, the guide and `init` are enough, and fixes what it finds missing.

Profile: `single-document` (as runs 0158 to 0160): scope, decisions, tasks, verification and findings on this page; the review passes were inline. The cold-agent trial (V6(b)) is the orchestrator's, after this run, against the jar left built.

## Scope

In: `AgentWalkIT` (V6(a)), the fixes the walk finds in the guide, the sweep V7, the jar and a copy of the guide output for the trial. Out: any change to another command's output (T1), the saved-view NullPointerException, the cold-agent trial.

## Decisions

- **D1 (the walk reads the guide).** `AgentWalkIT` asks `guide` for its text and takes from it the commands to start with (the `sh` block: `init <folder>`, `query graph`, `views generate -i shop_overview`) and the manifests to add (the `# file:` blocks via `GuideBlocks`); the test hard-codes a file name only to choose which of the guide's blocks to add. Commands run with `-w` where the guide says `cd`.
- **D2 (what it covers).** `init` into a folder that does not exist; the guide's start commands; the guide's container in a manifest of its own (`shop.search`), an environment with two nodes and an application hosted on one (`prod`), a Map of each layer (`apps_map` with `opened`/`pinned`, `prod_map` with `relationships: false`) drawn by `views generate -i`; `query graph` holds the new references and a node relationship; three mistakes (a dangling reference, an unknown key, a dotted id), each one `error:` line with exit 1 and no trace, then the repair; a plateau (`plateau list`, a patch and a new element, `query graph --plateau`, `diff`, `diff --fail-on new,removed` exit 3 and `--fail-on removed` exit 0, `views generate --plateau`, an unknown plateau is one `error:`); `stories generate` on the guide's story. No corpus addition: every manifest it writes is a block of the guide, already in the corpus (`ManifestCorpus.guide`, `GuideCorpusTest`); the mistaken files are not positives.

## Gaps found by the walk, and fixes

1. **The guide's plateau patch did not apply after `init`.** The guide's `plateau.to-be.yaml` set the description of `shop.catalog`, which only the guide's own `shop.yaml` has; `init`'s `shop` has just `web`, so adding the guide's plateau to the workspace `init` wrote ended in `error: plateau to-be: patch 1 ... selects nothing`. Fixed: the patch targets `shop.web` (in both workspaces). The guide also says which of its files `init` already wrote (`customer`, `shop`, `view.shop_overview`) and that the rest can be added to that workspace.
2. **The dangling-reference sentence names no file and no source** (`error: unable to find the element shop.nowhere`), and the guide only said sentences name the file and the key. Changing the sentence would move another command's output (T1), so the guide now says it, with the example and what to write.
3. Not a gap, checked: the unknown-key sentence lists the known keys; the dotted-id sentence names the key (`content.id`) and the rule.

## V6(b): the cold-agent trial (orchestrator)

A fresh agent with only the binary built the whole task (a small shop: a person, two systems, relationships, a plateau, a view) in one pass: 12 commands, all exit 0, no failure; it used `--help` and `guide` (not `init` nor `query schemas manifest`); final graph 8 elements and 4 relationships; `diff` showed 1 new element, 1 changed and 1 new relationship. Gaps it found in the guide's text, and the fixes (guide and golden file only; no command's output moved):

1. **External system.** The guide never said how. Checked in the code and by drawing: there is no `external` flag and no word has a special meaning; `qualifiers` are shown (`[system: external]`) and are also stereotypes (`<<external>>`) that `styles.by-qualifiers` can style; `tags.rendering-stereotypes` are unshown stereotypes for `styles.by-tags`. The guide says exactly that and gives `qualifiers: ["external"]` as the convention.
2. **Patches.** The guide showed only `SET`. It now says what each operator takes (`SET`, `ADD`, `MERGE`, `REMOVE`, from the kernel's `patch.rs`) and the corpus block `plateau.to-be.yaml` gains an `ADD` of a relationship (`field: relationships`) on `shop.web`, which loads and draws (`GuideCorpusTest`) and is asserted by `AgentWalkIT` in the graph of `to-be`.
3. **Default plateau.** `--plateau`, then `settings.current`, else the last plateau when they form one line, a fork needs `--plateau`; views go to `views-<plateau>` (a `views/` from before is left stale); no plateau draws into `views`.
4. **`diff --against`.** Default is the plateau the drawn one overrides; the root has none, one `error:` line (asserted in the walk: `diff --plateau baseline`).
5. **`query graph`** is one line of JSON; the guide gives `archicode query graph | grep -o '"reference"' | wc -l` to count elements.

The guide is 24.3 KB of 30 KB.

## Tasks (all done inline)

1. Walk the jar by hand from an empty folder and note what is missing (gaps 1 and 2).
2. Guide text fixes, regenerated `src/test/resources/guide/golden.md`.
3. `AgentWalkIT`.
4. Sweep and verification set; jar built, `guide.out` copied to the scratchpad.

## Verification

JDK 25, one command at a time, on the final tree:

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' ...`: BUILD SUCCESS, 1395 unit tests (2 skipped), 39 integration tests including `AgentWalkIT` (first run green after one compile fix); `GuideTest`, `GuideCorpusTest` and the 30 KB budget pass with the regenerated golden file.
- `cargo test`: 240 passed; `embed.sh --check`: exit 0; `node --test --test-concurrency=2`: 2563 of 2563; `npx prettier --check "src/**/*.java"`: clean.
- V7 (`sweep.py`) against the jar of `archicode-0.19.0`: 308 commands over 20 workspaces, 15252 files, `--help` of 14 commands, no differences except the top command gaining `guide` and `init`.
- Jar built at `target/quarkus-app/quarkus-run.jar`; the guide output is in the scratchpad as `guide.out` (identical to the jar's).

Not verified: the native runner (no Mandrel here): `AgentWalkIT` on the native image is for the `Native` job of draft pull request #157.

## Findings

- The NullPointerException of a saved overview without `properties` is untouched; the walk does not rely on it.
- The sentence of a dangling relationship is the weakest message the walk met (no file, no source element); it is for the wave's follow-ups, not T1.
- Files touched outside `likely_paths`: none.
