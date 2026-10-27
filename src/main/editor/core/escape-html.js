// =====================================================================
// Real three-panel read-only UI (run-0008, task-002; PRD FR-8..FR-16,
// NFR-2/NFR-4; TDD DEC-1/DEC-6/DEC-7/DEC-8/DEC-9/DEC-10/DEC-11,
// IF-1..IF-3, FLOW-5). Replaces the former temporary diagnostic view.
// =====================================================================

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c]
  );
}
