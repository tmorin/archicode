/**
 * The text of a YAML file after an edit, that keeps of the file what the edit did not touch: its comments, its blank
 * lines, its quotes and its final line break. `oldText` is the file as it is, `newValue` what it must now say.
 *
 * The emitter writes a value in one way only, so it cannot tell what a file looked like. This compares what it writes for
 * the old value (read from `oldText`) with what it writes for the new one, line by line, and applies the difference to
 * the lines of `oldText`: a line the edit did not touch stays as it was, the lines around it too. Each line the emitter
 * wrote for the old value has to be found, in order, in `oldText` with the same indentation and the same words (the
 * quotes and a trailing comment do not count); when one is not (a flow list, other indentation, a key written another
 * way), the layout of the file is not one this can follow, and the text is the emitter's, as before.
 *
 * A flow collection (`qualifiers: [Redis, Cache]`, `tags: {zone: north}`, one on several lines, one with others inside, one in an item of a list of maps) is
 * followed too (a list since wave 009, any shape since wave 010): it is read as the block the emitter writes, with the quotes of its values, and goes back
 * as it was written when the edit did not touch it (see `openFlowLists`); one that the edit changes goes back in brackets on its line when it fits and has no comment inside
 * (since wave 020, #145: see `bracketChangedFlows`), else it stays a block.
 *
 * What the edit writes again keeps what the author wrote (wave 021, run 0154, #150 and #151): a scalar that comes back on a line that is new (its collection changed shape, an
 * item was reordered) has the quotes it had, found by its key and its text (`movedYamlQuote`), and so has a key; a comment follows its own line when the line is written again
 * (`patchYamlLines`: the same key and text, the line of the same collection, the item that an edit empties); and a run of lines that goes or comes sits where it covers whole
 * items, so that removing the first of two items that read the same removes the first (`slideAmbiguousRuns`). The generated test `save-keeps-quotes-and-comments.test.js` checks it.
 *
 * A list written at the column of its key (`tags:` then `- a` at the same column) is followed too (see `markKeyColumnLists`): the file is read as the emitter would write it, with
 * those lists two columns deeper, and the lists go back to their column in the result, the items the edit adds with them.
 *
 * An anchor, an alias or a tag (`name: &n "Bakery"`, `description: *n`, `size: !!str 12`) is followed too (see `openYamlDecorations`): the lines the edit does not touch stay as
 * they were written, a line it changes keeps its anchor and its tag, and an alias stays as long as the line still says what it points at. Inside square or curly brackets too
 * (`[&a oven, *a]`, `{zone: &z north, other: *z}`; #78): the collection is read as the block it would be with them (see `openDecoratedFlows`) and goes back as it was written
 * when the edit did not touch it; one the edit changes stays a block, which keeps them by the same rules (the brackets of #145 are for a collection without them). A text that goes over several lines, plain or quoted, with a tag or
 * not, stays as written when the edit leaves it alone (it is read as the one line the emitter writes), and an item of a list whose map starts on the line below its dash
 * (`-` or `- &s`, then the keys) keeps that layout (see `mergeBareDashItems`). An anchor or a tag on a key (which the reader takes only inside brackets) and a pair in a list
 * (`[a: b]`) with them are not followed: the text is the emitter's.
 */
function patchYamlText(oldText, newValue, workspaceFile) {
  const before = yamlPlainReading;
  yamlPlainReading = workspaceFile === true; // `.archicode.yaml` is read with the plain `parseYaml` (numbers as written), a manifest as a model: the old value is read as the new one was
  try {
    return patchYamlTextRead(oldText, newValue);
  } finally {
    yamlPlainReading = before;
  }
}

function patchYamlTextRead(oldText, newValue) {
  // a text that starts with a byte-order mark is patched without it and keeps it (the page holds the text of a file without the mark, see `readTextAndMark`; #119)
  if (oldText.charCodeAt(0) === 0xfeff) return '\ufeff' + patchYamlTextRead(oldText.slice(1), newValue);
  const emitted = serializeYamlValue(newValue, 0);
  // an anchor, an alias or a tag inside brackets: the collection is first the block it would be, with them (#78)
  let flows;
  try {
    flows = openDecoratedFlows(oldText);
  } catch (e) {
    return emitted; // a layout this does not know: the emitter's text, which reads as the edit
  }
  if (flows !== null && flows.unsupported) return emitted;
  const text = flows === null ? oldText : flows.text;
  const opened = openYamlDecorations(text);
  let patched;
  if (opened === null) patched = patchYamlTextPlain(text, newValue);
  else if (opened.unsupported) return emitted;
  else patched = closeYamlDecorations(patchYamlTextPlain(opened.text, newValue), opened, emitted);
  return flows === null ? patched : closeDecoratedFlows(patched, flows, emitted);
}

/** Whether `text` reads as the value whose emitter's text is `emitted`. */
function yamlTextSays(text, emitted) {
  try {
    return serializeYamlValue(parseYamlAsModel(text), 0) === emitted;
  } catch (e) {
    return false;
  }
}

/**
 * The text with each flow collection that holds an anchor, an alias or a tag (`qualifiers: [&a oven, *a]`, `tags: {zone: &z north, other: *z}`, on one line or on several,
 * as the value of a key or an item of a list) written as the block it would be with them (`qualifiers:`, `- &a oven`, `- *a`), so that `openYamlDecorations` follows them
 * as it follows the ones of a block: `{ text, lists }` (`lists` as `openFlowLists` gives them, for `closeFlowLists` to put the collections back as they were written when the
 * edit left their block alone), `{ unsupported: true }` when one cannot be written so (an anchor or a tag on a key, a pair in a list, a decorated text over several lines, a
 * block that would not read as the brackets do), or `null` when the file has none (#78). The comments inside the brackets go under the first line of the block.
 */
function openDecoratedFlows(text) {
  const notes = { list: [], unsupported: false };
  const numbers = yamlModelNumbers;
  yamlModelNumbers = !yamlPlainReading;
  let value;
  try {
    value = parseYaml(text, notes);
  } catch (e) {
    return null;
  } finally {
    yamlModelNumbers = numbers;
  }
  const flows = notes.list.filter((note) => note.kind === 'flow').sort((a, b) => a.line - b.line);
  if (flows.length === 0) return null;
  const bom = text.charAt(0) === '\ufeff' ? '\ufeff' : '';
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.slice(bom.length).split(/\r\n|\r|\n/);
  const out = [];
  const lists = [];
  let next = 0;
  for (const note of flows) {
    if (note.line < next) return { unsupported: true };
    while (next < note.line) out.push(lines[next++]);
    const block = decoratedFlowBlock(lines, note);
    if (block === null) return { unsupported: true };
    lists.push({
      expanded: block.lines,
      original: lines.slice(note.line, note.last + 1),
      column: block.column,
      before: {
        original: lines.slice(Math.max(0, note.line - 3), note.line).reverse(),
        opened: out.slice(-3).reverse()
      }
    });
    out.push.apply(out, block.lines);
    next = note.last + 1;
  }
  while (next < lines.length) out.push(lines[next++]);
  const opened = bom + out.join(eol);
  // the block must say what the brackets say
  const before = yamlModelNumbers;
  yamlModelNumbers = !yamlPlainReading;
  try {
    if (serializeYamlValue(parseYaml(opened), 0) !== serializeYamlValue(value, 0)) return { unsupported: true };
  } catch (e) {
    return { unsupported: true };
  } finally {
    yamlModelNumbers = before;
  }
  return { text: opened, lists };
}

/**
 * The lines of the block that the flow collection of `note` (see `parseYamlInline`) is, with its anchors, its aliases and its tags, and the column of what holds it:
 * `{ lines, column }`, or `null` when it is not a layout this writes (it stands elsewhere than after `key:` or one `- `, or something in it cannot be written in a block).
 */
function decoratedFlowBlock(lines, note) {
  const line = lines[note.line];
  const ast = note.ast;
  if (!ast || (ast.type !== 'seq' && ast.type !== 'map')) return null;
  const tail = lines[note.last].slice(note.to); // the blanks and the comment after the closing bracket
  if (!/^[ \t]*(#.*)?$/.test(tail)) return null;
  const comment = tail.trim() === '' ? '' : tail;
  const lead = line.match(/^ *(?:- +)*/)[0];
  const dashes = (lead.match(/-/g) || []).length;
  const found = scanYamlKey(line, lead.length, 0);
  const propsOnly = (written) => /^(?:[&!]\S+(?:[ \t]+[&!]\S+)*)?$/.test(written);
  if (found !== null && found.end <= note.from && dashes <= 1) {
    const props = line.slice(found.end, note.from).trim();
    if (!propsOnly(props)) return null;
    const indent = lead.length + 2;
    const block = emitDecoratedFlow(ast, indent);
    if (block === null || block.length === 0) return null;
    const inside = note.comments.map((text) => ' '.repeat(indent) + text);
    return {
      lines: [line.slice(0, found.end) + (props ? ' ' + props : '') + comment].concat(inside, block),
      column: lead.length
    };
  }
  if (found === null && dashes === 1) {
    const props = line.slice(lead.length, note.from).trim();
    if (!propsOnly(props)) return null;
    const dashCol = lead.indexOf('-');
    const indent = dashCol + 2;
    const block = emitDecoratedFlow(ast, indent);
    if (block === null || block.length === 0) return null;
    const inside = note.comments.map((text) => ' '.repeat(indent) + text);
    if (ast.type === 'map' && props === '') {
      // a map item is written as the emitter writes it, its first key after the dash
      return {
        lines: [' '.repeat(dashCol) + '- ' + block[0].slice(indent) + comment].concat(inside, block.slice(1)),
        column: dashCol
      };
    }
    return {
      lines: [' '.repeat(dashCol) + '-' + (props ? ' ' + props : '') + comment].concat(inside, block),
      column: dashCol
    };
  }
  return null;
}

/**
 * The block lines, at `indent`, of a flow collection read by `parseYamlFlowNode` (its `ast`): the keys and the values as they were written, with their anchors, their tags and
 * their aliases, in the layout the emitter writes; `null` when one cannot be written on a line of its own (a text over several lines that has an anchor or a tag, a key not on one line).
 */
function emitDecoratedFlow(ast, indent) {
  const ind = ' '.repeat(indent);
  // the value as it stands after `key:` or `- ` (`undefined` when it is a block of its own, `null` when it cannot be written)
  const inline = (node) => {
    if (node.type === 'alias') return '*' + node.name;
    if (node.type === 'scalar') {
      let raw = node.raw;
      if (raw === null || raw === undefined) {
        if (node.props) return null;
        raw = serializeYamlScalarToken(node.value); // a text over several lines with nothing on it: the emitter's token, which reads the same
      }
      if (raw === '') return node.props || '';
      return node.props ? node.props + ' ' + raw : raw;
    }
    if (node.type === 'seq' && node.items.length === 0) return (node.props ? node.props + ' ' : '') + '[]';
    if (node.type === 'map' && node.entries.length === 0) return (node.props ? node.props + ' ' : '') + '{}';
    return node.type === 'seq' || node.type === 'map' ? undefined : null;
  };
  const out = [];
  if (ast.type === 'seq') {
    for (const item of ast.items) {
      if (!item) return null;
      const one = inline(item);
      if (one === null) return null;
      if (one !== undefined) {
        out.push(ind + '-' + (one === '' ? '' : ' ' + one));
        continue;
      }
      const below = emitDecoratedFlow(item, indent + 2);
      if (below === null) return null;
      if (item.type === 'map' && !item.props) {
        out.push(ind + '- ' + below[0].slice(indent + 2));
        out.push.apply(out, below.slice(1));
      } else {
        out.push(ind + '-' + (item.props ? ' ' + item.props : ''));
        out.push.apply(out, below);
      }
    }
    return out;
  }
  if (ast.type === 'map') {
    for (const entry of ast.entries) {
      if (entry.key === null || entry.key === '' || !entry.value) return null;
      const one = inline(entry.value);
      if (one === null) return null;
      if (one !== undefined) {
        out.push(ind + entry.key + ':' + (one === '' ? '' : ' ' + one));
        continue;
      }
      const below = emitDecoratedFlow(entry.value, indent + 2);
      if (below === null) return null;
      out.push(ind + entry.key + ':' + (entry.value.props ? ' ' + entry.value.props : ''));
      out.push.apply(out, below);
    }
    return out;
  }
  return null;
}

/**
 * `patched` with the flow collections that `openDecoratedFlows` wrote as blocks put back as they were written, where the edit left the block as it was (with its anchors,
 * its aliases and its tags back, see `closeYamlDecorations`); a block the edit changed stays a block (the collections without them go back in brackets, see `bracketChangedFlows`). The text must still say what the
 * edit says, else `patched` is.
 */
function closeDecoratedFlows(patched, flows, emitted) {
  if (patched === emitted) return patched;
  try {
    const closed = closeFlowLists(patched, flows.lists);
    return closed !== patched && yamlTextSays(closed, emitted) ? closed : patched;
  } catch (e) {
    return patched;
  }
}

/**
 * The anchors, the aliases and the tags of a file, taken out of its text so that the aligner (which compares the lines the emitter writes with the lines of the file) finds
 * the lines it expects: `{ text, entries }`, or `{ unsupported: true }` when the save cannot follow them, or `null` when the file has none.
 *
 * In `text`, an anchor and a tag are gone from their line (`name: &n "Bakery"` is `name: "Bakery"`; a tag that changed what the value reads as, `!!str 12`, leaves the
 * emitter's token, `"12"`) and an alias is the node it points at, as the emitter writes it (`description: Bakery`; a map or a list is a block under its key). A text that goes
 * over several lines (plain or quoted, with an anchor or a tag or none) is the one line the emitter writes for it, its comment after it (#78). Each line that
 * was changed carries a mark at the end (`\u0002` and a number, in the comment of the line, which every edit of a line keeps) that says which entry it came from; `entries`
 * has, for each, the lines as they were written and the line as it was opened. `closeYamlDecorations` puts them back. Unsupported are a flow collection that still has one
 * (`openDecoratedFlows` writes them as blocks first), two on one line, and a mark character in the file.
 */
function openYamlDecorations(text) {
  const notes = { list: [], unsupported: false };
  const numbers = yamlModelNumbers;
  yamlModelNumbers = !yamlPlainReading; // the numbers are read as the model reads them, as `parseYamlAsModel` does for the check that follows
  try {
    parseYaml(text, notes);
  } catch (e) {
    return null;
  } finally {
    yamlModelNumbers = numbers;
  }
  if (notes.list.length === 0 && !notes.unsupported) return null;
  if (notes.unsupported || /[\u0002\u0003]/.test(text) || notes.list.some((note) => note.kind === 'flow'))
    return { unsupported: true };
  const bom = text.charAt(0) === '﻿' ? '﻿' : '';
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.slice(bom.length).split(/\r\n|\r|\n/);
  const spanned = (note) => note.kind === 'lines' || (note.kind === 'props' && note.multiline); // the note covers the lines `line` to `last`
  const lastOf = (note) => (spanned(note) ? note.last : note.line);
  const list = notes.list.slice().sort((a, b) => a.line - b.line);
  for (let k = 1; k < list.length; k++) if (list[k].line <= lastOf(list[k - 1])) return { unsupported: true };
  const entries = [];
  const edits = [];
  for (const note of list) {
    const line = lines[note.line];
    const entry = {
      id: entries.length,
      kind: note.kind,
      original: lines.slice(note.line, lastOf(note) + 1),
      opened: null,
      bare: false,
      expansion: null,
      tokens: null,
      anchor: null,
      context: null
    };
    let replacement;
    if (spanned(note)) {
      // the text over several lines is the line the emitter writes for it, with the comment of its last line
      const tail = yamlScalarTail(lines[note.last], note.scalarEnd);
      if (tail === null) return { unsupported: true };
      if (note.kind === 'props') {
        entry.tokens = line.slice(note.from, note.end);
        entry.anchor = note.anchor;
      }
      // a quoted text is opened in its quotes, so that a value the edit writes there keeps them (the aligner writes a changed line in the quotes of the line it replaces)
      const at = note.kind === 'props' ? note.to : note.from;
      const quote = line[at] === '"' || line[at] === "'" ? line[at] : '';
      const value = note.value;
      let token = serializeYamlInline(value);
      if (quote === '"' && typeof value === 'string') token = '"' + escapeYamlDoubleQuoted(value) + '"';
      else if (
        quote === "'" &&
        typeof value === 'string' &&
        !/[\u0000-\u001f\u007f\u0085\u2028\u2029\ufeff]/.test(value)
      )
        token = "'" + value.replace(/'/g, "''") + "'";
      replacement = [line.slice(0, note.from) + token + tail];
    } else if (note.kind === 'props') {
      const before = line.slice(0, note.from);
      const rest = line.slice(note.to);
      const gap = line.slice(note.end, note.to);
      entry.tokens = line.slice(note.from, note.end);
      entry.anchor = note.anchor;
      let opened;
      if (rest === '' || isYamlCommentAt(rest, 0)) {
        const head = before.replace(/[ \t]+$/, '');
        if (head.trim() === '') return { unsupported: true };
        opened = note.changed ? head + ' ' + serializeYamlInline(note.value) + gap + rest : head + gap + rest;
      } else if (note.changed) {
        const token = stripYamlComment(rest).replace(/\s+$/, '');
        opened = before + serializeYamlInline(note.value) + rest.slice(token.length);
      } else {
        opened = before + rest;
      }
      replacement = [opened];
    } else {
      const before = line.slice(0, note.from);
      const rest = line.slice(note.to);
      if (!isYamlComplexValue(note.value)) {
        replacement = [before + serializeYamlInline(note.value) + rest];
        entry.context = 'scalar';
      } else if (/:[ \t]*$/.test(before)) {
        entry.context = 'key';
        const column = line.match(/^ *(?:- +)*/)[0].length;
        replacement = [before.replace(/[ \t]+$/, '') + rest].concat(
          serializeYamlValue(note.value, column + 2).split('\n')
        );
      } else if (/^ *- +$/.test(before)) {
        entry.context = 'item';
        replacement = serializeYamlValue([note.value], yamlIndentOf(before)).split('\n');
        replacement[0] += rest;
      } else {
        return { unsupported: true };
      }
      entry.expansion = replacement.slice();
    }
    entry.opened = replacement[0];
    entry.bare = stripYamlComment(replacement[0]).length === replacement[0].length;
    replacement[0] += (entry.bare ? ' #' : '') + '\u0002' + entry.id + '\u0003';
    entries.push(entry);
    edits.push({ line: note.line, count: entry.original.length, replacement });
  }
  edits.sort((a, b) => b.line - a.line);
  for (const edit of edits) lines.splice(edit.line, edit.count, ...edit.replacement);
  return { text: bom + lines.join(eol), entries };
}

/**
 * What follows a text that ends on `line` (the last line of a text over several lines): the blanks and the comment after it, or `''`. `end` is the column after the closing
 * quote of a quoted text, `null` for a plain text (which cannot hold ` #`). `null` when something else follows it.
 */
function yamlScalarTail(line, end) {
  if (end !== null && end !== undefined) {
    const after = line.slice(end);
    return /^[ \t]*(#.*)?$/.test(after) ? (after.trim() === '' ? '' : after) : null;
  }
  const found = /^[ \t]*\S.*?([ \t]+#.*)?$/.exec(line);
  return found && found[1] ? found[1] : '';
}

/** The column and the key of a line, to tell that a line is still the one an entry came from. */
function yamlLineSignature(line) {
  const prefix = line.match(/^ *(?:- +)*/)[0];
  const found = scanYamlKey(line, prefix.length, 0);
  return prefix.length + ':' + (found ? found.key : '');
}

/** `line` with the anchor and the tag `tokens` written before its value (after its key, or after its dash), or `null` when it has no place for them. */
function insertYamlTokens(line, tokens) {
  const prefix = line.match(/^ *(?:- +)*/)[0];
  const found = scanYamlKey(line, prefix.length, 0);
  const content = stripYamlComment(line).replace(/\s+$/, '');
  if (!found && /(^|\s)-$/.test(content)) return null; // a dash with nothing after it
  let at = found ? found.end : prefix.length;
  if (content.length <= at) return found ? line.slice(0, at) + ' ' + tokens + line.slice(at) : null; // a key with nothing after it
  while (at < line.length && isYamlWs(line[at])) at++;
  return line.slice(0, at) + tokens + ' ' + line.slice(at);
}

/**
 * `patched` (written by the aligner on the text `openYamlDecorations` gave) with the anchors, the aliases and the tags back where the file had them. A line the edit did not
 * change is the line of the file; a line it changed gets its anchor and its tag back. Each is put back only if the text then still says what the edit says (`emitted`, the
 * emitter's text of the new value): an alias whose anchor was changed, or whose own value was, stays the value it now has, and a tag that no longer fits the value is dropped.
 * A text over several lines that the edit did not change is its lines as written; one it changed is the emitter's line, with its anchor and its tag when they still fit.
 */
function closeYamlDecorations(patched, opened, emitted) {
  if (patched.indexOf('\u0002') === -1) return patched;
  const bom = patched.charAt(0) === '﻿' ? '﻿' : '';
  const eol = /\r\n/.test(patched) ? '\r\n' : '\n';
  let current = patched
    .slice(bom.length)
    .split(/\r\n|\r|\n/)
    .map((raw) => {
      const found = /\u0002(\d+)\u0003/.exec(raw);
      if (found === null || opened.entries[Number(found[1])] === undefined)
        return { text: raw.replace(/[\u0002\u0003]/g, ''), id: null };
      let text = raw.replace(found[0], '');
      if (opened.entries[Number(found[1])].bare && text.endsWith(' #')) text = text.slice(0, -2);
      return { text, id: Number(found[1]) };
    });
  const build = (items) => bom + items.map((item) => item.text).join(eol);
  const says = (items) => yamlTextSays(build(items), emitted);
  if (!says(current)) return emitted;
  const written = (entry) => entry.original.map((text) => ({ text, id: null }));
  for (const kind of ['props', 'alias', 'lines']) {
    for (const entry of opened.entries) {
      if (entry.kind !== kind) continue;
      const at = current.findIndex((item) => item.id === entry.id);
      if (at === -1) continue;
      const candidate = current.slice();
      if (kind === 'props' || kind === 'lines') {
        if (current[at].text === entry.opened) {
          candidate.splice(at, 1, ...written(entry));
        } else if (kind === 'props' && yamlLineSignature(current[at].text) === yamlLineSignature(entry.opened)) {
          const text = insertYamlTokens(current[at].text, entry.tokens);
          if (text === null) continue;
          candidate[at] = { text, id: null };
        } else {
          continue;
        }
      } else {
        // the lines the alias stood for: the ones the file had, or, when an edit changed them, the line and what is under it (the check below tells whether it still says the same)
        const same = entry.expansion.every(
          (text, k) =>
            current[at + k] !== undefined && current[at + k].text === text && (k === 0 || current[at + k].id === null)
        );
        const texts = current.map((item) => item.text);
        const last = same
          ? at + entry.expansion.length - 1
          : entry.context === 'scalar'
            ? at
            : yamlLastLineUnderKey(
                texts,
                at,
                entry.context === 'item' ? yamlIndentOf(texts[at]) : texts[at].match(/^ *(?:- +)*/)[0].length,
                false
              );
        if (!same && yamlLineSignature(texts[at]) !== yamlLineSignature(entry.opened)) continue;
        candidate.splice(at, last - at + 1, ...written(entry));
      }
      if (says(candidate)) current = candidate;
    }
  }
  return build(current);
}

/**
 * `patchYamlText` for a file that has no anchor, no alias and no tag that the save follows (they are taken out first, see `openYamlDecorations`). An item of a list whose
 * map starts on the line below its dash (`-` or `- &s`, then the keys) is first written as the emitter writes it (see `mergeBareDashItems`) and goes back to its lines after.
 */
function patchYamlTextPlain(oldText, newValue) {
  let merged;
  try {
    merged = mergeBareDashItems(oldText);
  } catch (e) {
    merged = null; // a layout this does not know: the file as it is
  }
  if (merged !== null) {
    let back;
    try {
      back = splitBareDashItems(patchYamlTextColumns(merged.text, newValue), merged.items);
    } catch (e) {
      back = null;
    }
    if (back !== null && yamlTextSays(back, serializeYamlValue(newValue, 0))) return back;
  }
  return patchYamlTextColumns(oldText, newValue);
}

/** A line that opens a block scalar on a key (`key: |`, `- key: >-`): the one pattern, shared by `yamlBlockHeader` and `yamlKeylessBlockHeader`. */
const YAML_KEYED_BLOCK = /^( *(?:- +)*)(?:[^\s].*?)?:\s+[|>][-+0-9]*\s*$/;

/**
 * The block scalar a line opens (`key: |`, `- key: >-`, or an item of a list that is one, `- |`): `{ 0: the indentation the text of the block must go past }` as a match, else null. For a key it
 * is what precedes the key (the dashes included); for `- |` it is the column of the last dash, as the text only has to go past the list (wave 022, run 0162, #154).
 */
function yamlBlockHeader(line) {
  const stripped = stripYamlComment(line);
  const keyed = stripped.match(YAML_KEYED_BLOCK);
  if (keyed) return keyed;
  const item = stripped.match(/^( *(?:- +)*)- +[|>][-+0-9]*\s*$/);
  return item;
}

/** Whether the item `- |` at line `at` of `original` (its dash at column `dash`) is the value the emitter wrote on `emitted` (`- "one\ntwo\n"`, or `- text` for a folded one): the same lead, the same text. */
function yamlKeylessBlockIsLine(original, at, dash, emitted) {
  const lead = original[at].match(/^ *(?:- +)*/)[0];
  if (emitted.match(/^ *(?:- +)*/)[0] !== lead) return false;
  const body = [];
  for (let k = at + 1; k < original.length; k++) {
    if (original[k].trim() !== '' && yamlIndentOf(original[k]) <= dash) break;
    body.push(original[k]);
  }
  while (body.length > 0 && body[body.length - 1].trim() === '') body.pop();
  try {
    const read = parseYaml(original[at].slice(dash) + '\n' + body.map((l) => shiftYamlLine(l, -dash)).join('\n'));
    const wrote = parseYaml(emitted.slice(dash));
    return JSON.stringify(read) === JSON.stringify(wrote);
  } catch (e) {
    return false;
  }
}

/** The column of the last dash of a line that is an item of a list opening a block scalar (`- |`, `- >-`), else null: the column the text of the block must go past. */
function yamlKeylessBlockHeader(line) {
  if (YAML_KEYED_BLOCK.test(stripYamlComment(line))) return null;
  const item = yamlBlockHeader(line);
  return item === null ? null : item[1].length;
}

/**
 * The text with each item of a list whose map starts on the line below its dash (`-` alone on its line, with its comment, then the keys deeper) written as the emitter writes
 * it: the dash and the first key on one line (`- id: a`), the other lines of the map moved to the column the emitter gives them (two past the dash). The line carries a mark
 * (`\u0004` and a number, in its comment) that tells `splitBareDashItems` which item it was: `{ text, items }`, `items` the dash line, the comments between it and the first key,
 * the columns and the shift. `null` when the file has none, or already uses the mark characters. An item inside such a map, or one whose lines cannot be moved and moved
 * back (a comment shallower than its keys), is left as it is.
 */
function mergeBareDashItems(text) {
  if (/[\u0004\u0005]/.test(text)) return null;
  const bom = text.charAt(0) === '\ufeff' ? '\ufeff' : '';
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.slice(bom.length).split(/\r\n|\r|\n/);
  const out = [];
  const items = [];
  let blockFrom = -1; // the column a block scalar's text must go past: the text of a block scalar is not YAML
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (blockFrom !== -1) {
      if (line.trim() === '' || yamlIndentOf(line) > blockFrom) {
        out.push(line);
        continue;
      }
      blockFrom = -1;
    }
    const header = yamlBlockHeader(line);
    if (header) {
      blockFrom = header[1].length;
      out.push(line);
      continue;
    }
    const dash = /^( *)-$/.exec(stripYamlComment(line).replace(/[ \t]+$/, ''));
    let j = i + 1;
    while (dash && j < lines.length && (lines[j].trim() === '' || /^[ \t]*#/.test(lines[j]))) j++;
    const dashCol = dash ? dash[1].length : -1;
    const keyCol = dash && j < lines.length ? yamlIndentOf(lines[j]) : -1;
    if (
      keyCol <= dashCol ||
      /^ *\t/.test(lines[j]) ||
      isYamlSeqItem(lines[j], keyCol) ||
      scanYamlKey(lines[j], keyCol, 0) === null
    ) {
      out.push(line);
      continue;
    }
    const last = yamlLastLineUnderKey(lines, i, dashCol, false);
    const shift = keyCol - dashCol - 2;
    if (shift > 0 && lines.slice(j, last + 1).some((l) => l.trim() !== '' && yamlIndentOf(l) < keyCol)) {
      out.push(line);
      continue;
    }
    const merged = ' '.repeat(dashCol) + '- ' + lines[j].slice(keyCol);
    const bare = stripYamlComment(merged).length === merged.length;
    out.push(merged + (bare ? ' #' : '') + '\u0004' + items.length + '\u0005');
    for (let k = j + 1; k <= last; k++) out.push(shiftYamlLine(lines[k], -shift));
    items.push({ dashLine: line, between: lines.slice(i + 1, j), dashCol, keyCol, shift, bare });
    i = last;
  }
  return items.length ? { text: bom + out.join(eol), items } : null;
}

/** `text` (written by the aligner on the output of `mergeBareDashItems`) with the items it merged put back on their lines; `null` when a marked line is no longer the first key of an item. */
function splitBareDashItems(text, items) {
  if (text.indexOf('\u0004') === -1) return text;
  const bom = text.charAt(0) === '\ufeff' ? '\ufeff' : '';
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.slice(bom.length).split(/\r\n|\r|\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const found = /\u0004(\d+)\u0005/.exec(lines[i]);
    if (found === null) {
      out.push(lines[i]);
      continue;
    }
    const item = items[Number(found[1])];
    if (item === undefined) return null;
    let line = lines[i].replace(found[0], '');
    if (item.bare) {
      if (!line.endsWith(' #')) return null;
      line = line.slice(0, -2);
    }
    const prefix = ' '.repeat(item.dashCol) + '- ';
    if (!line.startsWith(prefix) || scanYamlKey(line, prefix.length, 0) === null) return null;
    const last = yamlLastLineUnderKey(lines, i, item.dashCol, false);
    out.push(item.dashLine, ...item.between, ' '.repeat(item.keyCol) + line.slice(prefix.length));
    for (let k = i + 1; k <= last; k++) out.push(shiftYamlLine(lines[k], item.shift));
    i = last;
  }
  const back = bom + out.join(eol);
  return /[\u0004\u0005]/.test(back) ? null : back;
}
