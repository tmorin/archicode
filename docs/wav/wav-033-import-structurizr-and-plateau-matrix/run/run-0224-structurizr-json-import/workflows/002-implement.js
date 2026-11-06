export const meta = { name: "run-0224-implement", description: "Generated from the run directory: pending tasks of the pln only; cost profile low-cost" }
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
 "run": "0224",
 "slug": "structurizr-json-import",
 "wave": "033",
 "profile": "TDD+pln",
 "run_dir": "docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import",
 "status_file": "docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/run-0224-structurizr-json-import.md",
 "pln_file": "docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/pln-0224-structurizr-json-import.md",
 "prg_file": "docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/prg-0224-structurizr-json-import.md",
 "skill_file": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/SKILL.md",
 "check_script": "/home/tibo/git-perso/claude-agents/plugins/run-management/skills/complete-run/scripts/check_run.py",
 "hard": false,
 "stand_in": false,
 "stand_in_command": "",
 "done": [],
 "pending": [
  "task-001",
  "task-002",
  "task-004",
  "task-003",
  "task-005",
  "task-006",
  "task-008",
  "task-009",
  "task-007",
  "task-010"
 ],
 "levels": [
  [
   [
    {
     "id": "task-001",
     "title": "Facts and sample: fetch the Big Bank export with its licence and provenance, confirm the .dsl export command, grep the literal counts the golden will move",
     "objective": "Download structurizr-export/src/test/resources/big-bank-plc.json and the root LICENSE of github.com/structurizr/structurizr at one commit (read the SHA with gh api or git ls-remote; state the source URL and the size in the prg line), check there is no NOTICE or other licence file in or above that path at that SHA, write PROVENANCE.md (repository URL, path, 40-hex SHA, date), confirm with jq that the file has model.people, softwareSystems, containers and components, and count the elements. Then try the documented export of a DSL to JSON once (Q-1); if the tool is not runnable here, record that and keep the no-command sentence of DEC-6. Finally grep src/test and the docs for literal counts of shipped manifests or workspaces (ManifestSchemaCorpusTest, ManifestRoundTripCorpusTest, ManifestCorpus, src/test/CLAUDE.md) and list them in the Facts block.",
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
      "src/test/resources/structurizr/ holds big-bank-plc.json, LICENSE-Apache-2.0.txt and PROVENANCE.md",
      "PROVENANCE.md contains github.com/structurizr/structurizr and a 40-hex SHA",
      "jq reads model.softwareSystems from the sample and the element count is recorded in the Facts block",
      "the Facts block says whether the DSL export command ran, and lists each literal count found"
     ],
     "verification": [
      "ls src/test/resources/structurizr/",
      "grep -E '[0-9a-f]{40}' src/test/resources/structurizr/PROVENANCE.md",
      "grep -q 'github.com/structurizr/structurizr' src/test/resources/structurizr/PROVENANCE.md",
      "jq '.model.softwareSystems | length' src/test/resources/structurizr/big-bank-plc.json",
      "grep -q 'Apache License' src/test/resources/structurizr/LICENSE-Apache-2.0.txt"
     ],
     "likely_files": [
      "src/test/resources/structurizr/big-bank-plc.json",
      "src/test/resources/structurizr/LICENSE-Apache-2.0.txt",
      "src/test/resources/structurizr/PROVENANCE.md",
      "docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/prg-0224-structurizr-json-import.md"
     ],
     "tdd_excerpts": [
      "REQ-1",
      "REQ-7",
      "DEC-6",
      "DEC-8",
      "IMP-7",
      "Q-1",
      "Q-2",
      "RISK-1",
      "RISK-2",
      "RISK-5"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "the download is not permitted in the agent session or the network is absent: stop, log it, and fall back to the hand-written minimal workspace of Q-2 (a smaller sample that loses the compatibility proof; the wave verification must be told)",
      "a licence file other than Apache-2.0 sits in or above the path at that SHA",
      "the file is not a Structurizr workspace export"
     ],
     "depends_on": []
    }
   ]
  ],
  [
   [
    {
     "id": "task-002",
     "title": "Reader and model: Structurizr JSON to StructurizrModel and counted Dropped, with the sentences of the refusals",
     "objective": "Write the model records (Person, System, Container, Component, Link, Dropped) and a pure reader that takes a Jackson JsonNode and returns the model and the counted drops (views, deployment nodes counted as the TDD's DEC-9 says, styles, documentation, properties, perspectives, custom elements, configuration, implied relationships). A missing model is the error 'is not a Structurizr workspace: it has no model'; an element with no name is an error naming its Structurizr id. Test first on small inline JSON, then on the sample: the number of elements read equals the count that jq gives on the file, read by the test and not a literal.",
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
      "the reader reads the four element kinds and the relationships of the sample and its element count equals the jq count",
      "a document with no model and an element with no name each throw ArchiCodeException with one sentence",
      "every dropped part present in the sample is counted",
      "the reader touches no file"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=StructurizrReaderTest"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/importer/StructurizrModel.java",
      "src/main/java/io/morin/archicode/importer/StructurizrReader.java",
      "src/test/java/io/morin/archicode/importer/StructurizrReaderTest.java"
     ],
     "tdd_excerpts": [
      "TG-1",
      "DEC-1",
      "DEC-2",
      "CTR-1",
      "ASM-1",
      "IF-2",
      "IMP-1",
      "IMP-3"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "the sample has a key the model cannot hold (ASM-1 is false)"
     ],
     "depends_on": [
      "task-001"
     ]
    },
    {
     "id": "task-004",
     "title": "ImportFiles seam and DiskImportFiles: staging, all or nothing, refusals of the output folder",
     "objective": "Write the interface ImportFiles that writes (path, bytes) pairs and nothing else, and its disk implementation: refuse an existing folder that holds any entry (hidden included) with 'the folder <f> is not empty: import writes nothing over a folder'; refuse an --output that is an existing file; create an absent folder and an absent parent; write into <output>.archicode-import, replacing a stale staging folder left by a crash, then move it into place; a failing write removes the staging folder and says 'the import stopped at <file> (<reason>): nothing is written'. A fake lets a test fail the write at the step it chooses. The reason FoldFiles is not extended is that its commit rewrites existing files and creates none.",
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
      "a non-empty folder, an existing file as output and a failure at each step leave the file system as it was, byte for byte",
      "a stale <output>.archicode-import is replaced",
      "an empty existing folder is accepted",
      "every refusal is an ArchiCodeException with one sentence"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=ImportFilesTest"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/importer/ImportFiles.java",
      "src/main/java/io/morin/archicode/importer/DiskImportFiles.java",
      "src/test/java/io/morin/archicode/importer/ImportFilesTest.java"
     ],
     "tdd_excerpts": [
      "TG-3",
      "DEC-7",
      "IF-2",
      "FLOW-1",
      "IMP-1",
      "IMP-3"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "an atomic move of the staging folder onto an existing empty folder is not possible on the platform: use the move of each file and say so"
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
     "id": "task-003",
     "title": "Mapper: ids from names, references, relationships, Planned manifests and the workspace file",
     "objective": "Write the pure mapper: model in, a list of Planned(path, Manifest) plus the typed content of .archicode.yaml out; it serializes nothing. Rules: header.kind is the full id of ManifestKind (archicode.morin.io/person and the like, read from ManifestKind.getId(), never the short word); ids derived from names (DEC-4) where a missing name is the reader's error and a name with no [a-z0-9] takes the fallback <kind>_<structurizr id> passed through the same rewrite (add a unit case with an id such as ../x); siblings are all elements under one parent whatever their kind, a collision takes the first unused suffix _2, _3 and never lands on a sibling really named x_2; the tags structurizr.id and group; relationships resolved from a map built before the first manifest; linkedRelationshipId ones skipped and counted; a relationship to a not-imported element dropped and counted. Define 'rewritten id' once (a character replaced, a fallback, a suffix; case and spaces turned to _ are not) and give each rewrite one warning sentence with the element, its Structurizr id and the id written.",
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
      "header.kind of every Planned manifest is a full ManifestKind id",
      "two siblings of different kinds named alike get distinct ids, and a sibling named x_2 is never shadowed",
      "an id such as ../x yields a path under manifests/ with only [a-z0-9_.-]",
      "the references of the sample are unique and every relationship destination resolves",
      "the same input gives the same output twice"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest=StructurizrMapperTest"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/importer/StructurizrMapper.java",
      "src/test/java/io/morin/archicode/importer/StructurizrMapperTest.java"
     ],
     "tdd_excerpts": [
      "TG-2",
      "DEC-3",
      "DEC-4",
      "DEC-5",
      "CTR-2",
      "ASM-2",
      "ASM-3",
      "RISK-3",
      "RISK-6",
      "IMP-1",
      "IMP-3"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "a Manifest the mapper builds is refused by the loader in a way that needs a loader change (RISK-6): stop and log it, the loader is not changed"
     ],
     "depends_on": [
      "task-002"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-005",
     "title": "Service, command, group, report and native reflection",
     "objective": "Write the service (refuse a .dsl or non-.json name before reading, read, map, serialize with MapperFactory.forWriting(YAML), write through ImportFiles, queue the warnings in Warnings after the move succeeds, so a failed write prints no drop list) and the command import structurizr <workspace.json> --output <folder> in the group import, registered in ArchiCode. The .dsl sentence names the export command only as task-001 confirmed it, else the no-command sentence of DEC-6. The command loads no workspace and prints 'imported <n> elements and <m> relationships into <folder>'. Add the two command classes to reflect-config.json and run NativeReflectionConfigTest. Run PMD on the new code.",
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
      "a .dsl input, a non-JSON file, a missing file, a JSON with no model and a non-empty folder are each one error: line, exit 1, no stack trace, folder unchanged",
      "the warnings are in the order of DEC-9",
      "reflect-config.json names at least two io.morin.archicode.cli.Import classes",
      "PMD passes on the new code"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='StructurizrImportServiceTest,NativeReflectionConfigTest'",
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test-compile pmd:check"
     ],
     "likely_files": [
      "src/main/java/io/morin/archicode/importer/StructurizrImportService.java",
      "src/main/java/io/morin/archicode/cli/ImportGroup.java",
      "src/main/java/io/morin/archicode/cli/ImportStructurizrCommand.java",
      "src/main/java/io/morin/archicode/cli/ArchiCode.java",
      "src/main/resources/META-INF/native-image/io.morin.archicode/archicode/reflect-config.json",
      "src/test/java/io/morin/archicode/importer/StructurizrImportServiceTest.java"
     ],
     "tdd_excerpts": [
      "DEC-1",
      "DEC-6",
      "DEC-9",
      "CTR-3",
      "IF-1",
      "IF-2",
      "FLOW-1",
      "TG-4",
      "CON-2",
      "CON-3",
      "IMP-1",
      "IMP-2",
      "IMP-8"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "the command needs a change of an existing command's output (byte-identity would move)"
     ],
     "depends_on": [
      "task-003",
      "task-004"
     ]
    }
   ]
  ],
  [
   [
    {
     "id": "task-006",
     "title": "Golden output of the sample, report golden, and the shipped-corpus counts it moves",
     "objective": "Write a test that imports the sample into a temp folder and compares it byte for byte with src/test/resources/structurizr/expected/ and the warnings with expected-report.txt, with a documented way to regenerate both; commit the regenerated golden after reading it. The folder joins ShippedFilesTest, ManifestCorpus and MistakeSweepTest: run them, update the literal counts task-001 listed, and when a mutation of header.parent of an imported container ends in a stack trace, fix it in the importer's output only if the cause is the importer, else add the entry to known-traces.json with its reason. State that scripts/byte-identity.sh loads the golden with the base jar and must not need an exception. Check the count of elements of the output equals the count read from the sample by jq.",
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
      "the golden test passes and fails when one byte of the golden changes",
      "ShippedFilesTest, ManifestSchemaCorpusTest, ManifestRoundTripCorpusTest and MistakeSweepTest pass with the golden present and with no entry in shipped-files exceptions",
      "the element count of the golden equals the jq count of the sample",
      "the report golden holds one warning per dropped part present in the sample (views, deployment)"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='StructurizrGoldenTest,ShippedFilesTest,ManifestSchemaCorpusTest,ManifestRoundTripCorpusTest,MistakeSweepTest'"
     ],
     "likely_files": [
      "src/test/resources/structurizr/expected/",
      "src/test/resources/structurizr/expected-report.txt",
      "src/test/java/io/morin/archicode/importer/StructurizrGoldenTest.java",
      "src/test/resources/known-traces.json",
      "src/test/CLAUDE.md",
      "src/test/java/io/morin/archicode/doc/ManifestCorpus.java"
     ],
     "tdd_excerpts": [
      "TG-5",
      "REQ-2",
      "DEC-8",
      "DEC-9",
      "IMP-4",
      "CON-4",
      "RISK-5",
      "RISK-6",
      "ASM-3"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "the loader refuses the output (ASM-3 false): stop and log, no loader change",
      "MistakeSweepTest needs a known trace that hides an importer defect"
     ],
     "depends_on": [
      "task-001",
      "task-005"
     ]
    },
    {
     "id": "task-008",
     "title": "Manual, guide and help goldens, and the command-line notes",
     "objective": "Add to the manual a section for import structurizr (what it reads, writes, drops, the refusals) and add import to the hand-written list of first-level commands (== Commands, near the line for init); say whether guide.md mentions init and mirror it if so. Update the generated listing, the guide golden and the HelpIT expectation; read the diff, only the new command may differ. Add a short section to src/main/java/io/morin/archicode/CLAUDE.md that states what is true now (rules, tests), with no wave, run, issue or date. Update manual-anchors.json if the skeleton test asks.",
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
      "CommandReferenceTest, GuideTest and HelpIT pass",
      "the diff of golden.md holds only the new command",
      "the CLAUDE.md section carries no wave, run or issue id",
      "the manual lists import in both places"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='CommandReferenceTest,GuideTest'",
      "node --test src/test/javascript/manual-skeleton.test.js",
      "grep -nE 'wave|run-0|#135|20[0-9]{2}-' src/main/java/io/morin/archicode/CLAUDE.md | grep -i import || true"
     ],
     "likely_files": [
      "src/doc/README.adoc",
      "src/test/resources/guide/golden.md",
      "src/test/java/io/morin/archicode/it/HelpIT.java",
      "src/main/java/io/morin/archicode/CLAUDE.md",
      "src/test/javascript/manual-anchors.json",
      "src/main/resources/guide/guide.md"
     ],
     "tdd_excerpts": [
      "REQ-5",
      "REQ-8",
      "CON-7",
      "IMP-9",
      "IMP-10",
      "IMP-12"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "the generated listing moves for a command other than import"
     ],
     "depends_on": [
      "task-005",
      "task-001"
     ]
    },
    {
     "id": "task-009",
     "title": "The model of ArchiCode: the importer package, the command, their edges, and the sample bundle",
     "objective": "Model the importer package and the command in docs/architecture in the style of the neighbouring command-line elements, with tags.path naming real paths and the qualifiers the manifests use; run archicode query impact on Warnings and Manifest to see whether an impact question changes and change the question in the same commit if so; run npm run sample:build.",
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
      "npm run sample:check exits 0 after npm run sample:build",
      "the model loads: query graph on docs/architecture/.archicode.yaml lists the new elements"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw test -Dtest='ArchitectureDriftTest,ArchitectureImpactTest,ArchitectureModelTest'",
      "npm run sample:build && npm run sample:check"
     ],
     "likely_files": [
      "docs/architecture/manifests/",
      "src/test/javascript/architecture/impact-questions.json",
      "src/main/resources/editor-webapp/samples/archicode.yaml"
     ],
     "tdd_excerpts": [
      "REQ-5",
      "REQ-8",
      "IMP-11"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "an impact question changes in a way the run did not intend"
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
     "title": "Integration test on the packaged application and the editor test that opens the output",
     "objective": "Write StructurizrImportIT in the pattern of InitIT: the packaged application imports the sample, query graph loads the output and has as many elements as the sample, a .dsl and a non-empty folder are each one error: line with the folder unchanged. Write the node test in the pattern of init-workspace.test.js: the editor opens src/test/resources/structurizr/expected/ with no error in any manifest, no duplicate reference and as many elements as the sample. No change under src/main/editor.",
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
      "the IT passes against the jar",
      "the node test passes and reads the golden folder",
      "git status shows no change under src/main/editor"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false -Dit.test=StructurizrImportIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false",
      "node --test src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js",
      "npx prettier --check src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js"
     ],
     "likely_files": [
      "src/test/java/io/morin/archicode/it/StructurizrImportIT.java",
      "src/test/javascript/viewpoint-kernel/structurizr-import-workspace.test.js"
     ],
     "tdd_excerpts": [
      "REQ-4",
      "IMP-5",
      "IMP-6",
      "CON-4",
      "IF-3"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "the editor refuses a manifest the CLI loads (contract drift): log it as a finding, do not change the editor"
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
     "id": "task-010",
     "title": "Gates of the run: the whole suite, byte identity, format, lint, builds, and the gate run on the packaged application",
     "objective": "Run the commands of the gates in the repository root and record each exit code: ./mvnw verify -DskipITs=false; ./mvnw test-compile pmd:check; scripts/byte-identity.sh with scripts/byte-identity-exceptions.txt unchanged; npm run test:unit; npm run format:check; npm run lint; npm run editor:build and npm run sample:build with git status --short unchanged by them. Then, on the packaged application, import the sample into a new folder, check the exit code 0, at least one warning for views and for deployment, and that query graph on the output has as many elements as jq counts on the sample; and that a .dsl input and a non-empty folder are each one error: line. Say that the Native job of CI is not run on a branch and is left to the pull request. Fix nothing in this task beyond a failing command's cause; a fix goes back to the task that owns the file.",
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
      "every command above exits 0, or the failure is named with its owning task",
      "scripts/byte-identity-exceptions.txt is unchanged",
      "the count of elements in the output equals the sample's",
      "the prg holds the results block"
     ],
     "verification": [
      "JAVA_HOME=$HOME/.sdkman/candidates/java/25.0.4-tem ./mvnw verify -DskipITs=false",
      "npm run format:check",
      "npm run lint",
      "git diff --stat scripts/byte-identity-exceptions.txt"
     ],
     "likely_files": [
      "docs/wav/wav-033-import-structurizr-and-plateau-matrix/run/run-0224-structurizr-json-import/prg-0224-structurizr-json-import.md"
     ],
     "tdd_excerpts": [
      "REQ-2",
      "REQ-4",
      "REQ-5",
      "RISK-4",
      "RISK-7",
      "Observability and Verification"
     ],
     "prd_excerpts": [
      "none: no PRD; see the REQ-n of the TDD"
     ],
     "escalation_triggers": [
      "byte-identity needs a new exception",
      "a command fails for a reason outside the importer (a base that is already red): record it, do not fix it"
     ],
     "depends_on": [
      "task-007",
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
