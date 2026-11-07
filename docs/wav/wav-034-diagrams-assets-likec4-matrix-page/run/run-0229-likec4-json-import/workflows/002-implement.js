export const meta = { name: "run-0229-implement", description: "Generated from the run directory: pending tasks of the pln only; cost profile low-cost" }
// cost profile: low-cost
// overrides of declared tiers and profile ceilings (2):
//   - stage-11 and final-check: the run holds a sensitive task, both take the elevated pair sonnet/high
//   - task-001 declared standard: verifier raised to sonnet/high (human_review before; autonomy review_before); executor kept at sonnet/medium; no human gate
// autonomy override: none
const PLAN = {
 "cost_profile": "low-cost",
 "ceiling": {
  "models": [
   "haiku",
   "sonnet"
  ],
  "efforts": [
   "low",
   "medium",
   "high"
  ]
 },
 "repo_root": "/home/tibo/git-perso/archicode",
 "agents": {
  "bookkeeping": {
   "model": "haiku",
   "effort": "high",
   "class": "K0"
  },
  "create": {
   "model": "sonnet",
   "effort": "low",
   "class": "K1"
  },
  "run-agent": {
   "model": "sonnet",
   "effort": "high",
   "class": "K5"
  },
  "verify-task": {
   "model": "sonnet",
   "effort": "medium",
   "class": "K2"
  },
  "verify-run": {
   "model": "sonnet",
   "effort": "high",
   "class": "K2"
  },
  "gate": {
   "model": "sonnet",
   "effort": "medium",
   "class": "K2"
  }
 },
 "overrides": [
  "stage-11 and final-check: the run holds a sensitive task, both take the elevated pair sonnet/high",
  "task-001 declared standard: verifier raised to sonnet/high (human_review before; autonomy review_before); executor kept at sonnet/medium; no human gate"
 ],
 "sensitivity": [
  {
   "task": "task-001",
   "declared_tier": "standard",
   "risk": "medium",
   "human_review": "before",
   "autonomy": "review_before",
   "verifier": true,
   "gate": false,
   "reasons": [
    "human_review before",
    "autonomy review_before"
   ]
  }
 ],
 "run_sensitive": true,
 "gated": [],
 "autonomy_override": "",
 "kind": "implement",
 "stage11": {
  "model": "sonnet",
  "effort": "high",
  "class": "K5"
 },
 "run": "0229",
 "slug": "likec4-json-import",
 "wave": "034",
 "profile": "TDD+pln",
 "run_dir": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import",
 "status_file": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/run-0229-likec4-json-import.md",
 "pln_file": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/pln-0229-likec4-json-import.md",
 "prg_file": "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/prg-0229-likec4-json-import.md",
 "skill_file": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/SKILL.md",
 "check_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py",
 "hard": false,
 "stand_in": false,
 "stand_in_command": "",
 "done": [],
 "pending": [
  "task-001",
  "task-002",
  "task-003",
  "task-004",
  "task-005",
  "task-006",
  "task-009",
  "task-007",
  "task-008",
  "task-010"
 ],
 "levels": [
  [
   [
    {
     "id": "task-001",
     "title": "Sample and facts: generate the cloud-system export with the vendor tool in a scratch folder, trim its views, add the licence and the provenance, record the kinds, the nesting pairs, the --map options and the literal counts",
     "objective": "In a scratch folder outside the repository run npm install --ignore-scripts likec4@1.60.0 (state the package, version and source in the prg line before doing so; re-read the registry for a newer version per Q-3), clone github.com/likec4/likec4 at the tag v1.60.0 (record the 40-hex commit), run likec4 export json --help and then likec4 export json --skip-layout --project cloud-system on examples/cloud-system, empty the views key to {} with jq, copy the root LICENSE of the repository at that commit to LICENSE-MIT.txt and write PROVENANCE.md (repository URL, example path, exact tool version, exact command, commit SHA, date, size, the sentence that the only change is the removal of views). Then read the file: record the kinds of elements, the (parent kind, child kind) pairs from the dotted ids, whether description is a text or an object, whether imports is empty, whether elements and relations are objects; choose the --map options that make the sample load under Nesting; fix the DEC-1 sentence to what the tool printed; grep src/test and the docs for literal counts of shipped manifests or workspaces. Append a Facts block to the run prg. Nothing the tool installs is committed.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "high"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": true,
      "gate": false,
      "reasons": [
       "human_review before",
       "autonomy review_before"
      ]
     },
     "gate": false,
     "risk": "medium",
     "human_review": "before",
     "acceptance_criteria": [
      "src/test/resources/likec4/ holds cloud-system.json, LICENSE-MIT.txt and PROVENANCE.md",
      "PROVENANCE.md contains github.com/likec4/likec4, the tool version, the command and a 40-hex SHA",
      "jq reads elements from the sample, its views are {} and the element count is recorded in the Facts block",
      "the Facts block lists the kinds, the nesting pairs, the --map options chosen and the literal counts found",
      "no file of the tool is added under the repository except the three files above"
     ],
     "verification": [
      "ls src/test/resources/likec4/",
      "grep -E '[0-9a-f]{40}' src/test/resources/likec4/PROVENANCE.md",
      "grep -q 'github.com/likec4/likec4' src/test/resources/likec4/PROVENANCE.md",
      "jq '.elements | length' src/test/resources/likec4/cloud-system.json",
      "jq -e '.views == {}' src/test/resources/likec4/cloud-system.json",
      "grep -q 'MIT License' src/test/resources/likec4/LICENSE-MIT.txt"
     ],
     "likely_files": [
      "src/test/resources/likec4/cloud-system.json",
      "src/test/resources/likec4/LICENSE-MIT.txt",
      "src/test/resources/likec4/PROVENANCE.md",
      "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/prg-0229-likec4-json-import.md"
     ],
     "tdd_excerpts": [
      "REQ-1",
      "REQ-7",
      "DEC-1",
      "DEC-4",
      "DEC-9",
      "IMP-8",
      "ASM-1",
      "ASM-3",
      "ASM-4",
      "Q-2",
      "Q-3",
      "Q-5",
      "Q-6",
      "RISK-1",
      "RISK-2",
      "RISK-5"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "npm or the registry is not reachable, or likec4 export json cannot run in the agent session (Q-5): stop, log the reason in the prg and leave the importer waiting; do not write a sample by hand",
      "the export is not one object with an elements object, or elements is an array (ASM-1): stop and log the shape found, the reader design needs a decision",
      "no (parent kind, child kind) mapping of the sample can load under Nesting (RISK-2): stop with the finding; Nesting is not weakened and the sample is edited only by removing views",
      "the example folder holds a licence other than the root MIT one at the commit (ASM-4)"
     ],
     "depends_on": []
    },
    {
     "id": "task-002",
     "title": "Shared part moved: ImportIds, ImportSupport, Planned and WorkspaceFile, called by the Structurizr importer, its output unchanged",
     "objective": "Move, without changing a byte of the Structurizr output: the id rule (slug, rewritesCharacter, hasAlphanumeric) and the suffix loop into ImportIds with assign(bases, rewritten) returning the ids and the rewritten flags; WORKSPACE_FILE, parse, reason, serialize and add into ImportSupport; the nested records Planned and WorkspaceFile into top-level public records of the package with the same fields. StructurizrMapper and StructurizrImportService call them and keep their own fallback id. Grep first that no caller outside importer/ and its tests reads the nested records. Add ImportIdsTest (camel case lowercased, odd characters, a segment such as .. or x/y, a fallback, a collision suffix that skips a sibling already named x_2) and change the one reference in StructurizrMapperTest. Do not edit anything under src/test/resources/structurizr.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "after",
     "acceptance_criteria": [
      "the four shared types exist and StructurizrMapper and StructurizrImportService call them",
      "ImportIdsTest, the Structurizr tests and ImportFilesTest pass",
      "git diff --stat -- src/test/resources/structurizr prints nothing",
      "the only edit of an existing test is the one reference of StructurizrMapperTest"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='ImportIdsTest,Structurizr*Test,ImportFilesTest'",
      "git diff --stat -- src/test/resources/structurizr",
      "grep -rn 'StructurizrMapper.Planned\\|StructurizrMapper.WorkspaceFile' src | wc -l"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/importer/ImportIds.java",
      "src/main/java/io/morin/archicode/importer/ImportSupport.java",
      "src/main/java/io/morin/archicode/importer/Planned.java",
      "src/main/java/io/morin/archicode/importer/WorkspaceFile.java",
      "src/main/java/io/morin/archicode/importer/StructurizrMapper.java",
      "src/main/java/io/morin/archicode/importer/StructurizrImportService.java",
      "src/test/java/io/morin/archicode/importer/ImportIdsTest.java",
      "src/test/java/io/morin/archicode/importer/StructurizrMapperTest.java"
     ],
     "tdd_excerpts": [
      "REQ-5",
      "REQ-9",
      "TG-4",
      "DEC-3",
      "IMP-2",
      "IMP-13",
      "CTR-4",
      "CON-8",
      "RISK-3"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "a Structurizr golden or test needs an edit to pass: stop, the move changed the output (CON-8); fix the move, never the golden",
      "a caller of the nested records outside importer/ and its tests is found: log it and update that caller only if it is a one-line rename",
      "the existing tests of the first importer are red on the starting repository: record it and do not fix it"
     ],
     "depends_on": []
    }
   ]
  ],
  [
   [
    {
     "id": "task-003",
     "title": "Reader and model: LikeC4 JSON to LikeC4Model and counted Dropped, project selection and the sentences of the refusals",
     "objective": "Test first, then write LikeC4Model (records Element, Link and Dropped) and a pure LikeC4Reader on a Jackson JsonNode. It reads an object, or an array selected by --project (DEC-2: one-object array read as that object, several without --project refused with the ids, a project not held refused, an empty array or a scalar refused), keeps the elements with id, kind, title, description (a text, or an object with txt or md, or summary), technology and tags, keeps the relations with their ends as model references, and counts the parts present and not carried in the order of DEC-8 (views, deployment elements, deployment relationships, styles, metadata, links, globals, imports, diffs, manual layouts). Refusals: no elements object, an element with no kind (CTR-1; the reader takes a parsed JsonNode, so the missing file, the folder and the non-JSON cases are the service's, task-005). Cases on small inline JSON, then on the sample: the number of elements read equals the count read from the file by the test, not a literal. Each refusal is one error: line with no stack trace.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "LikeC4ReaderTest passes",
      "the reader opens no file and imports nothing from cli/",
      "the number of elements read from the sample equals the count read from the file",
      "every refusal sentence of DEC-2 and CTR-1 is asserted"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=LikeC4ReaderTest"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/importer/LikeC4Model.java",
      "src/main/java/io/morin/archicode/importer/LikeC4Reader.java",
      "src/test/java/io/morin/archicode/importer/LikeC4ReaderTest.java"
     ],
     "tdd_excerpts": [
      "REQ-2",
      "REQ-3",
      "REQ-6",
      "TG-1",
      "DEC-1",
      "DEC-2",
      "DEC-8",
      "CTR-1",
      "IF-2",
      "IMP-1",
      "IMP-4",
      "ASM-1",
      "ASM-2"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the sample shows a shape other than ASM-1 (task-001 Facts block): stop and log it before coding the reader",
      "a refusal sentence of the TDD cannot be produced with one error: line: log it as a finding"
     ],
     "depends_on": [
      "task-001"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-004",
     "title": "Mapper: kinds with --map, nesting check, ids and references, relationships, Planned manifests and the workspace file",
     "objective": "Test first, then write the pure LikeC4Mapper: the model and the kind mapping in, Mapped out (Planned manifests, workspace file, element and relationship counts, dropped counts, rewrites). Defaults actor to person, system, container and component; --map overrides; errors in the order of DEC-4 (malformed, duplicated or out-of-list --map, a --map for an absent kind, kinds with no target listed together in the order of first use); nesting checked on the whole model with the sentence of DEC-5, reading the rule from Nesting; a parent absent from the file refused (CTR-1); ids from the last segment through ImportIds with the fallback kind_n, the tags likec4.id and likec4.kind, name from the title; header.kind is the full ManifestKind id (ManifestKind.getId()); relationships on the source with label, qualifiers (technology then the LikeC4 tags) and tags, resolved in a map built first, ends not imported dropped and counted, bidirectional written once and counted; workspace name from project.title, project.name, projectId, else the file name. Cases include camel case, a collision, a segment .., an unmapped kind, a --map for an absent kind, a bad nesting, a missing parent, and the load of a mapped sample under the loader.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "LikeC4MapperTest passes",
      "a mapped model loads under the loader in a test with no mistake",
      "every error sentence of DEC-4 and DEC-5 is asserted as one error: line",
      "a file name built from an id holds only [a-z0-9_.-]"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='LikeC4MapperTest,ImportIdsTest'"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/importer/LikeC4Mapper.java",
      "src/test/java/io/morin/archicode/importer/LikeC4MapperTest.java"
     ],
     "tdd_excerpts": [
      "REQ-2",
      "REQ-3",
      "REQ-6",
      "TG-2",
      "TG-3",
      "DEC-3",
      "DEC-4",
      "DEC-5",
      "DEC-6",
      "DEC-7",
      "DEC-10",
      "CTR-2",
      "ASM-6",
      "IMP-1",
      "IMP-4",
      "RISK-6"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "Nesting cannot be read without a change under resource/ (DEC-5): choose the other of the two reads the TDD names, and if neither works stop and log it",
      "the loader refuses what the mapper writes: fix the mapper, never the loader"
     ],
     "depends_on": [
      "task-002",
      "task-003"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-005",
     "title": "Service, command, group, report and native reflection",
     "objective": "Write LikeC4ImportService (refuse a .c4 name with the DEC-1 sentence fixed by task-001, refuse a name that is not .json, refuse an input that is a folder or a missing file, check the output folder, parse, read, map, serialize through ImportSupport, commit through ImportFiles, then queue the warnings in the order of DEC-8 only after the move succeeded) and ImportLikeC4Command (name likec4, <model.json>, -o/--output required, repeatable --map as a Picocli Map<String,String>, --project; prints imported <n> elements and <m> relationships into <folder>; loads no workspace). Add the command to ImportGroup and the entry of the command to reflect-config.json. Service tests on the fake ImportFiles of run 0224: a refused folder is unchanged, a failed write leaves nothing and queues no warning, the report lists every dropped part present in a copy of the sample with a views entry added, and the .c4, non-JSON, unmapped kind, array and --project cases.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "after",
     "acceptance_criteria": [
      "LikeC4ImportServiceTest and NativeReflectionConfigTest pass",
      "ImportGroup lists both commands",
      "reflect-config.json names cli.ImportLikeC4Command",
      "every refusal is one error: line, exit 1, nothing written; warnings are queued only on success"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='LikeC4ImportServiceTest,NativeReflectionConfigTest,Structurizr*Test'",
      "grep -c LikeC4 src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/importer/LikeC4ImportService.java",
      "src/main/java/io/morin/archicode/cli/ImportLikeC4Command.java",
      "src/main/java/io/morin/archicode/cli/ImportGroup.java",
      "src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json",
      "src/test/java/io/morin/archicode/importer/LikeC4ImportServiceTest.java"
     ],
     "tdd_excerpts": [
      "REQ-2",
      "REQ-3",
      "REQ-4",
      "REQ-6",
      "DEC-1",
      "DEC-7",
      "DEC-8",
      "CTR-3",
      "IF-1",
      "IF-2",
      "FLOW-1",
      "IMP-1",
      "IMP-3",
      "IMP-7",
      "CON-2",
      "CON-3",
      "RISK-4"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "a refusal prints a stack trace or two lines: fix the command, one error: line is the contract (CON-3)",
      "Picocli cannot bind a repeatable Map option in the native runner: record it as RISK-4 for the Native job of the pull request, do not change the option form"
     ],
     "depends_on": [
      "task-004"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-006",
     "title": "Golden output: the workspace written from the sample, the report, the golden test, and the shipped-corpus counts it moves",
     "objective": "Write LikeC4GoldenTest as StructurizrGoldenTest is (import the sample with the --map options chosen by task-001 into a temp folder, compare byte for byte with src/test/resources/likec4/expected/, regenerate with -Darchicode.golden.regenerate=true), generate and read the golden, write expected-report.txt, and update every literal count of shipped manifests or workspaces that task-001 found, in tests, in src/test/CLAUDE.md only for such a count (the notes of the second importer are task-008). Run the corpus tests, the shipped-files tests of Java and node, and MistakeSweepTest; handle a trace as the escalation says. The golden is a workspace loaded by ShippedFilesTest and shipped-files.test.js with no entry of exceptions.json.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "LikeC4GoldenTest passes and the output is byte for byte the golden",
      "ShippedFilesTest, the corpus tests and MistakeSweepTest pass with no entry of exceptions.json for the golden",
      "npm run test:unit passes",
      "the sum rule of DEC-10 holds on the sample: the written elements equal the elements read from the file"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='LikeC4GoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'",
      "npm run test:unit"
     ],
     "likely_files": [
      "src/test/resources/likec4/expected/",
      "src/test/resources/likec4/expected-report.txt",
      "src/test/java/io/morin/archicode/importer/LikeC4GoldenTest.java",
      "src/test/resources/known-traces.json"
     ],
     "tdd_excerpts": [
      "REQ-2",
      "REQ-4",
      "TG-5",
      "DEC-9",
      "DEC-10",
      "IMP-5",
      "CON-4",
      "RISK-5"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "MistakeSweepTest ends in a stack trace on header.parent of an imported element: if the cause is the importer, fix the mapper; if not, add a reasoned entry of known-traces.json",
      "a literal count outside the list of task-001 moves: update it and say so in the prg"
     ],
     "depends_on": [
      "task-005"
     ]
    },
    {
     "id": "task-009",
     "title": "The model of ArchiCode and its sample bundle",
     "objective": "Read docs/architecture/manifests/archicode.yaml as it is in the working tree (it has uncommitted edits of another run) and add only the element import_likec4 (tags.path of ImportGroup.java and ImportLikeC4Command.java, its relationship to importer) and the description of importer, which no longer says only Structurizr. Update impact-questions.json only if a question changes. Run npm run sample:build last so that the bundle is the one of the folder.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "low",
     "human_review": "none",
     "acceptance_criteria": [
      "ArchitectureDriftTest and ArchitectureImpactTest pass",
      "every tags.path of the new element exists",
      "npm run sample:build leaves the bundle equal to the folder (a second run changes nothing)",
      "lines of other runs in the two files are unchanged"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='ArchitectureDriftTest,ArchitectureImpactTest'",
      "npm run sample:build && git diff --stat -- src/main/resources/editor-webapp/samples/archicode.yaml",
      "grep -c 'import_likec4' docs/architecture/manifests/archicode.yaml"
     ],
     "likely_files": [
      "docs/architecture/manifests/archicode.yaml",
      "src/main/resources/editor-webapp/samples/archicode.yaml"
     ],
     "tdd_excerpts": [
      "REQ-5",
      "REQ-8",
      "IMP-12",
      "RISK-8"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the architecture file or its sample carries uncommitted edits from another run (RISK-8): touch only the lines for the importer and keep the others as they are",
      "an impact question changes: change the model and the question in the same task"
     ],
     "depends_on": [
      "task-005"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-007",
     "title": "Integration test on the packaged application and the editor test on the golden",
     "objective": "Write LikeC4ImportIT on the pattern of StructurizrImportIT: import the sample into an empty folder with the --map options of task-001 (exit 0, one warning line per dropped part present, no stack trace), query graph on the output has as many elements as the sample (read by the test from the file), a .c4 input, a non-empty folder, a sample with an unmapped kind and an array of two projects are each one error: line with exit 1 and the folder unchanged, and --map for each listed kind exits 0. Write likec4-import-workspace.test.js on the pattern of structurizr-import-workspace.test.js: the editor opens src/test/resources/likec4/expected/ with no mistake, no duplicate reference and as many elements as the sample.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "none",
     "acceptance_criteria": [
      "LikeC4ImportIT passes against the packaged jar",
      "the node test passes",
      "git diff --stat -- src/main/editor prints nothing for the run"
     ],
     "verification": [
      "node --test src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=LikeC4ImportIT"
     ],
     "likely_files": [
      "src/test/java/io/morin/archicode/it/LikeC4ImportIT.java",
      "src/test/javascript/viewpoint-kernel/likec4-import-workspace.test.js"
     ],
     "tdd_excerpts": [
      "REQ-2",
      "REQ-3",
      "REQ-4",
      "IMP-6",
      "IF-3",
      "RISK-2",
      "RISK-4"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the packaged jar cannot be built in the session: run the node test, record the IT as not run and let task-010 say it",
      "the editor refuses the golden: fix the mapper, never the editor (no change under src/main/editor)"
     ],
     "depends_on": [
      "task-006"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-008",
     "title": "Help and guide goldens, the manual and the notes for the next session",
     "objective": "Regenerate the guide golden and update the expectations of HelpIT (only the new command may differ); add the section [[import-likec4]] after [[import-structurizr]] in src/doc/README.adoc (how to export the JSON with likec4 export json, what is read, the default mapping and --map, the ids and the tags likec4.id and likec4.kind, what is dropped, the refusals), name it in the hand-written line of import, and make the generated listing hold the command (CommandReferenceTest); add the anchor to the manual tests if needed; write a short section for the second importer and the shared classes in src/main/java/io/morin/archicode/CLAUDE.md and a paragraph on the LikeC4 import golden in src/test/CLAUDE.md. The notes state what is true now: no wave, run or issue ids, no dates. Manual [source] blocks are read by tests: run them.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "low",
     "human_review": "none",
     "acceptance_criteria": [
      "GuideTest, CommandReferenceTest and HelpIT pass",
      "the manual has the section import-likec4 and names the command in the line of import",
      "the two CLAUDE.md files have no wave, run or issue id"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='GuideTest,CommandReferenceTest,HelpIT'",
      "npm run test:unit",
      "grep -c 'import-likec4' src/doc/README.adoc",
      "grep -c 'import likec4' src/test/resources/guide/golden.md"
     ],
     "likely_files": [
      "src/test/resources/guide/golden.md",
      "src/test/java/io/morin/archicode/it/HelpIT.java",
      "src/doc/README.adoc",
      "src/main/java/io/morin/archicode/CLAUDE.md",
      "src/test/CLAUDE.md"
     ],
     "tdd_excerpts": [
      "REQ-5",
      "REQ-8",
      "CON-7",
      "CON-9",
      "IMP-9",
      "IMP-10",
      "IMP-11",
      "RISK-7"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "the regenerated guide golden differs by more than the new command: stop and read the diff, only the new command may differ",
      "a test reads a literal of the manual that the new section moves: update it and say so in the prg"
     ],
     "depends_on": [
      "task-007"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-010",
     "title": "Final check: the gates of the run on the packaged application and the whole suite",
     "objective": "On the packaged application run by hand the gate commands: import likec4 on the sample with an empty output folder (exit 0, one warning per dropped part present), query graph on the output compared with jq \".elements|length\" of the sample, a .c4 input, a non-empty folder and an unmapped kind (each one error: line, exit 1), and the --map form for the listed kinds. Run PMD, verify with the integration tests, byte-identity, the node tests, coverage, format, lint, editor:build and sample:build with git status --short unchanged by the last two. Record each command and its result in the run prg and say that the native image was not proved on the branch. Fix a failure only when its cause is in the files of this run.",
     "tier": "standard",
     "model": "sonnet",
     "effort": "medium",
     "agent_type": "general-purpose",
     "verify": {
      "model": "sonnet",
      "effort": "medium"
     },
     "retry": {
      "model": "sonnet",
      "effort": "high"
     },
     "sensitivity": {
      "verifier": false,
      "gate": false,
      "reasons": []
     },
     "gate": false,
     "risk": "medium",
     "human_review": "after",
     "acceptance_criteria": [
      "every gate command exits 0 or the exception is recorded with its cause",
      "git diff --stat of the exceptions file, src/main/rust, src/main/wasm and src/test/resources/structurizr prints nothing for the run",
      "the Facts and gate results are in the run prg"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false",
      "scripts/byte-identity.sh",
      "npm run test:unit",
      "npm run test:coverage",
      "npm run format:check",
      "npm run lint",
      "npm run editor:build && npm run sample:build && git status --short",
      "git diff --stat -- scripts/byte-identity-exceptions.txt src/main/rust src/main/wasm src/test/resources/structurizr"
     ],
     "likely_files": [
      "docs/wav/wav-034-diagrams-assets-likec4-matrix-page/run/run-0229-likec4-json-import/prg-0229-likec4-json-import.md"
     ],
     "tdd_excerpts": [
      "REQ-2",
      "REQ-3",
      "REQ-4",
      "REQ-5",
      "DEC-10",
      "RISK-3",
      "RISK-4",
      "CON-8"
     ],
     "prd_excerpts": [
      "none: there is no PRD (profile TDD+pln); the REQ-n of the TDD are listed with the TDD items"
     ],
     "escalation_triggers": [
      "byte-identity.sh needs a new exception or an existing command changes its output: stop and log, the importer must not change another command",
      "a command fails for a reason outside the importer (a base already red): record it and do not fix it",
      "npm run editor:build or sample:build leaves git status changed by a file of the run: fix the source and rerun"
     ],
     "depends_on": [
      "task-008",
      "task-009"
     ]
    }
   ]
  ]
 ],
 "blocked": [],
 "commit_tasks": true,
 "generator_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-wave/scripts/complete_wave.py",
 "run_completed": false
}
// ---- run implement engine (shared text: generated implement files and the shipped `run-implement` workflow) ----
// Every agent below is a leaf: it has neither the Workflow tool nor the Agent tool, so a task agent
// works its task inline and nothing here asks any agent to dispatch. Per lane of pending tasks:
// implementation agent (model and effort of the task's tier) -> independent verification agent ->
// (on failure, ONE escalation: a retry one rung up, then verified again) -> a marker agent writes the
// task's done status and results line into the pln. A task or check that needs a commit or a clean tree (nobody commits here)
// is reported unmeetable and stops the workflow at once with state awaiting-commit (no retry, which could not help; the task stays pending). After the last task: Stage 11 and an independent
// final check. A second failure of a task stops the workflow with state blocked.
// Model and effort of every agent come from PLAN (the cost profile `PLAN.cost_profile` applied to the need table by the
// generator, complete-wave/references/profiles.json); this engine names none of its own except the stand-in test agents.
const AG = PLAN.agents
const opt = (key, o) => ({ ...o, model: AG[key].model, effort: AG[key].effort })
const ROOT = `Working directory: ${PLAN.repo_root} (absolute path of the repository root). Every repository-relative path below is relative to it: cd there first, and never search the disk for a path that is named below.\n`
const STAND_IN_NOTE = PLAN.stand_in ? ' (STAND-IN TEST: do only what is asked, nothing else)' : ''
const IMPL_SCHEMA = {
  type: 'object',
  properties: { task: { type: 'string' }, done: { type: 'boolean' }, summary: { type: 'string' }, files_touched: { type: 'array', items: { type: 'string' } }, blocker: { type: 'string' }, unmeetable: { type: 'boolean' }, not_started: { type: 'boolean' } },
  required: ['task', 'done', 'summary'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    task: { type: 'string' }, passed: { type: 'boolean' },
    checks: { type: 'array', items: { type: 'object', properties: { check: { type: 'string' }, ran: { type: 'string' }, result: { type: 'string' } }, required: ['check', 'ran', 'result'] } },
    failing_output: { type: 'string' }, unmeetable: { type: 'boolean' }, unmeetable_kind: { type: 'string', enum: ['commit', 'contradiction'] }, outside_likely_files: { type: 'array', items: { type: 'string' } },
    changed_files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, outside: { type: 'boolean' } }, required: ['path', 'outside'] } },
  },
  required: ['task', 'passed', 'checks'],
}
const FINAL_SCHEMA = {
  type: 'object',
  properties: { run_status: { type: 'string' }, pln_status: { type: 'string' }, check_run_exit: { type: 'integer' }, check_run_named: { type: 'string' }, unmet: { type: 'array', items: { type: 'string' } }, not_verified: { type: 'string' } },
  required: ['run_status', 'pln_status', 'check_run_exit'],
}
const COMMIT_SCHEMA = {
  type: 'object',
  properties: { committed: { type: 'boolean' }, commit: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } },
  required: ['committed'],
}
const PRG = PLAN.prg_file
const WAVE_DOCS = PLAN.run_dir.includes('/run/') ? PLAN.run_dir.replace(/\/run\/[^/]+\/?$/, '') + '/*.md' : '(none)'
const PLN = PLAN.pln_file
// numbered progress groups (2.22.0): every agent is created under a phase whose title starts with a zero-padded number, so a UI that sorts groups
// alphabetically shows them in execution order. `PH` is the default group; a call that runs in parallel with others passes its own.
const pad = (n, w = 2) => String(n).padStart(w, '0')
// one group per task, numbered in execution order (levels, then lanes): 01 · task-001 · title; the agents of a task (task-, verify-, retry-, reverify-,
// commit-, and the lane marker, which carries the first task of its lane) are found by the task id their label ends with
const ALLTASKS = (PLAN.levels || []).flatMap((lv) => lv.flatMap((ln) => ln))
const NW = Math.max(2, String(ALLTASKS.length + 2).length)
const TPH = {}
ALLTASKS.forEach((t, i) => { TPH[t.id] = `${pad(i + 1, NW)} · ${t.id} · ${String(t.title || '').slice(0, 48)}` })
let PH = `${pad(0, NW)} · setup`
const ag = (prompt, o, ph) => {
  const hit = ph === undefined && o && o.label ? Object.keys(TPH).find((id) => o.label.endsWith('-' + id)) : null
  const p = ph !== undefined ? ph : hit ? TPH[hit] : PH
  return agent(prompt, p ? { ...o, phase: p } : o)
}
const results = []
const findings = []
// executor, verifier and retry pair of every task, and the Stage 11 pair, are resolved by the generator (profiles.py):
// the Delegation Policy's escalation on failure (one rung up; at the top of its range the Policy says inline in the session,
// which a leaf cannot do, so the nearest honest rung is the profile's strongest tier at high) is computed there.

function entryPrompt(text) {
  return (ROOT +
  `Append one dated line to the Log section of ${PRG} (use today's date from \`date +%F\`; add it after the last Log line, before "## Findings"; if the file does not exist create it with the frontmatter type: prg, run: ${PLAN.run}, status: active${PLAN.wave ? ', wave: ' + PLAN.wave : ''} and the headings "# Progress Log", "## Log", "## Findings", "## Lessons Learnt"). ` +
  `Write exactly this text after "- <date>: " and change nothing else in the file:\n\n${text}\n\nReturn the word done.${STAND_IN_NOTE}`)
}
const stop = async (reason, detail) => {
  await ag(entryPrompt(`implement workflow stopped, state blocked: ${reason} ` + JSON.stringify(detail)), opt('bookkeeping', { label: 'prg-escalation' }))
  return { state: 'blocked', reason, detail, results, findings }
}
// an agent that did not start: it says so (not_started), or it reports done false having touched no file and without calling the task unmeetable.
// The harness relays the launching session's last chat message ahead of the brief and ranks it above it (archicode wave 025), so such an agent
// may refuse without setting the flag; a retry of the same brief would meet the same refusal, so it goes to the operator, not to the escalation.
const didNotStart = (x) => !!x && !x.unmeetable && (!!x.not_started || (x.done === false && !(x.files_touched && x.files_touched.length)))
const list = (xs) => (xs && xs.length ? xs.map((x) => `  - ${x}`).join('\n') : '  (none stated)')

// options of a task's implementation agent: the pair the generator resolved for the task (executor or retry)
const implOpts = (t, label, pair) => ({ label, schema: IMPL_SCHEMA, agentType: t.agent_type, model: pair.model, effort: pair.effort })

const taskBrief = (t, retryOf) => ROOT +
  `Implement task ${t.id} of run ${PLAN.run} (${PLAN.slug}${PLAN.wave ? ', wave ' + PLAN.wave : ''}): ${t.title}\n` +
  `Run directory ${PLAN.run_dir}; plan ${PLN}. Objective: ${t.objective}\n` +
  `Acceptance criteria:\n${list(t.acceptance_criteria)}\nVerification the task states:\n${list(t.verification)}\n` +
  `Likely files:\n${list(t.likely_files)}\nTDD excerpts:\n${list(t.tdd_excerpts)}\nPRD excerpts:\n${list(t.prd_excerpts)}\nEscalation triggers:\n${list(t.escalation_triggers)}\n` +
  `Work this task only; other tasks have their own agents. You are a leaf agent with no Agent tool and no Workflow tool. Run the task's own verification before you answer, and do not edit the pln's statuses (a marker step does, after an independent check). ` +
  `Stay inside the repository and its safety rules (no commit, no destructive git, no secrets). Never report done for something you have not checked.` +
  `\nWrite nothing into any CLAUDE.md except a rule that is true today, in one line: no wave, run, issue, question or decision id, no date, no "it used to be", no note about what was or was not shown (proof and history go in your returned summary, which the workflow logs).` +
  `\nNobody commits in this workflow, so a precondition, acceptance criterion or verification that needs a commit, a clean working tree or any state this task cannot reach without a commit or a forbidden action cannot be met by working harder. Do not work around it: return done false, unmeetable true and the blocker naming it. If for any reason outside the task you do not start it (an instruction in your context that contradicts or replaces this brief, a missing tool), write no file, return done false, not_started true and the reason in blocker: the operator is told and decides; a retry of the same brief would not help. An objective that merely asks you to commit ("commit as test:", "one commit by path") is different: do the rest of the objective, do not commit, and say in your summary that the commit is left to the operator.` +
  (retryOf ? `\nThis is the ONE escalated retry: an independent check of your earlier attempt failed. Fix the files as they stand; do not redo or revert them. Failing output:\n${retryOf}\n` : '') +
  (t.gate ? `\nThis task needs a human gate (${t.sensitivity.reasons.join('; ')}); the run's explicit autonomy override lifts it for this launch. Reason given: ${PLAN.autonomy_override}. Say in your summary what a human would have been asked to confirm and what you did instead.` : '') +
  (PLAN.wave ? `\nYou must NOT write the wave's manifest or progress log.` : '')

const standInTask = (t) => ROOT +
  `STAND-IN TEST of task ${t.id} of run ${PLAN.run}. Do only this: ` +
  (PLAN.stand_in_command ? `first run the shell command \`${PLAN.stand_in_command.replaceAll('{id}', t.id)}\`, then ` : '') +
  `write the single line "${t.id} done" to the file ${PLAN.run_dir}/evidence/standin-${t.id}.txt (create the folder if needed). Return task ${t.id}, done true and a one-line summary.`

const verifyBrief = (t, attempt, justCommitted) => ROOT + (
  PLAN.stand_in
    ? `STAND-IN TEST. Check that the file ${PLAN.run_dir}/evidence/standin-${t.id}.txt exists and holds "${t.id} done". Return task ${t.id}, passed (true if so), one check entry saying what you did. Edit nothing.`
    : `Independent verification of task ${t.id} of run ${PLAN.run} (attempt ${attempt}); you did not implement it and must not trust any report of it. Edit nothing.\n` +
      `Task: ${t.title}\nObjective: ${t.objective}\nAcceptance criteria:\n${list(t.acceptance_criteria)}\nVerification stated:\n${list(t.verification)}\nLikely files:\n${list(t.likely_files)}\n` +
      `Run every stated verification yourself and read the actual files against each acceptance criterion, not the implementer's words. One entry in checks per verification or criterion: what you ran or read (ran) and what happened (result). passed is true only if every one holds; otherwise put the failing output in failing_output. ` +
      `Compare \`git status --porcelain\` with the likely files and list changes outside them (other tasks' files, ${PLAN.run_dir} and the wave's own documents ${WAVE_DOCS} excepted) in outside_likely_files. ` +
      `Also return changed_files: every path of that status that this task changed (its likely files, plus each outside_likely_files path with outside true), as repository-relative paths, leaving out anything git ignores and anything under target/. ` +
      `Nobody commits in this workflow: a check that needs a commit or a clean working tree cannot hold whatever the implementer does, so set unmeetable true, unmeetable_kind 'commit', passed false, and name the check in failing_output. If instead the checks cannot all hold because they contradict each other or a test that already exists (nothing a commit would change), set unmeetable true, unmeetable_kind 'contradiction', passed false, and name both sides in failing_output. A commit the task's objective asks for is not a criterion here: do not fail the task for its absence, check the rest and note in a check entry that the commit is left to the operator.` +
      (justCommitted ? `\nThis workflow has just committed this task's files by path, so HEAD now holds them: a check that only needed that commit should hold now; judge it again from scratch.` : ''))

// only with PLAN.commit_tasks (--commit-tasks): the one place this workflow commits, by path, after a verifier found a check that needs the commit
const commitBrief = (t, files) => ROOT +
  `Commit the work of task ${t.id} of run ${PLAN.run} (${t.title}), by path, and nothing else. Files: ${files.map((f) => '\`' + f + '\`').join(', ')}. ` +
  `Run \`git add -- <those paths>\` (never \`git add -A\` or \`git add .\`) and \`git commit -m "chore(run-${PLAN.run}): ${t.id} ${t.title.replaceAll('"', "'")}"\`; no amend, no push, no hook bypass, no other git command that changes history or the index beyond those paths. ` +
  `If a path is not changed or the commit fails, commit nothing more and return committed false with the reason. Otherwise return committed true, the short hash in commit and the files.`

// ONE marker per lane (wave 2.21.0): the pln is re-read and re-edited once for every task of the lane that passed its independent check
// (done) or failed it for good (blocked), instead of once per task; each task still gets its own status and its own `results:` line
const laneMarkerBrief = (marks) => ROOT +
  `Record the outcome of ${marks.length} task(s) of run ${PLAN.run} in ${PLN} with one command; edit nothing yourself and do not read the file. Run exactly this from the repository root and report its result:\n` +
  `python3 "${PLAN.generator_script}" mark ${PLN} --marks-json - <<'MARKS_JSON'\n` + JSON.stringify(marks.map((m) => ({ id: m.id, status: m.status, line: m.line }))) + `\nMARKS_JSON\n` +
  `Return the exit code of the command in exit and, if it is not 0, its stderr in message.${STAND_IN_NOTE}`
const MARK_SCHEMA = { type: 'object', properties: { exit: { type: 'integer' }, message: { type: 'string' } }, required: ['exit'] }

const startBrief = () => ROOT +
  `Start the implementation of run ${PLAN.run}: in ${PLN} set the \`status\` of the execution_manifest block to 'in_progress' unless it already reads 'done', and in ${PLAN.status_file} set the frontmatter \`status:\` to 'in-progress' unless it already reads 'completed'. Change nothing else. Return the word done.${STAND_IN_NOTE}`

const finalBrief = () => ROOT +
  `Stage 11 of run ${PLAN.run} (${PLAN.slug}). Read the section "## Stage 11 — Verification" of ${PLAN.skill_file} and carry it out for this run: ${PLN} Verification Plan, every PRD acceptance criterion re-checked against the files, repository-wide checks, ` +
  `then the pln's execution_manifest status (done only if every criterion holds, otherwise blocked with the unmet criteria named), the run's status (completed or in-progress) and its prg, the backlog sweep, the canonical obligations. ` +
  `You are a leaf agent with no Agent tool; tasks were implemented and independently verified one by one by earlier agents (${PLAN.pending.length ? PLAN.pending.join(', ') : 'none this generation'}; already done: ${PLAN.done.join(', ') || 'none'}). ` +
  `Run \`python3 "${PLAN.check_script}" --as-completed ${PLAN.run_dir}\` before you set completed. Return the statuses as read back from the files, the check's exit code and the item it names if not 0, and every unmet criterion. Append one Log line starting "- <date>: Stage 11" to ${PRG}. ` +
  `Stay inside the repository and its safety rules. Never report success you have not checked.`
const finalCheckBrief = () => ROOT + (
  PLAN.stand_in
    ? `STAND-IN TEST. Read ${PLAN.status_file} and ${PLN}; return run_status (frontmatter status), pln_status (execution_manifest status) and check_run_exit 0. Edit nothing.`
    : `Independent final check of run ${PLAN.run}; you did not do Stage 11. Edit nothing. Return run_status as read from ${PLAN.status_file}, pln_status as read from the execution_manifest block of ${PLN}, ` +
      `and run \`python3 "${PLAN.check_script}" --as-completed ${PLAN.run_dir}\` yourself: check_run_exit and, if not 0, check_run_named. List in unmet any task of the pln whose status is not done.`)

if (PLAN.pending.length === 0 && PLAN.blocked.length === 0 && PLAN.run_completed) {
  return { state: 'nothing-to-do', note: 'every task is done and the run is completed', results }
}
if (PLAN.blocked.length) return await stop('tasks blocked before start', PLAN.blocked)

// overrides of declared tiers, the human gate and the autonomy override are written to the run's prg before anything
// runs, so the log says what the generated file says (the same list is in the file's header comment)
const GATED = PLAN.gated || []
const OVERRIDES = PLAN.overrides || []
const overrideText = () => `implement workflow generated with cost profile ${PLAN.cost_profile}. ` +
  `Overrides of declared tiers (${OVERRIDES.length}): ${OVERRIDES.length ? OVERRIDES.join(' | ') : 'none'}. ` +
  `Human gate required for: ${GATED.length ? GATED.join(', ') : 'no task'}. ` +
  `Autonomy override: ${PLAN.autonomy_override ? 'carried by the launch, reason: ' + PLAN.autonomy_override : 'none'}.`
const awaiting = async (lane) => {
  const tasks = lane.filter((t) => t.gate).map((t) => ({ task: t.id, title: t.title, reasons: t.sensitivity.reasons }))
  await ag(entryPrompt(`implement workflow stopped, state awaiting-human: ${tasks.map((x) => x.task).join(', ')} need a human gate and no agent was given the task(s) ` +
    JSON.stringify(tasks) + `. Provide the validation yourself, or regenerate with --autonomy-override "<reason>" to lift the gate explicitly; tasks already done are dropped on regeneration.`), opt('bookkeeping', { label: 'prg-awaiting-human' }))
  return { state: 'awaiting-human', tasks, results, findings }
}
if (OVERRIDES.length || GATED.length || PLAN.autonomy_override) {
  const logged = await ag(entryPrompt(overrideText()), opt('bookkeeping', { label: 'prg-overrides' }))
  if (!logged) return await stop('overrides entry returned nothing', PLAN.run)
}

let started = null
for (const level of PLAN.levels) {
  for (const lane of level) {
    if (lane.some((t) => t.gate) && !PLAN.autonomy_override) return await awaiting(lane)
    if (!started) {
      started = await ag(startBrief(), opt('bookkeeping', { label: 'start' }))
      if (!started) return await stop('start step returned nothing', PLAN.run)
    }
    const impl = await parallel(lane.map((t) => () => PLAN.stand_in
      ? ag(standInTask(t), { label: `task-${t.id}`, schema: IMPL_SCHEMA, model: 'haiku', effort: 'low' })
      : ag(taskBrief(t), implOpts(t, `task-${t.id}`, t))))
    // with --commit-tasks an implementer that calls its task unmeetable (it cannot make a commit-dependent check hold) is verified all the same:
    // the independent verifier confirms the claim before anything is committed, and only the verifier's word leads to the commit below
    const verifiable = (x) => !!x && !didNotStart(x) && (!x.unmeetable || (PLAN.commit_tasks && !PLAN.stand_in && !!(x.files_touched && x.files_touched.length)))
    const ver = await parallel(lane.map((t, i) => () => verifiable(impl[i])
      ? ag(verifyBrief(t, 1), PLAN.stand_in
          ? { label: `verify-${t.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
          : { label: `verify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
      : null))
    const failed = []
    lane.forEach((t, i) => {
      if (!impl[i] || !impl[i].done || !ver[i] || !ver[i].passed) failed.push(i)
    })
    // one escalation rung (the pair is t.retry), then verify again; a hard_judgment task is already at the top and is retried as is
    const second = {}
    for (const i of failed) {
      const t = lane[i]
      if (didNotStart(impl[i])) {
        second[i] = { again: null, v2: null, effort: null, why: impl[i].blocker || impl[i].summary || 'task not started', notStarted: true }
        continue
      }
      if ((impl[i] && impl[i].unmeetable) || (ver[i] && ver[i].unmeetable)) {
        if (PLAN.commit_tasks && !PLAN.stand_in && impl[i] && (impl[i].done || impl[i].unmeetable) && ver[i] && ver[i].unmeetable && ver[i].unmeetable_kind !== 'contradiction') {
          const files = impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : (t.likely_files || [])
          const c = files.length ? await ag(commitBrief(t, files), opt('bookkeeping', { label: `commit-${t.id}`, schema: COMMIT_SCHEMA })) : null
          if (c && c.committed) {
            const v2 = await ag(verifyBrief(t, 2, true), { label: `reverify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
            second[i] = { again: { ...impl[i], done: true }, v2, effort: null, why: ver[i].failing_output || 'unmeetable check', committed: c.commit || 'yes' }
            continue
          }
        }
        const named = (impl[i] && impl[i].unmeetable && (impl[i].blocker || impl[i].summary)) || (ver[i] && ver[i].failing_output) || 'unmeetable precondition'
        second[i] = { again: null, v2: null, effort: null, why: named, unmeetable: true, contradiction: !!(ver[i] && ver[i].unmeetable_kind === 'contradiction' && !(impl[i] && impl[i].unmeetable)) }
        continue
      }
      const why = !impl[i] ? 'implementation agent returned nothing' : !impl[i].done ? ('reported not done: ' + (impl[i].blocker || impl[i].summary)) : !ver[i] ? 'verification agent returned nothing' : (ver[i].failing_output || 'verification failed')
      const effort = t.retry.effort
      const again = PLAN.stand_in
        ? await ag(standInTask(t), { label: `retry-${t.id}`, schema: IMPL_SCHEMA, model: 'haiku', effort: 'low' })
        : await ag(taskBrief(t, why), implOpts(t, `retry-${t.id}`, t.retry))
      const v2 = again
        ? await ag(verifyBrief(t, 2), PLAN.stand_in
            ? { label: `reverify-${t.id}`, schema: VERIFY_SCHEMA, model: 'haiku', effort: 'low' }
            : { label: `reverify-${t.id}`, schema: VERIFY_SCHEMA, model: t.verify.model, effort: t.verify.effort })
        : null
      second[i] = { again, v2, effort, why }
    }
    const bad = []
    const commitWait = []
    const operatorWait = []
    const marks = []
    for (let i = 0; i < lane.length; i++) {
      const t = lane[i]
      const esc = second[i]
      const passed = esc ? !!(esc.again && esc.again.done && esc.v2 && esc.v2.passed) : true
      if (esc && esc.committed && esc.v2 && esc.v2.unmeetable) { esc.unmeetable = true; esc.why = esc.v2.failing_output || esc.why }
      const v = esc ? esc.v2 : ver[i]
      results.push({ task: t.id, tier: t.tier, model: t.model, effort: t.effort, first_pass: !esc, escalated_to: esc ? esc.effort : null, verified: v })
      if (esc && esc.notStarted) {
        // the agent did not start (nothing written): no retry, the task stays pending and the operator decides
        operatorWait.push({ task: t.id, title: t.title, reason: esc.why })
        continue
      }
      if (!passed && esc.unmeetable && !esc.contradiction) {
        // not a failure of the task: its work is on disk and only a commit (which this workflow never makes) is missing; it stays pending,
        // so the next generation resumes it once the operator has committed
        // the operator commits in one command: the task's files plus the changes the verifier saw outside them, which stay listed apart
        // (never committed by this workflow: an unknown file such as a build artefact is the operator's call)
        const files = (impl[i] && impl[i].files_touched && impl[i].files_touched.length ? impl[i].files_touched : t.likely_files) || []
        const outside = ((v && v.outside_likely_files) || (ver[i] && ver[i].outside_likely_files) || []).filter((f) => !files.includes(f))
        // the list to commit is what the verifier saw changed by this task, outside-declared paths marked; the implementer's own list is only the fallback
        const changed = (v && v.changed_files) || (ver[i] && ver[i].changed_files) || []
        const add = changed.length ? changed.map((c) => c.path) : files
        commitWait.push({ task: t.id, title: t.title, files, outside_likely_files: outside, changed_files: changed, check: esc.why, committed_by_workflow: esc.committed || null, git_add: add.length ? 'git add -- ' + add.join(' ') : null })
        continue
      }
      if (!passed) {
        bad.push(esc.contradiction ? `${t.id}: its checks contradict each other or an existing test, a commit changes nothing (${esc.why})` : esc.unmeetable ? `${t.id}: unmeetable, no retry (${esc.why})` : `${t.id}: failed twice (${esc.why})`)
        marks.push({ id: t.id, status: 'blocked', line: esc.contradiction ? `tier ${t.tier}, effort ${t.effort}, its checks contradict each other or an existing test (a commit changes nothing), no retry: ${esc.why}` : esc.unmeetable ? `tier ${t.tier}, effort ${t.effort}, unmeetable precondition or check, no escalated retry (nothing commits in this workflow): ${esc.why}` : `tier ${t.tier}, effort ${t.effort}, failed first check and the escalated retry (${esc.effort}); blocked by the implement workflow` })
        continue
      }
      const line = `tier ${t.tier}, model ${t.model}, effort ${t.effort}, profile ${PLAN.cost_profile}, ${esc ? (esc.committed ? 'passed after the workflow committed the task (--commit-tasks, ' + esc.committed + ')' : 'passed after escalation to effort ' + esc.effort) : 'passed first time'}, inline (leaf), independently verified`
      marks.push({ id: t.id, status: 'done', line })
      if (v && v.outside_likely_files && v.outside_likely_files.length) findings.push({ task: t.id, outside_likely_files: v.outside_likely_files })
    }
    if (marks.length) {
      const marked = await ag(laneMarkerBrief(marks), opt('bookkeeping', { label: `mark-lane-${lane[0].id}`, schema: MARK_SCHEMA }))
      if (!marked) bad.push(`${marks.map((m) => m.id).join(', ')}: marker returned nothing`)
      else if (marked.exit !== 0) bad.push(`${marks.map((m) => m.id).join(', ')}: mark command failed (exit ${marked.exit}) ${marked.message || ''}`.trim())
    }
    if (bad.length) return await stop('task not verified', bad)
    if (operatorWait.length) {
      await ag(entryPrompt(`implement workflow stopped, state awaiting-operator: ${operatorWait.map((x) => x.task).join(', ')} not started by their agent, nothing written, the tasks stay pending. Read the reasons, fix the cause, then regenerate. ` + JSON.stringify(operatorWait)), opt('bookkeeping', { label: 'prg-awaiting-operator' }))
      return { state: 'awaiting-operator', tasks: operatorWait, results, findings }
    }
    if (commitWait.length) {
      await ag(entryPrompt(`implement workflow stopped, state awaiting-commit: ${commitWait.map((x) => x.task).join(', ')} have a check that is unmeetable as the workflow runs it (the verifier's judgment, not proof that a commit is missing); for each, committed_by_workflow tells whether this workflow already committed its files by path and the check still failed. Commit the files by path if none was committed, then regenerate (the tasks are still pending, the next generation resumes them and reruns the check) ` + JSON.stringify(commitWait)), opt('bookkeeping', { label: 'prg-awaiting-commit' }))
      return { state: 'awaiting-commit', tasks: commitWait, results, findings }
    }
  }
}

PH = `${pad(ALLTASKS.length + 1, NW)} · stage 11`
const fin = await ag(PLAN.stand_in ? `STAND-IN TEST. Append the Log line "- <date>: Stage 11 stand-in" to ${PRG} (create it with a "## Log" heading if absent), set the frontmatter status of ${PLAN.status_file} to completed and the execution_manifest status of ${PLN} to 'done'. Return run_status, pln_status and check_run_exit 0 as read from the files.` : finalBrief(),
  PLAN.stand_in ? { label: 'stage-11', schema: FINAL_SCHEMA, model: 'haiku', effort: 'low' } : { label: 'stage-11', schema: FINAL_SCHEMA, model: PLAN.stage11.model, effort: PLAN.stage11.effort })
if (!fin) return await stop('stage 11 returned nothing', PLAN.run)
const chk = await ag(finalCheckBrief(), PLAN.stand_in ? { label: 'final-check', schema: FINAL_SCHEMA, model: 'haiku', effort: 'low' } : opt('verify-run', { label: 'final-check', schema: FINAL_SCHEMA }))
if (!chk) return await stop('final check returned nothing', PLAN.run)
results.push({ stage: 11, reported: fin, independent: chk })
if (!PLAN.stand_in && (chk.run_status !== 'completed' || chk.pln_status !== 'done' || chk.check_run_exit !== 0)) {
  return await stop('final check not clean', { run_status: chk.run_status, pln_status: chk.pln_status, check_run_exit: chk.check_run_exit, named: chk.check_run_named || '', unmet: chk.unmet || [] })
}
return { state: 'done', run: PLAN.run, tasks: PLAN.pending, results, findings }
