---
type: wbc
wave: 006
status: completed
date: 2026-10-13
related:
  - docs/wav/wav-004-editor-workspace-experience/wav-004-editor-workspace-experience.md
  - docs/wav/wav-005-follow-ups-and-field-check/wav-005-follow-ups-and-field-check.md
  - src/doc/README.adoc
---

# Wave 006 — Library View Editor — Business Case

## Context

The Library of the standalone editor has a *Views* side (`#/library/views?view=<id>`) for the named diagrams a workspace
keeps (`view.<id>.yaml` manifests, wave 004). Today the page of a view is a text page: a list of facts (what it draws,
viewpoint, layer, properties, the file that keeps it) and the steps of stories that show it, with *Open on diagram*,
*Rename* and *Delete* in its header. The centre shows no diagram and the right-hand side is empty
(`renderLibraryPerspectiveHtml` returns `right: null`). To see a view, or to change anything about it, one has to leave
the Library: *Open on diagram* rewrites the state of the Map or of Elements to match the view, and the change then has
to be named again.

The page that prompted this wave is `#/library/views?ref=platform.iam&view=authentication_token_validation`, the view
`authentication_token_validation` of the user's own workspace (`viewpoint: detailed`, element `platform.iam`, facet
`oidc`, *Hide unlinked*, no labels, wrap). The user expects to modify a view directly on its page, and wants that page
to draw the diagram in the centre and to show the attributes in the right-hand panels, as the Map and the diagrams of
Elements do (wave 004's inspection panel).

Nothing in the registers covers this (`docs/` has no `bkg` or `ana` register, and no open GitHub issue is about it;
tmorin/archicode#18 is unrelated).

## Problems / Opportunities

- A view cannot be seen where it is managed: the Views side describes a diagram in words and sends the reader elsewhere
  to look at it.
- A view cannot be modified where it is managed either: its recipe (element, viewpoint, facet, texts, pins) can only be
  changed by drawing it on the Map or in Elements, moving things, and keeping the result under a new name.
- The diagram code of the editor is written for two hosts, the Map and the diagrams of Elements, and reads the page's
  global state (selection, pins, facet, texts). A third host that is not allowed to disturb the other two is the real
  difficulty of the request, not the layout.

## Options & Recommendation

1. **Four runs in a line: draw the view, show its attributes, edit it, check it in the real page (recommended).** The
   first run settles the hard part (a diagram host that leaves the Map and Elements state alone); the second reuses the
   inspection panel; the third makes the attributes editable; the last looks at the result on a copy of the real
   workspace, with the view that prompted the wave. Each run has a distinct exit evidence.
2. **One run for everything.** Rejected: the diagram host is a refactor of code shared with the Map and Elements, and
   if it goes wrong nobody can judge the panels or the editing built on top of it; one run also gives one evidence for
   four different claims.
3. **Keep the page as it is and make *Open on diagram* the way to edit, adding "Update view" on the Map and in
   Elements.** Rejected: it does not draw the view in the Library, which is what was asked; every visit would still
   rewrite the state of the Map or of Elements; and the attributes would still be edited by moving things around rather
   than by saying them.
4. **Draw the view in the Library as a picture produced once (static SVG).** Rejected: no selection, no attribute of a
   box, no redraw when the view is edited.

## Vision

The page of a view in the Library draws that view in the centre, from the model and as the Map and Elements draw it,
without touching what those two perspectives show. The right-hand panels show the view's attributes and, once a box or a
link of the diagram is selected, the same inspection panel as elsewhere. The attributes can be changed there, the
diagram follows, and the change waits for *Save all changes* like every other edit. The result has been seen in the
real page on a copy of the real workspace, with the view `authentication_token_validation`.
