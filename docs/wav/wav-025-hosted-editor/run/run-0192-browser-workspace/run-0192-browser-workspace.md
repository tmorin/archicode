---
type: run
run: 0192
status: completed
profile: TDD+pln
wave: 025
---

# Run 0192: browser-workspace

Wave 025 (hosted-editor), manifest id W-4.

Files outside likely_paths: src/main/editor/application/browser-workspaces.js, src/main/editor/composition/bootstrap.js, src/main/editor/composition/events.js, src/main/editor/composition/render.js, src/main/editor/model/app-state.js, src/main/editor/model/settings.js

Review pass: dispatched, the Stage 5 review of the TDD was made by a leaf agent in a fresh context, independent of the agent that drafted it (findings in the prg, Findings; the TDD is edited by the main agent, not by the reviewer).

## Chromium-only pass (task 009)

Method: a grep of `src/main/editor` (scripts, `style.css`, `page.html`) for the names of DEC-10 and for the CSS and JavaScript features newer than the floor of ASM-7 (Chromium 111, Firefox 121, Safari 16.2). MDN browser-compat-data was not consulted in this pass, so every release number below is from memory and marked C-UNCHECKED; the deny lists of `browser-apis.test.js` keep names known to be after the floor or Chromium-only. Result: `showDirectoryPicker` is the one Chromium-only API found; every other row is a version floor at or below ASM-7. No source needed a fix, so the page is not rebuilt.

| Feature | Where | First release (Chromium / Firefox / Safari) | What the page does where it is missing |
| --- | --- | --- | --- |
| `showDirectoryPicker` | `persistence/folder-access.js` only | 86 / none / none (C-UNCHECKED) | `isFileSystemAccessSupported()` tests `typeof window.showDirectoryPicker === 'function'`; the landing card offers the browser workspace (`canKeepWorkspace()`) instead |
| `document.fullscreenEnabled`, `requestFullscreen` | `presentation/story-player.js` | 71 / 64 / 16.4 on unprefixed `document.fullscreenEnabled` (C-UNCHECKED) | the button is not drawn without `fullscreenEnabled === true`; a refusal is a notice, the modal stays |
| `inert` attribute | `presentation/story-player.js` (`#app`) | 102 / 112 / 15.5 (C-UNCHECKED) | below the floor only; the Tab trap of the player keeps the focus inside, so the player still works |
| `navigator.storage.persist` | `persistence/browser-store.js` | 55 / 57 / 15.2 (C-UNCHECKED) | `askForPersistentStorage` returns without it; the answer stays null |
| `ResizeObserver` | `presentation/diagram-interaction.js`, `element-form.js` | 64 / 69 / 13.1 (C-UNCHECKED) | `typeof ResizeObserver` tested before use |
| CSS `:has()` | `style.css` (one rule, `.element-header:has(...)`, a z-index) | 105 / 121 / 15.4 (C-UNCHECKED) | the rule is ignored; the overflow menu may sit under a neighbour (cosmetic); this is the Firefox 121 floor |
| CSS `color-mix()` | `style.css` (19 uses, tints of borders and backgrounds) | 111 / 113 / 16.2 (C-UNCHECKED) | the declaration is dropped; the tint is missing, the text stays readable; this is the Safari 16.2 and Chromium 111 floor |
| CSS container queries `@container` | `style.css` (3 rules, container `center`) | 105 / 110 / 16 (C-UNCHECKED) | the narrow layouts do not apply; the wide layout stays |
| `100dvh` | `style.css` (`.player-shell`) | 108 / 101 / 15.4 (C-UNCHECKED) | `height: 100vh` in the same rule comes first; the test pins the pair |
| `:focus-visible`, `inset`, `scrollbar-width` | `style.css` | 86, 87, 121 / 85, 66, 64 / 15.4, 14.1, 18.2 (C-UNCHECKED) | `scrollbar-width` is cosmetic; the others are below the floor |

Guard: `src/test/javascript/viewpoint-kernel/browser-apis.test.js` (script list, stylesheet list, one-file rule for `showDirectoryPicker`, the guards above, the `100vh` fallback). Shown to fail on a scratch copy of `src/main/editor` (`ARCHICODE_EDITOR_SRC`) with `Promise.withResolvers()` and `showOpenFilePicker()` added to `application/move.js` and `field-sizing` to `style.css`: the script test and the stylesheet test fail naming file and name; the source tree is unchanged.

## Verification (task 011)

Commands, each run from the repository root on the finished work:

| Command | Result |
| --- | --- |
| `npm run test:unit` | exit 0; 2957 tests, 2956 pass, 0 fail, 1 skipped (the timing test, which runs alone) |
| `npm run test:coverage` | exit 0; 92.97 % of the lines (23,825 of 25,624), 96.37 % of the functions (2,177 of 2,259); "the figure holds the floor"; `git diff scripts/editor-coverage-floor.json` is empty, no floor lowered |
| `npm run lint` | exit 0 |
| `npm run format:check` | exit 0 ("All matched files use Prettier code style!") |
| `npm run editor:check` | exit 0; 1427 top-level names, load order holds, upward pairs 99 (max 99, `ratchet.max` in `layers.json` is 99) |
| `wc -l` of the files under `persistence`, `application`, `presentation` and `composition` | the largest is `presentation/changes-panel.js` with 1,494 lines, all under 3,000 |
| `grep -c "browser workspace" CLAUDE.md` | 1 (the paragraph "Browser workspace", before "CI jobs") |

Mutations of `src/main/editor/persistence/browser-store.js` (a copy of the file and of `standalone.html` was saved first; each mutation was followed by `npm run editor:build` and `node --test src/test/javascript/viewpoint-kernel/browser-store.test.js`):

1. DEC-6 check removed (`if (!isBrowserWorkspaceRecord(record)) {` made `if (false) {` in `withBrowserWorkspace`): exit 1, 4 failures, 30 pass: "a write whose workspace was deleted in another tab is refused with the sentence, name NotFoundError, and stores nothing", "a create, a removal and a new directory with a file after the workspace was deleted are refused and store nothing", "reads of a deleted workspace are a NotFoundError too", "renameBrowserWorkspace refuses a bad or taken name with the sentence, and a workspace that is gone".
2. `Math.max(Date.now(), before + 1)` replaced by `Date.now()` in `close()`: exit 1, 1 failure: "modified strictly increases across writes, inside one millisecond and when the clock goes back".
3. `close()` writing before it checks (the previous file record deleted in its own transaction ahead of the guarded transaction): exit 1, 2 failures: "a quota failure rejects close() ... and the old bytes stay" and the monotonic test.

After each, the file was restored from the saved copy, `npm run editor:build` was run, `cmp` showed `browser-store.js` and `standalone.html` identical to the saved copies, and after the third `npm run editor:check` exited 0. `git status` shows no change to `browser-store.js` or the page beyond what the run already had.

Not run: `./mvnw verify` and `scripts/byte-identity.sh`, the wave gate, because this run changed no Java file and no command-line behaviour (the editor page, its sources, tests and documents only).

### Notes for the wave owner

- The `likely_paths` of W-4 differ from the files changed: `composition/bootstrap.js`, `composition/events.js`, `model/app-state.js`, `model/settings.js` and `application/browser-workspaces.js` were added to the list; `package.json` was not touched (no dependency, no script).
- `browser-apis.test.js` carries release numbers from memory (C-UNCHECKED, see the Chromium-only pass): check them against MDN browser-compat-data before the floor of ASM-7 is quoted to readers.
- The third mutation is one reading of "writing before it checks"; it is caught by the quota test and the monotonic test, not by the DEC-6 tests.
