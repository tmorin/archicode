---
type: run
run: 0144
status: completed
profile: single-document
wave: 019
---

# Run 0144: rename-workspace-file

Wave 019, W-8. The file that marks a workspace is `.archicode.yaml`, with no alias, and the old name gives one clear sentence in both tools (#133, decision T9).

## Scope and decisions

- Only the default of `-w` changes (`cli/ArchiCode`); `-w workspace.yaml` (an explicit path) still works. No alias, no migration command.
- A folder with `workspace.yaml` and no `.archicode.yaml`: one sentence, the same word for word in both tools (`WorkspaceFactory.FORMER_NAME_SENTENCE`, `FORMER_WORKSPACE_FILE_SENTENCE` in `standalone.html`), pinned by `src/test/javascript/viewpoint-kernel/workspace-file-name-cases.json` (read by `WorkspaceFileNameTest` and `workspace-file-name.test.js`). Command line: one `error:` line, exit 1, before anything is loaded, also from `editor serve`. Editor: the reason the folder cannot be opened.
- Discovery: `.archicode.yaml` is never a manifest, in a folder read without `/**` as in one read with it (new cases D37, D38 of `discovery-cases.json`; `ManifestDiscovery.WORKSPACE_FILE_NAME`, `readManifestFolder`).
- `editor serve` lists and serves the file at the root only (`EditorHttpServer.WORKSPACE_FILE`); every other hidden entry is still refused.
- Every shipped workspace (20) renamed with `git mv`; tests, helpers, generator, README, site, `docs/fixtures` and `CLAUDE.md` follow. The manual: only the `include::` paths changed (W-9 owns the text).
- `CustomRenderingTest` uses `.custom/.archicode.yaml` if it exists, else `.custom/workspace.yaml`.
- `delete-plateau-as-released.test.js` opens the page of the tag `archicode-0.17.0`, which reads `workspace.yaml`: it gives that page a copy under the old name and puts the saved files back under the new one.

## Tasks

- [x] rename the 20 workspaces, text replace in code, tests, docs outside `src/doc`
- [x] sentence in both tools, shared cases, tests
- [x] discovery rule and cases, server listing and serving, tests
- [x] CLAUDE.md
- [x] verification (below)

## Verification

`./mvnw -o verify -DskipITs=false '-Dtest=!CustomRenderingTest'`: 1268 unit tests and 27 integration tests, 0 failures (2 skipped, as before); cargo test 240 passed; `embed.sh --check` ok; node 2407/2407; prettier check clean; `CustomRenderingTest` passed (it ran on the author's `.custom/workspace.yaml`, the old name, through the fallback). Byte identity with the jar of the end of P0 (old names): 20/20 workspaces identical for `views generate`, `diff --plateau` per plateau and `query graph` (plus `query graph --plateau saas|marketplace|to-be` checked by hand); no output file quotes the file name.

## Canonical impact

None for the architecture documents: no `CI-arc` or `CI-dom` item. The change is a user-visible rename that the manual and `CLAUDE.md` state (the manual's text is W-9's).
