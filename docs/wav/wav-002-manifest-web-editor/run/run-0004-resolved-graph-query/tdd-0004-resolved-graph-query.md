---
title: Resolved Graph Query Command
status: active
owner: run-0004
date: 2026-10-04
related:
  - docs/wav/wav-002-manifest-web-editor/wav-002-manifest-web-editor.md
  - docs/wav/wav-002-manifest-web-editor/wbc-002-manifest-web-editor.md
type: tdd
run: 0004
wave: 002
---

# Resolved Graph Query Command

# Summary

Add a new `query graph` subcommand (`GetGraphQuery`, registered in the
existing `QueryGroup`) that builds both element indexes exactly as
`views generate`/`query views` already do, forces resolution of every
relationship's `destination` through the same `ElementIndex.getElementByReference`
call those commands' viewpoint-building path already uses, and prints the
full set of elements and relationships as JSON. A dangling `destination` is
not caught or reported specially — it throws the same `ArchiCodeException`
`views generate` already throws today, uncaught, so the exit code is
non-zero exactly the way it already is. There is no PRD for this run
(infra-facing `TDD+pln` profile — see "PRD Traceability" below); scope comes
from wave 002's manifest entry `W-1` and its Phase P1 table row.

# Scope

In scope:

- One new Picocli subcommand, `query graph`, implemented as
  `GetGraphQuery.java`, registered as a `QueryGroup` subcommand alongside
  the existing `schemas`/`views` subcommands.
- Building `Workspace.appIndex` and `Workspace.techIndex` via the existing
  `WorkspaceFactory`/`ElementIndexFactory` path (no new parsing or indexing
  code).
- Forcing resolution of every relationship in both indexes by calling
  `ElementIndex.getElementByReference(relationship.getDestination())` for
  every relationship of every indexed element — the same method
  `MetaLinkFinderForEgress`/`MetaLinkFinderForIngress` already call during
  view building.
- Serializing the result as JSON: every element (with its reference and
  layer) and every relationship (with its source reference, layer, and the
  relationship's own fields, including `destination`).
- Letting `ArchiCodeException` (thrown by `getElementByReference` on a
  dangling destination) propagate uncaught, matching every other command's
  existing behavior (`GenerateViewsCommand`, `GetViewsQuery` do not catch it
  either).
- Unit/integration tests: a happy-path run against a fixture covering both
  layers, and a run against a fixture with one dangling `destination` that
  asserts the command throws.
- Manual verification against the real example workspace at `.custom/`
  (gitignored, not committed — see "Observability and Verification").

Out of scope (per wave non-goals and this phase's own table row):

- Any change to `views generate`'s rendering pipeline, `ElementIndex`,
  `ElementIndexFactory`, `MetaLinkFinder*`, or any other class in the
  existing resolution path — this run only *calls* that path, it does not
  modify it.
- A local HTTP server, a webapp, or anything from phases P2-P4 (wave's own
  dependency chain: `W-1 -> W-2 -> W-3 -> W-4`; those are separate, later
  runs).
- A graceful, collected report of *every* dangling reference in one pass
  (e.g. "found 3 broken destinations, here they are"). The wave's own exit
  evidence for this phase asks for the *same* failure behavior
  `views generate` already has (first dangling reference throws,
  non-zero exit) — not a new, friendlier validation mode. A collecting
  validator is a legitimate future idea but is not what this phase asks
  for, and building one here would be exactly the "second resolution path"
  the wave's focus line says not to write.
- Query/template/output-format flexibility (`-q`/`-t`/`-f`, as
  `GetViewsQuery` has). This command always prints JSON — see `DEC-2`.
- Documenting the new command in `README.md`. `query views` (already
  shipped, `GetViewsQuery`) isn't documented there either; adding docs for
  one query subcommand but not the other would be inconsistent, and the
  wave's own exit evidence for this phase doesn't ask for a README change
  (W-2's does, for the server's Docker invocation). Revisit when the wave
  documents the whole `query`/`editor` surface together, if ever.

# PRD Traceability

No PRD exists for this run (infra-facing `TDD+pln` profile). Requirements
are sourced directly from wave 002's manifest (`W-1`) and Phase P1 table row
in `docs/wav/wav-002-manifest-web-editor/wav-002-manifest-web-editor.md`:
focus ("one CLI command that answers 'what does this resolve to and what is
dangling'"), scope (new `query graph` subcommand, full `ElementIndex`,
force resolution the same way `views generate`/`query views` do, print
resolved elements + relationships as JSON), and exit evidence (valid JSON
against `.custom`; non-zero exit with the same kind of error against a
dangling destination). All three are addressed below under "Technical
Goals" and "Observability and Verification".

# Technical Goals

- `TG-1` — A `query graph` subcommand exists, registered in `QueryGroup`.
- `TG-2` — It builds both `appIndex` and `techIndex` via the existing
  `WorkspaceFactory` — no new parsing/indexing code.
- `TG-3` — It calls `ElementIndex.getElementByReference` for every
  relationship's destination in both indexes — the same method the
  existing viewpoint-building path (`MetaLinkFinderForEgress`/
  `MetaLinkFinderForIngress`) already calls — so a dangling destination
  fails the same way, from the same code, not a second check.
- `TG-4` — Output is valid JSON containing every indexed element (its
  reference, layer, and full element data) and every relationship (its
  source reference, layer, and relationship data) when every destination
  resolves.
- `TG-5` — When any destination is dangling, the command exits non-zero by
  letting `ArchiCodeException` propagate uncaught (no try/catch that turns
  it into a partial report or a swallowed warning).
- `TG-6` — Running the command against `.custom/` prints valid JSON for
  every one of its ~25 manifests' elements and relationships.
- `TG-7` — Running the command against a workspace with one deliberately
  broken `destination` exits non-zero via the propagated
  `ArchiCodeException`.

# Non-Goals

- Changing any existing command's behavior or output.
- A collecting/graceful dangling-reference report (see "Scope").
- Output-format flexibility beyond JSON.
- Server/webapp/AI-bridge work (phases P2-P4).
- `README.md` changes (see "Scope").

# Assumptions

- `ASM-1` — "The full `ElementIndex`" in the wave's focus line means both
  element indexes the workspace already builds (`appIndex` and `techIndex`)
  — there is only ever one `ElementIndex` *instance* per layer, never a
  single merged index across layers in the existing codebase
  (`Workspace.java`: two `@Builder.Default ElementIndex` fields). Validated
  by reading `Workspace.java`, `WorkspaceFactory.java`, and every existing
  command that iterates "all elements" (`GenerateViewsCommand`,
  `GetViewsQuery`) — all of them process `appIndex` and `techIndex`
  separately and merge the results, which this command mirrors.
- `ASM-2` — `.custom/`, the example workspace the wave's business case
  names, is real but gitignored (confirmed: `.gitignore` line 14 is
  `.custom`) and therefore absent from a fresh worktree checkout. It exists
  in the main repository checkout this worktree was branched from. Copied
  into this worktree for manual verification only (see prg Log) — this does
  not create or modify any tracked file.
- `ASM-3` — No Picocli `IExecutionExceptionHandler` is registered anywhere
  in this codebase (`grep` confirmed), so an uncaught `RuntimeException`
  from any command's `run()` already falls through to Picocli's default
  handler, which prints the exception and returns a non-zero exit code.
  `TG-5`/`TG-7` rely on this existing, unmodified behavior — not on any new
  exception handling this run adds.

# Constraints

- `CON-1` — Must reuse `ElementIndex.getElementByReference` as the
  resolution call — not a second lookup against `elementByReferenceIndex`
  or `searchElement` with different failure semantics. This is the wave's
  explicit instruction ("reusing that resolution path — do not write a
  second one").
- `CON-2` — Must not catch/wrap `ArchiCodeException` in a way that changes
  its propagation or message, matching `GenerateViewsCommand`'s own
  behavior for the identical failure.
- `CON-3` — No new runtime dependency; Jackson (already used by every other
  command for JSON) is sufficient for serialization.

# Current State

- `QueryGroup` (`src/main/java/io/morin/archicode/cli/QueryGroup.java`)
  currently lists two subcommands: `GetSchemasQuery` (`schemas`) and
  `GetViewsQuery` (`views`). Both live flat in
  `src/main/java/io/morin/archicode/cli/`, not in a `cli/query/` subpackage
  — see `DEC-1` for why this run follows that existing convention instead
  of the wave manifest's `likely_paths` guess.
- `ElementIndex` (`src/main/java/io/morin/archicode/workspace/ElementIndex.java`)
  exposes `listAllElementReferences(Predicate<Element>)` (returns every
  reference matching a predicate), `getElementByReference(String)` (throws
  `ArchiCodeException("unable to find the element %s", reference)` if
  absent), and public fields (`@FieldDefaults(level = AccessLevel.PUBLIC)`)
  — but every existing command goes through the two methods above rather
  than touching the fields directly, which this command follows.
- `Element` (`src/main/java/io/morin/archicode/resource/element/Element.java`)
  exposes `getRelationships(): Set<Relationship>`; `Relationship`
  (`.../application/Relationship.java`) exposes `getDestination(): String`
  plus `label`/`qualifiers`/`tags`. Neither carries Jackson type-discriminator
  annotations, so default Jackson POJO serialization (by runtime type) is
  sufficient — already proven by `GetSchemasQuery`'s schema generation and
  the project's own YAML round-tripping of the same classes.
- `src/test/workspaces/case_a.yaml` / `case_b.yaml` / `case_c.yaml` are the
  existing fixture workspaces: `case_a` is application-only with two valid
  relationships, `case_b` is technology-only with valid relationships (plus
  nested K8s-shaped elements), `case_c` is application-only with facet-based
  relationship filtering. None combines both layers in one file, and none
  has a dangling destination — this run adds both kinds of new fixture (see
  "Repository Impact").
- No `IExecutionExceptionHandler`, no `docs/CLAUDE.md` register, no
  `docs/bkg/`/`docs/adr/`/`docs/arc/`/`docs/dom/`/`docs/ana/` directories,
  and no `tooling/docs/check-backlog.py` exist in this repository (all
  confirmed by direct inspection) — Canonical Impact is "not applicable"
  and there is no backlog register to file into.

# Proposed Design

No existing component or module boundary changes; the diagram trigger
rules in `write-technical-design-document` (2+ component relationships
changing, or a non-trivial branching/async/failure flow) don't apply to
adding one new, self-contained read-only query command, so this section
stays textual.

`DEC-1 — Place the new command flat in cli/, not under a new cli/query/ subpackage`

- Decision: Add `GetGraphQuery.java` at
  `src/main/java/io/morin/archicode/cli/GetGraphQuery.java`, alongside
  `GetSchemasQuery.java`/`GetViewsQuery.java`, rather than creating
  `src/main/java/io/morin/archicode/cli/query/GetGraphQuery.java`.
- Rationale: wave 002's manifest declares `likely_paths` of
  `src/main/java/io/morin/archicode/cli/query/**` for `W-1`, but the actual
  repository convention (`QueryGroup`'s two existing subcommands) keeps
  every `query` subcommand flat in `cli/`. Splitting only the new command
  into its own subpackage would be the one inconsistent file in that
  package, for no behavioral reason. `likely_paths` exists for
  `complete-wave`'s same-batch path-overlap bookkeeping, which this wave's
  own Risks section states doesn't apply here anyway ("this wave is fully
  serial... the same-batch path-overlap check has nothing to check").
- Alternatives considered: creating the `cli/query/` subpackage as the
  manifest implies, and moving `GetSchemasQuery`/`GetViewsQuery` into it
  too for consistency — rejected as out of scope for this run (it would
  touch files with no behavioral reason to change, for a phase whose focus
  is "one CLI command"); creating the subpackage for only the new file —
  rejected as inconsistent with its two siblings for no benefit.
- Tradeoffs: this run's actual `likely_paths` footprint differs from the
  wave manifest's declared one. Named explicitly here and in the final
  report rather than silently diverging — zero collision risk since this
  phase has no concurrent sibling run.
- Linked requirement: wave 002 manifest `W-1` `likely_paths` (deviation);
  existing `QueryGroup`/`GetSchemasQuery`/`GetViewsQuery` convention.

`DEC-2 — Always print JSON; no -f/--output-format, -q/--query, or -t/--template options`

- Decision: `query graph` has no output-format, JSONPath-filter, or
  template options. It always serializes to JSON on stdout via
  `QueryOutputWriter`.
- Rationale: the wave's focus/scope/exit-evidence all say "JSON" and
  nothing else; `GetSchemasQuery` (the simpler of the two existing query
  commands) already establishes the precedent of a fixed-format command
  with no `-f` option. Adding YAML/TOML/custom-template support here would
  be unused, speculative surface — the wave's own business case names the
  consumer of this command's output as `W-2`'s server, which will shell out
  to it and parse JSON directly; a fixed, simple contract serves that
  better than configurability nobody asked for.
- Alternatives considered: mirroring `GetViewsQuery`'s full
  `-f`/`-q`/`-t` option set — rejected as unrequested scope (KISS); this
  can be added later, additively, if a real second consumer needs it
  without breaking the JSON-only default.
- Tradeoffs: none identified; this is the narrower, not the riskier, choice.
- Linked requirement: wave 002 `W-1` scope ("prints the resolved elements +
  relationships as JSON").

`DEC-3 — Resolve by walking every element's own relationships via getElementByReference, not by re-deriving MetaLinkFinderForEgress/Ingress's view-scoped traversal`

- Decision: For each layer's index, get every reference via
  `index.listAllElementReferences(element -> true)`, then for each
  reference's element, for each of its `getRelationships()`, call
  `index.getElementByReference(relationship.getDestination())` to force
  resolution.
- Rationale: `MetaLinkFinderForEgress`/`MetaLinkFinderForIngress` exist to
  answer a *view-scoped* question ("which links cross this view's
  boundary", filtering out descendant-to-descendant links via
  `isDescendantOf`) — that filtering is a rendering concern, not a graph-
  completeness concern. Calling `getElementByReference` directly, once per
  relationship, is the same resolution call those two finders make
  internally (`CON-1`), applied to *every* relationship with no view-scope
  filtering — which is exactly what "what does this resolve to and what is
  dangling" (the wave's focus line) asks for: the full graph, not one
  view's slice of it.
- Alternatives considered: calling `MetaLinkFinderForEgress.find(index,
  reference)` once per top-level reference and unioning the results —
  rejected, because its `isDescendantOf` filter would silently drop
  relationships whose destination is a descendant of the view root,
  undercounting the graph for no reason relevant to this command;
  reimplementing resolution via `searchElement`/`Optional` and inventing a
  new error message — rejected outright by `CON-1`.
- Tradeoffs: none identified; this is strictly a subset of
  `MetaLinkFinderForEgress`'s own internal call, applied more broadly and
  without its view-scoping filter.
- Linked requirement: wave 002 `W-1` scope ("forces resolution of every
  relationship the same way `views generate`/`query views` already do...
  reuse that resolution path — do not write a second one").

`DEC-4 — Output shape: parallel "elements" and "relationships" arrays, each tagged with layer`

- Decision: Top-level JSON object with two arrays:
  `elements: [{reference, layer, element}]` (one entry per indexed
  reference, `element` is the raw `Element` object) and
  `relationships: [{source, layer, relationship}]` (one entry per
  relationship, `relationship` is the raw `Relationship` object — whose own
  `destination` field is the resolved-and-confirmed-to-exist reference).
  Both nested static value classes (`ElementEntry`, `RelationshipEntry`) and
  the top-level `Graph` wrapper live inside `GetGraphQuery.java`, mirroring
  `GetSchemasQuery`'s nested `SchemaType` enum pattern rather than adding
  new top-level files for small, command-local shapes.
- Rationale: a flat `relationships` list with an explicit `source` is what
  a future graph-visualization consumer (`W-3`'s stated need: "see at least
  one cross-manifest relationship rendered as a graph edge") can iterate
  directly without re-deriving source/destination pairs from each element's
  nested list; keeping each element's own `relationships` field in its raw
  serialized form (not stripped) means the output is also directly useful
  for "browse this element's full manifest content" (`W-2`'s "raw manifest
  read" need) without a second query. The `layer` tag on both arrays is
  necessary because `appIndex`/`techIndex` are separate indexes with
  potentially overlapping reference strings in principle (different root
  types) — tagging avoids ambiguity.
- Alternatives considered: a single merged list keyed only by reference
  (rejected — loses the layer distinction `Workspace` itself maintains);
  stripping `relationships` out of each serialized `element` to avoid the
  duplication with the top-level `relationships` array (rejected — adds a
  custom partial-serialization path for one field, for no real benefit,
  since the duplication is harmless and avoiding it would cost more code
  than it saves).
- Tradeoffs: each relationship's data appears twice in the output (once
  nested in its source element, once in the flat list) — accepted, it's
  small, duplicated read-only data, not a correctness risk.
- Linked requirement: wave 002 `W-1` scope ("prints the resolved elements +
  relationships as JSON"); wbc-002 Vision (dependency-graph visualization
  as the eventual consumer).

# Repository Impact

`IMP-1 — New command: GetGraphQuery.java`
- Path(s): `src/main/java/io/morin/archicode/cli/GetGraphQuery.java`
- Change type: add
- Why impacted: `TG-1`-`TG-5`, `DEC-1`-`DEC-4`.
- Linked PRD IDs: n/a (no PRD; see wave manifest `W-1`).
- Risks / notes: new, additive file; registers itself in `QueryGroup`
  (`IMP-2`). No existing class's behavior changes.

`IMP-2 — QueryGroup.java: register the new subcommand`
- Path(s): `src/main/java/io/morin/archicode/cli/QueryGroup.java`
- Change type: modify
- Why impacted: `TG-1`.
- Linked PRD IDs: n/a.
- Risks / notes: one-line addition to the `subcommands` array; no other
  change to this file.

`IMP-3 — New test fixtures: a two-layer happy-path workspace and a dangling-reference workspace`
- Path(s): `src/test/workspaces/case_graph_ok.yaml`,
  `src/test/workspaces/case_graph_dangling.yaml`
- Change type: add
- Why impacted: `TG-6`, `TG-7` (as unit tests; `.custom/` itself is the
  manual/exit-evidence check, not a unit-test fixture, since it's
  gitignored and not guaranteed present in every checkout).
- Linked PRD IDs: n/a.
- Risks / notes: none; new, isolated fixture files following the existing
  `case_a`/`case_b`/`case_c` naming and shape conventions.

`IMP-4 — New test: GetGraphQueryTest.java`
- Path(s): `src/test/java/io/morin/archicode/cli/GetGraphQueryTest.java`
- Change type: add
- Why impacted: `TG-6`, `TG-7`.
- Linked PRD IDs: n/a.
- Risks / notes: follows `GetSchemasQueryTest`/`GetViewsQueryTest`'s
  `@QuarkusTest` + `@Inject` pattern.

# Canonical Impact

Not applicable — no canonical registers declared. This repository has no
`docs/CLAUDE.md` register declaration and no `arc`/`dom` directories (same
finding as run-0002 under wave 001,
`docs/wav/wav-001-quarkus-java-upgrade/run/run-0002-quarkus-platform-upgrade/`,
re-confirmed directly for this run).

# Data Model and Contracts

New, additive JSON output contract for `query graph` only:

```json
{
  "elements": [
    { "reference": "sol_a.sys_aa", "layer": "application", "element": { "id": "sys_aa" } }
  ],
  "relationships": [
    { "source": "per_a", "layer": "application", "relationship": { "destination": "sol_a.sys_aa" } }
  ]
}
```

(`layer` renders lowercase and empty/null fields are omitted because the
JSON mapper this command reuses — `MapperFactory.create(MapperFormat.JSON)`
— is already configured repository-wide with
`EnumFeature.WRITE_ENUMS_TO_LOWERCASE` and
`JsonInclude.Include.NON_EMPTY`; this command inherits both, it does not
configure its own mapper.)

No existing contract (manifest YAML schema, `View` JSON shape, PlantUML
output) changes.

# Interfaces and Behavior

`ArchiCode -> QueryGroup -> GetGraphQuery` (new leaf), parallel to the
existing `ArchiCode -> QueryGroup -> {GetSchemasQuery, GetViewsQuery}`. No
change to `ArchiCode`, `ViewsGroup`, or either existing `Query*` class.

# Flows and Processing Logic

```
workspace.yaml --> WorkspaceFactory.create(path)   [unchanged, existing]
                --> Workspace{appIndex, techIndex} [unchanged, existing]
                --> for each index in [appIndex, techIndex]:
                      for each reference in index.listAllElementReferences(e -> true):
                        element = index.getElementByReference(reference)        [existing resolution call]
                        emit ElementEntry(reference, layer, element)
                        for each relationship in element.getRelationships():
                          index.getElementByReference(relationship.getDestination())  [same existing call — throws ArchiCodeException if dangling, uncaught]
                          emit RelationshipEntry(reference, layer, relationship)
                --> JSON-serialize {elements, relationships}                      [new, this command only]
                --> QueryOutputWriter.write(...)                                  [existing, reused from GetSchemasQuery/GetViewsQuery]
```

No branching beyond "does every destination resolve" (success path emits
JSON; failure path is an uncaught exception, handled identically to every
other command today) — no diagram added per the diagram trigger rules.

# Reliability, Performance, and Scalability

Single pass over both indexes' elements and relationships, same asymptotic
cost as `views generate`'s own `renderBuiltinViews` traversal (which already
walks every element reference once per viewpoint). No new I/O, no new
external dependency, no persistence. `.custom/`'s ~25 manifests are a small
enough graph that this is a non-concern in practice; no performance target
is set because none was asked for.

# Security and Privacy

Read-only command against local files already readable by `views generate`/
`query schemas`/`query views` today; no new file-system write, no network
call, no credential handling. Out of scope per wave non-goals (this phase
has no server/auth surface at all — that's P2).

# Observability and Verification

Primary gate:

```bash
./mvnw verify
```

Must be green — exercises the new `GetGraphQueryTest` alongside every
existing test.

Exit-evidence-specific checks (run manually from the worktree root, JDK 25
active; `.custom/` must be present per `ASM-2` — it is gitignored and not
guaranteed to exist in every checkout, so copy it in first if missing):

```bash
./mvnw -q quarkus:dev -Dquarkus.args="query graph -w .custom/workspace.yaml" &
# or, simpler for a one-shot CLI check without the dev server:
java -jar target/quarkus-app/quarkus-run.jar query graph -w .custom/workspace.yaml | python3 -m json.tool > /dev/null && echo "valid JSON"
```

(Exact invocation settled during implementation once the built artifact's
actual run command is confirmed — see prg Log for what was actually run.)

- `TG-6`: the command's stdout against `.custom/workspace.yaml`, piped
  through a JSON validator, must parse without error and contain at least
  one entry per manifest-declared element/relationship.
- `TG-7`: the command's stdout against a fixture with one deliberately
  broken `destination`, run via the built CLI (not the unit-test harness,
  to also confirm the real process exit code), must exit non-zero; the
  unit test (`GetGraphQueryTest`) covers the same assertion via
  `assertThrows(ArchiCodeException.class, ...)` at the Java level.

Out of scope for this run's verification: the `native`/GraalVM profile
(wave 001 precedent: not touched unless a run specifically needs it; this
run doesn't).

# Deployment and Rollout

Code-only, additive CLI subcommand. No migration, no feature flag, no
backward-compatibility concern (new command, nothing depends on it yet).
Rollback is `git revert` of this run's commit — planning guidance only;
this TDD does not grant deployment permission.

# Risks and Tradeoffs

`RISK-1` — `DEC-1`'s file-placement deviation from the wave manifest's
declared `likely_paths` could look, out of context, like scope drift.
Mitigated by stating the reasoning here and in the final report; zero
actual collision risk since wave 002 is fully serial (its own Risks section
says so).

`RISK-2` — `DEC-4`'s duplication (each relationship appears both nested in
its source element and in the flat list) could confuse a consumer expecting
a single source of truth. Mitigated by documenting the shape explicitly
here; a future W-2/W-3 run can re-shape the contract if it proves awkward
in practice, since nothing yet depends on it.

# Open Questions

None outstanding. The two genuine design forks this run faced (`DEC-1`
file placement, `DEC-4` output shape) were resolved by direct inspection of
existing conventions and the wave's own stated downstream consumer (`W-2`/
`W-3`), not left open.

# Deferred Work

None identified. No `docs/bkg/` register exists in this repository (see
"Current State"), so there is no admission-tested backlog to file into even
if something had surfaced.

# File Placement and Frontmatter

Saved at
`docs/wav/wav-002-manifest-web-editor/run/run-0004-resolved-graph-query/tdd-0004-resolved-graph-query.md`,
per `manage-runs`' convention for a wave-owned run. Frontmatter carries
`type: tdd`, `run: 0004`, `wave: 002`, and `related:` links to the wave plan
and business case.
