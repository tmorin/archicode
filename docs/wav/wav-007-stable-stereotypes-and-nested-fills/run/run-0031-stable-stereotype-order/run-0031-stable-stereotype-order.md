---
type: run
run: 0031
status: completed
wave: 007
---

# Run 0031: Stable stereotype order

Wave 007 (`stable-stereotypes-and-nested-fills`), item W-1 (phase P1). Focus: regenerate a workspace and see no changed file
unless the workspace changed. Document profile: `single-document` (scope arrives settled by the wave's W-1 row, the design has
no live alternative worth a TDD, and one agent carries it end to end); this file carries scope, decisions, canonical impact,
verification and findings.

## Context

A user reports that regenerating the views changes thousands of files "because the stereotypes are not always written in the
same order", and sorts them after the generation. Two earlier runs touched the order (0013: the kernel tells the stereotypes
in a stable order; 0021, commit `cf642ad`: the CLI writes the stereotypes of a box last first). The wave asks to find the real
cause or to show the report is already explained, and to add a determinism guard.

## Investigation

All the experiments below were run on **copies** of the user's `to-be` workspace in the scratchpad (50 manifests, 3,411
`.puml` files over the workspace and its nine facets; the user counts 3,461 with the manifests). Nothing of the client's text
or files is in the repository. Builds: the tags `archicode-0.9.0` and `archicode-0.10.0` (`git archive` into the scratchpad,
`./mvnw -o package -DskipTests`), the head of this branch before the fix, and the head with the fix; all on JDK 25.0.4. To vary
what a same-machine double generation does not vary, each build also ran with `-XX:+UnlockExperimentalVMOptions
-XX:hashCode=2` and `=4`, which change the identity hash of every object (the hash of an enum is its identity hash).

| Comparison (same workspace, same build unless stated) | Differing files |
|---|---|
| head, default vs the same copy at another path | 0 |
| head, default vs `hashCode=2` / `hashCode=4` | 8 / 8 |
| 0.10.0, default vs `hashCode=2` / `=4` | 8 / 8 |
| 0.9.0, default vs `hashCode=2` | 8 |
| **fix**, default vs `hashCode=2` / `hashCode=4` | **0 / 0** |
| 0.9.0 vs 0.10.0 (both default) | 3,044 |
| 0.10.0 vs head (both default) | 3,411 |
| head vs fix (both default) | 7 |

What the differences are:

- **Between versions (thousands of files): the stereotypes.** 0.9.0 wrote the stereotypes of a box from a `Collectors.toSet()` of
  strings (`<<composite>> <<external>>`); 0.10.0 writes them in the kernel's order (qualifiers, then the words of the tag:
  `<<external>> <<composite>>`); 0.11.0 writes them last first (run 0021). Each of these is a one-time reorder of every box that
  has two stereotypes, hence 3,044 and then 3,411 files. The `<style>` blocks changed order too (a `HashSet` of entries in 0.10.0,
  sorted by name since 0.11.0). A user who upgraded between two generations sees exactly the reported symptom, and the thousands
  of files fit this and nothing else.
- **Between runs of one build (a handful of files, never the stereotypes): the order of links.** Under a different identity hash,
  8 of 3,411 files (all technology `*-deep.puml`) differ, only in lines containing `-->`, and in every build from 0.9.0 to the
  head. `grep` of the other lines of those diffs: none; no `<<...>>` line differs in any build.

The stereotypes of a box were therefore never unstable from one run to the next in any version tested, on this workspace; the
report is explained by the version changes (the user's workaround, sorting after the generation, would then have been running
against a tool that changed its format twice). It cannot be proved which version the user ran: this is an inference from the
numbers above, to confirm with them (`archicode --version` and a regeneration with the build of the wave, which should be
stable from then on).

## Cause of the real run-to-run instability

`Link.compareTo` ordered the links of a view by `from.reference + to.reference + label` only, and `Item.compareTo` by
`reference` only. An application deployed on several nodes is one item per node, **all with the reference of the application**
(`app:idp`), told apart by the item id (`north_idp`, `south_idp`). The links of the caller to each of those items tie, and so do
two links with the same ends and label that differ by their qualifiers. `PlantumlViewRenderer` sorts `viewpoint.getLinks()`
with a stable sort; a tie keeps the iteration order of the `HashSet<Link>` that `KernelViewpointFactory` builds, and a link hashes
through its `Item`s, whose `@Value` hash includes the `Kind` enum: an identity hash, which is another from one JVM to another
(and from native image to JVM). Identity hashes are drawn from a per-thread generator that is deterministic for a given
sequence of allocations, which is why two consecutive generations on one machine are byte-identical and the defect hides until
the JVM, its version, its flags or the code path change.

Everything else on the path was checked and is not an order source: `ManifestParser` collects the manifest files and the
candidates in `HashSet`s, but the elements go to the kernel through a `TreeMap` by reference (`KernelViewpointFactory.toGraph`),
the files of the views are named from the view ids, the facet folders from `directory-name-template` and the facet list in
the YAML order, and the style blocks are sorted by name since run 0021. The editor-side code (`standalone.html`) and the kernel
were not touched: the kernel's order is the author's (the qualifiers as declared, then the words of the tag), and it was found
stable (`BTreeMap` for tags, `Vec` for the stereotypes).

## Decisions

- **D1. Break the ties, keep everything else in place.** `Item.compareTo` is by reference then by item id. `Link.compareTo` keeps
  the former key first (so no link that was not tied moves; changing it to a field-by-field comparison would move every file in
  which a system and its child both have links, for no benefit), then the ids of the ends, `synthetic`, the qualifiers, the tags
  and a description of the relationships. Two links that differ in anything the view shows are never tied. Rejected: sorting
  after the generation (the user's workaround, a wave non-goal); making the sets linked (it would keep the kernel's order, which
  is not a defined order the author can name); sorting the output file as text.
- **D2. The kernel and the wasm are unchanged.** The defect is in Java; `embed.sh --check` confirms the committed wasm is the one
  the sources build.
- **D3. Two guards, because one cannot be both realistic and sensitive.** (a) `DeterministicGenerationTest` generates an
  invented workspace (boxes with several stereotypes, an application on two nodes, a facet) in two folders, one with the manifests,
  the elements, the relationships and the tags in the reverse order and under other file names, and compares every file; it also
  generates again in the already-generated folder. It cannot vary the JVM. (b) `StableOrderTest` gives the renderer the same items
  and links in every permutation of their order (120 for the links, 24 for the items), which stands for the order another JVM
  gives the `HashSet`, and asserts one output; `OrderTest` pins the comparators. (b) fails on the code before the fix (checked: 5
  failures out of 6) and passes after.
- **D4. The manual states the guarantee.** A paragraph in "Generate views" says what is guaranteed (same workspace, same files,
  wherever the folder, however the files are listed, whatever JVM, whatever the order of lists, relationships and tags), what keeps
  the author's order (the qualifiers and the words of `rendering-stereotypes`), the sort inside a file, and that a new version
  may rewrite files (0.10.0, 0.11.0, and this fix in 0.12.0).

## Canonical impact

None to canonical documents: `docs/` holds the run and wave records only, and this repository has no ADR/arc/dom packet for the
rendering. The user-visible rule is in the manual (`src/doc/README.adoc`), updated by this run. `docs/` has no `ana` or `bkg`
register, and no analysis this run fulfils.

## Tasks

| Id | Task | Status |
|----|------|--------|
| T1 | Copy `to-be`, build 0.9.0 and 0.10.0, generate with several identity hashes and folders, compare | done |
| T2 | Find the cause (ties in `Item`/`Link` ordering) and rule out the other sources | done |
| T3 | `Item.compareTo`, `Link.compareTo` | done |
| T4 | `OrderTest`, `StableOrderTest` (fail before the fix), `DeterministicGenerationTest` | done |
| T5 | Manual: the guarantee | done |
| T6 | Re-run the experiment with the fix; `./mvnw verify`, node tests, `embed.sh --check`, `cargo test` | done |

## Acceptance criteria (the W-1 row)

- AC1. Names the cause, or shows the report is explained by the earlier version: both, above (version changes for the thousands of
  files; ties in the sort for the one run-to-run instability).
- AC2. A test generates twice with inputs declared in different orders and compares bytes: `DeterministicGenerationTest`.
- AC3. No file generated from a copy of the user's target workspace differs between two generations: with the fix, default vs
  `hashCode=2` vs `hashCode=4`, 3,411 files, 0 differing (before the fix: 8).
- AC4. `./mvnw verify` passes: see Verification.

## Review passes

Run inline (short document; no subagent dispatched).

- **KDMLLC.** K: two comparators extended, no new class; D: the order is defined in the two `compareTo` methods, once; M: tests
  cover items, links, the renderer, and the whole command; L: nothing sorted twice, nothing that is not a tie moved; U/C: the
  manual's sentences were checked against the experiment (folder, JVM identity hash, declaration order) and against the code.
- **C scan.** Claim "the stereotypes are unstable" (the report) checked against the code and four builds: false for every
  version tested. Claim "elements order cannot leak" checked against `toGraph` (`TreeMap`) and by the reversed-layout test.
  The first manual draft said "another Java or the native binary"; only the identity-hash variation was tested, so the text
  says "the JVM that runs the command" and the native binary is listed under what was not verified.
- **Open questions.** Which version the user ran: unanswerable from here, stated as an inference. None else.

## Verification

All with `JAVA_HOME=/home/tibo/.sdkman/candidates/java/25.0.4-tem` (shell is Java 21).

- Experiment table above (T1/T6), fix: `fix-default` vs `fix-h2` vs `fix-h4`: 0 differing files of 3,411.
- Tests added: before the fix `StableOrderTest` 2/2 and `OrderTest` 3/4 fail; after the fix 6/6 pass; `DeterministicGenerationTest`
  passes (it passes before the fix too, by construction, see D3).
- `npx prettier --check "src/**/*.java"`: all files formatted.
- The full suite, below.

### Results

- `./mvnw -o verify`: BUILD SUCCESS, 121 tests, 0 failures, 0 errors (integration tests are skipped by default, as in `pom.xml`).
- `node --test "src/test/javascript/**/*.test.js"`: 571 tests, 0 failures.
- `cargo test --manifest-path src/main/rust/viewpoint-kernel/Cargo.toml`: 69 passed, 0 failed.
- `src/main/rust/viewpoint-kernel/embed.sh --check`: the committed WebAssembly is the one the sources build (495,062 bytes).
- `npx prettier --check "src/**/*.java"`: clean.
- The `docs/bkg` register and `tooling/docs/check-backlog.py` do not exist in this repository: nothing to sweep.

## Findings

- **For the wave.** The cause of the reported reorder is, as far as the evidence reaches, the two format changes of 0.10.0 and
  0.11.0 (3,044 and 3,411 files on the user's target workspace), not an instability of the current build; the real run-to-run
  instability was the order of links that tie in the sort (8 files of 3,411), fixed here. Nothing in the editor or the kernel
  was involved, so W-2 and W-3 are not affected.
- **Not verified.** The native image (`-Dnative`): its identity hashes are another sequence again, which the permutation test
  stands for but no run exercised. Another JDK than 25. A real regeneration by the user.
- **Constraint for later runs.** A tie in a sort is an order the JVM chooses: any new `sorted()` over items or links must end on
  a total key. `Item` and `Link` keep their `@Value` equality (which includes the `Kind` enum) and must not be iterated in a
  `HashSet` order to write a file.
