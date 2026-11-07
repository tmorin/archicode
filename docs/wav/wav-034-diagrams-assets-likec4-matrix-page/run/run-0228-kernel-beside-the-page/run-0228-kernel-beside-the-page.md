---
type: run
run: 0228
status: completed
profile: TDD+pln
wave: 034
---

# Run 0228 kernel-beside-the-page

Run of wave 034, manifest id W-3.

Files outside likely_paths: CLAUDE.md, .github/CLAUDE.md, .github/scripts/release-smoke.sh, .github/scripts/test-release-scripts.sh, .prettierignore, docs/architecture/manifests/archicode.yaml, scripts/changes.mjs, scripts/extract-editor-script.mjs, src/main/editor/assets.json, src/main/editor/page.html, src/main/java/io/morin/archicode/cli/EditorHttpServer.java, src/main/rust/viewpoint-kernel/README.md, src/main/wasm/viewpoint_kernel.wasm (moved), src/test/java/io/morin/archicode/cli/EditorHttpServerTest.java, src/test/java/io/morin/archicode/it/EditorServeIT.java

## Verification

Stage 11 re-ran in the working tree: `npm run editor:check`, `npm run test:unit`, `npm run format:check` and `npm run lint` exit 0; the page is 1,652,681 bytes with no `application/octet-stream`; the file beside the page is byte-identical to the kernel of `bfd0581`; `src/main/wasm` is gone; no Rust source changed; `embed.sh --check` exits 0. Maven verify with the integration tests, PMD, byte-identity and the two-engine e2e suite are taken from the task-008 record in the prg (not re-run at Stage 11). Unproved until a tag run: the real website step and the content type on GitHub Pages; also macOS, Windows, the native image, real Safari and a real network.

Review pass: dispatched (Stage 5 and Stage 9 reviews by agents other than the drafter; each task was verified independently by a separate agent).

Canonical impact: not applicable, the repository declares no arc or dom register (see the tdd).
