---
type: run
run: 0015
status: completed
wave: 004
---

# Run 0015: Workspace name

Wave 004 (`editor-workspace-experience`), run W-4. Document profile: `single-document` (this file carries scope,
decisions, canonical impact, verification and findings).

## Context

- `workspace.yaml` has `settings` (manifests, relationships, views, facets) but nothing that names the workspace: the
  editor shows the name of the picked folder (`AppState.folder.name`) top-left, followed by a `/`, and uses it in the
  page title and in the "Opening “x”…" messages.
- `Settings.java` is a Lombok `@Value @Jacksonized @Builder`; the project mappers disable `FAIL_ON_UNKNOWN_PROPERTIES`
  and serialize with `NON_EMPTY`, so an optional `String` field is absent from the output while it is null.
- In the editor, `parseSettings` builds the settings, `serializeManagedSettings` / `serializeSettingsToRaw` write them
  back around the keys the editor does not manage (`SETTINGS_MANAGED_KEYS` lists, per section, the keys it owns), and
  `readSettingsDraft` / `commitSettingsEdit` take the Settings form through "Save all changes".
- Run 0014 added the "Appearance (this browser)" section (a per-browser preference, outside the workspace); it must not
  change.

## Scope

In:

1. CLI: an optional `name` in `Settings` (older files stay valid).
2. Editor model: `settings.name` read by `parseSettings`, written by `serializeManagedSettings`, omitted when blank, other
   and unknown keys still preserved.
3. Settings screen: a "Workspace" section with a "Name" field, through Save (marks the workspace modified).
4. Display: the name replaces the folder name in the top bar, in the page title and in the "Opening “x”…" messages; the
   folder name becomes the tooltip of the name. Without a name, nothing changes.
5. Manual and the `domain_workspace` example; node and Java tests.

Out: remembering the name across visits and with each folder (W-9 owns the stored record); the landing "Welcome back"
text, which is about the permission of a folder and keeps naming the folder; the CLI using the name (no output of the
CLI shows a workspace name today).

## Decisions

- **D1. The key is `settings.name`, optional** (decided by the user). Rejected: a top-level `name` of `workspace.yaml`
  (the user chose `settings`; it also keeps the key inside the section the editor already merges).
- **D2. `Settings.name` is a plain `String` with no default.** Null when absent, so the mapper's `NON_EMPTY` leaves it out
  and the generated manual snippets (`default_settings.yaml`, `default.yaml`) do not change. No `@JsonAlias` is needed: a
  single word has one spelling. Rejected: a default of `""` (it would be written back as `name: ""`).
- **D3. In the editor a blank name is no name.** `parseSettings` yields `''` for an absent, null, blank or non-text value
  (a number or a boolean becomes its text, as Jackson reads them into a `String`); the value is kept as written
  otherwise). Display uses the trimmed text; the form applies and serializes the trimmed text, so a name written with
  spaces around it is trimmed the next time the settings are saved (never otherwise). A blank name is omitted from the
  file. A `name` that is not a text (a mapping, a list) is no name for the editor and is dropped from the file on the next
  save of the settings, as a blank one is: the CLI could not read it into a `String` either.
- **D4. `name` is a single value, not a section, so it gets its own list, `SETTINGS_MANAGED_SCALARS`**, beside
  `SETTINGS_MANAGED_KEYS` (which maps a section to its owned sub-keys). `serializeSettingsToRaw` skips the raw `name`
  and writes the managed one in the same place when it exists; without that rule an emptied name would survive as an
  "unknown" key. A name the file did not have is written first in `settings`, which is where a reader looks for it.
  Rejected: adding `name` to `SETTINGS_MANAGED_KEYS` with a pseudo-section (the merge code treats each entry as an
  object); always writing `name` (a workspace without one would gain a key it never asked for).
- **D5. The Name field is in its own section "Workspace"**, between "Appearance (this browser)" and "Manifests", with the
  folder name as the placeholder (it is what is shown when the field is empty) and a help text linking to the manual's
  Workspace section. It is read in `readSettingsDraft` and applied by `commitSettingsEdit`, like every other field:
  typing dirties the form, "Save all changes" applies and writes it.
- **D6. Top bar.** With a name: `<span class="folder-name workspace-name" title="Folder: …">name</span>`, no `/` (the
  slash marks the browsing root of a folder, which is no longer what is displayed). The long explanatory tooltip of the
  folder name is replaced by the folder name, as the user asked. Without a name, the former markup is untouched. Both
  texts are escaped with `escapeHtml`; the existing `.folder-name` CSS (ellipsis, no wrap) applies to both.
- **D7. Page title** is "ArchiCode Editor " + the name, or the folder name without one (`pageTitle`, through
  `workspaceLabel`). The landing screens keep the plain "ArchiCode Editor".
- **D8. "Opening “x”…" says the name only for a workspace this page has already read.** At the time the message shows,
  `workspace.yaml` has not been read yet, so the name can only come from memory. `lastWorkspaceName` (outside `AppState`,
  which Close folder resets, like `landingBusy`) records the name and the folder it belongs to on every render of a loaded
  workspace; `openingMessage(folder)` uses it when the folder name matches, and the folder name otherwise.
  It holds the name as the page has it in memory, which can be an edit not saved yet. It covers "Try again" and picking
  the same folder again after Close folder, when this page has already shown that workspace. A first visit, or another folder,
  says the folder name: remembering the name across visits is the stored record of W-9 (this run does not touch
  IndexedDB). Matching by folder name is a heuristic; the cost of a wrong match is a message that the load replaces
  within a moment. Rejected: persisting the name in the stored handle record or in `localStorage` (W-9 changes that
  schema and remembers the name per folder; doing it here would be redone).
- **D9. The landing text "Your browser needs your permission to read “x” again" and the error text keep the folder
  name**: they are about a folder the browser needs a permission for, and the name is not known there.

## Canonical impact

None to the canonical docs: `docs/` holds the run and wave records only; this repository has no ADR/arc/dom packet for a
setting of the workspace file. The user-visible behaviour is documented in the manual (`src/doc/README.adoc`: Workspace,
Technical Configuration, Editor > "Name of the workspace"), the repository's canonical description of the product; task T5
discharges it. `docs/` has no analysis this run fulfils.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | `Settings.name` and Java tests (read, absent, not written when null) | done |
| T2 | Editor model: `parseSettings`, `serializeManagedSettings`, `serializeSettingsToRaw`, `readSettingsDraft` | done |
| T3 | Settings screen: "Workspace" section, help text | done |
| T4 | Display: top bar, page title, `openingMessage` | done |
| T5 | Manual and the `domain_workspace` example | done |
| T6 | Node tests (`workspace-name.test.js`) | done |

Tasks are worked inline: small, one contract (`settings.name`), none is `hard_judgment`.

## Acceptance criteria

- AC1. A `workspace.yaml` with `settings.name` is read by the CLI; one without it stays valid and the name is null.
- AC2. The editor reads `settings.name`; an absent or blank one is `''`.
- AC3. A save writes the trimmed name where the file had it (or first in `settings` when new), omits a blank one, never
  adds a `name` to a workspace that had none, and keeps the other and unknown settings.
- AC4. Settings shows "Workspace" > "Name" between "Appearance" and "Manifests"; typing marks the form dirty and the
  value goes through Save; the Appearance section is as it was.
- AC5. With a name, the top bar shows it (escaped) with the folder as tooltip and no `/`; the page title uses it.
  Without a name, the top bar markup and the title are exactly as before.
- AC6. "Opening “x”…" shows the name for a folder whose workspace this page has read, the folder name otherwise.
- AC7. The manual and the `domain_workspace` example show the setting.

## Review passes

KDMLLC review of this document (dispatched, standard tier, with a C scan against the repository diff). Verdict
Acceptable (KISS 4, DRY 4, MECE 3, LEAN 4, LUCID 3, C 4); no S3, two S2, three S1. The implementation matched the
document and no escaping or save defect was found. Applied: F1 and F2 (Verification below, with the AC-to-evidence table
and what is unverifiable), F3 (D3: a non-text `name` is dropped on the next save), F4 (D8: the remembered name is the
in-memory one, "Try again" softened), F5 (D3: trimmed when the settings are written). F6 (numbers and booleans read as
text, as Jackson does) kept: one line, and it matches the CLI. F7 needed nothing. The suggested input-event test for AC4
was added. Open questions: none.

## Verification

Run on 2026-10-13, JDK 25 (`JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem`):

- `node --test "src/test/javascript/**/*.test.js"`: 222 pass, 0 fail (baseline 209; 13 new in `workspace-name.test.js`).
- `./mvnw test`: 107 tests, 0 failures (baseline 104; 3 new in `SettingsTest`). The generated example files
  (`default.yaml`, `default_settings.yaml`) are unchanged by the run of `GenerateResourceTest`.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: exit 0 (no Rust change; the base64 kernel block is untouched).
- Diff review: no change to the kernel block, no debug leftover, the Appearance section code untouched.

| AC | Evidence |
|----|----------|
| AC1 | `SettingsTest` (read, absent, null not written); `Settings` alone, not a full `WorkspaceFactory` load |
| AC2 | `workspace-name.test.js`: `parseSettings` for absent, blank, null, mapping, number |
| AC3 | round trip in place, new name first, absent stays absent, blank removed, unknown keys kept |
| AC4 | markup and order of the section, placeholder, help; `readSettingsDraft` + `commitSettingsEdit` + save; typing dirties the form; the Appearance tests of `theme.test.js` still pass |
| AC5 | top bar with a name, without (exact former markup), blank, escaping; page title |
| AC6 | `openingMessage` unit test; the five call sites are not exercised (they need the picker) |
| AC7 | by reading only |

Not confirmed: the page itself (the editor needs the File System Access picker, so it was not opened): the look of the
name and the ellipsis of a long one, and the five "Opening" call sites in a browser; the manual was not built with
Asciidoctor (the `<<editor-workspace-name>>` and `<<workspace>>` anchors were checked by reading).

## Findings

- A name is not known while a folder opens (workspace.yaml is not read yet), so "Opening “x”…" can only say it for a
  workspace the page already showed. For the wave: W-9 should feed `openingMessage(folderName)` from the name it stores
  with each folder and drop `lastWorkspaceName`.
- `serializeSettingsToRaw` has a second rule for single-value keys (`SETTINGS_MANAGED_SCALARS`); a later single-value
  setting belongs in that list.
- The top bar span gained the class `workspace-name`; the CSS of `.folder-name` is unchanged and applies to both forms.
