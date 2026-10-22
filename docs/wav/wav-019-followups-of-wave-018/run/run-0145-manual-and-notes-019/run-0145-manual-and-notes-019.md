---
type: run
run: 0145
status: completed
profile: single-document
wave: 019
---

# Run 0145: manual-and-notes-019

Wave 019, W-9. The manual (`src/doc/README.adoc`), `README.md` and `CLAUDE.md` say what the tools do at the end of wave 019, with one block of what changes for a reader who knows 0.17.0, the rename first. Documentation only: no kernel, page or Java file changes.

## Scope and decisions

1. **The name of the workspace file, everywhere.** `workspace.yaml` became `.archicode.yaml` in the 50 prose lines of the manual that still named it (the section on the workspace, the captions, the tutorial, the folder listings, the facet and design steps, the discovery paragraphs, the editor statements, the default-name text); `src/site/index.html` and most of `README.md` were already renamed by run 0144. Kept on purpose: the sentence the tools print, the block of what changes, the `-w workspace.yaml` lines. A new bullet of `[[workspace]]` says the file is hidden (`ls -a`, "show hidden files"), never a manifest, and what `-w` does; `[[editor-open]]` and `[[serve-the-editor]]` say the folder needs a `.archicode.yaml`; `README.md` has a three-line note on the rename and no longer says the editor can reach "no hidden entry" (it serves `.archicode.yaml` at the root).
2. **A block `[[upgrade-0-17]]`** ("What changes for a reader who knows 0.17.0") at the top of `[[plateaus-upgrade]]`, the rename first, then `stories generate`, the technology links, the numbers and tags, the save, the checks, the three rough edges and the speed. It says it serves as the release notes. Each item points to the section that tells it.
3. **Each change where it belongs:** `[[workspace]]`, `[[manifests-folders]]`, `[[editor-open]]`, `[[serve-the-editor]]` (the name); `[[editor-elements]]` (tagged numbers, the save); `[[editor-rename]]` (the form after a failed yes); `[[editor-compare]]` (the cap of the key on a resize); `[[facets]]` and `[[editor-facets]]` (the sentence of a refused facet is the error of the view); `[[editor-replaces]]` (the merge refused as a whole with its sentence, *Add replaces* checked); `[[editor-plateau-delete]]` (`against` and saved views, the sentences, the fold by hand `[[fold-by-hand]]`); `[[using-environments]]` and `[[map-technology]]` (the destination inside a deployed application, the secondary links of a flow); `[[stories-generate]]` and the warnings list of `[[errors-and-warnings]]` (`gap.*`, the facet folders, `global-enabled: false`, the skip warning).
4. **The fold by hand** (decision T4) was tried with the jar on a copy of `domain_plateaus` with the plateau `later` of the tutorial added: `to-be` folded into `later` (`plateau: "later"` in the six manifests, `override: "baseline"`, the patches of `to-be` in front of those of `later`, the plateau manifest of `to-be` removed, `at: "later"` in the story). `archicode diff --plateau later --against baseline` gave the same table before and after, byte for byte, except the PLATEAU column of the cascade (`to-be` became `later`); `plateau list` shows `later` over `baseline`. Without the story edit the tool printed `error: the story ... step 2 says `at: to-be`, which is not a plateau of this workspace (the plateaus are `baseline`, `later`)`, which the manual quotes. A `REMOVE` of `later` that names an element `to-be` declared still finds it after the fold.
5. **`[[plateau-limits]]` and `CLAUDE.md`.** #125 is no longer a limit (the paragraph on the large pair says the measured cost); #78 became the list of four layouts that still fall back; the anchor or tag on a mapping key and the merge key `<<` are told as not planned; the offer of #138 is not planned and points at the fold by hand; the pinned differences between the tools are listed once (line and column, `5.0` in a patch value, `!!binary` in a typed field, Java-only spellings). `CLAUDE.md` loses the "#78 and #125 are filed" statement, says what is not planned and where the 0.17.0 block is. The wave 019 facts that the other runs wrote in it stay.
6. **A side fix:** every code span with `**` in the manual (`/**`, `./**`, `manifests/**`) is now written `+...+`. Two of them in one paragraph made Asciidoctor read bold across the span, which turned the whole numbered list of the discovery rules of `[[manifests-folders]]` into broken markup in the built manual (13 broken spans; 0 now). 28 spans changed; the text is the same.

## Quoted sentences and the commands that printed them (jar of this tree, JDK 25)

- `archicode views generate`, `archicode query graph` and `archicode editor serve` in a copy of `domain_technology` with `workspace.yaml` only: `error: `workspace.yaml` is no longer the name of the workspace file: rename it to `.archicode.yaml` (`git mv workspace.yaml .archicode.yaml`), or tell the command line where it is with `-w workspace.yaml``, exit 1.
- `archicode -w workspace.yaml editor serve`: `the editor opens a folder with a .archicode.yaml: <path>/workspace.yaml is not named so.` then the usage, exit 2. `archicode -w workspace.yaml views generate`: works.
- A `workspace.yaml` left in a folder read by `./**`: `error: `workspace.yaml` is not valid: unknown key `settings` (known: content, header) at `settings` (line 5, column 3)`; removed, the load works.
- `archicode views generate` with no file: `error: the workspace file `<path>/.archicode.yaml` does not exist (`-w` names another one)`; with the camel-case key: `error: `.archicode.yaml` is not valid: unknown key `hideUnlinked`, write `hide-unlinked` (known: actions, hide-unlinked, name) at `settings.facets.customs[0].hideUnlinked` (line 5, column 27)`.
- `archicode stories generate --story fork_tour --plateau saas` on a copy of the layered Brightcart: `warning: skip fork_tour/2 in the facet `no-externals`: it names `commerce-saas`, which the facet removes` and `warning: skip fork_tour/7: it is told at the plateau `saas` and compared with it: there is nothing to compare`, exit 0; folders `01-shop_overview` with `-journey`, `-no-externals`, `-without-cart`; `gap.md`/`gap.json` in steps 02 to 06. On `domain_plateaus`, `archicode stories generate`: `gap.*` in `02-overview` and `04-overview` only. `stories generate --help` was read from the jar.
- The merge sentence, the delete sentences and the `against`/saved-view sentences are those the node tests assert (`replaces-and-delete-checks.test.js`); they come from the page, not from the command line.

## Stale statements found and fixed (greps)

| grep (README.adoc, CLAUDE.md, README.md, site) | result |
|---|---|
| `workspace\.yaml` | 55 lines of the manual renamed; 5 left on purpose (the hidden-file bullet, the 0.17.0 block, the `-w` line, the editor-open line); CLAUDE.md 2 and README.md 3, all on purpose (the sentence); site 0 |
| `#78`, `#125`, `#133`, `#136` to `#140` | manual 0 (the limits no longer cite them); CLAUDE.md 5, all history ("wave 019, run N, #N") written by the runs, no longer listed as open |
| `slow`, `Slow` | the "editor is slow on very large pairs (#125)" limit rewritten with the measured cost; 0 left |
| `Four differences` | the 0.16.0 block ("Four differences are left and pinned") now says two are left and points at 0.18; the limits bullet rewritten; the 1 left is the unrelated list of four differences of the first layers |
| `not checked` / `is not checked` | the *Add replaces* "is not checked" sentence rewritten; the 1 left is the plateau-free check of `[[plateau-untied]]`, unrelated |
| `written again` | the save paragraph and the limits rewritten (the three forms of #78 are kept); the 1 left in the manual says what still falls back; CLAUDE.md 1 is the same, already true |
| `no facet`, `global views only`, `gap.md. or` | the sentence "no facet is applied ... the comparison writes no gap.md" of `[[stories-generate]]` replaced; the skip list of `[[errors-and-warnings]]` completed |
| `one pair at a time` | the merge paragraph rewritten (checked as a whole); 2 lines now say the new rule |
| `are filed` (CLAUDE.md) | the "#78 and #125 are filed" statement replaced |

## Not verified

A real browser (the editor statements come from the node harness and the runs' documents); the native image; the manual's text was read, not proofread by a second person.

## Canonical impact

`CLAUDE.md`: one sentence changed in place (what `[[plateau-limits]]` lists and where the notes of 0.17.0 are). No architecture or domain packet; no contract moves. The manual and `README.md` are the deliverable.

## Tasks

- [x] the rename in the manual, the hidden-file text, the three editor/serve places
- [x] the 0.17.0 block
- [x] each change where it belongs, the fold by hand tried with the jar
- [x] `[[plateau-limits]]`, `CLAUDE.md`, `README.md`
- [x] greps for stale statements
- [x] the verification set on the final tree, the manual build, the commit

## Verification

On the final tree (JDK 25.0.4-tem, one after the other, after the last edit): `./mvnw -o package -DskipTests` exit 0; `./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest' -Dsurefire.failIfNoSpecifiedTests=false` exit 0 (1268 unit tests, 2 skipped, 27 integration tests, 0 failures); `cargo test` 240 passed; `embed.sh --check` ok (794709 bytes); `node --test` 2407 of 2407; `npx prettier --check "src/**/*.java"` clean. The manual: `./mvnw -o asciidoctor:process-asciidoc` builds with no warning; every `href="#..."` of the built page has its `id` (118 links, 0 missing), `upgrade-0-17` and `fold-by-hand` exist. Tests that read the manual (`site.test.js`, `help.test.js`, `example-identity.test.js`, `ManualExamplesTest`, `PlateauComparisonTest`) are in those runs.
