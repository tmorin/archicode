// =====================================================================
// Bundle codec (run 0191, #162 proposal 1; TDD-0191 DEC-1 to DEC-5, CTR-1
// to CTR-3): a workspace as one YAML text and back, byte for byte. Two
// pure functions and their helpers: no AppState, no DOM, no storage. The
// contract is data: src/test/resources/editor-bundle/bundle-cases.json.
// =====================================================================

/* exported bundleWorkspaceFiles, bundleSkippedSentence, unbundleWorkspaceFiles --
   the entry points of the codec: read by its tests now, by Export and Import (run W-5 of wave 025) next. */

const BUNDLE_SEPARATOR_PREFIX = '--- # file: ';
const BUNDLE_NO_FINAL_NEWLINE = ' # no final newline';
const BUNDLE_MAX_BYTES = 10 * 1024 * 1024;

/** The one test of a separator line (DEC-1): the line begins with the prefix. */
function bundleSeparatorAt(line) {
  return line.startsWith(BUNDLE_SEPARATOR_PREFIX);
}

/** Compare two paths by code point (DEC-4), not by UTF-16 code unit. */
function bundleComparePaths(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  const length = Math.min(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const difference = left[i].codePointAt(0) - right[i].codePointAt(0);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

/**
 * The reason a path cannot be carried (DEC-3), a phrase, or null when it can.
 * The one place the phrases are written; export stores them, import quotes them.
 */
function bundlePathProblem(path) {
  if (path === '') return 'empty path';
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) return 'absolute path';
  if (path.includes('\\')) return 'holds a backslash';
  if (/[\u0000-\u001f\u007f-\u009f]/.test(path)) return 'holds a control character';
  if (path.includes(' #')) return 'holds a space and a hash';
  if (path.startsWith(' ') || path.endsWith(' ')) return 'starts or ends with a space';
  const segments = path.split('/');
  if (segments.includes('')) return 'has an empty segment';
  if (segments.includes('..')) return 'leaves the workspace folder';
  if (segments.includes('.')) return 'has a `.` segment';
  if (path !== WORKSPACE_FILE_NAME && segments.some((segment) => segment.startsWith('.'))) return 'hidden';
  // the same case-sensitive test as readManifestFolder: `.YAML` is not a manifest
  if (!/\.(ya?ml)$/.test(path)) return 'not YAML';
  return null;
}

/** The path that clashes with `path` as a file and a folder, among the `files` map (path -> any), or null. */
function bundleClashingPath(path, files) {
  const segments = path.split('/');
  for (let i = 1; i < segments.length; i++) {
    const ancestor = segments.slice(0, i).join('/');
    if (files.has(ancestor)) return ancestor;
  }
  for (const other of files.keys()) {
    if (other.startsWith(path + '/')) return other;
  }
  return null;
}

/**
 * Bundle files `[{ path, bytes }]` into one text (FLOW-1). Returns
 * `{ text, carried, skipped }`; a file the bundle cannot carry is listed in
 * `skipped` with its reason, never thrown on.
 */
function bundleWorkspaceFiles(files) {
  if (!Array.isArray(files)) throw new TypeError('bundleWorkspaceFiles needs a list of files');
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  const skipped = [];
  const kept = new Map();
  for (const file of files) {
    let reason = bundlePathProblem(file.path);
    let text = '';
    if (reason === null) {
      try {
        text = decoder.decode(Uint8Array.from(file.bytes));
      } catch (e) {
        reason = 'not UTF-8';
      }
    }
    if (reason === null && text.split('\n').some(bundleSeparatorAt)) {
      reason = 'holds a line that looks like a bundle separator';
    }
    if (reason === null && kept.has(file.path)) reason = 'path twice';
    if (reason === null && bundleClashingPath(file.path, kept) !== null) reason = 'file and folder';
    if (reason !== null) {
      skipped.push({ path: file.path, reason });
      continue;
    }
    kept.set(file.path, { path: file.path, bytes: file.bytes, text });
  }
  const carried = Array.from(kept.values()).sort((a, b) => bundleComparePaths(a.path, b.path));
  let text = '';
  for (const file of carried) {
    const closed = file.text === '' || file.text.endsWith('\n');
    text += BUNDLE_SEPARATOR_PREFIX + file.path + (closed ? '' : BUNDLE_NO_FINAL_NEWLINE) + '\n';
    text += file.text + (closed ? '' : '\n');
  }
  return {
    text,
    carried: carried.map((file) => ({ path: file.path, bytes: file.bytes })),
    skipped
  };
}

/** The sentence for the message of an export (IF-2); empty for nothing skipped. */
function bundleSkippedSentence(skipped) {
  if (skipped.length === 0) return '';
  const list = skipped.map((file) => '`' + file.path + '` (' + file.reason + ')').join(', ');
  return skipped.length === 1
    ? '1 file was not exported: ' + list
    : skipped.length + ' files were not exported: ' + list;
}

/**
 * Split a bundle text into files (FLOW-2). Returns `{ files, problems }`;
 * `files` is empty when `problems` is not. Every problem is one sentence.
 */
function unbundleWorkspaceFiles(text, options) {
  const maxBytes = options && options.maxBytes !== undefined ? options.maxBytes : BUNDLE_MAX_BYTES;
  const encoder = new TextEncoder();
  const size = encoder.encode(text).length;
  if (size > maxBytes) {
    return { files: [], problems: ['the bundle is ' + size + ' bytes, over the limit of ' + maxBytes + ' bytes'] };
  }
  const body = text.startsWith('﻿') ? text.slice(1) : text;
  // the separator lines: where each starts, its number, and where its file begins
  const separators = [];
  const lines = [];
  let offset = 0;
  let number = 1;
  while (offset <= body.length) {
    const newline = body.indexOf('\n', offset);
    const end = newline === -1 ? body.length : newline;
    const line = body.slice(offset, end);
    lines.push({ number, line });
    if (bundleSeparatorAt(line)) {
      let path = line.slice(BUNDLE_SEPARATOR_PREFIX.length).replace(/\r$/, '');
      let marked = false;
      if (path.endsWith(BUNDLE_NO_FINAL_NEWLINE)) {
        path = path.slice(0, -BUNDLE_NO_FINAL_NEWLINE.length);
        marked = true;
      }
      separators.push({ number, path, marked, start: offset, bodyStart: Math.min(end + 1, body.length) });
    }
    if (newline === -1) break;
    offset = newline + 1;
    number++;
  }
  const problems = [];
  const leadIn = (limit) => {
    for (const entry of lines) {
      if (entry.number >= limit) break;
      const trimmed = entry.line.replace(/\r$/, '');
      if (trimmed.trim() !== '' && !trimmed.startsWith('#')) {
        problems.push(
          'line ' +
            entry.number +
            ': text before the first `' +
            BUNDLE_SEPARATOR_PREFIX.trim() +
            '` line must be blank or a comment'
        );
        return;
      }
    }
  };
  if (separators.length === 0) {
    // a text that mentions the separator somewhere else (a BOM before it) is told what is wrong with its start
    if (body.includes(BUNDLE_SEPARATOR_PREFIX)) leadIn(Infinity);
    if (problems.length === 0) problems.push('the bundle holds no file');
    return { files: [], problems };
  }
  leadIn(separators[0].number);
  const seen = new Map();
  const files = [];
  separators.forEach((separator, index) => {
    const reason = bundlePathProblem(separator.path);
    if (reason !== null) {
      problems.push('line ' + separator.number + ': the path `' + separator.path + '` cannot be imported: ' + reason);
      return;
    }
    if (seen.has(separator.path)) {
      problems.push(
        'line ' +
          separator.number +
          ': the path `' +
          separator.path +
          '` is declared twice (first at line ' +
          seen.get(separator.path) +
          ')'
      );
      return;
    }
    const other = bundleClashingPath(separator.path, seen);
    if (other !== null) {
      problems.push(
        'line ' +
          separator.number +
          ': the paths `' +
          other +
          '` and `' +
          separator.path +
          '` clash: one is a file and the other is inside it as a folder'
      );
      return;
    }
    seen.set(separator.path, separator.number);
    const stop = index + 1 < separators.length ? separators[index + 1].start : body.length;
    let chunk = body.slice(separator.bodyStart, stop);
    if (separator.marked && chunk.endsWith('\n')) chunk = chunk.slice(0, -1);
    files.push({ path: separator.path, bytes: encoder.encode(chunk) });
  });
  if (problems.length > 0) return { files: [], problems };
  files.sort((a, b) => bundleComparePaths(a.path, b.path));
  return { files, problems };
}
