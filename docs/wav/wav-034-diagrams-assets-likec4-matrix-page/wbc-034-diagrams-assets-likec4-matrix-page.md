---
type: wbc
wave: 034
status: proposed
date: 2026-11-06
related:
  - docs/wav/wav-033-import-structurizr-and-plateau-matrix/wav-033-import-structurizr-and-plateau-matrix.md
  - docs/wav/wav-028-fold-and-browser-menu/run/run-0206-n-plateaus-design/run-0206-n-plateaus-design.md
---

# Wave 034 — The manual's diagrams, the editor's files beside a lean page, the LikeC4 importer and the matrix page — Business Case

## Context

Wave 033 is merged. Four issues are open on `tmorin/archicode`, all `ready` with the author's decision:

- #209 (bug, found on 2026-11-06): the 18 PlantUML diagrams of the manual are not drawn on the website, every block says `Could not load PlantUML`. Cause read and reproduced: `pom.xml` gives the Asciidoctor plugin `asciidoctorj-diagram` but not `asciidoctorj-diagram-plantuml`; the build exits 0. The error is in the CI log of the tags 0.12.0 to 0.24.0. With the dependency added, 0 errors and 18 PNG files. The guard `<failIf>` was tried and does not catch it; a step of the job `Java` that reads the generated page is the proposal.
- #207 (retitled and decided on 2026-11-06): the editor loads CodeMirror and ELK at run time from `esm.sh`, so offline the YAML falls back to a textarea and the diagrams to a plain list, and a CDN failure made the CI of a pull request fail once. Decided: dependencies bundled by a pinned bundler into files committed beside the page (not inlined: the author prefers a lean `standalone.html`), the kernel `.wasm` served beside the page too instead of 1.1 MB of base64, working offline a tested property. The road after (Maven building the kernel with Rust, then the page with Node, nothing generated committed) is accepted in principle and is **not** in this wave. The two runs of this wave are W-1 and W-2 of that ticket; here they are W-2 and W-3.
- #134 the LikeC4 importer, `ready` since #135 was merged (wave 033). The JSON schema of `likec4 export json` was read on 2026-11-02: it holds the model. `archicode import likec4 <file.json> --output <empty folder>` with `--map kind=kind`, ids rewritten, a report of what was dropped. It reuses what #135 built.
- #24 the page for the matrix of N plateaus, the file having been delivered in wave 033: a *Reading* view on the page Plateaus that reads the same cases (`src/test/resources/brightcart/matrix-cases.json`).

The registers do not cover this: `docs/` has no `bkg` or `ana` register. The sources are the four issues.

## Problems / Opportunities

- A reader of the manual sees no diagram, and the build does not say so. Every release since at least 0.12.0 shipped that manual.
- The editor is not self-contained, is slower to load than it needs to be (1.1 MB of base64 kernel in a page of 2.7 MB), and its CI can fail on someone else's server.
- A team with a LikeC4 model cannot bring it in; a user of the plateaus cannot read where an element came from across more than two plateaus without a command line.

## Options & Recommendation

1. **Five runs in three phases, one at a time** (recommended). The bug first (small, and it stops the manual lying), then the editor's build (the two runs share the server, the build script and the CI), then the two features that sit on the new build (the importer, the page). A gate between the phases proves each before the next one starts. The author wants runs strictly one after another; every pair of runs here shares a file, so the plan says so.
2. **Fix #209 outside the wave, in a short pull request.** Rejected: it is one run of the single-document profile with its own evidence, and the wave's gate records it; it costs the same either way.
3. **Add the road of #207 (Rust and Node built by Maven).** Rejected: W-3 and W-4 of that ticket change the build of every contributor and of the five native jobs; they come after this wave has shown the size and the time of the lean build.
4. **Put the page for the matrix before the editor's build.** Rejected: both edit the same sources and the generated page; a feature written on the page of today would be rebased under the build change. The page comes after.
5. **Leave #134 for later.** Rejected: it is `ready`, and its sample needs Node and the network once; the run does it while the Structurizr code it reuses is fresh.

## Vision

The website's manual draws its diagrams, and the build fails if it ever does not. The editor's page is a lean file beside three committed files (CodeMirror, ELK and the kernel), served by `editor serve`, the website and the native image, with no import from a public server and a test that the editor works with external hosts blocked. `archicode import likec4` brings a LikeC4 JSON export in, as `import structurizr` does. The page Plateaus has a reading of a path of plateaus that shows the same rows as the file.
