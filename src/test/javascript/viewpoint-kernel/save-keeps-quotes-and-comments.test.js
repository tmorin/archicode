'use strict';
// The editor's line-preserving save keeps the quotes and the comments of what an edit does not touch (wave 021, run 0154, decision T7, GitHub issues #150 and #151).
//   #150  a value written in quotes lost them when the collection around it changed shape: `value: {destination: "c", label: "l"}` that becomes a list of two maps was written
//         `[{destination: c, label: l}, ...]`; so were the quotes of a key, and the quotes of items that a reorder moved. A scalar now keeps the quotes it had wherever the edit
//         writes it again (the same key, the same text), and so does a key.
//   #151  removing the first of two items that read the same (`- [a, b]  # row a`, `- [c, d]  # row c`) left the comment of the first on the second: the common start of the two
//         texts kept the first `-`. A run of lines that goes (or comes) now sits where it covers whole items, and a comment follows its own line when the line is written again.
// The guard is a generated test: `save-generator.js` writes files of every layout the save follows, makes one random edit to each and checks what the save wrote (the model, the
// quotes, the comments above and after a line, every line the edit did not touch, a second save). The seed and the number of cases are fixed, so it is the same on every machine.
// ARCHICODE_EDITOR_HTML=<the page of archicode-0.18.0> makes it fail. Everything here is invented: a mill, a bakery, a garden.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createApp } = require('./harness');
const G = require('./save-generator');

const REPO = path.resolve(__dirname, '../../../..');
const plain = (value) => JSON.parse(JSON.stringify(value));
const app = createApp({});

const SEED = 154;
const CASES = 2000;

/** `text` after `change` was made to its value, saved as the editor saves it; it must read back as that value. */
function save(text, change, page = app) {
  const value = plain(page.parseYaml(text));
  change(value);
  const out = page.patchYamlText(text, value);
  assert.deepEqual(plain(page.parseYaml(out)), value, 'what is written says what the edit says\n' + out);
  assert.equal(
    [...out].some((c) => c >= '\u0001' && c <= '\u0007'),
    false,
    'no mark is left'
  );
  return out;
}

// ---- #150: the quotes follow the text ------------------------------------------------------------------------------------------------------------------------------------

const PATCH =
  'content:\n  id: a\n  patches:\n    - operator: ADD\n      target: "shop.web"\n      value: {destination: "commerce-saas", label: "maintains", qualifiers: ["HTTPS"]}\n  name: N\n';

test('#150: a map in brackets that becomes a list of two maps keeps the quotes of its values, its keys and its list', () => {
  const out = save(PATCH, (v) => {
    v.content.patches[0].value = [v.content.patches[0].value, { destination: 'psp', label: 'refunds' }];
  });
  assert.equal(
    out,
    PATCH.replace(
      '      value: {destination: "commerce-saas", label: "maintains", qualifiers: ["HTTPS"]}\n',
      '      value:\n        - destination: "commerce-saas"\n          label: "maintains"\n          qualifiers:\n            - "HTTPS"\n        - destination: psp\n          label: refunds\n'
    )
  );
  // the new map first: the one that was there goes on, with its quotes
  const first = save(PATCH, (v) => {
    v.content.patches[0].value = [{ destination: 'psp', label: 'refunds' }, v.content.patches[0].value];
  });
  assert.equal(first.includes('        - destination: "commerce-saas"\n          label: "maintains"\n'), true, first);
  // a key written in quotes, and a value of the single quotes: in brackets when it fits (wave 020), a map that was in brackets and goes in a list of maps that does not fit is a block
  const keys = 'content:\n  id: a\n  tags: {"zone": \'north\', tier: "gold"}\n';
  assert.equal(
    save(keys, (v) => {
      v.content.tags = [v.content.tags, { area: 'south' }];
    }),
    'content:\n  id: a\n  tags: [{"zone": \'north\', tier: "gold"}, {area: south}]\n'
  );
  const long = 'content:\n  id: a\n  tags: {"zone": \'a rather long text for the north\', tier: "gold"}\n';
  assert.equal(
    save(long, (v) => {
      v.content.tags = [
        v.content.tags,
        { area: 'a rather long text for the south of the garden', other: 'and a second one' }
      ];
    }),
    'content:\n  id: a\n  tags:\n    - "zone": \'a rather long text for the north\'\n      tier: "gold"\n    - area: a rather long text for the south of the garden\n      other: and a second one\n'
  );
});

test('#150: a map in brackets that gains a key, and a block map that is wrapped in a list, keep their quotes (as they did)', () => {
  assert.equal(
    save(PATCH, (v) => {
      v.content.patches[0].value.size = 'big';
    }),
    PATCH.replace('qualifiers: ["HTTPS"]}', 'qualifiers: ["HTTPS"], size: big}')
  ); // a new text with no line of its key to follow is written as it was
  const block = 'content:\n  id: a\n  tags:\n    zone: "north"\n    tier: \'gold\'\n';
  assert.equal(
    save(block, (v) => {
      v.content.tags = [v.content.tags, { zone: 'south' }];
    }),
    'content:\n  id: a\n  tags:\n    - zone: "north"\n      tier: \'gold\'\n    - zone: "south"\n'
  ); // the new `zone` is written like the others
});

test('#150: a value that moves keeps its quotes (items reordered, a value that leaves its key for a list, a list that gives its item back)', () => {
  const list = 'content:\n  id: a\n  qualifiers:\n    - "Cart"\n    - Sack\n    - \'Belt\'\n';
  assert.equal(
    save(list, (v) => {
      v.content.qualifiers.reverse();
    }),
    'content:\n  id: a\n  qualifiers:\n    - \'Belt\'\n    - Sack\n    - "Cart"\n'
  );
  assert.equal(
    save(list, (v) => {
      v.content.qualifiers = ['Crate', v.content.qualifiers];
    }),
    'content:\n  id: a\n  qualifiers:\n    - Crate\n    -\n      - "Cart"\n      - Sack\n      - \'Belt\'\n'
  );
  const scalar = 'content:\n  id: a\n  size: "big"   # how big\n';
  assert.equal(
    save(scalar, (v) => {
      v.content.size = ['big', 'small'];
    }),
    'content:\n  id: a\n  size:   # how big\n    - "big"\n    - small\n'
  );
  const one = 'content:\n  id: a\n  size:   # how big\n    - "big"\n';
  assert.equal(
    save(one, (v) => {
      v.content.size = 'big';
    }),
    'content:\n  id: a\n  size: "big"   # how big\n'
  );
  // a value that was changed is still written in the style of the line it replaces
  assert.equal(
    save(scalar, (v) => {
      v.content.size = 'small';
    }),
    'content:\n  id: a\n  size: "small"   # how big\n'
  );
});

// ---- #151: a comment stays with its own item -----------------------------------------------------------------------------------------------------------------------------

const MATRIX = 'content:\n  id: a\n  matrix:\n    - [a, b]  # row a\n    - [c, d]  # row c\n';

test('#151: the first of two items that read the same goes with its own comment, the second keeps its own', () => {
  assert.equal(
    save(MATRIX, (v) => {
      v.content.matrix.shift();
    }),
    'content:\n  id: a\n  matrix:\n    - [c, d]  # row c\n'
  );
  assert.equal(
    save(MATRIX, (v) => {
      v.content.matrix.pop();
    }),
    'content:\n  id: a\n  matrix:\n    - [a, b]  # row a\n'
  );
  // a comment above the next item is its introduction: it stays above it, and the next item stays a flat `- [c, d]`
  const above = 'content:\n  id: a\n  matrix:\n    - [a, b]\n    # about c\n    - [c, d]\n';
  assert.equal(
    save(above, (v) => {
      v.content.matrix.shift();
    }),
    'content:\n  id: a\n  matrix:\n    # about c\n    - [c, d]\n'
  );
  // the same in blocks: items of lists, lines that are the bare dash of an item
  const blocks =
    'content:\n  id: a\n  matrix:\n    -  # row a\n      - a\n      - b\n    -  # row c\n      - c\n      - d\n';
  assert.equal(
    save(blocks, (v) => {
      v.content.matrix.shift();
    }),
    'content:\n  id: a\n  matrix:\n    -  # row c\n      - c\n      - d\n'
  );
});

test('#151: an item added above the next one does not take its comment', () => {
  const out = save(MATRIX, (v) => {
    v.content.matrix.unshift(['x', 'y']);
  });
  assert.equal(
    out,
    'content:\n  id: a\n  matrix:\n    -\n      - x\n      - y\n    - [a, b]  # row a\n    - [c, d]  # row c\n'
  ); // a new item is the emitter's block
  const blocks = 'content:\n  id: a\n  matrix:\n    -  # row c\n      - c\n      - d\n';
  assert.equal(
    save(blocks, (v) => {
      v.content.matrix.unshift(['x', 'y']);
    }),
    'content:\n  id: a\n  matrix:\n    -\n      - x\n      - y\n    -  # row c\n      - c\n      - d\n'
  );
});

test('a line that comes back as it was keeps its comment and its key (re-indented, a dash given or taken, the collection around it wrapped or unwrapped)', () => {
  const text = 'content:\n  id: a\n  size:\n    "unit": cm   # the unit\n    # the width\n    width: 12   # in unit\n';
  assert.equal(
    save(text, (v) => {
      v.content.size = [v.content.size];
    }),
    'content:\n  id: a\n  size:\n    - "unit": cm   # the unit\n    # the width\n      width: 12   # in unit\n'
  ); // the comment line keeps its column
  const wrapped = 'content:\n  id: a\n  size:\n    - "unit": cm   # the unit\n      width: 12   # in unit\n';
  assert.equal(
    save(wrapped, (v) => {
      v.content.size = v.content.size[0];
    }),
    'content:\n  id: a\n  size:\n    "unit": cm   # the unit\n    width: 12   # in unit\n'
  );
  // a key that gains or loses a collection keeps the comment after it and the way it is written
  const key = "content:\n  id: a\n  'tags': {zone: north}   # where\n";
  assert.equal(
    save(key, (v) => {
      v.content.tags = 'none';
    }),
    "content:\n  id: a\n  'tags': none  # where\n"
  );
  assert.equal(
    save('content:\n  id: a\n  tags: none   # where\n', (v) => {
      v.content.tags = ['north'];
    }),
    'content:\n  id: a\n  tags:   # where\n    - north\n'
  );
});

test('a comment left above a line that goes is not taken for the text of the block scalar above it', () => {
  // the comment sits at the indentation of the text of `notes: |`, where the reader would read it as text: it goes to the column of the key
  const text = 'content:\n  id: a\n  notes: |\n    one\n    two\n  extra:\n    # about the size\n    size: 12\n';
  const out = save(text, (v) => {
    delete v.content.extra;
  });
  assert.equal(out, 'content:\n  id: a\n  notes: |\n    one\n    two\n  # about the size\n');
  assert.equal(plain(app.parseYaml(out)).content.notes, 'one\ntwo\n');
});

// ---- the generated test --------------------------------------------------------------------------------------------------------------------------------------------------

const describeFailure = (page, failure) => {
  const kind = failure.problems[0].kind;
  const small = G.attempt(page, G.reduce(page, failure.root, failure.d, kind), failure.d);
  return (
    'case ' +
    failure.n +
    ' (' +
    failure.edit +
    '), ' +
    failure.problems.map((p) => p.kind + ': ' + p.message).join('; ') +
    '\n--- the file, reduced\n' +
    small.file +
    '--- the result\n' +
    small.out
  );
};

test('the generator is deterministic: the same seed writes the same files on every machine', () => {
  const rand = G.prng(1);
  assert.deepEqual(
    [rand.next(), rand.next(), rand.next()].map((x) => Math.round(x * 1e6)),
    [627074, 2736, 527447]
  );
  const root = G.generate(G.prng(SEED * 100003), 0);
  assert.equal(G.write(root).text, G.write(G.generate(G.prng(SEED * 100003), 0)).text);
  const sample = G.write(G.generate(G.prng(SEED * 100003 + 4), 4)).text;
  assert.equal(sample.length > 100, true);
  assert.equal(sample, G.write(G.generate(G.prng(SEED * 100003 + 4), 4)).text);
  assert.deepEqual(plain(app.parseYaml(sample)), G.valueOf(G.generate(G.prng(SEED * 100003 + 4), 4)));
});

test(
  'generated: ' +
    CASES +
    ' files, one random edit each; the save keeps the model, every quote and comment, every line the edit did not touch, and a second save changes nothing',
  () => {
    const { stats, failures } = G.run(app, SEED, CASES);
    assert.equal(
      failures.length,
      0,
      failures.length +
        ' of ' +
        stats.cases +
        ' cases fail; the first:\n' +
        failures
          .slice(0, 3)
          .map((f) => describeFailure(app, f))
          .join('\n\n')
    );
    // the generator makes every kind of edit, in numbers
    for (const kind of [
      'set',
      'add-item',
      'remove-item',
      'add-key',
      'remove-key',
      'wrap',
      'unwrap',
      'to-scalar',
      'reorder'
    ])
      assert.equal((stats.edits[kind] || 0) >= 80, true, kind + ' ' + JSON.stringify(stats.edits));
    assert.equal(stats.cases + Object.values(stats.limits).reduce((a, b) => a + b, 0) + stats.skipped, CASES);
    assert.equal(stats.cases >= 1900, true, JSON.stringify(stats));
    // no wall-clock bound: the property is what the save writes, not how fast (it takes seconds alone and a minute inside the parallel run of every test file; wave 022, run 0162)
    // the shapes of #154 and of #155 L2 are in it, in numbers
    assert.equal(stats.shapes['block-scalar-item'] >= 100, true, JSON.stringify(stats.shapes));
    assert.equal(stats.shapes['first-key-before-block'] >= 40, true, JSON.stringify(stats.shapes));
  }
);

// ---- against the page of the tag archicode-0.18.0 --------------------------------------------------------------------------------------------------------------------------

const TAG = 'archicode-0.18.0';
let released = null;
try {
  released = execFileSync('git', ['show', TAG + ':src/main/resources/editor-webapp/standalone.html'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore']
  });
} catch (e) {
  released = null; // no tag in this clone
}
const SKIP_TAG =
  released === null
    ? 'the tag ' + TAG + ' is not in this clone'
    : process.env.ARCHICODE_EDITOR_HTML
      ? 'another page is run for every test (ARCHICODE_EDITOR_HTML)'
      : false;

test(
  'the page of archicode-0.18.0 fails the generated test, for the shapes of #150 and of #151',
  { skip: SKIP_TAG },
  () => {
    const before = createApp({ html: released });
    const { failures } = G.run(before, SEED, CASES);
    const problems = (edit, kind) =>
      failures.filter((f) => f.kind === edit && f.problems.some((p) => p.kind === kind)).length;
    assert.equal(failures.length > 300, true, failures.length + ' cases fail on the page of the tag');
    assert.equal(problems('wrap', 'quote') > 100, true, 'quotes lost when a collection becomes a list (#150)');
    assert.equal(problems('unwrap', 'quote') > 40, true, 'quotes lost when a list gives its item back (#150)');
    assert.equal(problems('reorder', 'quote') > 40, true, 'quotes not carried over a reorder (#150)');
    assert.equal(
      problems('wrap', 'comment') > 20 && problems('unwrap', 'comment') > 10,
      true,
      'comments lost when the lines of an item are written again'
    );
    assert.equal(
      problems('remove-item', 'comment') >= 1,
      true,
      'a comment on the wrong item when an item of a list is removed (#151)'
    );
    // and the examples above, on the page of the tag
    const out150 = save(
      PATCH,
      (v) => {
        v.content.patches[0].value = [v.content.patches[0].value, { destination: 'psp', label: 'refunds' }];
      },
      before
    );
    assert.equal(out150.includes('"commerce-saas"'), false, out150);
    assert.equal(
      save(
        MATRIX,
        (v) => {
          v.content.matrix.shift();
        },
        before
      ),
      'content:\n  id: a\n  matrix:\n    -  # row a\n      - c\n      - d\n'
    ); // the comment of the removed item is on the item that stays
  }
);

/** The YAML files the repository ships as a workspace, an example or a fixture. */
function shippedYaml() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(entry.name)) found.push(p);
    }
  };
  for (const root of ['src/doc/examples', 'src/test/resources'])
    if (fs.existsSync(path.join(REPO, root))) walk(path.join(REPO, root));
  return found.sort();
}

const placesOf = (value, at = []) => {
  const out = [];
  if (Array.isArray(value)) {
    out.push({ kind: 'list', at, size: value.length });
    value.forEach((x, i) => out.push(...placesOf(x, at.concat(i))));
  } else if (value && typeof value === 'object') {
    out.push({ kind: 'map', at, size: Object.keys(value).length });
    for (const key of Object.keys(value)) out.push(...placesOf(value[key], at.concat(key)));
  } else if (typeof value === 'string') out.push({ kind: 'leaf', at });
  return out;
};
const at = (value, where) => where.reduce((x, k) => x[k], value);

function sweepShipped(before, differing) {
  // a value set, an item added, the first and the last item removed, a key added, the first and the last key removed; in the first and the last place of each kind. The files with brackets
  // are the business of wave 020 (a collection that an edit changes goes back in brackets: save-keeps-the-brackets.test.js, which compares the edits that do not reach them)
  let files = 0;
  let edits = 0;
  for (const file of shippedYaml()) {
    const text = fs.readFileSync(file, 'utf8');
    if (/:\s*[[{][^\]}\s]|^\s*- [[{]/m.test(text)) continue;
    let value;
    try {
      value = before.parseYamlAsModel(text);
    } catch (e) {
      continue; // not a file the editor reads (a TOML twin, a negative case)
    }
    if (value === null || typeof value !== 'object') continue;
    files++;
    const places = placesOf(plain(value));
    const pick = (kind, i) => {
      const of = places.filter((p) => p.kind === kind && (kind === 'leaf' || p.size > 0));
      return of.length ? of[Math.min(i, of.length - 1)] : null;
    };
    for (const i of [0, 1000]) {
      const edit = (page, change) => {
        const v = plain(page.parseYamlAsModel(text));
        change(v);
        return v;
      };
      const leaf = pick('leaf', i);
      const list = pick('list', i);
      const map = pick('map', i);
      const cases = [];
      if (leaf)
        cases.push((v) => {
          at(v, leaf.at.slice(0, -1))[leaf.at[leaf.at.length - 1]] = 'zz edited';
        });
      if (list)
        cases.push(
          (v) => at(v, list.at).push('zz new'),
          (v) => at(v, list.at).shift(),
          (v) => at(v, list.at).pop()
        );
      if (map)
        cases.push(
          (v) => {
            at(v, map.at).zz_probe = 'x';
          },
          (v) => {
            delete at(v, map.at)[Object.keys(at(v, map.at)).pop()];
          },
          (v) => {
            delete at(v, map.at)[Object.keys(at(v, map.at))[0]];
          }
        );
      for (const change of cases) {
        const mine = app.patchYamlText(text, edit(app, change));
        const theirs = before.patchYamlText(text, edit(before, change));
        if (differing === undefined) assert.equal(mine, theirs, path.relative(REPO, file));
        else if (mine !== theirs) differing.push(path.relative(REPO, file));
        edits++;
      }
    }
  }
  assert.equal(files > 150, true, 'many shipped files (' + files + ')');
  assert.equal(edits > 2000, true, 'many edits (' + edits + ')');
  return { files, edits };
}

test(
  'every shipped file with no collection in brackets, saved with an edit of every kind, is the same bytes as the page of archicode-0.18.0 writes',
  { skip: SKIP_TAG },
  () => {
    sweepShipped(createApp({ html: released }));
  }
);

// ---- against the page of the tag archicode-0.19.0 (the base of wave 022) --------------------------------------------------------------------------------------------------

const TAG19 = 'archicode-0.19.0';
let base19 = null;
try {
  base19 = execFileSync('git', ['show', TAG19 + ':src/main/resources/editor-webapp/standalone.html'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore']
  });
} catch (e) {
  base19 = null; // no tag in this clone
}
const SKIP_19 =
  base19 === null
    ? 'the tag ' + TAG19 + ' is not in this clone'
    : process.env.ARCHICODE_EDITOR_HTML
      ? 'another page is run for every test (ARCHICODE_EDITOR_HTML)'
      : false;

test(
  'every shipped file with no collection in brackets, saved with an edit of every kind, is the same bytes as the page of archicode-0.19.0 writes (wave 022: only the shapes of #154 and #155 L2 may differ, and no shipped file has them)',
  { skip: SKIP_19 },
  () => {
    const differing = [];
    const { files, edits } = sweepShipped(createApp({ html: base19 }), differing);
    assert.deepEqual(
      differing,
      [],
      differing.length + ' of ' + edits + ' edits over ' + files + ' files write other bytes than the page of the tag'
    );
  }
);

test(
  'the page of archicode-0.19.0 fails the generated test for the shapes of #154 and #155 L2 and for no other',
  { skip: SKIP_19 },
  () => {
    const before = createApp({ html: base19 });
    const { failures } = G.run(before, SEED, CASES);
    assert.equal(failures.length > 100, true, failures.length + ' cases fail on the page of the tag');
    const hasBlockItem = (f) => /^ *(?:- +)*- \|/m.test(f.file);
    const firstKey = (f) => {
      // the first key of a map that is an item of a list changes, and the key that comes second is a block scalar (or takes the dash line)
      if (f.d.kind !== 'add-key' && f.d.kind !== 'remove-key') return false;
      if (f.d.at !== 0) return false;
      let found = false;
      const visit = (node) => {
        if (node.type === 'scalar') return;
        for (const slot of node.slots) {
          const item = slot.node;
          if (node.type === 'list' && item.id === f.d.target && item.type === 'map') {
            const next = f.d.kind === 'add-key' ? item.slots[0] : item.slots[1];
            if (next && next.node.type === 'scalar' && next.node.block) found = true;
          }
          visit(item);
        }
      };
      visit(f.root);
      return found;
    };
    const other = failures.filter((f) => !hasBlockItem(f) && !firstKey(f));
    assert.equal(
      other.length,
      0,
      other.length +
        ' cases fail on the page of the tag for another shape; the first: ' +
        (other[0] ? other[0].edit + '\n' + other[0].file : '')
    );
    assert.equal(
      failures.filter(firstKey).length >= 20,
      true,
      'the first key of an item before a block scalar (#155 L2) fails on the page of the tag'
    );
    assert.equal(
      failures.filter(hasBlockItem).length >= 100,
      true,
      'a block scalar that is an item of a list (#154) fails on the page of the tag'
    );
  }
);

// ---- what the generator found and the save does not do (listed in the run, kept out of the generator, pinned here) ---------------------------------------------------------------

test('#154: a block scalar that is an item of a list (`- |`) is followed by the save: the comments and the layout of the file stay, whatever the edit', () => {
  const text = 'content:  # top\n  id: a\n  notes:\n    - |\n      one\n      two\n  name: N # why\n';
  assert.equal(
    save(text, (v) => {
      v.content.name = 'M';
    }),
    'content:  # top\n  id: a\n  notes:\n    - |\n      one\n      two\n  name: M # why\n'
  );
  // an item added next to it, one removed, the block kept after a re-indentation, a comment above it
  const more = 'content:\n  id: a\n  notes:\n    # first\n    - |  # the text\n      one\n      two\n    - z # last\n';
  assert.equal(
    save(more, (v) => {
      v.content.notes.push('y');
    }),
    more + '    - y\n'
  );
  assert.equal(
    save(more, (v) => {
      v.content.notes.pop();
    }),
    'content:\n  id: a\n  notes:\n    # first\n    - |  # the text\n      one\n      two\n'
  );
  assert.equal(
    save(more, (v) => {
      v.content.notes.shift();
    }),
    'content:\n  id: a\n  notes:\n    # first\n    - z # last\n'
  ); // a comment above a line that goes stays
  assert.equal(
    save(text, (v) => {
      v.content.notes = [v.content.notes];
    }).includes('# why'),
    true
  );
  // the text itself changed: a line of the item is new, the rest stays
  const changed = save(text, (v) => {
    v.content.notes[0] = 'one\nthree\n';
  });
  assert.equal(
    changed.startsWith('content:  # top\n  id: a\n  notes:\n') && changed.endsWith('  name: N # why\n'),
    true,
    changed
  );
  // a folded block, in a list with other items
  const nested =
    'content:\n  id: a\n  rows:\n    - q # c\n    - >-\n      folded\n      text\n    - r\n  name: N # why\n';
  assert.equal(
    save(nested, (v) => {
      v.content.name = 'M';
    }),
    nested.replace('name: N', 'name: M')
  );
});

test('#155 L2: a block scalar on the key that takes the dash line of a map that is an item of a list stays a block scalar', () => {
  const text =
    'content:\n  id: a\n  steps:\n    - drop: y\n      note: |\n        one\n        two\n      other: x # why\n';
  assert.equal(
    save(text, (v) => {
      delete v.content.steps[0].drop;
    }),
    'content:\n  id: a\n  steps:\n    - note: |\n        one\n        two\n      other: x # why\n'
  );
  // a comment above the key that goes stays where it was (as for any line that goes), and the comment after the header stays on it
  const commented =
    'content:\n  id: a\n  steps:\n    - drop: y\n      # about the note\n      note: |  # text\n        one\n        two\n      other: x\n';
  assert.equal(
    save(commented, (v) => {
      delete v.content.steps[0].drop;
    }),
    'content:\n  id: a\n  steps:\n      # about the note\n    - note: |  # text\n        one\n        two\n      other: x\n'
  );
  // a key added in front: the block key gives the dash line up and keeps its block
  const front = save(text, (v) => {
    v.content.steps[0] = Object.assign({ first: 'f' }, v.content.steps[0]);
  });
  assert.equal(front.includes('      note: |\n        one\n        two\n'), true, front);
  // the first key removed when the block key is not the second one: nothing to take over
  const third = 'content:\n  id: a\n  steps:\n    - drop: y\n      mid: m\n      note: |\n        one\n        two\n';
  assert.equal(
    save(third, (v) => {
      delete v.content.steps[0].drop;
    }),
    'content:\n  id: a\n  steps:\n    - mid: m\n      note: |\n        one\n        two\n'
  );
});

test('known limit: a comment on the dash of an item that is a list is lost, or taken by the new item above, when the lists around it are nested again', () => {
  const text = 'content:\n  id: a\n  rows:\n    -  # first row\n      - a\n      - b\n    - [c, d]  # second row\n';
  const out = save(text, (v) => {
    v.content.rows = [['new'], v.content.rows];
  });
  assert.equal(
    out.includes('-  # first row\n      - new\n'),
    true,
    'the comment of the first row is now on the new row: ' + out
  );
});

test('known limit: a list that holds a list in brackets, wrapped in another list, is written in brackets as a whole, with the quotes of its items as the block had them', () => {
  const text = 'content:\n  id: a\n  rows:\n    - "w9"\n    - [w23]\n';
  const out = save(text, (v) => {
    v.content.rows = [{ n: 'x' }, v.content.rows];
  });
  assert.equal(out, 'content:\n  id: a\n  rows:\n    - n: x\n    - ["w9", [w23]]\n');
});
