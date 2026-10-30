---
type: wave
wave: 028
status: planned
date: 2026-10-30
related:
  - docs/wav/wav-028-fold-and-browser-menu/wbc-028-fold-and-browser-menu.md
  - docs/wav/wav-025-hosted-editor/run/run-0190-plateau-fold-analysis/run-0190-plateau-fold-analysis.md
  - docs/wav/wav-027-editor-layout-and-walk/wav-027-editor-layout-and-walk.md
---

# Wave 028 — Fold and browser menu

## Purpose

The *Workspace* menu and the top bar of a browser workspace are readable and complete at 1280 px and at 360 px. `archicode plateau fold <id>` folds a plateau into the one above it, after a `--dry-run` that prints the plan, the refusals and the files that will be rewritten, and the plateaus that stay read the same before and after. The N-plateaus reading of #24 has a written layout and a mock-up that the author can accept or change. No new engine is added to the product.

## Non-Goals

- No diagram toolbar change: RFC-002 (P-1 to P-8) keeps the decisions, the build waits.
- No editor action for fold, no `editor serve` endpoint, no WASM or TeaVM spike: the fold logic is a pure Java class so that a later wave can add them.
- No YAML text patcher in Java and no change to the editor's line-preserving save; its long tail stays frozen.
- No "make the future plateau the new root" operation, no `--archive`, no rewrite of story steps: those cases are refused.
- No importers (#134, #135) and no build of the N-plateaus reading (#24): W-2 writes a document only.
- The ratchet of `src/main/editor/layers.json` does not rise (99); no coverage floor, Java or JavaScript, is lowered; the tag run, the native runner and the real Safari stay unproved.

## Decision Prerequisites

None open. D1 to D4 are the author's answers of 2026-10-30, recorded in the progress log.

## Open questions

- **Patches that target an element declared below the folded plateau.** D3 says the patches become direct values in the rewritten files. That holds for elements the folded plateau declares. An element declared by a plateau below it cannot be rewritten (siblings read it), so those patches have to stay patches, moved in front of the patches of the plateau above, as in step 2 of the manual's recipe. W-3 settles this in its TDD and says so in the dry-run plan; the author is told if it changes D3.
- Which file takes an element the plateau above inherited and now declares (proposed: the file where it is already declared, else the folded plateau's manifest).
- Whether the dry-run also prints JSON, and the exact words of each refusal. W-3.
- Where the shared cases file lives. Proposed beside `discovery-cases.json` in `src/test/javascript/viewpoint-kernel/`; only Java reads it today.
- How the cascade table's PLATEAU and PATCH columns are compared in the oracle (run 0190 found both change). W-4.

## Wave Manifest

```yaml
wave_manifest:
  wave: 028
  slug: fold-and-browser-menu
  status: planned
  sources:
    - 'gh:tmorin/archicode#182'
    - 'gh:tmorin/archicode#65'
    - 'gh:tmorin/archicode#24'
  phases:
    - id: P1
      name: Browser menu and the N-plateaus design
      gate:
        criteria:
          - '`npm run editor:build`, `npm run test:unit`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass, `ratchet.max` in `src/main/editor/layers.json` is not above 99, and the committed `standalone.html` is the assembly of the parts'
          - 'an end-to-end spec named in W-1''s run document, in Chromium, Firefox and WebKit, opens the Brightcart sample at 1280 px and at 360 px, opens the *Workspace* menu, and asserts that the bounding boxes of its items do not intersect and that every top bar button is inside the window (`npm run test:e2e`)'
          - 'W-2''s run document holds a layout for the N-plateaus reading that answers each question of #24 (rows and columns, cumulative change, a `replaces` move across more than two plateaus, a tree that forks, page or generated file) with a mock-up, and no file under `src/main/` or `src/test/` changed in that run'
    - id: P2
      name: Fold plan
      gate:
        criteria:
          - '`./mvnw verify` passes, `scripts/byte-identity.sh` shows no unexpected difference, and `src/test/resources/guide/golden.md` is regenerated in the same commit as the new command'
          - '`archicode plateau fold <id> --dry-run` on a copy of the layered Brightcart prints the plan and writes nothing (a test compares the folder before and after, byte for byte), and each refusal of D2 (several plateaus above, a step naming the plateau by `at` or `against`, `settings.current`, the root, a leaf) is one `error:` line with exit 1, each a case of the shared cases file read by a Java test'
          - 'the fold logic is a class with no Picocli, CDI or Lombok-generated command code in its signature, called by a test without a command line (`FoldTest` or its twin), so that an HTTP endpoint can call it later'
          - 'the dry-run names every file it would rewrite and says that those files lose their comments, quotes and layout'
    - id: P3
      name: Fold writer
      gate:
        criteria:
          - '`./mvnw verify -DskipITs=false`, `npm run test:unit`, `npm run lint`, `npm run format:check` and `npm run editor:check` pass; no coverage floor is lowered; the jar and the editor open the folded workspace'
          - 'on a copy of the layered Brightcart (`inhouse` into `marketplace`) a test and the run document record `plateau list`, `diff` and `views generate` before and after, equal for every plateau that stays but for the PLATEAU and PATCH columns of the cascade, and a second run on the same copy refuses the fold of a plateau that no longer exists'
          - 'the fold writes all its files or none: a test makes one write fail and shows that the folder is unchanged'
          - 'the manual (`[[fold-by-hand]]`, a page for the command, `[[plateau-limits]]`) and `archicode guide` say what the command does, what it refuses and what the rewritten files lose; `CLAUDE.md` names the command and its limits'
  runs:
    - id: W-1
      slug: workspace-menu-overflow
      phase: P1
      depends_on: []
      run: 0205
      delegation: standard
      likely_paths:
        - 'src/main/editor/style.css'
        - 'src/main/editor/presentation/top-panel.js'
        - 'src/main/editor/names.json'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/e2e/**'
        - 'src/test/javascript/**'
        - 'src/doc/README.adoc'
      focus: 'a visitor of a browser workspace reads every item of the Workspace menu and reaches Close workspace at 1280 px and at 360 px (#182)'
    - id: W-2
      slug: n-plateaus-design
      phase: P1
      depends_on: []
      run: 0206
      delegation: standard
      profile: single-document
      likely_paths:
        - 'docs/wav/wav-028-fold-and-browser-menu/run/**'
      focus: 'the author reads one layout and a mock-up of the N-plateaus reading and decides whether and how a later wave builds it (#24)'
    - id: W-3
      slug: plateau-fold-dry-run
      phase: P2
      depends_on: []
      run: 0207
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/guide/guide.md'
        - 'src/main/resources/META-INF/native-image/**'
        - 'src/test/java/**'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      focus: 'an author asks what folding a plateau would do and gets the plan, the files that lose their comments, or one sentence that says why it cannot, with nothing written (#65, first half)'
    - id: W-4
      slug: plateau-fold-writer
      phase: P3
      depends_on: [W-3]
      run: null
      delegation: hard_judgment
      delegation_reason: 'rewrites and deletes manifests in the author''s workspace: data deletion'
      likely_paths:
        - 'src/main/java/io/morin/archicode/cli/**'
        - 'src/main/java/io/morin/archicode/workspace/**'
        - 'src/main/resources/guide/guide.md'
        - 'src/test/java/**'
        - 'src/test/resources/guide/golden.md'
        - 'src/test/javascript/viewpoint-kernel/fold-cases.json'
        - 'src/doc/README.adoc'
        - 'CLAUDE.md'
      focus: 'an author folds a plateau into the one above and the plateaus that stay read the same before and after (#65, second half)'
```

## Phase P1 — Browser menu and the N-plateaus design

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | — | `workspace-menu-overflow` | — | the Workspace menu and the top bar of a browser workspace | the item boxes of `.workspace-menu` and `.workspace-item`, the top bar wrap or fold at 560 and 360 px, light and dark | the e2e spec of the gate in three browsers, node tests, the page built and committed |
| W-2 | — | `n-plateaus-design` | — | a layout for the reading of N plateaus | a document and a mock-up; no code | the document under the run folder |

**Gate:** see the manifest.

## Phase P2 — Fold plan

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-3 | — | `plateau-fold-dry-run` | — | plan and refusals, no writer | `plateau fold <id> --dry-run`, the pure Java class, the five refusals, the cases file, the guide and the manual's first sentences | the Java tests, the unchanged-folder test, the golden guide |

**Gate:** see the manifest.

## Phase P3 — Fold writer

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-4 | — | `plateau-fold-writer` | W-3 | write the folded files | rewrite from the resolved model, all or nothing, the manual and `CLAUDE.md` | the before and after record on the layered Brightcart, the failed-write test |

**Gate:** see the manifest.

## Dependency View

```
W-1 workspace-menu-overflow ┐
                            ├=(gate P1)=> W-3 plateau-fold-dry-run =(gate P2)=> W-4 plateau-fold-writer
W-2 n-plateaus-design      ┘
```

W-3 has no edge to W-1 or W-2: it waits for them only through the gate of P1, and shares no file with them.

## Risks

- **Overlap, verdict `concurrent-safe`, W-1 and W-2.** W-2 touches only its own run folder; W-1 touches the editor. No shared path.
- **Overlap, verdict `serialize`, W-1 with W-3 and W-4.** Both edit `src/doc/README.adoc`; the phases put them in different batches, so they never run together. If a later edit moves W-1 into a later batch, the verdict still holds.
- **Overlap, verdict `serialize`, W-3 and W-4.** They share the Java files, the guide, `CLAUDE.md` and the cases file; W-4 depends on W-3.
- **Comments are lost by design.** The rewritten manifests lose comments, quotes and layout. Mitigation: the dry-run lists the files and says so, git is the safety net, the manual says it in the command's page and in `[[plateau-limits]]`.
- **Patches on elements declared below the folded plateau** cannot be rewritten into those elements (open question). Mitigation: W-3 decides in its TDD and the dry-run shows what is kept as a patch.
- **The writer can lose data.** W-4 is `hard_judgment`; all or nothing, the before and after oracle, and a refusal for every case D2 lists.
- **A hand-written YAML writer, if one is chosen after all.** Jackson's YAML output may not match the style of the repository's manifests; W-3 measures it on the layered Brightcart and the dry-run says what changes.
- **Outward-facing steps left to the author:** commenting on and closing #182, #65 and #24 on GitHub is not done by any run.

## Completion Criteria

- Every gate of P1, P2 and P3 holds, checked by a fresh agent.
- #182 is fixed and proved in three browsers; #65 is built and recorded; #24 has its design document for the author's review.
- `CLAUDE.md`, the manual and `archicode guide` describe the command, its refusals and what the rewritten files lose; the Workspace menu of a browser workspace is described in `[[editor-small-screen]]` for the narrow case.
