/**
 * The block lines (one collection, at the indentation of the first line) as one flow collection (`[a, b]`, `{k: v, l: [x, y]}`), or `null` when a line is not a key, an item or a value
 * that can stand in brackets. A value keeps the quotes it has; a plain text that holds a bracket, a brace or a comma is quoted, for the brackets cannot hold it. `pad` is the spacing
 * the file used inside brackets (`[ a ]`, `{ k: v }`).
 */
function yamlBlockLinesToFlow(input, pad) {
  const lines = input.slice();
  let i = 0;
  const wrap = (open, items, close, padded) =>
    items.length === 0 ? open + close : open + (padded ? ' ' : '') + items.join(', ') + (padded ? ' ' : '') + close;
  const scalar = (text) => {
    const token = text.trim();
    if (token === '') return null;
    if (token === '[]' || token === '{}') return token;
    if (token[0] === '"') return /^"(?:[^"\\]|\\.)*"$/.test(token) ? token : null;
    if (token[0] === "'") return /^'(?:[^']|'')*'$/.test(token) ? token : null;
    if (/^[[{&*!|>%@`#]/.test(token)) return null;
    return /[,[\]{}]/.test(token) ? '"' + escapeYamlDoubleQuoted(token) + '"' : token;
  };
  const isItem = (text) => text === '-' || text.startsWith('- ');
  const node = (indent) => {
    if (i >= lines.length || yamlIndentOf(lines[i]) !== indent) return null;
    if (isItem(lines[i].slice(indent))) {
      const items = [];
      while (i < lines.length && yamlIndentOf(lines[i]) === indent && isItem(lines[i].slice(indent))) {
        const rest = lines[i].slice(indent + 1);
        const content = rest.replace(/^ +/, '');
        const column = indent + 1 + (rest.length - content.length);
        let value;
        if (content === '') {
          i++;
          if (i >= lines.length || yamlIndentOf(lines[i]) <= indent) return null;
          value = node(yamlIndentOf(lines[i]));
        } else if (isItem(content) || scanYamlKey(content, 0, 0) !== null) {
          lines[i] = ' '.repeat(column) + content; // the collection that starts after the dash is read as if it stood at its own column
          value = node(column);
        } else {
          value = scalar(content);
          i++;
        }
        if (value === null) return null;
        items.push(value);
      }
      return wrap('[', items, ']', pad.seq);
    }
    const entries = [];
    while (i < lines.length && yamlIndentOf(lines[i]) === indent) {
      if (isItem(lines[i].slice(indent))) return null;
      const found = scanYamlKey(lines[i], indent, 0);
      if (found === null) return null;
      let key = lines[i].slice(indent, found.end - 1).replace(/[ \t]+$/, '');
      if (!/^["']/.test(key) && /[,[\]{}]/.test(key)) key = '"' + escapeYamlDoubleQuoted(key) + '"';
      const rest = lines[i].slice(found.end).trim();
      let value;
      if (rest === '') {
        i++;
        if (i >= lines.length || yamlIndentOf(lines[i]) <= indent) return null;
        value = node(yamlIndentOf(lines[i]));
      } else {
        value = scalar(rest);
        i++;
      }
      if (value === null) return null;
      entries.push(key + ': ' + value);
    }
    return wrap('{', entries, '}', pad.map);
  };
  const flow = node(yamlIndentOf(lines[0]));
  return flow !== null && i === lines.length ? flow : null;
}

/** The indentation of a YAML line, in spaces. */
function yamlIndentOf(line) {
  return line.length - line.replace(/^ +/, '').length;
}

/** The words of a line: no quote, no trailing comment, no space around it (its indentation is compared on its own). */
function yamlWordsOf(line) {
  return stripYamlComment(line).replace(/["']/g, '').trim();
}

/**
 * A line that is a scalar, `key: value`, `- value` or `- key: value`, read for its quoting: `{ prefix, key, valueAt, quote, text, plainable }`, or `null` for any other line
 * (a key alone, a flow collection, a block scalar, an anchor, a text that does not close). `prefix` is the indentation and the dashes, `key` the name (`null` for a list
 * item), `valueAt` the index where the value starts, `quote` how it is written (`'"'`, `"'"` or `''` for plain), `text` the string it reads as, `plainable` whether the emitter would have written the
 * string without quotes: a quote that the text needs (`"1"`, `"a: b"`) is not a choice of the author and says nothing about the style of the file.
 */
function readYamlScalarLine(line) {
  const prefix = line.match(/^ *(?:- +)*/)[0];
  const found = scanYamlKey(line, prefix.length, 0);
  let at = prefix.length;
  if (found) {
    at = found.end;
    while (at < line.length && isYamlWs(line[at])) at++;
  }
  const token = stripYamlComment(line).replace(/\s+$/, '').slice(at);
  if (token === '' || /^[[{&*!|>#%@`?]/.test(token)) return null;
  let quote = '';
  let value = token;
  try {
    if (token[0] === '"' || token[0] === "'") {
      if (token.length < 2 || token[token.length - 1] !== token[0]) return null;
      quote = token[0];
      const body = token.slice(1, -1);
      value = quote === '"' ? unescapeYamlDoubleQuoted(body, 0) : body.replace(/''/g, "'");
    }
  } catch (e) {
    return null;
  }
  return {
    prefix,
    key: found ? found.key : null,
    valueAt: at,
    quote,
    text: value,
    plainable: !yamlStringNeedsQuoting(value)
  };
}

/**
 * `{ prefix, key, collection }` of a line `key: value` whose value is a scalar, nothing (`key:`) or an empty collection (`[]`, `{}`); `collection` is true for the last two, the
 * lines the emitter writes for a collection that has no item or that has a block under it. `null` for any other line.
 */
function readYamlKeyLine(line) {
  const prefix = line.match(/^ *(?:- +)*/)[0];
  const found = scanYamlKey(line, prefix.length, 0);
  if (found === null) return null;
  const rest = stripYamlComment(line).slice(found.end).trim();
  const collection = rest === '' || rest === '[]' || rest === '{}';
  return collection || readYamlScalarLine(line) !== null ? { prefix, key: found.key, collection } : null;
}

/** The scalar lines of a file whose quoting is the author's choice (see `readYamlScalarLine`), the text of a block scalar left out. */
function yamlQuotingVotes(original) {
  const votes = [];
  let blockFrom = -1; // the column a block scalar's text must go past
  for (const line of original) {
    if (blockFrom !== -1) {
      if (line.trim() === '' || yamlIndentOf(line) > blockFrom) continue;
      blockFrom = -1;
    }
    const header = yamlBlockHeader(line);
    if (header) {
      blockFrom = header[1].length;
      continue;
    }
    const read = readYamlScalarLine(line);
    if (read !== null && read.plainable) votes.push({ key: read.key, quote: read.quote });
  }
  return votes;
}

/** The quote that most of `votes` use, plain when there is none or when plain is as frequent as the other. */
function dominantYamlQuote(votes) {
  const count = { '': 0, '"': 0, "'": 0 };
  for (const vote of votes) count[vote.quote]++;
  let best = '';
  for (const quote of ['"', "'"]) if (count[quote] > count[best]) best = quote;
  return best;
}

/**
 * The quote of the very same text with the same key, written in the lines that go (a collection that changed shape, a value that moved or was reordered: the lines are new, the scalar
 * is not): `null` when none goes, else the quote it had (`''` for plain). The line that goes is used up. Asked of every line that comes before any other rule is, so that a line which
 * only looks like the one that goes (same place, other text) does not take its quotes.
 */
function movedYamlQuote(line, dropped, pool) {
  const added = readYamlScalarLine(line);
  if (added === null || added.quote !== '' || !added.plainable) return null;
  const same = (d) =>
    d.read !== null &&
    !d.used &&
    d.read.plainable &&
    d.read.text === added.text &&
    (d.read.key === added.key || d.read.key === null || added.key === null); // `k: v` that becomes `k:` and `- v`, and back
  const moved = dropped.find(same) || (pool || []).find(same);
  if (!moved) return null;
  moved.used = true;
  return moved.read.quote;
}

/**
 * The line the emitter wrote for a new or changed value, written in the quotes of the file: the style of the line it replaces (`dropped`: the lines the edit takes out
 * next to it, read by `readYamlScalarLine`) when one has the same key, else the one of a line that goes anywhere in the edit (`pool`) with the same key and the same text (the
 * scalar is the author's, only its line is new: #150, see `movedYamlQuote`), else the one of a line that stays next to it (`siblings`) with the same key, else the one most
 * lines with that key use, else the one most scalar lines of the file use, else none. Only a string that the emitter writes plain is touched (a number, a boolean, a text the emitter had to quote stay as the emitter wrote them), and the line comes
 * back as it was when the choice is plain.
 */
function quoteYamlAddedLine(line, dropped, siblings, votes, moved) {
  const added = readYamlScalarLine(line);
  if (added === null || added.quote !== '' || !added.plainable) return line;
  let quote = moved === undefined ? null : moved; // see `movedYamlQuote`
  if (quote === null) {
    const twin = dropped.find(
      (d) => d.read !== null && !d.used && d.read.prefix === added.prefix && d.read.key === added.key
    );
    if (twin) {
      twin.used = true;
      if (twin.read.plainable) quote = twin.read.quote;
    }
  }
  if (quote === null) {
    // a line of the same list or the same mapping, next to the new one, as the author wrote it
    const sibling = siblings.find(
      (read) => read !== null && read.plainable && read.prefix === added.prefix && read.key === added.key
    );
    if (sibling) quote = sibling.quote;
  }
  if (quote === null) {
    const same = votes().filter((vote) => vote.key === added.key);
    quote = dominantYamlQuote(same.length ? same : votes());
  }
  if (quote === '') return line;
  const token = line.slice(added.valueAt);
  return (
    line.slice(0, added.valueAt) +
    (quote === '"' ? '"' + escapeYamlDoubleQuoted(token) + '"' : "'" + token.replace(/'/g, "''") + "'")
  );
}

/** A plain word of the file (`on`, `1_000`) that the reader makes the value of the token the emitter writes (`true`, `1000`). */
function yamlWordIsToken(word, token) {
  try {
    return resolveYamlPlain(word) === JSON.parse(token);
  } catch (e) {
    return false;
  } finally {
    yamlPlainNumberSeen = null;
  }
}

/**
 * The words of the line `at` of `original` as the emitter would write them: a plain scalar that the reader reads as a boolean or a null by another word than the
 * emitter's (`yes`, `Off`, `~`) is the word the emitter writes for that value (`true`, `false`, `null`), and so is a key with nothing after it and nothing below it
 * (`description:` is `description: null`), so that a line written by the author is found for the line the emitter wrote.
 */
function yamlEmittedWordsOf(original, at) {
  const line = original[at];
  const words = yamlWordsOf(line);
  const read = readYamlScalarLine(line);
  if (read === null) {
    const prefix = line.match(/^ *(?:- +)*/)[0];
    const found = scanYamlKey(line, prefix.length, 0);
    if (found === null || stripYamlComment(line).replace(/\s+$/, '').length !== found.end) return words;
    let next = at + 1;
    while (next < original.length && yamlWordsOf(original[next]) === '') next++;
    // a block below it (deeper, or a list at the column of the key) is the value of the key
    if (
      next < original.length &&
      (yamlIndentOf(original[next]) > prefix.length ||
        (yamlIndentOf(original[next]) === prefix.length && /^ *- /.test(original[next]) && !/- /.test(prefix)))
    )
      return words;
    return words + ' null';
  }
  if (read.quote !== '') return words;
  // a number the emitter writes another way (`010` is `8` in a manifest, `1_000` is `1000`) is found by the words the emitter writes (issue #103)
  const before = yamlModelNumbers;
  yamlModelNumbers = !yamlPlainReading;
  let value;
  let heldAsText;
  try {
    yamlPlainNumberSeen = null;
    value = resolveYamlPlain(stripYamlComment(line).replace(/\s+$/, '').slice(read.valueAt));
    heldAsText = yamlPlainNumberSeen !== null && yamlPlainNumberSeen.number.kind !== 'malformed'; // a number held as the text Java prints (`1e3` is `1000.0`)
  } catch (e) {
    return words; // a number the reader refuses is not one the emitter writes
  } finally {
    yamlModelNumbers = before;
    yamlPlainNumberSeen = null;
  }
  if (value !== null && typeof value !== 'boolean' && typeof value !== 'number' && !heldAsText) return words;
  return (
    yamlWordsOf(line.slice(0, read.valueAt)) +
    ' ' +
    (typeof value === 'string' ? value : serializeYamlScalarToken(value))
  ).trim();
}

/**
 * Where each line of `before` (what the emitter writes for the old value) sits in the original lines: `{ place, spans }` (`spans`: the lines of a block scalar
 * that follow the first one), or `null` when a line cannot be found in order, with the same indentation and the same words.
 */
function locateEmittedLines(original, before) {
  const indentOf = yamlIndentOf;
  const wordsOf = yamlWordsOf;
  // where each emitted line of the old value sits in the original text
  const place = [];
  const spans = []; // the lines of a block scalar that follow its first line
  let cursor = 0;
  for (const line of before) {
    let found = -1;
    if (wordsOf(line) === '') {
      // a blank line or one that reads as a comment: inside a block scalar, where it is text, so it is the very next line
      if (cursor < original.length && original[cursor].trim() === line.trim()) found = cursor;
      if (found === -1) return null;
      place.push(found);
      spans.push(0);
      cursor = found + 1;
      continue;
    }
    let span = 0;
    for (let j = cursor; j < original.length; j++) {
      const candidate = original[j];
      if (wordsOf(candidate) === '') continue; // a comment or a blank line
      if (indentOf(candidate) === indentOf(line)) {
        const keylessBlock = yamlKeylessBlockHeader(candidate); // `- |`: the emitter writes it `- "one\ntwo\n"` (#154)
        if (wordsOf(candidate) === wordsOf(line) || yamlEmittedWordsOf(original, j) === wordsOf(line)) found = j;
        else if (keylessBlock !== null && yamlKeylessBlockIsLine(original, j, keylessBlock, line)) {
          found = j;
          for (let k = j + 1; k < original.length; k++) {
            if (original[k].trim() === '') continue;
            if (indentOf(original[k]) <= keylessBlock) break;
            span = k - j;
          }
        } else {
          // a text over several lines is a block (| or >) in the file and a quoted string on one line for the emitter
          const key = line.slice(0, line.indexOf(': ') + 1);
          const header = stripYamlComment(candidate).replace(/["']/g, '').trim();
          if (
            key.length > 1 &&
            /^[|>][-+0-9]*$/.test(header.slice(key.replace(/["']/g, '').trim().length).trim()) &&
            header.startsWith(key.replace(/["']/g, '').trim())
          ) {
            found = j;
            const keyColumn = candidate.length - candidate.replace(/^ *(?:- +)*/, '').length;
            for (let k = j + 1; k < original.length; k++) {
              if (original[k].trim() === '') continue;
              if (indentOf(original[k]) < keyColumn + 1) break;
              span = k - j;
            }
          }
        }
      }
      break; // the next line with words has to be it
    }
    if (found === -1) return null;
    place.push(found);
    spans.push(span);
    cursor = found + 1 + span;
  }
  return { place, spans };
}

/**
 * `steps` (the edit as `keep`, `drop` and `add` steps over `before`, the lines the emitter writes for the old value) with each run of lines that only go, or only come, moved to
 * where it covers whole items (#151). Lines that read the same (`-`, the bare dash of an item that is a list) leave a choice: removing the first of two items `- [a, b]  # row a`
 * and `- [c, d]  # row c` drops `- a`, `- b` and one `-`, and the common start takes the first `-` for the kept item, so that the comment of the first stays on the second. A run
 * slides over the lines that read like the ones it passes (the text written is the same wherever it is); it takes the first position, the nearest the diff's own, where it starts
 * at its shallowest line and the line after it is not deeper (items, not the tail of one and the head of the next). A run that is already whole items, or that has no such
 * position, stays where it is.
 */
function slideAmbiguousRuns(steps, before) {
  const wholeItems = (lines, following) => {
    const first = yamlIndentOf(lines[0]);
    return (
      lines.every((line) => yamlIndentOf(line) >= first) &&
      (following === undefined || yamlIndentOf(following) <= first)
    );
  };
  const same = (a, b) => a.length === b.length && a.every((line, i) => line === b[i]);
  const textOf = (step) =>
    step.keep !== undefined ? before[step.keep] : step.drop !== undefined ? before[step.drop] : step.add;
  for (let from = 0; from < steps.length; from++) {
    if (steps[from].keep !== undefined) continue;
    let to = from;
    while (to < steps.length && steps[to].keep === undefined) to++;
    const dropping = steps.slice(from, to).every((step) => step.drop !== undefined);
    if (!dropping && !steps.slice(from, to).every((step) => step.add !== undefined)) {
      from = to - 1;
      continue;
    } // lines that are replaced: paired below
    const n = to - from;
    // the kept steps around the run, up to `n` on each side with no other edit between: the run and these lines, in the order of the text the edit leaves (the lines that go are
    // left out of it, the lines that come are in it), are what the run can slide over
    let lo = from;
    while (from - lo < n && lo > 0 && steps[lo - 1].keep !== undefined) lo--;
    let hi = to;
    while (hi - to < n && hi < steps.length && steps[hi].keep !== undefined) hi++;
    const segment = steps.slice(lo, hi);
    const lines = segment.map(textOf);
    const home = from - lo;
    const without = (at) => lines.slice(0, at).concat(lines.slice(at + n)); // the text without the run, or the text around it: the same wherever the run can be
    let best;
    for (let distance = 0; distance <= lines.length && best === undefined; distance++) {
      // the positions are tried from the nearest to the home one: home, then one up, one down, two up...
      for (const position of distance === 0 ? [home] : [home - distance, home + distance]) {
        if (
          position < 0 ||
          position + n > lines.length ||
          (position !== home && !same(without(position), without(home)))
        )
          continue;
        if (best === undefined && wholeItems(lines.slice(position, position + n), lines[position + n])) best = position;
      }
    }
    if (best === undefined || best === home) {
      from = to - 1;
      continue;
    }
    const keeps = segment.filter((step) => step.keep !== undefined);
    const indexes = dropping ? segment.map((step) => (step.keep !== undefined ? step.keep : step.drop)) : [];
    steps.splice(
      lo,
      segment.length,
      ...segment.map((step, i) => {
        const inRun = i >= best && i < best + n;
        if (dropping) return inRun ? { drop: indexes[i] } : { keep: indexes[i] };
        return inRun ? { add: lines[i] } : keeps.shift();
      })
    );
    from = hi - 1;
  }
}

/**
 * `patchYamlText` for a layout it can follow: the text of `oldText` with the difference between what the emitter writes for the old value and `emitted`
 * (what it writes for `newValue`) applied; `null` when a line the emitter writes for the old value cannot be found in `oldText`.
 */
function patchYamlLines(oldText, emitted, newValue, styled, itemMarks) {
  let oldValue;
  try {
    oldValue = parseYamlAsModel(oldText); // the model holds `parent: yes` as the text it is (issue #85), so does the old value it is compared with
  } catch (e) {
    return null;
  }
  if (oldValue === null || typeof oldValue !== 'object') return null;
  const eol = /\r\n/.test(oldText) ? '\r\n' : '\n';
  const endsWithBreak = /\n$/.test(oldText);
  const original = oldText.replace(/^\ufeff/, '').split(/\r\n|\r|\n/);
  if (endsWithBreak) original.pop();
  const before = serializeYamlValue(oldValue, 0).split('\n');
  const after = emitted.split('\n');

  // where each emitted line of the old value sits in the original text
  const located = locateEmittedLines(original, before);
  if (located === null) return null;
  const { place, spans } = located;

  // the lines both have, in order (the common start and end first, which is nearly always most of it)
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  const middleBefore = before.slice(start, endBefore);
  const middleAfter = after.slice(start, endAfter);
  const rows = middleBefore.length + 1;
  const cols = middleAfter.length + 1;
  const table = new Array(rows * cols).fill(0);
  for (let i = rows - 2; i >= 0; i--) {
    for (let j = cols - 2; j >= 0; j--) {
      table[i * cols + j] =
        middleBefore[i] === middleAfter[j]
          ? table[(i + 1) * cols + j + 1] + 1
          : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
    }
  }
  // the edit as a list of steps over `before`: keep the line, drop it, or write a new line there
  const steps = [];
  for (let i = 0; i < start; i++) steps.push({ keep: i });
  let i = 0;
  let j = 0;
  while (i < middleBefore.length || j < middleAfter.length) {
    if (i < middleBefore.length && j < middleAfter.length && middleBefore[i] === middleAfter[j]) {
      steps.push({ keep: start + i });
      i++;
      j++;
    } else if (
      j < middleAfter.length &&
      (i === middleBefore.length || table[i * cols + j + 1] >= table[(i + 1) * cols + j])
    ) {
      steps.push({ add: middleAfter[j] });
      j++;
    } else {
      steps.push({ drop: start + i });
      i++;
    }
  }
  for (let k = endBefore; k < before.length; k++) steps.push({ keep: k });

  // what a line is, for telling it again on another line: a value by key and text, the line of a collection by key (`null` for any other line)
  const identityOf = (line) => {
    const read = readYamlScalarLine(line);
    if (read !== null) return 'value\n' + read.key + '\n' + read.text;
    const shape = readYamlKeyLine(line);
    return shape !== null && shape.collection ? 'collection\n' + shape.key : null;
  };
  const commentOf = (line) => line.slice(stripYamlComment(line).replace(/\s+$/, '').length);
  // the first line of an item that is a collection in brackets (a mark of `markOpenedFlows` of the kind `item`), not of a key's: its comment is the item's
  const itemFlow = (line) => {
    const mark = /\u0006(\d+)\u0007/.exec(commentOf(line));
    return mark !== null && itemMarks !== undefined && itemMarks.has(Number(mark[1]));
  };

  slideAmbiguousRuns(steps, before);

  // in a run of lines that go and lines that come, each line that goes is followed by the one that replaces it (the first with the first, the second with the second): the
  // comments and blank lines that sit above a line that goes stay above the line that takes its place, and not below it
  for (let from = 0; from < steps.length; from++) {
    if (steps[from].keep !== undefined) continue;
    let to = from;
    while (to < steps.length && steps[to].keep === undefined) to++;
    const drops = steps.slice(from, to).filter((step) => step.drop !== undefined);
    const adds = steps.slice(from, to).filter((step) => step.add !== undefined);
    const paired = [];
    const alternate = (goes, comes) => {
      for (let k = 0; k < Math.max(goes.length, comes.length); k++) {
        if (k < goes.length) paired.push(goes[k]);
        if (k < comes.length) paired.push(comes[k]);
      }
    };
    // a line that comes back as it was (the same key and text, or the same key for a collection, on a line that is new: re-indented, a dash taken or given) follows the line that goes, in the order of both: what sits
    // between the lines that go (the comments above the next one) stays above its line (#151); the other lines are paired in turn
    let goneFrom = 0;
    let comeFrom = 0;
    for (let g = 0; g < drops.length; g++) {
      const gone = identityOf(original[place[drops[g].drop]]);
      if (gone === null || g < goneFrom) continue;
      const c = adds.findIndex((add, k) => k >= comeFrom && identityOf(add.add) === gone);
      if (c === -1) continue;
      // the lines that come before it with none left that goes are written after the line that goes (the comments above it stay above them), else it is written just before its own
      const surplus = c - comeFrom > g - goneFrom;
      alternate(drops.slice(goneFrom, surplus ? g + 1 : g), adds.slice(comeFrom, c));
      if (!surplus) paired.push(drops[g]);
      paired.push(adds[c]);
      goneFrom = g + 1;
      comeFrom = c + 1;
    }
    alternate(drops.slice(goneFrom), adds.slice(comeFrom));
    steps.splice(from, to - from, ...paired);
    from = to - 1;
  }

  // a value that is added or changed is written in the quotes of the file (only when the caller asks: `styled` counts the lines it wrote so)
  if (styled) {
    let all = null;
    const votes = () => all || (all = yamlQuotingVotes(styled.voteLines || original));
    const pool = steps
      .filter((step) => step.drop !== undefined)
      .map((step) => ({ step, read: readYamlScalarLine(original[place[step.drop]]), used: false })); // every line that goes, for a scalar that comes back elsewhere
    const moved = new Map(); // the lines that come with the quotes of the same text that goes, found first for every line of the edit (see `movedYamlQuote`)
    for (let from = 0; from < steps.length; from++) {
      if (steps[from].keep !== undefined) continue;
      let to = from;
      while (to < steps.length && steps[to].keep === undefined) to++;
      const hunk = steps.slice(from, to);
      const dropped = pool.filter((entry) => hunk.includes(entry.step));
      for (const step of hunk) {
        const quote = step.add === undefined ? null : movedYamlQuote(step.add, dropped, pool);
        if (quote !== null) moved.set(step, quote);
      }
      from = to - 1;
    }
    for (let from = 0; from < steps.length; from++) {
      if (steps[from].keep !== undefined) continue;
      let to = from;
      while (to < steps.length && steps[to].keep === undefined) to++;
      const hunk = steps.slice(from, to);
      const dropped = pool.filter((entry) => hunk.includes(entry.step));
      // the lines that stay just before and after the edit, read for their quotes: what a new item of their list is written like
      const around = [steps[from - 1], steps[to]]
        .filter((step) => step !== undefined)
        .map((step) => readYamlScalarLine(original[place[step.keep]]));
      let shallowest = Infinity; // the new lines of a list that goes with a key of its own (a new `replaces:`) are not next to the lines before it
      for (const step of hunk) {
        if (step.add === undefined) continue;
        const depth = yamlIndentOf(step.add);
        const line = quoteYamlAddedLine(step.add, dropped, shallowest < depth ? [] : around, votes, moved.get(step));
        shallowest = Math.min(shallowest, depth);
        if (line !== step.add) {
          step.add = line;
          styled.lines++;
        }
      }
      from = to - 1;
    }
  }

  // a line that is changed keeps what the edit did not change of it: how its key is written and its trailing comment (`id: "a"  # why` renamed is `id: "b"  # why`)
  const keyEndOf = (line) => {
    const found = scanYamlKey(line, line.match(/^ *(?:- +)*/)[0].length, 0);
    return found === null ? -1 : found.end;
  };
  const writtenKeys = new Map(); // every line that goes, by key: how the key was written (`"tier"`), for a key that comes back on a line that is new
  for (const step of steps) {
    if (step.drop === undefined) continue;
    const line = original[place[step.drop]];
    const lead = line.match(/^ *(?:- +)*/)[0];
    const found = scanYamlKey(line, lead.length, 0);
    if (found === null) continue;
    if (!writtenKeys.has(found.key)) writtenKeys.set(found.key, new Set());
    writtenKeys.get(found.key).add(line.slice(lead.length, found.end - 1).replace(/\s+$/, ''));
  }
  // a line that comes back as it was written, a little further (re-indented, a dash added or taken away: its collection became a list, a list became its item; or the aligner took
  // another line for the one that stayed) keeps its comment: the same key and the same text for a value, the same key for the line of a collection, when it is the only one of its
  // kind within three kept lines of it (else it is not known which is which)
  const going = [];
  const coming = [];
  steps.forEach((step, at) => {
    if (step.drop !== undefined) {
      const line = original[place[step.drop]];
      going.push({
        i: at,
        step,
        line,
        id: identityOf(yamlKeylessBlockHeader(line) === null ? line : before[step.drop])
      }); // `- |` is the value the emitter writes on its line (#154)
    } else if (step.add !== undefined) coming.push({ i: at, step, id: identityOf(step.add) });
  });
  const goneIds = new Set(going.map((g) => g.id));
  const comeIds = new Set(coming.map((c) => c.id));
  const near = (from, to) =>
    steps.slice(Math.min(from, to), Math.max(from, to)).filter((step) => step.keep !== undefined).length <= 3;
  for (const gone of going) {
    if (gone.id === null || gone.step.matched || commentOf(gone.line).trim() === '') continue;
    // the comment of an item in brackets is the item's, not its first key's: only the first line of an item takes it
    const asItem = itemFlow(gone.line);
    const comers = coming.filter(
      (c) =>
        c.id === gone.id &&
        !c.step.paired &&
        near(c.i, gone.i) &&
        (!asItem || /- $/.test(c.step.add.match(/^ *(?:- +)*/)[0]))
    );
    if (
      comers.length !== 1 ||
      going.filter((g) => g.id === gone.id && !g.step.matched && near(g.i, comers[0].i)).length !== 1
    )
      continue;
    gone.step.matched = true;
    comers[0].step.paired = true;
    comers[0].step.add += commentOf(gone.line);
  }
  for (let from = 0; from < steps.length; from++) {
    if (steps[from].keep !== undefined) continue;
    let to = from;
    while (to < steps.length && steps[to].keep === undefined) to++;
    const hunk = steps.slice(from, to);
    const goneLines = hunk
      .filter((step) => step.drop !== undefined)
      .map((step) => ({
        line: original[place[step.drop]],
        read: readYamlScalarLine(original[place[step.drop]]),
        shape: readYamlKeyLine(original[place[step.drop]]),
        used: step.matched === true
      }));
    const addSteps = hunk.filter((step) => step.add !== undefined);
    for (const step of addSteps) {
      if (step.paired) continue;
      const added = readYamlScalarLine(step.add);
      if (added === null) {
        // the line of a key whose collection an edit fills or empties (`tags: [] # note` and `tags: # note` become `tags:`, and back) keeps its comment and the way its key is written
        const shape = readYamlKeyLine(step.add);
        const gone =
          shape !== null && shape.collection
            ? goneLines.find(
                (g) => !g.used && g.shape !== null && g.shape.prefix === shape.prefix && g.shape.key === shape.key
              )
            : undefined;
        if (gone) {
          gone.used = true;
          step.paired = true;
          step.add =
            gone.line.slice(0, keyEndOf(gone.line)) + step.add.slice(keyEndOf(step.add)) + commentOf(gone.line);
        }
        continue;
      }
      // a value that is on a line that goes, or a line that goes and comes back, is the same value moved (see above), not one that was changed: it does not take the place of another
      const moves = (id) => id !== null && goneIds.has(id) && comeIds.has(id);
      const same = (g) =>
        !g.used &&
        g.read !== null &&
        g.read.prefix === added.prefix &&
        g.read.key === added.key &&
        !moves(identityOf(g.line)) &&
        !goneIds.has(identityOf(step.add));
      // an item of a list has no key: it is told from the other items only when as many items go as come (the first that goes is the first that comes), as in a rename of the items of a list
      const items = (reads) => reads.filter((r) => r !== null && r.key === null && r.prefix === added.prefix).length;
      if (
        added.key === null &&
        items(goneLines.map((g) => g.read)) !== items(addSteps.map((o) => readYamlScalarLine(o.add)))
      )
        continue;
      const twin = goneLines.find(same);
      if (!twin) {
        // a value where there was a collection (`tags: [a, b]  # note` becomes `tags: none`): the line is the same key's, with its comment
        const header =
          added.key === null
            ? undefined
            : goneLines.find(
                (g) =>
                  !g.used &&
                  g.shape !== null &&
                  g.shape.collection &&
                  g.shape.prefix === added.prefix &&
                  g.shape.key === added.key
              );
        if (header) {
          header.used = true;
          step.paired = true;
          step.add =
            header.line.slice(0, keyEndOf(header.line)) + step.add.slice(keyEndOf(step.add)) + commentOf(header.line);
        }
        continue;
      }
      twin.used = true;
      step.paired = true;
      const kept = twin.line;
      step.add = kept.slice(0, twin.read.valueAt) + step.add.slice(added.valueAt) + commentOf(kept);
    }
    // the item of a list that is a collection in brackets (`- {k: v}  # note`, marked by `markOpenedFlows`) or a list below a bare dash (`-  # note`) and that an edit changes so that its
    // first line is another one (the first key goes, the list is emptied, `- {}`) is the same item: its comment stays on its first line. One item goes and one comes, in a column
    const itemColumnOf = (line) => {
      const prefix = line.match(/^ *(?:- +)*/)[0];
      if (/- $/.test(prefix) && stripYamlComment(line).trim() !== '') return prefix.length - 2;
      const bare = /^( *(?:- +)*)-[ \t]*(?:#.*)?$/.exec(line);
      return bare ? bare[1].length : -1;
    };
    const isBareDash = (line) => /^ *(?:- +)*-[ \t]*(?:#.*)?$/.test(line);
    for (const gone of goneLines) {
      const column = itemColumnOf(gone.line);
      if (
        gone.used ||
        column === -1 ||
        commentOf(gone.line).trim() === '' ||
        !(itemFlow(gone.line) || isBareDash(gone.line))
      )
        continue;
      const comers = addSteps.filter((step) => !step.paired && itemColumnOf(step.add) === column);
      if (comers.length !== 1 || goneLines.filter((g) => !g.used && itemColumnOf(g.line) === column).length !== 1)
        continue;
      gone.used = true;
      comers[0].paired = true;
      comers[0].add += commentOf(gone.line);
    }
    // a key that comes back on a line that is new is written as it was (`"tier": gold` in brackets, `tier:` as a list's key now)
    for (const step of addSteps) {
      const lead = step.add.match(/^ *(?:- +)*/)[0];
      const found = scanYamlKey(step.add, lead.length, 0);
      const forms = found === null ? undefined : writtenKeys.get(found.key);
      if (
        forms === undefined ||
        forms.size !== 1 ||
        step.add.slice(lead.length, found.end - 1) !== serializeYamlKey(found.key)
      )
        continue;
      const [written] = Array.from(forms);
      if (written !== serializeYamlKey(found.key)) step.add = lead + written + step.add.slice(found.end - 1);
    }
    from = to - 1;
  }

  // a block scalar (`note: |`) whose key goes to another line (the key before it was removed or one was added in front, so it takes the dash line of its item, or gives it up) comes back as a
  // block scalar, not as the quoted text the emitter writes: the header and the text of the original, moved to the column of the new key (wave 022, run 0162, #155 L2). Only when the text
  // read from the block is the one the emitter's line says, and only in the pass that follows the quotes of the file (`styled`): the pass without it writes what the emitter wrote
  if (styled) {
    for (let from = 0; from < steps.length; from++) {
      if (steps[from].keep !== undefined) continue;
      let to = from;
      while (to < steps.length && steps[to].keep === undefined) to++;
      const hunk = steps.slice(from, to);
      for (const step of hunk) {
        if (step.add === undefined || step.addLines !== undefined) continue;
        const lead = step.add.match(/^ *(?:- +)*/)[0];
        const found = scanYamlKey(step.add, lead.length, 0);
        if (found === null) continue;
        const quoted = /^: ("(?:[^"\\]|\\.)*")$/.exec(step.add.slice(found.end - 1));
        if (quoted === null) continue;
        let text;
        try {
          text = JSON.parse(quoted[1]);
        } catch (e) {
          continue;
        }
        if (typeof text !== 'string' || text.indexOf('\n') === -1) continue;
        const goes = hunk.find((g) => {
          if (g.drop === undefined || g.blockTaken || spans[g.drop] === 0) return false;
          const line = original[place[g.drop]];
          const head = yamlBlockHeader(line);
          if (head === null || yamlKeylessBlockHeader(line) !== null) return false;
          const oldLead = line.match(/^ *(?:- +)*/)[0];
          const oldKey = scanYamlKey(line, oldLead.length, 0);
          if (oldKey === null || oldKey.key !== found.key) return false;
          const body = original.slice(place[g.drop] + 1, place[g.drop] + 1 + spans[g.drop]);
          try {
            const read = parseYaml(
              line.slice(oldLead.length) + '\n' + body.map((l) => shiftYamlLine(l, -oldLead.length)).join('\n')
            );
            return read !== null && typeof read === 'object' && read[found.key] === text;
          } catch (e) {
            return false;
          }
        });
        if (goes === undefined) continue;
        const line = original[place[goes.drop]];
        const oldLead = line.match(/^ *(?:- +)*/)[0];
        goes.blockTaken = true;
        step.add = lead + line.slice(oldLead.length);
        step.addLines = original
          .slice(place[goes.drop] + 1, place[goes.drop] + 1 + spans[goes.drop])
          .map((l) => shiftYamlLine(l, lead.length - oldLead.length));
        styled.lines++;
        const wasAt = steps.indexOf(step);
        const goesAt = steps.indexOf(goes);
        if (goesAt > wasAt && steps.slice(wasAt + 1, goesAt + 1).every((other) => other.drop !== undefined)) {
          steps.splice(wasAt, 1);
          steps.splice(goesAt, 0, step); // the comments above the key that went stay above the block, which is written after the lines that go with it
        }
      }
      from = to - 1;
    }
  }

  // the original lines, the ones that sit between two lines of the value (comments, blank lines) with the line before them
  const out = [];
  const stray = new Set(); // the lines of `out` that are comments and blank lines left behind by a line that goes
  let next = 0; // the next original line not yet written
  const copyUpTo = (index) => {
    // up to and including the original line `index`
    while (next <= index) out.push(original[next++]);
  };
  for (const step of steps) {
    if (step.keep !== undefined) copyUpTo(place[step.keep] + spans[step.keep]);
    else if (step.drop !== undefined) {
      // the comments above a dropped line are not its own: they stay, the line goes
      while (next < place[step.drop]) {
        stray.add(out.length);
        out.push(original[next++]);
      }
      next = place[step.drop] + 1 + spans[step.drop];
    } else {
      out.push(step.add);
      if (step.addLines !== undefined) out.push(...step.addLines);
    }
  }
  while (next < original.length) out.push(original[next++]); // what follows the last line of the value: a trailing comment, a blank line
  keepStrayCommentsOutOfBlockScalars(out, stray);
  return out.join(eol) + (endsWithBreak ? eol : '');
}
