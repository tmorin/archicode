---
type: wbc
wave: 018
status: completed
date: 2026-10-21
related:
  - docs/wav/wav-017-editor-defects-and-composed-replaces/wav-017-editor-defects-and-composed-replaces.md
  - docs/wav/wav-017-editor-defects-and-composed-replaces/prg-017-editor-defects-and-composed-replaces.md
  - docs/fixtures/brightcart-spec.md
  - CLAUDE.md
---

# Wave 018 — Groups, Shims and Plateau Gaps — Business Case

## Context

Wave 017 (PR 131) was released as 0.16.0 on 2026-10-21 and left the issues #124, #112, #109, #114, #78, #103, #125, #128, #129, #130 and #132 open, besides the older #24, #25, #29 and #65. On the same day the author went through all of them in a decision page and decided, one by one (the answers are quoted in the comments of the issues):

- **in this wave:** #132 and #129 in one lot, #130 (refuse the write), #112 (delete a plateau in the middle, in one step), #109 (a command of its own that draws the steps of a story), #124 (the dependencies of an application include those of what is inside it), #103 (the parser marks the YAML 1.1 numbers);
- **removed instead of fixed:** the notion of *group* (#114: no shipped example, fixture or manual example uses one, and it is the source of the limits of #114 and D3 of run 0091), and every compatibility shim (#128: the tools are 0.x, so no legacy: the camel-case keys of `settings.facets`, the Jayway dialect of the facets, the old routes of the editor);
- **closed:** #25 (`--fail-on` is built, the git ref is not needed since plateaus are layers) and #29 (the automated checks are enough);
- **kept open, out of this wave:** #65 (plateau merge, another wave), #24, #78, #125.

Nothing in the registers (`docs/bkg`, `docs/ana`) exists to read; the sources are the GitHub issues.

## Problems / Opportunities

- The group is a kind with no manifest of its own. Each rule written for the other kinds needs an exception for it (nesting, *Move*, the creation under an inherited parent, the top level), and two of them are documented limits that nobody can lift without making the patches create elements.
- Four shims keep two readers alive (the camel-case aliases, the rewrite of the Jayway dialect by the kernel, the routes of the editor) for a workspace that the author does not have; each costs code, cases and manual text.
- The key under the diagram takes up to half of the height of the pane when a comparison is on; a refused write drops what was typed; *Write replaces* can write an entry that the layer it is written in does not know.
- A plateau in the middle of the tree can only be deleted by editing the plateaus above it first; a story step told at a plateau is checked but never drawn by the command line.
- The derived dependencies of a deployed application ignore the relationships of what is inside it, so a container with components shows fewer links than a container without.
- `id: 010` is one reference for the command line and another for the editor.

## Options & Recommendation

1. **Removals first, then the editor, then the model and the command line, then the manual (four phases, nine runs)** (recommended): the two breaking removals come first so that every later run compares against a tree that already refuses the old forms, the editor lot is three independent runs, the three model runs come last because two of them change what the kernel and the views draw.
2. **Keep the group and the shims, only fix** (the first recommendation of the review). Rejected by the author: the group has never been used by an example and every limit it creates is an exception; the shims are the legacy he does not want in a 0.x tool.
3. **One breaking run for the group and the shims.** Rejected: they have separate exit evidence (a kind that is refused, forms that are refused) and different files (Java kinds and the editor page, against the kernel facets and the editor routes); one run would be the largest of the wave and could not fail cheaply.
4. **Add #65 (plateau merge).** Rejected by the author for another wave: it is the largest feature and shares the plateau tree with #112, which should settle first.

## Vision

The group no longer exists: a manifest or an element of kind `group` is one clear `error:` line that says what to write. The old forms of the facets and the old routes of the editor are gone, each removed form of a file says what replaces it in one line, and the manual has one block that lists the breaks. A comparison folds its key into a row, a refused write keeps what was typed, *Write replaces* refuses an entry its layer cannot hold, and a plateau in the middle of the tree is deleted in one step that names what its neighbours lose. The command line draws the steps of the stories with their plateaus, the dependencies of an application include those of what it holds, and the command line and the editor read `id: 010` the same.
