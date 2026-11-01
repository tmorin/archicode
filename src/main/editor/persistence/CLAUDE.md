# Editor: reading YAML and the line-preserving save

How the page reads the scalars of a manifest like the command line does, and what the save keeps as written. The command line is the reference for the reading (`src/main/java/io/morin/archicode/CLAUDE.md`, section "Numbers in YAML"). The cases are `src/test/javascript/viewpoint-kernel/yaml-number-cases.json`, `yaml-numbers.test.js` and `editor-reads-like-cli.test.js`.

## Reading numbers like the command line

- `yamlOneDotOneNumber` is the grammar of YAML 1.1 numbers (checked against every spelling of up to five characters); `javaDoubleText` is `Double.toString`.
- Two readings of a scalar: `parseYamlAsModel` for a manifest (`yamlModelNumbers`: a JS number when the page can hold the text Java prints for it, else that text; the header fields `yamlKeepWords`: the text as written), and the plain `parseYaml` for `.archicode.yaml` (the text as written; `plainNumberOf(container, key)` says the text was a plain number, which the checks of `readValue` use for a whole number, a boolean and an enum). `patchYamlText(..., true)` of `.archicode.yaml` reads the old file the same way.
- A refused scalar (`.inf`, `.nan`, `._`) is held as its text with a mark (`yamlDeferMalformed`, `refuseYamlScalar`, read by `headerProblem` and `manifestProblem`), so the reader meets it where the command line does: the content of a manifest is decoded whole, the header key by key. `.archicode.yaml` is decoded whole by both and the page stops at the scalar.
- Tagged scalars (`applyYamlTag`; the scalar after a tag is not looked at as a number first, `yamlRawScalars`: `!!int .inf` and `!!str .inf` are the text):
  - `!!int` (`yamlTaggedInt`) is Jackson's integer: a sign, then `0` and a digit or `_` is octal, `0x` hexadecimal, `0b` binary; otherwise only digits and `_` make a decimal number and anything else stays the text (`1:30`, `1e3`, `0o17`). `09`, `0x` and `_` are refused with its sentence (`Invalid base-8 number ('9'), problem: For input string: "9" under radix 8`, down to the group of digits `BigInteger` stops at).
  - `!!float` (`yamlTaggedFloat`) is `Double.parseDouble` of the text without its `_` (`12` is `12.0`; `1d`, `0x1p3`, `Infinity` and `NaN` are texts in the content).
  - `!!binary` (`yamlTaggedBinary`) is the base64 text of the bytes of its text, with Jackson's MIME decoder and sentences (`YR==` is `YQ==`).
  - Each is checked against the jar over every spelling of up to five characters (about a million per tag). A tagged integer or binary text it cannot read is refused when the reader gets to the token, wherever it stands (under an unknown key of the header too, `at `header``); a tagged float when a value is asked of it like a plain number.
- The diagram draws the whole numbers of a style as the command line reads them (`styleValueAsRead`: `line-gap: 0x1F` is 31, `round-corner: 8.0` and `8.9` are 8, `1.5` is 1; `StyleNumbersTest`).
- An anchor or a tag on a mapping key stays refused by the editor and read by the command line (decided); the merge key `<<` is refused by both.

## What the line-preserving save keeps

- A number is written back as it was written: the save finds the line of `id: 010` for the `8` the page holds (`yamlEmittedWordsOf`, `yamlWordIsToken`, the flow lists read in the same mode), and a tagged number too (`openYamlDecorations` reads in the mode of the model; the line of `x: 1e3` for the `1000.0`). A block the emitter writes anew (a new file, a copy) spells the number as the emitter does (`8`).
- An anchor, an alias or a tag inside brackets: `openDecoratedFlows` writes such a collection as the block it would be, with them, before `openYamlDecorations` opens them, and `closeFlowLists` puts the brackets back when the edit left the block alone. One the edit changes stays a block that keeps them by the rules of a block (an alias whose anchor's value changed is written as the value it had).
- A text over several lines, plain or quoted, with a tag or none: `openYamlDecorations` reads it as the one line the emitter writes, in its quotes, and puts its lines back when the edit left it alone.
- An item of a list whose map starts on the line below its dash (`-` or `- &s`): `mergeBareDashItems` writes it as `- key: ...` with its lines at the emitter's column, `splitBareDashItems` puts it back.
- The fallback (the emitter's text) stays for an anchor or a tag on a key inside brackets, a pair in a list (`[a: b]`) with them, a tagged text over several lines inside brackets, and an item below its dash inside the map of another.
- An item removed whose first line reads as the next one's is the item removed: the next one keeps its own dash line, comments and columns (`slideAmbiguousRuns`; `save-keeps-anchors-in-brackets.test.js`).
