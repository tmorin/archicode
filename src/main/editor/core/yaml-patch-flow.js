/** `patchYamlText` for a file whose items start on the line of their dash: a list at the column of its key is moved where the emitter writes it first (see `markKeyColumnLists`). */
function patchYamlTextColumns(oldText, newValue) {
  const marked = markKeyColumnLists(oldText);
  if (marked === null) return patchYamlTextAt(oldText, newValue);
  const emitted = serializeYamlValue(newValue, 0);
  const back = unmarkKeyColumnLists(patchYamlTextAt(marked, newValue));
  try {
    // a result is accepted only if re-reading it gives the emitter's value
    return back !== null && serializeYamlValue(parseYamlAsModel(back), 0) === emitted ? back : emitted;
  } catch (e) {
    return emitted;
  }
}

/** `patchYamlText` for a file whose lists are all indented as the emitter writes them. */
function patchYamlTextAt(oldText, newValue) {
  const emitted = serializeYamlValue(newValue, 0);
  // what is written must say what the edit says, in the emitter's own terms
  const says = (text) => {
    try {
      return serializeYamlValue(parseYamlAsModel(text), 0) === emitted;
    } catch (e) {
      return false;
    }
  };
  const styled = { lines: 0 };
  const strict = patchYamlLines(oldText, emitted, newValue, styled);
  if (strict !== null) {
    // a new value written in the quotes of the file is kept only if it reads back as the emitter's text; otherwise the value is written plain, as the emitter does
    if (styled.lines === 0 || says(strict)) return strict;
    return patchYamlLines(oldText, emitted, newValue);
  }
  const opened = openFlowLists(oldText);
  if (opened === null) return emitted;
  // a collection in brackets that the edit changes goes back in brackets where it can (see `bracketChangedFlows`); if that does not read as the edit, the blocks, as before
  const marked = opened.lists.length === 0 ? null : markOpenedFlows(opened); // nothing was opened: there is no collection in brackets to write back
  const textLines = oldText.replace(/^\ufeff/, '').split(/\r\n|\r|\n/);
  const widest = marked === null ? 0 : textLines.reduce((most, line) => Math.max(most, line.length), 0);
  const itemMarks = new Set(opened.lists.map((list, n) => (list.kind === 'item' ? n : -1)).filter((n) => n !== -1)); // the collections in brackets that are items of a list, by the number of their mark
  const attempt = (styledLines, brackets) => {
    const patched = patchYamlLines(brackets ? marked : opened.text, emitted, newValue, styledLines, itemMarks);
    if (patched === null) return null;
    if (!brackets) return closeFlowLists(patched, opened.lists);
    const bracketed = bracketChangedFlows(patched, opened, widest);
    return closeFlowLists(bracketed.text, opened.lists.filter((list) => !bracketed.done.has(list)));
  };
  const run = (brackets) => {
    const quoted = { lines: 0, voteLines: textLines.slice() }; // the quotes of the author are in the text as written, not in the lists opened
    let closed = attempt(quoted, brackets);
    if (closed === null) return null;
    if (quoted.lines > 0 && !says(closed)) closed = attempt(undefined, brackets);
    // if what is written does not say what the edit says, the emitter's text is the safe one
    return closed !== null && says(closed) ? closed : null;
  };
  const text = marked === null ? null : run(true);
  if (text !== null) return text;
  const blocks = run(false);
  return blocks === null ? emitted : blocks;
}

/** The column of the key of a line that is `key:` with nothing after it but a comment (`- tags:` included), -1 for any other line. */
function yamlBareKeyColumn(line) {
  const prefix = line.match(/^ *(?:- +)*/)[0];
  const found = scanYamlKey(line, prefix.length, 0);
  return found !== null && stripYamlComment(line).replace(/\s+$/, '').length === found.end ? prefix.length : -1;
}

/**
 * The last line under the key at line `i` of `lines` (the key is at column `col`): the lines deeper than the key, then the comments deeper than the key; `i` when there is none.
 * With `atColumn` the lines are those of a file as written, where the first one has to be an item at the column of the key (`- a`) and the others may be one too.
 */
function yamlLastLineUnderKey(lines, i, col, atColumn) {
  const item = (line) => atColumn && yamlIndentOf(line) === col && /^ *-(?: |$)/.test(line);
  let last = i;
  for (let j = i + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (last === i && atColumn ? !item(line) : !(yamlIndentOf(line) > col || item(line))) break;
    last = j;
  }
  if (atColumn && last === i) return i;
  for (let j = last + 1; j < lines.length; j++) {
    if (lines[j].trim() === '') continue;
    if (!lines[j].trim().startsWith('#') || yamlIndentOf(lines[j]) <= col) break;
    last = j;
  }
  return last;
}

/**
 * The text with each list written at the column of its key (`tags:` then `- a` at the same column, and everything under the list) moved two columns to the right, which is where
 * the emitter writes it, so that the aligner finds the lines it expects; the line of the key carries a mark (a comment, `\u0001K` after ` #`, or `\u0001L` after the comment it has)
 * that tells `unmarkKeyColumnLists` which lists to put back. The comments between the key and the end of the list move with it, and the ones after it that are deeper than the key.
 * `null` when the file has no such list (or already uses the mark character).
 */
function markKeyColumnLists(text) {
  if (text.indexOf('\u0001') !== -1) return null;
  const bom = text.charAt(0) === '\ufeff' ? '\ufeff' : '';
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.slice(bom.length).split(/\r\n|\r|\n/);
  const shift = new Array(lines.length).fill(0);
  const keys = new Set();
  let blockFrom = -1; // the column a block scalar's text must go past: the text of a block scalar is not YAML
  for (let i = 0; i < lines.length; i++) {
    if (blockFrom !== -1) {
      if (lines[i].trim() === '' || yamlIndentOf(lines[i]) > blockFrom) continue;
      blockFrom = -1;
    }
    const header = yamlBlockHeader(lines[i]);
    if (header) { blockFrom = header[1].length; continue; }
    const col = yamlBareKeyColumn(lines[i]);
    const last = col === -1 ? i : yamlLastLineUnderKey(lines, i, col, true);
    if (last === i) continue;
    keys.add(i);
    for (let j = i + 1; j <= last; j++) shift[j] += 2;
  }
  if (keys.size === 0) return null;
  return bom + lines.map((line, i) => {
    const moved = line.trim() === '' ? line : ' '.repeat(shift[i]) + line;
    if (!keys.has(i)) return moved;
    return stripYamlComment(line).length < line.length ? moved + '\u0001L' : moved + ' #\u0001K';
  }).join(eol);
}

/**
 * `text` (written by the aligner on the output of `markKeyColumnLists`) with the lists that were at the column of their key put back there: the lines under each marked key
 * move two columns to the left, the items the edit added with them. `null` when a line has no room to move or a mark is left over.
 */
function unmarkKeyColumnLists(text) {
  const bom = text.charAt(0) === '\ufeff' ? '\ufeff' : '';
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.slice(bom.length).split(/\r\n|\r|\n/);
  for (let i = 0; i < lines.length; i++) {
    const mark = lines[i].match(/ #\u0001K$|\u0001L$/);
    if (mark === null) continue;
    lines[i] = lines[i].slice(0, -mark[0].length);
    const col = lines[i].match(/^ *(?:- +)*/)[0].length;
    const last = yamlLastLineUnderKey(lines, i, col, false); // the key may have been rewritten (`tags: []`), the comments under it were moved all the same
    let first = i + 1;
    while (first <= last && (lines[first].trim() === '' || lines[first].trim().startsWith('#'))) first++;
    if (first <= last && !(yamlIndentOf(lines[first]) === col + 2 && /^ *-(?: |$)/.test(lines[first]))) continue; // the line is no longer the key of a list (the aligner kept it for another value): what is under it is the emitter's
    for (let j = i + 1; j <= last; j++) {
      if (lines[j].trim() === '') continue;
      if (yamlIndentOf(lines[j]) < 2) return null;
      lines[j] = lines[j].slice(2);
    }
  }
  const out = bom + lines.join(eol);
  return out.indexOf('\u0001') === -1 ? out : null;
}

/** A line moved `delta` columns to the right (to the left when negative, as far as it has room): the shift of a block that is carried to another depth. */
function shiftYamlLine(line, delta) {
  if (line.trim() === '' || delta === 0) return line;
  if (delta > 0) return ' '.repeat(delta) + line;
  return yamlIndentOf(line) >= -delta ? line.slice(-delta) : line.replace(/^ +/, '');
}

/**
 * The lines the emitter writes for `value` (a list or a mapping that a flow collection holds) when it sits at `indent`, with what the author wrote in the collection that
 * the emitter does not: the quotes of the values (`["a", 'b', c]` is written `- "a"`, `- 'b'`, `- c`), the quotes of the keys (`{"tier": gold}` is `"tier": gold`), the word
 * of a boolean or a null that is not the emitter's (`{heat: on}` is `heat: on`) and the comments (`# first` on a line of its own above the value it comes before, `# second`
 * at the end of the line of the value it follows). `read` is what the reader noted (`leaves`, `keys`, `comments`: see `parseYamlFlowNode`), in the order the emitter writes it;
 * a quote or a word is applied only where the emitter wrote the plain text, and nothing is applied if the lines do not match one to one what was read (the comments then stand above the block).
 */
function emitFlowBlock(value, read, indent) {
  const lines = serializeYamlValue(value, indent).split('\n');
  const leaves = read.leaves;
  const carrying = lines.map((line, i) => (/^ *(?:- )*-$/.test(line) || /:$/.test(line) ? -1 : i)).filter((i) => i !== -1); // the lines that end with a value
  // the lines do not match one to one what was read: nothing is applied to them, but a comment is the author's text and is not lost, it goes above the block
  if (carrying.length !== leaves.length) return read.comments.map((comment) => ' '.repeat(indent) + comment.text).concat(lines);
  carrying.forEach((at, k) => {
    const added = readYamlScalarLine(lines[at]);
    if (added === null || added.quote !== '') return;
    const token = lines[at].slice(added.valueAt);
    if (leaves[k].quote === '') { // a word that reads as the emitter's token (`on` for `true`, `~` for `null`) stays the author's
      const word = leaves[k].word;
      if (word !== null && word !== token && /^(true|false|null|-?\d+(\.\d+)?)$/.test(token) && yamlWordIsToken(word, token)) lines[at] = lines[at].slice(0, added.valueAt) + word;
    } else if (added.plainable) {
      lines[at] = lines[at].slice(0, added.valueAt) + (leaves[k].quote === '"' ? '"' + escapeYamlDoubleQuoted(token) + '"' : "'" + token.replace(/'/g, "''") + "'");
    }
  });
  // the keys the author quoted
  const keyLines = [];
  lines.forEach((line, i) => {
    const prefix = line.match(/^ *(?:- +)*/)[0];
    const found = scanYamlKey(line, prefix.length, 0);
    if (found) keyLines.push({ at: i, prefix, found });
  });
  if (keyLines.length === read.keys.length && keyLines.every((k, n) => k.found.key === read.keys[n].key)) {
    keyLines.forEach((k, n) => {
      const written = read.keys[n].written;
      if (written !== null && lines[k.at].slice(k.prefix.length, k.found.end - 1) === serializeYamlKey(k.found.key)) lines[k.at] = k.prefix + written + ':' + lines[k.at].slice(k.found.end);
    });
  }
  // the comments: at the end of the line of the value they follow, or on lines of their own above the value they come before (above the lines of the keys that lead to it)
  const above = new Map();
  const below = [];
  const after = new Map();
  for (const comment of read.comments) {
    if (comment.after !== -1 && comment.after < carrying.length) {
      if (!after.has(carrying[comment.after])) after.set(carrying[comment.after], (comment.gap === '' ? '  ' : comment.gap) + comment.text);
      continue;
    }
    if (comment.before >= carrying.length) { below.push(' '.repeat(indent) + comment.text); continue; }
    let at = carrying[comment.before];
    const floor = comment.before === 0 ? -1 : carrying[comment.before - 1];
    while (at - 1 > floor) at--;
    if (!above.has(at)) above.set(at, []);
    above.get(at).push(' '.repeat(yamlIndentOf(lines[at])) + comment.text);
  }
  const out = [];
  lines.forEach((line, i) => {
    if (above.has(i)) out.push.apply(out, above.get(i));
    out.push(line + (after.get(i) || ''));
  });
  return out.concat(below);
}

/**
 * The text with every flow collection written as the value of a plain key (`  tags: [a, b]  # why`, `  - destination: x`, `    tags: {zone: north}`) or as an item of a
 * list (`- {destination: x, label: y}`), on one line or on several, with other collections inside, written as the block the emitter writes for it (the quotes of its values
 * stay, and the comment goes on the first line), and the collections as they were, to put back by `closeFlowLists`. `null` when the text has none, or none that can be
 * read as the block they become.
 */
function openFlowLists(text) {
  const before = yamlModelNumbers;
  yamlModelNumbers = !yamlPlainReading; // the lists are read as the value of the file is: `[1_000]` holds `1000` in a manifest
  try {
    return openFlowListsRead(text);
  } finally {
    yamlModelNumbers = before;
  }
}

function openFlowListsRead(text) {
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.split(/\r\n|\r|\n/);
  const lists = [];
  const out = [];
  let blockFrom = -1; // the column a block scalar's text must go past: the text of a block scalar is not YAML
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (blockFrom !== -1) {
      if (line.trim() === '' || yamlIndentOf(line) > blockFrom) { out.push(line); continue; }
      blockFrom = -1;
    }
    const header = yamlBlockHeader(line);
    if (header) { blockFrom = header[1].length; out.push(line); continue; }
    // `key: [`, `- key: {` (the key plain or quoted), or `- [` / `- {`: where a flow collection starts, and the text before it
    const lead = line.match(/^ *(?:- +)*/)[0];
    const found = scanYamlKey(line, lead.length, i);
    let at = -1;
    if (found) {
      at = found.end;
      while (at < line.length && isYamlWs(line[at])) at++;
    }
    const keyed = found !== null && at < line.length && (line[at] === '[' || line[at] === '{');
    const item = !keyed && /^ *- +[[{]/.test(line);
    if (!keyed && !item) { out.push(line); continue; }
    const m = keyed ? [line.slice(0, at), lead, line.slice(lead.length, found.end - 1).replace(/[ \t]+$/, '')] : line.match(/^( *)(- +)(?=[[{])/); // [text before the collection, indentation (and dashes), key as written]
    if (!keyed) at = m[0].length;
    const p = { lines, i, col: at, leaves: [], keys: [], comments: [] };
    let node;
    let comment;
    let tailText; // what follows the closing bracket, as written
    try {
      node = parseYamlFlowNode(p, i);
      tailText = lines[p.i].slice(p.col);
      const tail = lines[p.i].slice(p.col).match(/^[ \t]*$|^[ \t]+(#.*)$/);
      if (!tail || node.scalar || node.value === null || typeof node.value !== 'object') { out.push(line); continue; }
      comment = tail[1] || '';
    } catch (e) {
      out.push(line);
      continue;
    }
    const note = comment ? '  ' + comment : '';
    let expanded;
    let column; // what a line must be indented past to belong to the collection
    if (keyed) {
      const key = m[2]; // as written, quotes included
      const empty = yamlEmptyCollection(node.value);
      expanded = empty ? [m[1] + key + ': ' + empty + note].concat(p.comments.map((c) => ' '.repeat(m[1].length + 2) + c.text)) : [m[1] + key + ':' + note].concat(emitFlowBlock(node.value, p, m[1].length + 2));
      column = m[1].length;
      if (!empty) { // the block must say what the flow collection says
        const keyless = [key + ':'].concat(expanded.slice(1).map((l) => shiftYamlLine(l, -m[1].length)));
        let same = false;
        try {
          same = serializeYamlValue(parseYaml(keyless.join('\n')), 0) === serializeYamlValue({ [found.key]: node.value }, 0);
        } catch (e) { /* not the same */ }
        if (!same) { out.push(line); continue; }
      }
    } else {
      const dashes = m[1].length;
      const block = emitFlowBlock([node.value], p, dashes);
      expanded = block.slice();
      if (note) { const first = expanded.findIndex((l) => !/^ *#/.test(l)); expanded[first] += note; }
      column = dashes;
      let same = false;
      try {
        same = serializeYamlValue(parseYaml(block.map((l) => shiftYamlLine(l, -dashes)).join('\n')), 0) === serializeYamlValue([node.value], 0);
      } catch (e) { /* not the same */ }
      if (!same) { out.push(line); continue; }
    }
    const original = lines.slice(i, p.i + 1);
    if (expanded.join('\n') !== original.join('\n')) {
      const written = original.join('\n');
      // `index`, `kind`, `empty`, `tail`, `width`, `pad` and `bare` are for `markOpenedFlows` and `bracketChangedFlows`: where the collection starts in the text opened, how it was written
      lists.push({ expanded, original, column, before: { original: lines.slice(Math.max(0, i - 3), i).reverse(), opened: out.slice(-3).reverse() }, index: out.length, kind: keyed ? 'keyed' : 'item', empty: yamlEmptyCollection(node.value) !== null, tail: tailText, width: p.i === i ? line.length : 0, pad: { seq: /\[ +[^\s\]#]/.test(written), map: /\{ +[^\s}#]/.test(written) }, bare: false });
    }
    out.push.apply(out, expanded);
    i = p.i;
  }
  return lists.length ? { text: out.join(eol), lists } : null;
}

/**
 * The text after the edit with the collections that `openFlowLists` opened and the edit left alone put back as they were written; a collection the edit changed stays a
 * block. A collection is found where the edit left it, or where it was carried to (another depth: a block moved to another parent): its lines are then shifted the same.
 *
 * Two collections can read the same and be written differently (`{zone: north}` and `{ zone:  north }`): the block is then no clue to which one is which, and the lines
 * before it are (they stay with it when the edit removes one of the two or a move reorders them). Such twins are put back only where those lines are the ones they had; a twin
 * that cannot be told apart that way stays a block, which reads the same.
 */
function closeFlowLists(text, lists) {
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  let lines = text.split(/\r\n|\r|\n/);
  let from = 0;
  const keyOf = (list) => list.expanded.join('\n');
  const twinOf = (list) => lists.some((other) => other !== list && keyOf(other) === keyOf(list) && other.original.join('\n') !== list.original.join('\n'));
  // how many of the (up to three) lines right before the collection are those it had, as written or as opened: counted from the nearest one, up to the first that is not
  const contextOf = (list, i, delta) => {
    let score = 0;
    for (let k = 0; k < 3 && i - 1 - k >= 0; k++) {
      const written = list.before.original[k];
      const opened = list.before.opened[k];
      const line = lines[i - 1 - k];
      if (!((written !== undefined && line === shiftYamlLine(written, delta)) || (opened !== undefined && line === shiftYamlLine(opened, delta)))) break;
      score++;
    }
    return score;
  };
  lists.forEach((list, n) => {
    const size = list.expanded.length;
    const fits = (i) => {
      const delta = yamlIndentOf(lines[i]) - yamlIndentOf(list.expanded[0]);
      if (!list.expanded.every((line, k) => lines[i + k] === shiftYamlLine(line, delta))) return null;
      const next = lines[i + size];
      // the edit added a line after the last one that belongs to the collection (an item, a key): it is not the collection that was written
      if (next !== undefined && next.trim() !== '' && !next.trim().startsWith('#') && yamlIndentOf(next) > list.column + delta) return null;
      return { i, delta };
    };
    const found = (start, end) => {
      for (let i = start; i < end && i + size <= lines.length; i++) {
        const place = fits(i);
        if (place !== null) return place;
      }
      return null;
    };
    let place;
    if (twinOf(list)) {
      const candidates = [];
      for (let i = 0; i + size <= lines.length; i++) {
        const fit = fits(i);
        if (fit !== null) candidates.push(Object.assign(fit, { score: contextOf(list, i, fit.delta) }));
      }
      const best = candidates.reduce((top, c) => (top === null || c.score > top.score ? c : top), null);
      const rivals = candidates.filter((c) => best !== null && c.score === best.score).length;
      const twins = lists.slice(n).filter((other) => keyOf(other) === keyOf(list)).length; // the ones still to place, this one included
      // the lines before it say which one it is; with none of them left (the edit changed them), only the order does, if no other place could be its
      place = best !== null && (best.score > 0 ? rivals === 1 : candidates.length === twins) ? best : null;
    } else {
      place = found(from, lines.length) || found(0, from);
    }
    if (place === null) return;
    lines = lines.slice(0, place.i).concat(list.original.map((line) => shiftYamlLine(line, place.delta)), lines.slice(place.i + size));
    from = place.i + list.original.length;
  });
  return lines.join(eol);
}

/**
 * `opened.text` with a mark at the end of the first line of each collection `openFlowLists` opened (`\u0006` and its number, `\u0007`, in the comment of the line, which every edit of
 * a line keeps, as the marks of `openYamlDecorations` are), so that `bracketChangedFlows` finds the block again after the edit. `opened.lists[n].bare` says that the mark made the comment.
 * `null` when the file already uses the mark characters.
 */
function markOpenedFlows(opened) {
  if (/[\u0006\u0007]/.test(opened.text)) return null;
  const eol = /\r\n/.test(opened.text) ? '\r\n' : '\n';
  const lines = opened.text.split(/\r\n|\r|\n/);
  opened.lists.forEach((start, n) => {
    const line = lines[start.index];
    start.bare = stripYamlComment(line).length === line.length;
    lines[start.index] = line + (start.bare ? ' #' : '') + '\u0006' + n + '\u0007';
  });
  return lines.join(eol);
}

/**
 * `text` (written by the aligner on the output of `markOpenedFlows`) with the marks taken out, and each collection the edit changed written back in brackets on one line (#145):
 * the block under the marked line is read, and if it is only keys, items and values (no comment inside it, no block scalar, no anchor), it becomes `key: [a, b]` / `key: {k: v}` /
 * `- {k: v}`, with the first line's own comment after it as it was written and the spacing inside the brackets (`[ a ]`, `{ k: v }`) the file used; the values keep the quotes and the
 * words the block has. It is written when it fits (`bracketWidth`) and when it reads as the block does; otherwise the block stays, as before. A block that is as `openFlowLists` wrote it
 * is left for `closeFlowLists`. `{ text, done }`, `done` the `lists` that were written in brackets.
 */
function bracketChangedFlows(text, opened, widest) {
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.split(/\r\n|\r|\n/);
  const done = new Set();
  for (let i = 0; i < lines.length; i++) {
    const found = /\u0006(\d+)\u0007/.exec(lines[i]);
    if (found === null) continue;
    const start = opened.lists[Number(found[1])];
    lines[i] = lines[i].replace(found[0], '');
    if (start === undefined) continue;
    if (start.bare && lines[i].endsWith(' #')) lines[i] = lines[i].slice(0, -2);
    if (start.empty) continue; // `[]` and `{}` are what the emitter writes for nothing, not a layout the author chose: filled, they are a block
    let end = i + 1;
    while (end < lines.length && lines[end].trim() !== '' && yamlIndentOf(lines[end]) > start.column && !/\u0006/.test(lines[end])) end++;
    const region = lines.slice(i, end);
    const delta = yamlIndentOf(region[0]) - yamlIndentOf(start.expanded[0]);
    if (region.length === start.expanded.length && region.every((line, k) => line === shiftYamlLine(start.expanded[k], delta))) continue; // as it was opened: `closeFlowLists` puts it back
    let line;
    try {
      line = bracketedLine(region, start, widest);
    } catch (e) {
      line = null; // something this does not know: the block stays
    }
    if (line === null) continue;
    lines.splice(i, end - i, line);
    done.add(start);
  }
  return { text: lines.join(eol), done };
}

/**
 * The line that a collection written as a block (`region`: its first line, `key:` or `- key: v`, and the lines under it) is in brackets, or `null` when it cannot be (a comment inside
 * it, an anchor, a block scalar, something that is not a key, an item or a value; or the line would be wider than `bracketWidth`; or it would not read as the block does).
 */
function bracketedLine(region, start, widest) {
  const first = region[0];
  const body = stripYamlComment(first).replace(/[ \t]+$/, '');
  const comment = first.slice(body.length); // the blanks and the comment after the first line's words
  // the comment of the first line is the one that followed the closing bracket, with the blanks before it as the author wrote them; any other is a comment inside the brackets, which they cannot hold
  if (comment.trim() !== '' && start.tail.trim() !== comment.trim()) return null;
  const tail = comment.trim() === '' ? '' : start.tail;
  let head;
  let node;
  let firstIsChecked = false;
  if (start.kind === 'keyed') {
    const lead = first.match(/^ *(?:- +)*/)[0];
    const key = scanYamlKey(first, lead.length, 0);
    if (key === null) return null;
    if (region.length === 1) { // the collection the edit emptied: `[]` or `{}` on its line, the comment as the author wrote it
      const emptied = body.slice(key.end).trim();
      return emptied === '[]' || emptied === '{}' ? body + tail : null;
    }
    if (body.slice(key.end).trim() !== '') return null;
    head = body.slice(0, key.end) + ' ';
    node = region.slice(1);
  } else {
    const dash = /^ *- */.exec(body);
    if (dash === null) return null;
    head = dash[0].endsWith(' ') ? dash[0] : dash[0] + ' ';
    node = [' '.repeat(dash[0].length) + body.slice(dash[0].length)].concat(region.slice(1));
    if (node[0].trim() === '') node.shift();
    else firstIsChecked = true; // its comment was taken out above, with `body`
  }
  if (node.length === 0 || node.some((line, k) => (k === 0 && firstIsChecked ? false : stripYamlComment(line).replace(/[ \t]+$/, '') !== line.replace(/[ \t]+$/, '')))) return null; // a comment inside
  const flow = yamlBlockLinesToFlow(node, start.pad);
  if (flow === null) return null;
  const line = head + flow + tail;
  if (line.length > Math.max(bracketWidth(widest), start.width)) return null;
  // it must read as the block does
  const base = yamlIndentOf(node[0]);
  const numbers = yamlModelNumbers;
  yamlModelNumbers = !yamlPlainReading;
  try {
    const block = serializeYamlValue(parseYaml(node.map((l) => shiftYamlLine(l, -base)).join('\n')), 0);
    if (serializeYamlValue(parseYaml(flow), 0) !== block) return null;
  } finally {
    yamlModelNumbers = numbers;
  }
  return line;
}

/**
 * How wide a collection in brackets may be on its line (#145), comment included: as wide as the widest line the file already has, but not under 100 columns and not over 120; a
 * collection that was on one line is allowed the width that line had, so that an edit which shortens it never moves it. Wider than that, the block stays.
 */
function bracketWidth(widest) {
  return Math.max(100, Math.min(120, widest));
}

