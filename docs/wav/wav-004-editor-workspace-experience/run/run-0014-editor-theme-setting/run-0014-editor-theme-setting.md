---
type: run
run: 0014
status: completed
wave: 004
---

# Run 0014: Editor — theme setting

Wave 004 (`editor-workspace-experience`), run W-3. Document profile: `single-document` (this file carries scope,
decisions, canonical impact, verification and findings).

## Context

- The editor's stylesheet follows `prefers-color-scheme` alone: `:root` holds the light variables and one `@media
  (prefers-color-scheme: dark)` block the dark ones. There is no way to pick a scheme in the page.
- `prefersDarkScheme()` (matchMedia) feeds the CodeMirror `dark` flag and its dark highlight; `diagramExportCss()` reads
  the computed CSS variables, so the SVG/PNG export follows the stylesheet by itself.
- `localStorage` is already used for the panel sizes, always in `try/catch` (`panelSizeStorage`).
- `handleAppInput` marks the form dirty (`draftTyped`, which lights "Save all changes") for any `input` event inside
  `.settings-view`.

## Scope

In:

1. Stylesheet: `:root[data-theme="light"|"dark"]` override `prefers-color-scheme`; no attribute means "system".
   `color-scheme` is right in each case (`light dark` for system, `light` or `dark` when forced).
2. A small inline script in `<head>` applies the stored choice before the first paint (no flash).
3. State and functions: the choice (`light` | `dark` | `system`, default `system`), read from and written to
   `localStorage` (every access in `try/catch`), kept in memory when the storage is unavailable.
4. Settings: a section "Appearance (this browser)" with native radios in a `fieldset`/`legend`, placed first and apart
   from the workspace settings. The effect is immediate.
5. CodeMirror follows the resolved scheme (forced choice, else the system one); the editors already open are rebuilt
   with their current text when the scheme changes, including when "system" follows the operating system.
6. Tests (node) and a paragraph in the manual (`src/doc/README.adoc`).

Out: anything in `workspace.yaml`; the Save state; a colour of the diagram boxes (W-6); a fourth theme; a switch on the
screens that need no workspace (the landing screen follows the stored choice but offers no way to change it: the setting
lives in Settings, as decided).

## Decisions

- **D1. Per-browser preference in `localStorage`, key `archicode-standalone-editor:theme`.** Decided by the user. It
  never touches `workspace.yaml`, never marks the workspace as modified and never lights "Save all changes".
  Rejected: a workspace setting (the theme is a property of the viewer, not of the workspace).
- **D2. `system` is the absence of the attribute**, not `data-theme="system"`. The `prefers-color-scheme` rule then
  applies as before, so a browser without the script, or with the storage blocked, behaves as it did. Rejected: an
  attribute with all three values (needs a JS resolution of the system scheme to style the page).
- **D3. The dark variables are written twice** (the media query for "system", the `[data-theme="dark"]` rule): CSS has
  no mixin. The media rule is `:root:not([data-theme="light"])` so a forced light wins over a dark OS. A node test
  asserts that both blocks hold the same custom properties (the forced one also sets `color-scheme`), so they cannot
  drift, and that each overrides a variable of the light block. Rejected: `light-dark()` on each declaration (it would
  drop the second block, but it needs a recent browser and the badge-contrast test reads the `#rrggbb` literals of the
  declarations).
- **D4. The inline script in `<head>` is its own `<script id="theme-boot">`**, distinct from the app script. It only
  reads the key and sets the attribute, inside `try/catch`. The app script applies the choice again at start (the test
  harness does not run the head script, and a failed one costs nothing). The key and the accepted values are written in
  both; a node test runs the head script and checks they agree with the app's. The storage wrapper is its own small
  function rather than `panelSizeStorage`, whose key prefix and purpose are the panel sizes'. Rejected: setting the attribute only
  from the app script (the page would flash, the script runs after the body).
- **D5. The radios do not mark the form dirty.** The choice is applied from `handleAppInput` (the `input` event of a
  native radio; no `data-action`, so the click handler and its "leave the form" confirmation are not involved), which
  returns on the theme radios before its `draftTyped` test, and the choice does not call `render()`: a redraw would discard what the user typed in the
  workspace settings above or below. Only the attribute, the radios' own state and the open code editors change.
  Rejected: `render()` (loses the unsaved typing of the Settings form).
- **D6. Code editors are rebuilt with their live text** when the resolved scheme changes (`refreshCodeEditorThemes`),
  because the `dark` flag and the dark highlight are fixed when an `EditorView` is created. The undo history of an
  open editor is lost; its content and the unsaved draft are not. Rejected: a CodeMirror `Compartment` (the editor
  bundle exposes `EditorView` only, adding the state module for it is a larger change than the history is worth).
- **D7. "System" follows the operating system live**: a `change` listener on the media query re-runs the same refresh
  (guarded, `matchMedia` may be missing). The CSS follows by itself; this is for the code editors only.
- **D8. The SVG/PNG export needs no change.** `diagramExportCss()` and the background read the computed variables of
  the root element, which carry the chosen theme. Node has no CSS engine: a test only checks that the export reads the
  root element's computed style and keeps no colour or media query of its own.
- **D9. `prefersDarkScheme()` becomes `isDarkScheme()`**: it answers "is the page dark", whatever the reason, and its
  comment no longer says there is no switch.

## Canonical impact

None to the canonical docs: `docs/` holds the run and wave records only, with no ADR/arc/dom packet in this
repository's workflow for a UI preference. The user-visible behaviour is documented in the manual
(`src/doc/README.adoc`, "Editor"), which is the repository's canonical description of the editor; task T5 discharges it.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Stylesheet: `data-theme` overrides, `color-scheme`, head script | done |
| T2 | State, storage, `applyTheme`, `isDarkScheme`, code-editor refresh | done |
| T3 | Settings section with radios, input handling that does not dirty the form | done |
| T4 | Node tests (harness: `documentElement`, optional `localStorage`); `ui-fixes.test.js` contrast regex follows the new selector | done |
| T5 | Manual | done |

Tasks are worked inline: they are small, they touch one file and share one contract (the key, the three values, the
attribute); none is `hard_judgment`.

## Acceptance criteria

- AC1. The Settings screen shows "Appearance (this browser)": a `fieldset` with a `legend` and three native radios
  (Light, Dark, System), the stored one checked, System by default.
- AC2. Choosing a radio sets `data-theme` on the root element (`light`/`dark`) or removes it (`system`), stores the
  choice, and leaves the workspace unmodified and "Save all changes" off.
- AC3. With the storage throwing (read and write), the page loads, the choice still applies for the session, nothing
  throws.
- AC4. The stylesheet: forced light and forced dark rules exist with the right `color-scheme`; the system rule is
  skipped by a forced light; the two dark blocks hold the same custom properties (so the existing badge-contrast test,
  which reads the system dark block, covers the forced one too).
- AC5. The head script applies the stored value before the app script, ignores an unknown value and a throwing storage.
- AC6. The CodeMirror theme is dark for a forced dark whatever the OS says, light for a forced light, the OS's for system.
- AC7. Typed, unsaved settings are not lost by choosing a theme.
- AC8. The manual describes the setting.
- AC9. Open code editors are rebuilt with the text they hold when the theme changes (and the old views are destroyed);
  "system" rebuilds them when the operating system changes.

## Review passes

KDMLLC review of this document (dispatched, standard tier, with a C scan against the repository). Verdict Acceptable
(KISS 3, DRY 3, MECE 3, LEAN 4, LUCID 4, C 3); no S0, four S2, six S1. Applied: F1 (the contrast test's regex follows
the new selector, in T4; the forced dark block is covered because AC4 makes it equal to the system one), F3 and F4 (D3
reworded to the true trade-off and to "same custom properties"), F5 (the screens without a workspace are out of scope,
stated), F6 (AC9 for D6/D7), F7 (D5 names the event and says there is no `data-action`; D6 destroys the old views),
F2 (task statuses), F9 (D8 reduced to what node can check), F10 and F8 (D4 says why the storage wrapper is separate and
why the app script applies the choice again). F3's alternative (`light-dark()`) was weighed and rejected in D3. Open
questions: none left.

## Verification

Run on 2026-10-13, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`):

- `node --test "src/test/javascript/**/*.test.js"`: 209 pass, 0 fail (baseline 197, 12 new in `theme.test.js`; the
  contrast test in `ui-fixes.test.js` now reads the new selector).
- `./mvnw test`: 104 tests, 0 failures (no Java change; run to confirm the page still ships, nothing else reads it).
- AC1, AC2, AC7: `theme.test.js` renders the Settings screen (fieldset, legend, three radios, the stored one checked,
  section first and once), plays the `input` event of a radio (attribute set or removed, key written, `draftTyped`
  false, no unsaved changes, no redraw, `Save all changes` disabled, nothing "theme" in the serialized settings).
  AC3: refusing and absent storage. AC4: stylesheet rules and equal dark blocks. AC5: the head script run in a vm
  (dark, light, system, unknown, empty, refusing, absent storage; before `<style>`). AC6, AC9: CodeMirror dark flag for
  each choice and system, and the rebuild with the live text. AC8: README.adoc, section "Theme" (`editor-theme`).
- Diff review: no change to the base64 kernel block, no debug leftover.

Not confirmed: the page itself (the editor needs the File System Access picker, so it was not opened): the absence of
a flash, the radios' look in both themes, the real `data-theme` cascade and the export's colours are by reading only;
the OS-change listener and the CodeMirror rebuild run against fakes, not the real library; the manual was not built
with Asciidoctor.

## Findings

- The harness had no `documentElement` and no `localStorage`: both are now in `harness.js` (the storage only when a
  test passes one, so the other tests still run as a browser that refuses it).
- The head script is a second `<script>`: it carries `id="theme-boot"` so the harness's `<script>` match still takes
  the app script. Anything that stamps or serves the page (`EditorHttpServer`, the CI stamp) only touches the version
  `<meta>`, which is unchanged.
- For the wave: W-6 can rely on `data-theme` on the root element and on the CSS variables for dark-theme colours; a
  custom fill in the dark theme must use them or its own dark variant. W-4's top-bar work is unaffected.
