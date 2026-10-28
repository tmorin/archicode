---
type: run
run: 0193
status: in-progress
profile: TDD+pln
wave: 025
---

# Run 0193: import-export-and-sample

Wave 025 (hosted-editor), manifest id W-5.

## Sample check (task-002)

`scripts/build-sample.mjs` builds `src/main/resources/editor-webapp/samples/brightcart.yaml` (61 files carried, 0 skipped, 43,182 bytes) from the fixture and the page's codec. Tests: `build-sample-script.test.js` (6) and `sample-brightcart.test.js` (3) pass; prettier and lint are clean.

`npm run sample:check` on the tree:

```
exit 0 (no output)
```

`node scripts/build-sample.mjs --check --root <copy>` on a copy with one byte of the sample changed:

```
build-sample: src/main/resources/editor-webapp/samples/brightcart.yaml is not the bundle of src/test/resources/brightcart/layered (first difference at line 3): run `npm run sample:build`
exit 1
```

A `.md` file added to the copy of the fixture, `node scripts/build-sample.mjs --root <copy>`:

```
build-sample: the bundle skips 1 file(s) of the fixture: x.md (not YAML)
exit 1
```

## CI wiring and rehearsal of the assembly (task-004)

`.github/workflows/ci-build.yaml` gains 8 lines and changes none (`git diff --stat`: 8 insertions, 0 deletions):

- job `Page`, after "Check the editor page is the assembly of its parts" and before "Check the move commits" (so before the format check): the step "Check the Brightcart sample is the bundle of its fixture", `run: npm run sample:check`.
- job `Build`, step "Assemble website", after the line that writes `target/site/editor/index.html`: `mkdir -p target/site/editor/samples`, `cp -r src/main/resources/editor-webapp/samples/. target/site/editor/samples/`, `test -f target/site/editor/samples/brightcart.yaml` and `cmp` of that file with its source.

The workflow parses (`python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" .github/workflows/ci-build.yaml`, exit 0).

Rehearsal: the `run:` block of "Assemble website" was extracted from the workflow with PyYAML and run with `bash -euo pipefail` in a scratch copy (the page, the `samples/` folder and `src/site/index.html` of the tree, and a stand-in `target/generated-docs/index.html`) with `GITHUB_REF_NAME=archicode-0.0.0-rehearsal`.

```
exit 0
cmp target/site/editor/samples/brightcart.yaml src/main/resources/editor-webapp/samples/brightcart.yaml   -> exit 0

target/site/editor/:
-rw-rw-r-- 1 tibo tibo 2591402 index.html
drwxrwxr-x 2 tibo tibo    4096 samples
target/site/editor/samples/:
-rw-rw-r-- 1 tibo tibo   43182 brightcart.yaml
```

The same block with the `cp -r ... samples/.` line removed (`target/site` deleted first):

```
exit 1   (at `test -f target/site/editor/samples/brightcart.yaml`; `mkdir -p` had made the folder, the file is not there)
```

What this proves and what it does not: the rehearsal runs the same shell text on a copy, so a typo in the four lines or a missing source file is found here. The step runs on a tag only (CON-12), so the first proof on the real site is the tag run (the GitHub Pages configuration and the layout of a tag checkout are only seen there, RISK-2); the criterion for the published site is not met by this rehearsal alone.
