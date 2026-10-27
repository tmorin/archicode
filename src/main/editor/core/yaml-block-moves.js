/**
 * Moves the comments that a line which goes left behind (`stray`, indexes of `out`) out of the block scalar they now follow: a comment indented as the text of a `key: |` above it is
 * text of that scalar for the reader, and the file would no longer say what the edit says. It goes to the column of the key (the column the scalar's text must go past), where it ends the scalar.
 */
function keepStrayCommentsOutOfBlockScalars(out, stray) {
  let blockFrom = -1; // the column a block scalar's text must go past
  for (let i = 0; i < out.length; i++) {
    const line = out[i];
    if (blockFrom !== -1) {
      if (line.trim() === '') continue;
      if (yamlIndentOf(line) > blockFrom) {
        if (stray.has(i) && line.trim().startsWith('#')) out[i] = ' '.repeat(blockFrom) + line.trim();
        continue;
      }
      blockFrom = -1;
    }
    const header = yamlBlockHeader(line);
    if (header) blockFrom = header[1].length;
  }
}

/** The path of `node` in the tree of elements under `root`, by identity (`['elements', 0, 'elements', 2]`), or null when it is not there. */
function pathOfElementNode(root, node) {
  if (root === node) return [];
  const list = root && Array.isArray(root.elements) ? root.elements : [];
  for (let i = 0; i < list.length; i++) {
    const inner = pathOfElementNode(list[i], node);
    if (inner !== null) return ['elements', i].concat(inner);
  }
  return null;
}

/** The element at `path` (see `pathOfElementNode`) under `root`. */
function elementNodeAt(root, path) {
  let current = root;
  for (const key of path) current = current[key];
  return current;
}

/**
 * The lines the emitter writes for `value`, and the range `[start, end)` of those of the element at `path` under `value.content` (its list item: the `- ` line to the
 * line before the next one at the same depth). The element is found by writing the value again with a mark in its id.
 */
function emittedBlockOf(value, path) {
  const mark = 'moved-block-mark';
  const lines = serializeYamlValue(value, 0).split('\n');
  const copy = JSON.parse(JSON.stringify(value));
  elementNodeAt(copy.content, path).id = mark;
  const marked = serializeYamlValue(copy, 0).split('\n');
  const at = marked.map((line, i) => (line.indexOf(mark) !== -1 ? i : -1)).filter((i) => i !== -1);
  if (marked.length !== lines.length || at.length !== 1) return null;
  let start = at[0];
  if (!/^ *- /.test(marked[start])) {
    const depth = yamlIndentOf(marked[start]);
    while (start > 0 && yamlIndentOf(marked[start]) >= depth) start--;
    if (!/^ *- /.test(marked[start])) return null;
  }
  const itemIndent = yamlIndentOf(marked[start]);
  let end = start + 1;
  while (end < marked.length && yamlIndentOf(marked[end]) > itemIndent) end++;
  return { lines, start, end };
}

/**
 * The last line of `original` that goes with a block whose last line is `last` and whose list item (the `- ` line) is at column `itemIndent` (#119): the comments that follow it.
 * A comment is read as the block's own when it is indented deeper than the item (as the block's keys), and when it sits at the column of the item and no sibling follows it
 * (the next line that is not a comment or blank is shallower than the item, or there is none): nothing is then introduced by it. A comment at the column of the item above a
 * sibling is that sibling's introduction, and one shallower than the item is the next thing's: both stay, and so does every line from the first of them on. The blank lines between
 * the block and a comment that goes with it go with it; the blank lines after the last of those stay. Returns `last` when no comment goes with the block. The rule is indentation
 * alone: a comment about the block written at the column of an item that has a sibling after it, or a comment about the next element indented as the keys of the block, is
 * attributed the other way (the model is never affected).
 */
function lastLineOfBlockWithComments(original, last, itemIndent) {
  const isComment = (line) => line.trim().startsWith('#');
  let stop = last + 1;
  while (stop < original.length && (original[stop].trim() === '' || isComment(original[stop]))) stop++;
  const lastOfItsList = stop >= original.length || yamlIndentOf(original[stop]) < itemIndent;
  let end = last;
  for (let i = last + 1; i < stop; i++) {
    if (original[i].trim() === '') continue;
    const indent = yamlIndentOf(original[i]);
    if (indent > itemIndent || (indent === itemIndent && lastOfItsList)) end = i;
    else break;
  }
  return end;
}

/**
 * Whether a comment just above a block is the comment that follows the block before it (#119, the other side of `lastLineOfBlockWithComments`): the block has a sibling before it,
 * and the comment is indented deeper than the item (`itemLine`, the `- ` line of the block in the file), as the keys of that sibling are. `before` is `emittedBlockOf` of the block.
 */
function deeperThanItemAfterSibling(commentLine, before, itemLine) {
  const siblingBefore =
    before.start > 0 && yamlIndentOf(before.lines[before.start - 1]) > yamlIndentOf(before.lines[before.start]);
  return siblingBefore && yamlIndentOf(commentLine) > yamlIndentOf(itemLine);
}

/**
 * The text of a manifest after an element was put under another parent of the same file, with the block of the element carried over as it was written: its comments,
 * its quotes and its blank lines, re-indented, and the comments just above it with it. `oldValue`/`newValue` are `{ header, content }` before and after the move
 * (nothing else changed between them), `oldPath`/`newPath` where the element was and is (see `pathOfElementNode`). The other lines are the author's. `null` when the
 * layout of the file is not one this can follow, or when re-reading the result does not give what the emitter writes for `newValue`: the caller then keeps the
 * ordinary patch, which writes the moved lines as the emitter does.
 */
function moveBlockInText(oldText, oldValue, oldPath, newValue, newPath) {
  if (oldText.charCodeAt(0) === 0xfeff) {
    // a byte-order mark stays where it is (#119)
    const moved = moveBlockInText(oldText.slice(1), oldValue, oldPath, newValue, newPath);
    return moved === null ? null : '\ufeff' + moved;
  }
  try {
    if (openYamlDecorations(oldText) !== null) return null; // an anchor, an alias or a tag: the ordinary patch follows them
    if (!oldPath || !newPath || !oldPath.length || !newPath.length) return null;
    const eol = /\r\n/.test(oldText) ? '\r\n' : '\n';
    const endsWithBreak = /\n$/.test(oldText);
    const opened = openFlowLists(oldText); // the flow collections of the file are read as the blocks the emitter writes, and put back where the move left them
    const source = opened ? opened.text : oldText;
    const original = source.replace(/^\ufeff/, '').split(/\r\n|\r|\n/);
    if (endsWithBreak) original.pop();
    const before = emittedBlockOf(oldValue, oldPath);
    const after = emittedBlockOf(newValue, newPath);
    if (before === null || after === null) return null;
    if (serializeYamlValue(parseYamlAsModel(source), 0) !== before.lines.join('\n')) return null; // the model is not what the file says: no guess
    // the value without the element (and without its parent's `elements` if that was the last one)
    const without = JSON.parse(JSON.stringify(oldValue));
    const parent = elementNodeAt(without.content, oldPath.slice(0, -2));
    parent.elements.splice(oldPath[oldPath.length - 1], 1);
    if (parent.elements.length === 0) delete parent.elements;
    const middle = serializeYamlValue(without, 0).split('\n');
    const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i]);
    // what the move takes out of the old lines, and what it puts in
    let cutFrom = before.start;
    if (!same(before.lines.slice(0, cutFrom).concat(before.lines.slice(before.end)), middle)) {
      cutFrom = before.start - 1;
      if (cutFrom < 0 || !same(before.lines.slice(0, cutFrom).concat(before.lines.slice(before.end)), middle))
        return null;
    }
    let putAt = after.start;
    if (!same(after.lines.slice(0, putAt).concat(after.lines.slice(after.end)), middle)) {
      putAt = after.start - 1;
      if (putAt < 1 || !same(after.lines.slice(0, putAt).concat(after.lines.slice(after.end)), middle)) return null;
    }
    const located = locateEmittedLines(original, before.lines);
    if (located === null) return null;
    const { place, spans } = located;
    const first = place[before.start];
    const last = lastLineOfBlockWithComments(
      original,
      place[before.end - 1] + spans[before.end - 1],
      yamlIndentOf(original[first])
    ); // and the comments that follow it (#119)
    // the comments just above the element are its own; the lines before them are not
    const floor = place[before.start - 1] + spans[before.start - 1];
    let carryFrom = first;
    while (
      carryFrom - 1 > floor &&
      original[carryFrom - 1].trim().startsWith('#') &&
      !deeperThanItemAfterSibling(original[carryFrom - 1], before, original[first])
    )
      carryFrom--;
    const delta = yamlIndentOf(after.lines[after.start]) - yamlIndentOf(before.lines[before.start]);
    const carried = original.slice(carryFrom, last + 1).map((line) => shiftYamlLine(line, delta));
    const removeFrom = cutFrom < before.start ? place[cutFrom] : carryFrom;
    // the new lines go after the line of the old text that comes before them in the new one
    const previous = putAt - 1 < cutFrom ? putAt - 1 : putAt - 1 + (before.end - cutFrom);
    const insertAfter = place[previous] + spans[previous];
    const inserted = after.lines.slice(putAt, after.start).concat(carried);
    const out = [];
    for (let i = 0; i < original.length; i++) {
      if (i < removeFrom || i > last) out.push(original[i]);
      if (i === insertAfter) out.push.apply(out, inserted);
    }
    const moved = out.join(eol) + (endsWithBreak ? eol : '');
    const text = opened ? closeFlowLists(moved, opened.lists) : moved;
    return serializeYamlValue(parseYamlAsModel(text), 0) === after.lines.join('\n') ? text : null;
  } catch (e) {
    return null;
  }
}

/**
 * The first half of a move to another file (wave 015, run 0104, #43): the text of a manifest without the block of the element at `oldPath` under `oldValue.content`, and the
 * lines of the block as they were written, with the comments just above it (`carried`, at the indentation they had; `indent` is the one the emitter gives the item). The
 * other lines are the author's. `null` when the layout of the file is not one this can follow, or when re-reading the result does not give the value without the element:
 * the caller then keeps the ordinary patch, which writes the file as the emitter does (the block is gone, with its comments).
 */
function cutBlockFromText(oldText, oldValue, oldPath) {
  if (oldText.charCodeAt(0) === 0xfeff) {
    // a byte-order mark stays where it is (#119)
    const out = cutBlockFromText(oldText.slice(1), oldValue, oldPath);
    return out === null ? null : Object.assign({}, out, { text: '\ufeff' + out.text });
  }
  try {
    if (openYamlDecorations(oldText) !== null) return null; // an anchor, an alias or a tag: the ordinary patch follows them
    if (!oldPath || !oldPath.length) return null;
    const eol = /\r\n/.test(oldText) ? '\r\n' : '\n';
    const endsWithBreak = /\n$/.test(oldText);
    const opened = openFlowLists(oldText);
    const source = opened ? opened.text : oldText;
    const original = source.replace(/^\ufeff/, '').split(/\r\n|\r|\n/);
    if (endsWithBreak) original.pop();
    const before = emittedBlockOf(oldValue, oldPath);
    if (before === null) return null;
    if (serializeYamlValue(parseYamlAsModel(source), 0) !== before.lines.join('\n')) return null;
    const without = JSON.parse(JSON.stringify(oldValue));
    const parent = elementNodeAt(without.content, oldPath.slice(0, -2));
    parent.elements.splice(oldPath[oldPath.length - 1], 1);
    if (parent.elements.length === 0) delete parent.elements;
    const middle = serializeYamlValue(without, 0).split('\n');
    const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i]);
    let cutFrom = before.start; // the last child leaving takes the `elements:` line with it
    if (!same(before.lines.slice(0, cutFrom).concat(before.lines.slice(before.end)), middle)) {
      cutFrom = before.start - 1;
      if (cutFrom < 0 || !same(before.lines.slice(0, cutFrom).concat(before.lines.slice(before.end)), middle))
        return null;
    }
    const located = locateEmittedLines(original, before.lines);
    if (located === null) return null;
    const { place, spans } = located;
    const first = place[before.start];
    const last = lastLineOfBlockWithComments(
      original,
      place[before.end - 1] + spans[before.end - 1],
      yamlIndentOf(original[first])
    ); // and the comments that follow it (#119)
    const floor = place[before.start - 1] + spans[before.start - 1]; // the comments just above the element are its own; the lines before them are not
    let carryFrom = first;
    while (
      carryFrom - 1 > floor &&
      original[carryFrom - 1].trim().startsWith('#') &&
      !deeperThanItemAfterSibling(original[carryFrom - 1], before, original[first])
    )
      carryFrom--;
    const removeFrom = cutFrom < before.start ? place[cutFrom] : carryFrom;
    let carried = original.slice(carryFrom, last + 1);
    const out = original.filter((line, i) => i < removeFrom || i > last);
    const cut = out.join(eol) + (endsWithBreak ? eol : '');
    const text = opened ? closeFlowLists(cut, opened.lists) : cut;
    if (serializeYamlValue(parseYamlAsModel(text), 0) !== middle.join('\n')) return null;
    if (opened) carried = closeFlowLists(carried.join(eol), opened.lists).split(eol); // the collections of the block go as they were written
    return { text, carried, indent: yamlIndentOf(before.lines[before.start]) };
  } catch (e) {
    return null;
  }
}

/**
 * The second half of a move to another file: the text of a manifest with the lines `carried` by `cutBlockFromText` (written at `indent`) put as the last child of the parent
 * that `newPath` says, in `newValue` (the value of the manifest with the element added, `oldValue` the value before). The other lines are the author's. `null` when the layout
 * of the file is not one this can follow or the result does not read as `newValue`: the caller then keeps the ordinary patch, which writes the block as the emitter does.
 */
function pasteBlockInText(oldText, oldValue, newValue, newPath, carried, indent) {
  if (oldText.charCodeAt(0) === 0xfeff) {
    // a byte-order mark stays where it is (#119)
    const pasted = pasteBlockInText(oldText.slice(1), oldValue, newValue, newPath, carried, indent);
    return pasted === null ? null : '\ufeff' + pasted;
  }
  try {
    if (openYamlDecorations(oldText) !== null) return null;
    if (!newPath || !newPath.length) return null;
    const eol = /\r\n/.test(oldText) ? '\r\n' : '\n';
    const endsWithBreak = /\n$/.test(oldText);
    const opened = openFlowLists(oldText);
    const source = opened ? opened.text : oldText;
    const original = source.replace(/^\ufeff/, '').split(/\r\n|\r|\n/);
    if (endsWithBreak) original.pop();
    const before = serializeYamlValue(oldValue, 0).split('\n');
    const after = emittedBlockOf(newValue, newPath);
    if (after === null) return null;
    if (serializeYamlValue(parseYamlAsModel(source), 0) !== before.join('\n')) return null;
    const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i]);
    let putAt = after.start; // a parent with no `elements:` yet gets the line that opens the list
    if (!same(after.lines.slice(0, putAt).concat(after.lines.slice(after.end)), before)) {
      putAt = after.start - 1;
      if (putAt < 1 || !same(after.lines.slice(0, putAt).concat(after.lines.slice(after.end)), before)) return null;
    }
    const located = locateEmittedLines(original, before);
    if (located === null) return null;
    const { place, spans } = located;
    const delta = yamlIndentOf(after.lines[after.start]) - indent;
    const inserted = after.lines.slice(putAt, after.start).concat(carried.map((line) => shiftYamlLine(line, delta)));
    const insertAfter = place[putAt - 1] + spans[putAt - 1];
    const out = [];
    for (let i = 0; i < original.length; i++) {
      out.push(original[i]);
      if (i === insertAfter) out.push.apply(out, inserted);
    }
    const pasted = out.join(eol) + (endsWithBreak ? eol : '');
    const text = opened ? closeFlowLists(pasted, opened.lists) : pasted;
    return serializeYamlValue(parseYamlAsModel(text), 0) === after.lines.join('\n') ? text : null;
  } catch (e) {
    return null;
  }
}

/**
 * The text of a new manifest for an element that was nested in another one (a move to the top level, or under a parent of a plateau that the plateau drawn does not write):
 * the lines of its block, as `cutBlockFromText` carried them, become its `content`. The `- ` that opened the item goes, so does the line of its `kind` (it is in the header of a
 * manifest), and the lines are carried to the column of a `content`. `null` when the block does not have that shape or the result does not read as `{ header, content }`:
 * the caller then writes the file as the emitter does.
 */
function manifestTextFromBlock(carried, header, content) {
  try {
    const dash = carried.findIndex((line) => !line.trim().startsWith('#') && line.trim() !== '');
    if (dash === -1 || !/^ *- /.test(carried[dash])) return null;
    const column = yamlIndentOf(carried[dash]) + 2;
    const lines = carried.slice();
    lines[dash] = lines[dash].replace('-', ' ');
    const kindLines = lines
      .map((line, i) => (i >= dash && yamlIndentOf(line) === column && /^kind\s*:/.test(line.trim()) ? i : -1))
      .filter((i) => i !== -1);
    if (kindLines.length !== 1) return null;
    // the comments above the item sit where its keys now are; the lines of the item go to the column of a `content`
    const body = lines
      .map((line, i) => (i < dash ? (line.trim() === '' ? line : '  ' + line.trim()) : shiftYamlLine(line, 2 - column)))
      .filter((line, i) => i !== kindLines[0]);
    const head = serializeManifestFile(header, content).split('\n');
    const at = head.indexOf('content:');
    if (at === -1) return null;
    const text =
      head
        .slice(0, at + 1)
        .concat(body)
        .join('\n') + '\n';
    return serializeYamlValue(parseYamlAsModel(text), 0) === serializeManifestFile(header, content) ? text : null;
  } catch (e) {
    return null;
  }
}

/** The manifest of a file that exists, rewritten after an edit of its `header` and `content` (see patchYamlText). */
function reserializeManifestFile(mf) {
  return patchYamlText(mf.rawText, { header: mf.header, content: mf.content });
}
