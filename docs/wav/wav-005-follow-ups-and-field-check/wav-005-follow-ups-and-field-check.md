---
type: wave
wave: 005
status: in-progress
date: 2026-10-13
related:
  - docs/wav/wav-005-follow-ups-and-field-check/wbc-005-follow-ups-and-field-check.md
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - CLAUDE.md
---

# Wave 005 — Follow-ups and Field Check

## Purpose

When this wave is done, the CLI's PlantUML resolves the style of a box carrying several styled stereotypes by the same
deterministic rule as the editor. The inspection panel lets a reader jump to the declaring element of a relationship,
carries a selected link in the URL, centres the Map on it, tells parallel links apart and reaches diagram links with a
single tab stop; the element header shows its stereotype badges. The list of remembered folders shows which folders will
need a permission click and merges the duplicate records two tabs can create. The newest editor features have been
exercised in the real page on a copy of a real workspace, in light and dark, with every finding recorded and every clear
regression fixed; the dangling-reference fix has run end to end; and the artifacts published by the 0.10.0 release have
been pulled and run.

## Non-Goals

- Does not compute a baseline-versus-target diff (tmorin/archicode#18): its inputs and output are undecided product
  questions and need an interactive requirements session first. The "show only new and changed" lens stays with it.
- Does not verify the IndexedDB migration of a profile filled by the previous version, nor real permission prompts, in a
  real Chromium: those need a folder picker and a human (the third item of tmorin/archicode#16).
- Does not write to, or run the CLI or generator inside, the user's own workspace
  (`/home/tibo/syncthing/tibo-work/archi`): the field check reads a copy kept outside the repository.
- Does not change `workspace.yaml`, the manifest format or the kernel contract.
- Does not cut a release.

## Wave Manifest

```yaml
wave_manifest:
  wave: 005
  slug: follow-ups-and-field-check
  status: in-progress
  sources: []
  phases:
    - id: P1
      name: Independent follow-ups
      gate:
        criteria:
          - 'node --test "src/test/javascript/**/*.test.js" passes'
          - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test passes'
          - 'a Java test shows that two styled stereotypes on one box give the same PlantUML in repeated runs, and that the later stereotype wins property by property and by-tags wins over by-qualifiers for the same key'
          - 'a test with the fake indexedDB shows that a remembered folder is listed with its permission state without any prompt, and that two records for the same folder are merged into one'
          - 'the run document of W-6 records, for release 0.10.0, what was checked on the published site, the container image and the Maven package, and what could not be checked and why'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
    - id: P2
      name: Inspection panel follow-ups
      gate:
        criteria:
          - 'node --test "src/test/javascript/**/*.test.js" passes'
          - 'tests show that a relationship of the link panel offers its declaring element, that a selected link round-trips through the URL, that two parallel links are told apart, and that diagram links take one tab stop with arrow-key movement'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
    - id: P3
      name: Field check
      gate:
        criteria:
          - 'JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test passes and node --test "src/test/javascript/**/*.test.js" passes'
          - 'the run document of W-5 lists every check of the Visual check and Dangling-reference items of tmorin/archicode#8 with what was observed, in light and dark, and names every finding as fixed (with its test) or open'
          - 'the dangling-reference check records the manifest file of the copy before and after the fix'
          - 'every run of the phase has status completed in its run-NNNN-*.md'
  runs:
    - id: W-1
      slug: cli-style-order
      phase: P1
      depends_on: []
      run: '0021'
      delegation: standard
      likely_paths:
        - 'src/main/java/io/morin/archicode/rendering/plantuml/**'
        - 'src/test/java/**'
        - 'src/test/resources/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
        - 'src/doc/examples/**'
      focus: 'the CLI and the editor pick the same style, every time, for a box with several styled stereotypes'
    - id: W-4
      slug: remembered-folders-followups
      phase: P1
      depends_on: []
      run: '0023'
      delegation: hard_judgment
      delegation_reason: 'merging duplicate records deletes stored IndexedDB records of remembered folders (data deletion)'
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'the list of remembered folders says what will need a click, and never holds the same folder twice'
    - id: W-6
      slug: release-artifacts-check
      phase: P1
      depends_on: []
      run: '0022'
      delegation: standard
      likely_paths:
        - 'docs/wav/wav-005-follow-ups-and-field-check/run/**'
      focus: 'what the 0.10.0 release published can be pulled and run'
    - id: W-2
      slug: inspection-panel-navigation
      phase: P2
      depends_on: []
      run: '0024'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
        - 'src/doc/README.adoc'
      focus: 'jump from a relationship to its declaring element, share a selected link by URL, and tell parallel links apart'
    - id: W-3
      slug: diagram-link-tab-stops
      phase: P2
      depends_on: []
      run: '0025'
      delegation: standard
      likely_paths:
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'reach the links of a dense diagram by keyboard without tabbing through all of them'
    - id: W-5
      slug: editor-field-check
      phase: P3
      depends_on: [W-2, W-3, W-4]
      run: '0026'
      delegation: standard
      likely_paths:
        - 'docs/wav/wav-005-follow-ups-and-field-check/run/**'
        - 'src/main/resources/editor-webapp/standalone.html'
        - 'src/test/javascript/viewpoint-kernel/**'
      focus: 'see the real editor on a copy of a real workspace, light and dark, and fix what is clearly broken'
```

## Phase P1 — Independent follow-ups

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-1 | 0021 | `cli-style-order` | — | The CLI and the editor pick the same style, every time, for a box with several styled stereotypes | `single-document`, tmorin/archicode#15. `PlantumlViewRenderer` collects style entries in a `HashSet`: make the order stable and the rule the editor's (a later stereotype overrides an earlier one property by property; `by-tags` overrides `by-qualifiers` for the same key). Regenerated example views and fixtures are expected. Manual updated if it describes the rule. | Java tests: repeated renders are identical; the winner follows the rule; `./mvnw test` green |
| W-4 | 0023 | `remembered-folders-followups` | — | The list of remembered folders says what will need a click, and never holds the same folder twice | `TDD+pln`, tmorin/archicode#16 (first two items). Each entry shows its permission state without prompting (`queryPermission` needs no gesture; a failing query is shown as such). Two records for the same folder, created by two tabs racing, are merged (the TDD decides the mechanism: Web Locks or a `BroadcastChannel` to prevent it, a post-hoc merge to repair it, or both) without ever losing the last-folder record. | Node tests with the fake `indexedDB`: state shown per entry, a race produces one record, a merge keeps the right name and last-folder pointer |
| W-6 | 0022 | `release-artifacts-check` | — | What the 0.10.0 release published can be pulled and run | `single-document`, evidence run, tmorin/archicode#8 (third unchecked item, redone for 0.10.0). Check the release workflow of tag `archicode-0.10.0` finished; the published site (`/`, `/docs/`, `/editor/` stamped 0.10.0, fetched over HTTP); the container image of the tag (pull and run it against an example workspace if a container runtime is available); the Maven package (listed, and downloaded if the credentials allow). Writes only its run directory. Anything that cannot be checked is recorded with the reason, not treated as a failure of the release. | The run document: one line per artifact with the command used and what came back |

**Gate:** the checks listed under P1 in the manifest hold.

## Phase P2 — Inspection panel follow-ups

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-2 | 0024 | `inspection-panel-navigation` | — | Jump from a relationship to its declaring element, share a selected link by URL, and tell parallel links apart | `TDD+pln`, tmorin/archicode#17 (items 1, 2, 3, 5, 6). In the link panel each relationship offers its declaring element (a click selects it, like `goto-element`); a selected link is carried by the hash and restored on load (the TDD decides the key, given that a link is keyed by the pair of boxes); on the Map, selecting a link brings it into view; two parallel links between the same pair are marked so the panel says which one was clicked; the element header shows the stereotype badges. Manual (`[[editor-inspection]]`) updated. | Node tests: the declaring-element action, URL round trip, the parallel-link marker, header badges |
| W-3 | 0025 | `diagram-link-tab-stops` | — | Reach the links of a dense diagram by keyboard without tabbing through all of them | `single-document`, tmorin/archicode#17 (item 4). Replace one tab stop per link by a roving tab stop with arrow-key movement (the ARIA pattern for a composite widget), keeping the selection model, focus return after a redraw and the existing Escape behaviour. | Node tests: one tab stop for the group of links, arrow movement, focus kept across a redraw |

**Gate:** the checks listed under P2 in the manifest hold.

## Phase P3 — Field check

| # | Run | Slug | Depends on | Focus | Scope | Exit evidence |
|---|-----|------|------------|-------|-------|---------------|
| W-5 | 0026 | `editor-field-check` | W-2, W-3, W-4 | See the real editor on a copy of a real workspace, light and dark, and fix what is clearly broken | `single-document`, evidence run, tmorin/archicode#8 (the Visual check and Dangling-reference items). Copy `/home/tibo/syncthing/tibo-work/archi` outside the repository (never write there), build the CLI of this branch, run `archicode editor serve` on the copy and drive the page in the built-in browser. Check: top bar wrapping, theme (light, dark, system) including the code editor, the help menu and manual links, styled boxes and badges, the inspection panel beside a wide Map and the link panel, the centre header at several widths, the workspace name. Dangling-reference fix: make a relationship point at nothing in the copy, run the fix from the page, and compare the manifest file before and after. Findings are recorded; a clear regression of wave 004 or 005 is fixed with a test, anything else is written up as a finding for a follow-up issue (not filed by the run). The folder list and the IndexedDB migration cannot be exercised in served mode and are out of reach (see Non-Goals). | The run document: each check with what was observed and how, screenshots described, each finding fixed (with its test) or open |

**Gate:** the checks listed under P3 in the manifest hold.

## Dependency View

```
P1  W-1 (CLI)       W-4 (folders)       W-6 (artifacts)
                       │
P2  W-2 (panel nav)  W-3 (tab stops)
        │               │       │
P3      └───────────────┴───────┴──► W-5 (field check)
```

## Risks

- **Overlaps inside P1.** W-1 and W-4 both may edit `src/doc/README.adoc`: **`serialize`**. W-6 writes only its own run directory and reads published artifacts, so it is **`concurrent-safe`** with W-1 and W-4 (reason: no path in common, no shared build output: it builds nothing). The largest effective concurrency of P1 is two.
- **Overlaps inside P2.** W-2 and W-3 both edit `standalone.html` and the JS tests, and touch the same code (diagram links, link selection): **`serialize`**. W-2 goes first; W-3 reads the selection model as W-2 leaves it.
- **W-5 is last** and may edit `standalone.html` and the tests to fix a regression; it runs alone in its phase.
- **W-4 deletes stored records** (it merges duplicates): it is `hard_judgment`. A merge must never drop the last-folder pointer or the stored name, and a failed merge must leave the records as they were.
- **W-1 regenerates example views and fixtures** (`src/doc/examples/**/views`, `src/test/resources/viewpoint-kernel/**`): expect a heavy diff of pure reorderings.
- **W-5 and W-6 depend on tools that may be missing** (a container runtime, credentials to read the Maven package, the built-in browser). A missing tool is recorded as "could not be checked, because…", never silently skipped and never counted as a failing release.
- **The user's workspace is a Syncthing folder.** W-5 reads it and works only on a copy outside the repository.
- **The release workflow of 0.10.0 may still be running** when W-6 starts; W-6 waits for it to finish (it may take minutes) before judging what was published.

### Open questions (answered by the run that owns them, not decided here)

- W-2: the key of a link in the URL, and how two parallel links are told apart (an index, or the label).
- W-4: prevent the race (Web Locks, `BroadcastChannel`) or repair it after the fact, or both.
- W-5: how many widths and which workspace views make a sufficient field check.

## Completion Criteria

- All three phase gates hold, run by run as they complete.
- Each of the six runs has a `run-NNNN-*.md` with `status: completed` and exactly one commit; the wave is one pull request.
- `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem ./mvnw test` and `node --test "src/test/javascript/**/*.test.js"` pass on the wave branch.
- tmorin/archicode#15 is solved; the items of #16 and #17 named in the scope are solved; the items of #8 named in W-5 and W-6 have a recorded result.
