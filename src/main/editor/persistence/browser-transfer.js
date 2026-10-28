// =====================================================================
// Reading and replacing every file of a browser workspace (wave 025, run 0193, TDD-0193 DEC-6, DEC-12, CTR-1, CON-8, CON-9): the two
// operations of Export, Import's neighbours and Reset that need a snapshot or an atomic swap, which only one transaction gives.
// Both go through withBrowserWorkspace (persistence/browser-store.js), so a workspace deleted in another tab is the sentence of W-4 DEC-6
// and is never written to. Pure persistence: no DOM, no drawing, no page state. They use only what the fake of the harness has: the keys of
// the store, `get`, `put` and `delete` (no range, no index, no cursor).
// =====================================================================

/* exported readBrowserWorkspaceFiles, replaceBrowserWorkspaceFiles --
   the two entry points of this part: the flows of application/bundle-flows.js call them (run 0193, task 009). */

/**
 * A snapshot of the files of a workspace, in one read-only transaction: `[{ path, bytes, modified }]` sorted by code point, the bytes
 * copied into arrays of the page's own. A workspace that is gone rejects with the sentence of W-4 DEC-6 (`ownerName` is the name in it,
 * '' when unknown). Writes nothing.
 */
async function readBrowserWorkspaceFiles(workspaceId, ownerName) {
  const prefix = BROWSER_FILE_PREFIX + workspaceId + '/';
  const files = await withBrowserWorkspace('readonly', workspaceId, ownerName, (store, record, out, fail) => {
    out.value = [];
    store.getAllKeys().onsuccess = browserStep(fail, (event) => {
      for (const key of event.target.result.filter((candidate) => candidate.startsWith(prefix))) {
        store.get(key).onsuccess = browserStep(fail, (ev) => {
          const value = ev.target.result;
          if (!isBrowserFileRecord(value)) return; // a record of another kind under the prefix is not a file of the workspace
          const filePath = key.slice(prefix.length);
          if (!ArrayBuffer.isView(value.bytes)) {
            throw browserError('NotReadableError', 'The file “' + filePath + '” could not be read from this browser.');
          }
          out.value.push({
            path: filePath,
            bytes: browserBytesOf(value.bytes),
            modified: typeof value.modified === 'number' ? value.modified : 0
          });
        });
      }
    });
  });
  return files.sort((a, b) => bundleComparePaths(a.path, b.path));
}

/**
 * Swaps every file of a workspace for `files` (`[{ path, bytes }]`) in one read-write transaction: the files that are stored are deleted,
 * the new ones written with one `modified` for all, and the record gets a new `openedAt` and is otherwise left as it is. The paths are
 * checked, with the sentence of the creation, before the transaction opens, and the bytes are copied before it, so nothing the caller
 * keeps is stored. Any failure aborts the transaction and the old files stay. Resolves when the transaction has committed.
 */
async function replaceBrowserWorkspaceFiles(workspaceId, files, ownerName) {
  const list = files || [];
  for (const file of list) {
    const problem = browserPathProblem(file && file.path);
    if (problem) throw browserError('InvalidPathError', 'A workspace cannot hold this file: ' + problem + '.');
  }
  const now = Date.now();
  const stored = list.map((file) => ({
    key: BROWSER_FILE_PREFIX + workspaceId + '/' + file.path,
    value: { kind: 'file', workspace: workspaceId, path: file.path, bytes: browserBytesOf(file.bytes), modified: now }
  }));
  const own = BROWSER_FILE_PREFIX + workspaceId + '/';
  await withBrowserWorkspace('readwrite', workspaceId, ownerName, (store, record, out, fail) => {
    store.getAllKeys().onsuccess = browserStep(fail, (event) => {
      for (const key of event.target.result) {
        if (key.startsWith(own)) store.delete(key);
      }
      for (const file of stored) store.put(file.value, file.key);
      store.put(
        Object.assign({}, record, { openedAt: Math.max(now, record.openedAt + 1) }),
        BROWSER_WORKSPACE_PREFIX + workspaceId
      );
    });
  });
}
