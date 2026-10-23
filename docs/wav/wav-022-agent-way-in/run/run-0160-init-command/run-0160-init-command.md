---
type: run
run: 0160
status: completed
wave: 022
profile: single-document
---

# Run 0160: init-command

Wave 022, W-3 (decisions T2, T5, T6; validation corpus C3, the IT of `init`; P1 gate; GitHub issue tmorin/archicode#144, third item of the author's order). Focus: `archicode init` writes a workspace that loads in both tools and is drawn, and the guide tells how to start with it.

Profile: `single-document` (as runs 0158 and 0159): scope, decisions, tasks, verification and findings on this page; the review passes were inline.

## Scope

In: `archicode init [FOLDER]`, its resources, C3 (the output in the corpus and conforming to the schema), the editor reading it in a node test, `InitIT`, the guide's start-from-nothing section and the golden file. Out: any change to another command's output, the saved-view NullPointerException, the walk (W-4).

## Decisions

- **D1 (what it writes).** `.archicode.yaml` (`settings.name`, `manifests.paths: ["manifests"]`), `manifests/customer.yaml` (person, one relationship to `shop.web`), `manifests/shop.yaml` (system with the container `web`), `manifests/view.shop_overview.yaml`, and `/views*/` in `.gitignore` (matches `views`, `views-<plateau>` and `views-stories`). The files are resources `init/**` (`archicode.yaml` is written as `.archicode.yaml`), in `quarkus.native.resources.includes`; `InitCommand` is in `reflect-config.json`.
- **D2 (the view).** An `overview` view of `shop` with `properties: {element: shop}`: with no `properties` an overview ends in a NullPointerException (existing bug, T1 forbids fixing it here), and `properties: {}` gives `has no element`. It is drawn with `views generate -i shop_overview` (into `shop_overview.puml`); a plain `views generate` draws the three element viewpoints of every element and skips saved views, so the two commands printed as next steps are `query graph` and `views generate`, and the guide shows `-i shop_overview` too.
- **D3 (never overwrites).** A folder that has `.archicode.yaml`, a manifest of the list already there, or a path that is a file: one `ArchiCodeException` (`error:`, exit 1) before anything is written; files are opened with `CREATE_NEW` as a last guard. `.gitignore` is created or appended to once (a missing final line feed is added first), never rewritten otherwise.
- **D4 (guide).** A section "Starting from nothing" before "The loop", in a `sh` block (the `bash` blocks of the guide are run by `GuideTest` inside the already-initialised workspace, where `init` would be refused); the last line no longer says `init` is not built. `init` in the commands list is generated. Guide 22.0 KB of 30 KB.

## Tasks (all done, inline in this session)

1. `InitCommand`, registration in `ArchiCode`, resources, `application.properties`, `reflect-config.json`.
2. Tests: `InitTest` (writes, loads, draws, refusals, five `.gitignore` cases), `doc/InitCorpusTest` with `ManifestCorpus.init` (C3), `init-workspace.test.js` (editor), `it/InitIT`.
3. Guide text, regenerated `src/test/resources/guide/golden.md`; `CLAUDE.md` paragraph.

## Verification (JDK 25, one command at a time)

- `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' ...`: BUILD SUCCESS, 1394 unit tests (2 skipped, as before), 38 integration tests (including `InitIT`, `GuideIT`); `NativeReflectionConfigTest` passes.
- `cargo test`: 240 passed; `embed.sh --check`: exit 0.
- `node --test --test-concurrency=2`: 2563 of 2563.
- `npx prettier --check "src/**/*.java"`: clean.
- V7 (`sweep.py`, scratch) against the jar of `archicode-0.19.0`: 308 commands over the 20 shipped workspaces, same exit codes, outputs and sha256 of the 15252 files written; `--help` of the 14 commands identical except the top command, which gains exactly `guide` and `init`.
- By hand with the jar: `init` in a new folder, second `init` refused (`error:` one line, exit 1), `query graph` 0, `views generate` 0, `views generate -i shop_overview` 0 and silent.

Not verified: the native runner (no Mandrel here): `InitIT` and the resource `init/**` on the native image are for the `Native` job of draft pull request #157.

## Findings

- The NullPointerException of a saved overview with no `properties` is still there (see run 0159); `init` writes the property so the first view an agent sees works.
- Files touched outside `likely_paths`: none (production Java: `cli/InitCommand`, `cli/ArchiCode`; resources `init/**`, `guide/guide.md`, `application.properties`, `reflect-config.json`; tests as listed; `CLAUDE.md`).
