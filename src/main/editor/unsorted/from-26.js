// =====================================================================
// Perspectives (Eclipse-style named panel arrangements) — three now, so
// this is a real per-region dispatch (see renderShellHtml), not just a
// label. Hash-routed (file:// pages don't reload on a hash change, so
// this is a free, build-step-free router): the hash is the one source of
// truth for which perspective is showing, kept in sync with
// `currentPerspective` in both directions (setPerspective writes the
// hash; the 'hashchange' listener below reads it back, which also covers
// back/forward and a hand-edited URL).
// =====================================================================
/**
 * The pages of the editor, by id, and where each lives: the group of the top bar it belongs to (`group`) and the route that names it in the address (`route`).
 * Wave 014 (run 0081, W-7): the perspectives are Timeline (the pages Plateaus, Applications, Environments and Elements), Stories, Files and
 * Settings. Wave 015 (run 0096, W-8): the page that lists and edits the plateaus is called Plateaus (`plateaus`, "#/timeline/plateaus"; it was the page Timeline) and
 * the button Timeline of the top bar opens Applications, the first page of the perspective that draws something. The ids `map`, `elements` and `library` are the former perspectives and stay the names the code uses: `map` is the page called Applications,
 * `library` the one called Stories. Wave 015 (run 0099, W-11, #92): `environments` is a perspective of its own, the Map of the technology layer, as `map` is the Map of the application
 * layer (`mapIsShown`, `mapLayer`); the page Elements keeps its tree of both layers.
 */
const PERSPECTIVES = {
  plateaus: { label: 'Plateaus', group: 'timeline', route: 'timeline/plateaus' },
  map: { label: 'Applications', group: 'timeline', route: 'timeline/applications' },
  environments: { label: 'Environments', group: 'timeline', route: 'timeline/environments' },
  elements: { label: 'Elements', group: 'timeline', route: 'timeline/elements' },
  library: { label: 'Stories', group: 'library', route: 'stories' },
  files: { label: 'Files', group: 'files', route: 'files' },
  settings: { label: 'Settings', group: 'settings', route: 'settings' }
};
/** The buttons of the top bar: each is a group of pages, and opens the first page of its group. */
const PERSPECTIVE_GROUPS = [
  { id: 'timeline', page: 'map', label: 'Timeline' },
  { id: 'library', page: 'library', label: 'Stories' },
  { id: 'files', page: 'files', label: 'Files' },
  { id: 'settings', page: 'settings', label: 'Settings' }
];
/** The pages of Timeline other than Plateaus, in the order of the second bar (which begins with Plateaus). */
const TIMELINE_PAGES = ['map', 'environments', 'elements'];
