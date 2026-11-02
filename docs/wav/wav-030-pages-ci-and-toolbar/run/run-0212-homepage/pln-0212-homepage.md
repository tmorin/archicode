---
title: Execution Plan — Homepage
status: draft
date: 2026-11-01
related:
  - docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/tdd-0212-homepage.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wav-030-pages-ci-and-toolbar.md
  - docs/wav/wav-030-pages-ci-and-toolbar/wbc-030-pages-ci-and-toolbar.md
  - src/site/index.html
  - src/test/javascript/site.test.js
  - .github/workflows/ci-build.yaml
  - https://github.com/tmorin/archicode/issues/195
type: pln
run: 0212
wave: 030
---

# Execution Plan: Homepage

Profile TDD+pln: there is no PRD, so REQ-1 to REQ-10 are the IDs the TDD labels (section "PRD Traceability"), taken from the W-2 row and the third and fourth criteria of gate P1 of the wave manifest and from the six findings and the acceptance of #195. The plan follows the TDD plus the Stage 5 review findings F-1 to F-10 (progress log, Stage 5 line), which the TDD has not absorbed: task-001 amends the TDD with them before any test is written. Where the TDD and a finding differ, the finding wins (the one that matters most: F-1, a test that every `<a>` text is pairwise different would fail on the page as it is, 'Open the editor' three times, and on the bar and footer texts the design adds; the rule that the gate states is that no two links share the text of a sample link, and the test follows the gate).

The order is test first, as the profile asks: task-002 extends `site.test.js` red, task-003 writes the three static files (turns the files group green), task-004 edits the step "Assemble website" (turns the workflow group green), task-005 rewrites the page (turns the page groups green), task-006 runs the gates, the commands of the page against the jar, the link check and the render check, and writes the run record. The wave is sequential by the author's decision of 2026-11-01 (one run at a time). Inside this run, task-003 and task-004 touch different files and could run side by side, but both are verified by the same test file and the run is small, so the chain stays sequential and no task runs in parallel with another.

Baseline of the diff checks (found at Stage 9): when this plan was written the working tree held uncommitted work of run 0211 (`.github/workflows/ci-build.yaml` with 16 removed lines, `.github/CLAUDE.md`, `scripts/changes.mjs`, `src/test/javascript/changes-map.test.js`, the wave documents), because the wave commits when needed. A check of the form `git diff --stat -- <paths>` that is written as "prints nothing" or "is unchanged from the baseline" is therefore read against a baseline, not against HEAD: before its first edit a task saves `git diff -- <those paths>` and `git status --short` to the scratchpad, and the check is that the same commands print the same output after the task (apart from the files the task is meant to write). If the tree is clean at the start of the task, the baseline is empty and the check reads as written.

This run operates under the autonomy override of `complete-run` (read before Stage 10): no task stops for a human on its category alone. No task of this plan is `critical` or `human_required`, so the override changes no route. The only step that reaches production is the tag-only publish step (task-004); it fails closed and is reviewed by the author at the pull request, and it is proved for real only by the next release. Nothing in this plan commits, pushes, merges, tags or releases: those are human steps outside the plan, and the TDD says it does not authorise them.

## 1. Executive Summary

```yaml
summary:
  status: 'pending'
  product_goal: 'The presentation page shows what ArchiCode produces in its first screen, explains each sample behind one button, gives an agent a way in, shows plateaus, diff, stories and fold, and carries the metadata a search engine or an agent reads (#195); robots.txt, sitemap.xml and llms.txt are published beside it.'
  technical_approach: 'Amend the TDD with the review findings, extend site.test.js red (head, hero, links, agents, files, workflow, commands), write the three static files, add the copy and cmp lines to the tag-only step Assemble website, rewrite src/site/index.html in place as one file with inline CSS and SVG, then run the gates, run the commands of the page against the packaged jar, check the links, check the render in light and dark at 360 and 1280 px, and write in the run record which part is proved on the pull request and which only on a tag.'
  total_tasks: 6
  parallel_groups: 0
  high_risk_tasks: 0
  human_review_gates: 1
  autonomy_level: 'medium'
  recommendation: 'proceed_with_review'
  criteria:
    - 'src/site/index.html has exactly one h1, and its title and meta description contain C4, ArchiMate and PlantUML (REQ-7)'
    - 'The hero link named Try the editor on a realistic project is the first such link and has the Brightcart address, the second sample is reached by a link text of its own (Open the model of ArchiCode), with sample=archicode, and no link text of a sample link is shared (REQ-2, CON-1)'
    - 'A For agents block names archicode init, archicode guide, archicode query graph and archicode query schemas manifest and links the model of ArchiCode and llms.txt (REQ-4)'
    - 'A plateaus block shows plateau list, diff, plateau fold and stories generate with links to anchors the manual defines (REQ-6)'
    - 'robots.txt, sitemap.xml and llms.txt exist in src/site, the step Assemble website copies each and checks it with test -f and cmp, and site.test.js checks the three files and the step text (REQ-8)'
    - 'The page has a canonical link, Open Graph tags and a JSON-LD SoftwareApplication block that parses, in a typed script that is not the first or the last bare script (REQ-8, CON-2)'
    - 'The hero figure has an aria-label and a figcaption, the redirect of old manual anchors still works, and no page id equals a manual id (REQ-9, TG-4)'
    - 'Every archicode command on the page starts with a name of the command list of the test, and the options shown were read from the packaged jar and the manual, and the run record lists the commands run (REQ-10)'
    - 'node --test src/test/javascript/site.test.js, npm run test:unit, npm run format:check and npm run lint exit 0, git diff src/test/e2e is empty, and git diff --stat shows no file outside IMP-1 to IMP-5 and the run record'
    - 'The run record says which part is proved on the pull request and which only by the next release tag, and describes the render check by eye (REQ-8, REQ-9)'
```

## 2. PRD/TDD Consistency Assessment

```yaml
consistency_assessment:
  aligned_items:
    - 'Scope, REQ-1 to REQ-10, DEC-1 to DEC-10, CTR-1 to CTR-4 and IMP-1 to IMP-5 agree with the W-2 row and the P1 gate of the wave manifest; every task below traces to them'
    - 'No question is open in the TDD (Q-1 to Q-3 are settled in the draft: ASM-2, DEC-10 and DEF-2); Stage 6 checked them and left the TDD unedited'
    - 'The current state quoted by the TDD matches the repository at planning time: the step Assemble website at lines 413 to 434 of ci-build.yaml copies the manual, the stamped page, the stamped editor and both samples with test -f and cmp, and site.test.js is 115 lines'
    - 'The TDD touches no CLAUDE.md, no command, no editor code and no manual text, and the map of scripts/changes.mjs already sends src/site/** to the right jobs (R-13, R-14), so no change to the map is needed'
  gaps:
    - id: gap-001
      type: contradiction
      description: 'F-1 (S2): CTR-1 and CTR-4 require the texts of all links to be pairwise different, but gate P1 criterion 3 and DEC-2 only forbid two links sharing the sample text; the page today has Open the editor three times and the planned bar and footer would repeat Editor and GitHub.'
      impact: 'medium'
      recommendation: 'Decided here: the test narrows to the gate. The hero text appears once; every other link to editor/#...sample= has a text of its own, different from the hero text and from the others of its kind; the bar and the footer may repeat a text that has no sample address. task-001 words CTR-1 and CTR-4 so; task-002 writes it so.'
    - id: gap-002
      type: ambiguity
      description: 'F-2 (S2): the caption of DEC-1 says Generated from 14 lines of YAML, but the card beside it is 29 lines and the overview the SVG draws needs no stated number.'
      impact: 'low'
      recommendation: 'Decided here: drop the number. task-001 words the caption as Generated from a short YAML file: the person uses the platform, which uses an identity provider and a payment gateway; task-005 writes it so.'
    - id: gap-003
      type: contradiction
      description: 'F-3 (S2): the DEF numbering is inconsistent. DEC-8 says DEF-4 is not a deferral while DEF-4 is the Playwright spec, DEC-9 cites DEF-5 for that spec while DEF-5 is the tie of options to the binary, and REQ-10 cites DEF-1 and W-6 for options where DEF-5 is meant.'
      impact: 'low'
      recommendation: 'task-001 corrects the three references (DEC-8 names the wave plan, not a DEF; DEC-9 cites DEF-4; REQ-10 cites DEF-5 and W-6).'
    - id: gap-004
      type: contradiction
      description: 'F-4 (S2): TG-3 says nothing is proved only by reading, but the theme and the 360 px layout are checked by eye (DEC-9, Observability 5) and the tag-only copy is proved by reading the YAML and bash -n (ASM-3, RISK-3).'
      impact: 'low'
      recommendation: 'task-001 rewords TG-3 to: every check that can be automated in node is, in site.test.js, and the two that cannot (the render, the tag-only copy) are named in the run record.'
    - id: gap-005
      type: ambiguity
      description: 'F-5 (S2): Q-2 says the exact values of --fail-on and --plateau are read by the task and not pinned by the TDD, but DEC-6 already lists diff --plateau target --against baseline and diff --fail-on new,removed.'
      impact: 'medium'
      recommendation: 'Decided here: the DEC-6 lines are illustrative. FailOn.java accepts the seven kernel states and any, so new,removed is valid today, but task-005 reads archicode diff --help and the manual section diff and writes what they say; task-001 marks the lines as illustrative in DEC-6.'
    - id: gap-006
      type: ambiguity
      description: 'F-6 (S1): DEC-8 lists the repository and docs/architecture among absolute links, which reads as a Pages address and would 404.'
      impact: 'low'
      recommendation: 'task-001 writes the github.com/tmorin/archicode/tree/main/docs/architecture URL in DEC-8, as CTR-3 already says; task-003 writes that URL in llms.txt.'
    - id: gap-007
      type: ambiguity
      description: 'F-7 (S1): DEC-9 says the new ids are checked against the anchors of the old manual only to know which links stay on the page, which does not say the rule. Read against the repository at Stage 9, two ids of the design collide with a [[id]] of src/doc/README.adoc: plateaus (the section of DEC-6, [[plateaus]] at line 280) and version (the footer span that the page has today, [[version]] at line 2356). Neither shadows a published address (both manual ids were added after the manual left the root), but the rule of F-7 as the test states it would fail on both. The other ids (agents, try, start, limits, solution, main, top, ah, ah2) are not manual ids; context and problem go with DEC-3.'
      impact: 'medium'
      recommendation: 'Decided here, not left conditional: task-001 states the rule in DEC-9 (no id of the page equals a manual [[id]]) and renames the section of DEC-6 to plateau-states in DEC-6, in the Proposed Design list and in the id list of DEC-9. task-002 adds the test (the id attributes of the page against the [[id]] list of README.adoc). task-005 names the section plateau-states and renames the footer span from version to site-version, in the markup and in the last bare script; the footer test of site.test.js does not name the id (it stubs getElementById), so it stays as it is. The links to the manual anchors docs/#plateaus and docs/#version are unaffected.'
    - id: gap-008
      type: ambiguity
      description: 'F-8 (S1): DEC-7 says codeRepository-style url of the site and sameAs the repository, which is muddled, and offers price 0 without priceCurrency.'
      impact: 'low'
      recommendation: 'Decided here: url is the Pages root, sameAs the repository, offers dropped (the tests assert only @context and @type, and a price is not part of the claim). task-001 words DEC-7 so; task-005 writes it so.'
    - id: gap-009
      type: ambiguity
      description: 'F-9 (S1): the criteria are stated three times (REQ-7 and REQ-8, CTR-4, Observability 2).'
      impact: 'low'
      recommendation: 'task-001 keeps CTR-4 as the owner and lets Observability 2 name only the grep commands the gate asks for.'
    - id: gap-010
      type: ambiguity
      description: 'F-10 (S1): RISK-6 says reviewed in Stage 5, which is stale once Stage 5 is done.'
      impact: 'low'
      recommendation: 'task-001 words RISK-6 as what was checked: the page claims no certification and says the views follow C4 and ArchiMate (DEC-7, Security and Privacy).'
    - id: gap-011
      type: risk
      description: 'The step Assemble website runs only on a release tag (ASM-3), so a typo in the copy lines is not proved by the pull request. The step is a run block under set -euo pipefail, so a missing file fails the tag run before Publish website and the site keeps the previous release.'
      impact: 'medium'
      recommendation: 'Proved by the text test of the step, by bash -n on the extracted run text and by a local dry run of the copy lines into a temporary folder (task-006); proved for real by the next release tag. The run record says so and nothing in this plan authorises a tag.'
    - id: gap-012
      type: risk
      description: 'The render check (light, dark, 360 and 1280 px) has no automated form for this page (DEC-9, DEF-4), so it is a judgement made by the task from screenshots of the browser pane.'
      impact: 'low'
      recommendation: 'task-006 takes the four views, states in the run record what each shows (claim, figure and hero button in the first screen, no horizontal scroll at 360 px) and says plainly that it was by eye; if the browser pane is unavailable it records not checked and does not claim the check.'
    - id: gap-013
      type: risk
      description: 'The options shown on the page (diff, plateau fold, stories generate, views generate -i shop_overview) are read from the packaged jar, which needs JDK 25 (the shell default is 21) and a built target/quarkus-app (present at planning time, built by an earlier run).'
      impact: 'low'
      recommendation: 'task-005 and task-006 use JAVA_HOME of sdkman 25 and run ./mvnw -q package -DskipTests only if target/quarkus-app is absent; if the jar cannot run, the task writes the commands from the manual only, records not run against the jar and says so in the Findings of the prg.'
  blocking_gaps: []
```

## 3. Execution Graph

```yaml
execution_graph:
  nodes:
    - id: task-001
      status: 'done'
      title: 'Amend the TDD with the Stage 5 findings F-1 to F-10'
      depends_on: []
      produces:
        - 'tdd-0212-homepage.md amended'
      agent_role: 'Architecture Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 82
    - id: task-002
      status: 'done'
      title: 'Extend src/test/javascript/site.test.js, red'
      depends_on: [task-001]
      produces:
        - 'src/test/javascript/site.test.js extended'
      agent_role: 'Test Generation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 75
    - id: task-003
      status: 'done'
      title: 'Write robots.txt, sitemap.xml and llms.txt'
      depends_on: [task-002]
      produces:
        - 'src/site/robots.txt'
        - 'src/site/sitemap.xml'
        - 'src/site/llms.txt'
      agent_role: 'Documentation Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 85
    - id: task-004
      status: 'done'
      title: 'Add the copy and cmp lines of the three files to the step Assemble website'
      depends_on: [task-003]
      produces:
        - '.github/workflows/ci-build.yaml (step Assemble website only)'
      agent_role: 'Infrastructure Agent'
      autonomy: 'review_after'
      risk: 'medium'
      confidence: 80
    - id: task-005
      status: 'done'
      title: 'Rewrite src/site/index.html in place'
      depends_on: [task-004]
      produces:
        - 'src/site/index.html'
      agent_role: 'Frontend Implementation Agent'
      autonomy: 'autonomous'
      risk: 'medium'
      confidence: 68
    - id: task-006
      status: 'done'
      title: 'Run the gates, the commands against the jar, the link and render checks, and write the run record'
      depends_on: [task-005]
      produces:
        - 'run-0212-homepage.md with the verification and the proved-where statement'
        - 'prg-0212-homepage.md Findings with the check output'
      agent_role: 'QA Agent'
      autonomy: 'autonomous'
      risk: 'low'
      confidence: 78
  edges:
    - from: task-001
      to: task-002
      reason: 'the test is written against the amended TDD (the narrowed link rule of F-1, the page id rule of F-7, the typed JSON-LD)'
    - from: task-002
      to: task-003
      reason: 'the files are written to turn the red files group green; the test names what it expects of each'
    - from: task-003
      to: task-004
      reason: 'the step copies files that must exist, and the workflow group checks the step text against the three names'
    - from: task-004
      to: task-005
      reason: 'the page links llms.txt and the page task runs the whole test file, whose files and workflow groups must already be green'
    - from: task-005
      to: task-006
      reason: 'the gates, the jar commands, the link check and the render check cover the page and the files as written'
```

## 4. Task Catalog

```yaml
task_catalog:
  tasks:
    - id: task-001
      title: 'Amend the TDD with the Stage 5 findings F-1 to F-10'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-7'
          - 'REQ-8'
          - 'REQ-10'
        tdd:
          - 'Technical Goals TG-3'
          - 'DEC-1'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-8'
          - 'DEC-9'
          - 'CTR-1'
          - 'CTR-4'
          - 'RISK-6'
          - 'Observability and Verification'
      outputs:
        - 'CTR-1 and CTR-4 state the rule of the gate: the hero text appears once, every other sample link has a text of its own, the bar and footer may repeat texts that carry no sample address (F-1)'
        - 'DEC-1 words the caption without a line count (F-2)'
        - 'DEC-8 names the github.com tree URL for docs/architecture and the wave plan for the later edit of llms.txt, not a DEF; DEC-9 cites DEF-4 for the Playwright spec; REQ-10 cites DEF-5 and W-6 (F-3, F-6)'
        - 'TG-3 says every check that can be automated in node is, and names the two that cannot (F-4)'
        - 'DEC-6 marks its command lines as illustrative, to be replaced by what the help and the manual say (F-5)'
        - 'DEC-9 states the rule that no id of the page equals a manual id, lists the page ids with plateau-states in place of plateaus and site-version in place of the footer version, and CTR-4 lists the test (F-7, gap-007); DEC-6 and the Proposed Design name the section plateau-states'
        - 'DEC-7 words url as the Pages root and sameAs as the repository and drops offers (F-8)'
        - 'Observability 2 names only the grep commands of the gate (F-9); RISK-6 says what was checked (F-10)'
      verification:
        - 'grep -c "14 lines of YAML" on the TDD prints 0'
        - 'grep -q "no id of the page equals a manual id" on the TDD succeeds'
        - 'grep -c "DEF-4 is not a deferral" on the TDD prints 0'
        - 'grep -c "codeRepository-style" on the TDD prints 0'
        - 'grep -c "reviewed in Stage 5" on the TDD prints 0'
        - 'grep -c "id=\"plateaus\"" on the TDD prints 0'
        - 'git diff --stat -- src scripts .github pom.xml package.json is unchanged from the baseline taken before the task (see the baseline paragraph of the introduction)'
      risk: 'low'
      confidence: 82
      human_review: 'none'
      escalation_triggers:
        - 'A finding contradicts the repository when read (follow the repository, write the reading in the Findings of the prg)'
        - 'A fix needs a product decision (none is expected: F-2, F-5 and F-8 are wording choices taken in gap-002, gap-005 and gap-008)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-002
      title: 'Extend src/test/javascript/site.test.js, red'
      source_requirements:
        prd:
          - 'REQ-2'
          - 'REQ-7'
          - 'REQ-8'
          - 'REQ-9'
          - 'REQ-10'
        tdd:
          - 'DEC-2'
          - 'DEC-7'
          - 'DEC-8'
          - 'DEC-9'
          - 'DEC-10'
          - 'CTR-1'
          - 'CTR-2'
          - 'CTR-3'
          - 'CTR-4'
          - 'CON-1'
          - 'CON-2'
          - 'CON-5'
      outputs:
        - 'site.test.js keeps its existing cases, changes the one that uses #problem to #start and the one that asserts two identical sample hrefs to accept one Brightcart address and one archicode address with every sample= id in BROWSER_SAMPLES, and keeps reading the first bare script and the last one'
        - 'New tests, each title starting with its group in square brackets: [head] one h1, title and description contain C4, ArchiMate and PlantUML, canonical, og:title, a JSON-LD block that parses with @context and @type SoftwareApplication in a typed script; [links] the first link named Try the editor on a realistic project has the Brightcart address and its text appears once, sample=archicode appears at least once with a link text of its own, no id attribute of the page equals a manual [[id]] (red on the page as it is: version; plateau-states and site-version are the names the page takes in task-005); [agents] the block holds the four command strings and a link with sample=archicode and a link to llms.txt; [figure] the hero figure has an aria-label and a figcaption; [commands] every archicode command in code or pre starts with a name of the command list of DEC-10; [files] robots.txt names the sitemap, sitemap.xml has exactly the three loc, llms.txt has one H1 and its docs/#id links resolve to manual anchors; [workflow] the step Assemble website mentions each of the three files in a cp and in a cmp'
        - 'The Pages root address is one constant read by [head] and [files] (RISK-5)'
        - 'No test needs a jar, a network or a browser, and the file is Prettier-clean and ESLint-clean'
      verification:
        - 'node --check src/test/javascript/site.test.js exits 0'
        - 'npx prettier --check src/test/javascript/site.test.js exits 0'
        - 'npx eslint --max-warnings 0 src/test/javascript/site.test.js exits 0'
        - 'node --test src/test/javascript/site.test.js exits non-zero and names failing tests of the groups head, links, agents, figure, files and workflow (the red state: task-003 turns the files group green, task-004 the workflow group, task-005 the others)'
        - 'grep -c "^test(.\[" src/test/javascript/site.test.js counts at least 7 titles that start with a group in brackets'
        - 'git diff --stat -- src/site scripts .github src/main src/test/e2e is unchanged from the baseline (src/test/e2e: empty)'
      risk: 'medium'
      confidence: 75
      human_review: 'none'
      escalation_triggers:
        - 'A test cannot be written without reading the page as it will be (write it against the TDD contract, not against the old page, and log the choice)'
        - 'The existing cases of site.test.js cannot be kept (stop and log which one and why: the redirect and the stamp are a published contract, TG-4)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-003
      title: 'Write robots.txt, sitemap.xml and llms.txt'
      source_requirements:
        prd:
          - 'REQ-8'
        tdd:
          - 'DEC-8'
          - 'CTR-3'
          - 'IMP-2'
          - 'IF-3'
          - 'ASM-1'
          - 'ASM-2'
      outputs:
        - 'src/site/robots.txt: User-agent *, Allow /, and the Sitemap line with the absolute URL https://tmorin.github.io/archicode/sitemap.xml'
        - 'src/site/sitemap.xml: a urlset in the sitemaps.org namespace with exactly three loc (the root, docs/, editor/) as absolute URLs and no other tag'
        - 'src/site/llms.txt: one H1 ArchiCode, one blockquote sentence, an H2 Start here with absolute links to the manual root, docs/#guide, docs/#init, docs/#install, the editor, the repository and the github.com tree of docs/architecture, and an H2 Optional with the releases page; every docs/#id is a [[id]] of src/doc/README.adoc'
        - 'The three files are ASCII with a final newline, and none is stamped'
      verification:
        - 'node --test --test-name-pattern="\[files\]" src/test/javascript/site.test.js exits 0'
        - 'test -f src/site/robots.txt && test -f src/site/sitemap.xml && test -f src/site/llms.txt'
        - 'grep -c "<loc>" src/site/sitemap.xml prints 3'
        - 'grep -c "^# " src/site/llms.txt prints 1'
        - 'git diff --stat -- src/site/index.html .github src/main is unchanged from the baseline'
      risk: 'low'
      confidence: 85
      human_review: 'none'
      escalation_triggers:
        - 'A docs/#id named by the design is not a [[id]] of the manual (drop the link, log it, never edit the manual)'
        - 'The public address of the site is found to differ from ASM-1 (stop: it changes the three files, the canonical and the sitemap together)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-004
      title: 'Add the copy and cmp lines of the three files to the step Assemble website'
      source_requirements:
        prd:
          - 'REQ-8'
        tdd:
          - 'DEC-8'
          - 'IMP-3'
          - 'CTR-3'
          - 'FLOW-3'
          - 'ASM-3'
          - 'CON-6'
      outputs:
        - 'In the step Assemble website only: a cp of src/site/robots.txt, src/site/sitemap.xml and src/site/llms.txt into target/site/, then for each a test -f of the copy and a cmp against its source, in the style of the samples and before the grep of the stamp'
        - 'No change to the name, the if, the needs, the permissions or any other step; the comment of the step says it also copies the three static files'
      verification:
        - 'node --test --test-name-pattern="\[workflow\]" src/test/javascript/site.test.js exits 0'
        - 'node --test --test-name-pattern="folders that the CI assembles" src/test/javascript/site.test.js exits 0 and reports one passing test (the existing test that reads target/site/index.html, target/site/docs/ and target/site/editor/index.html stays green; the pattern is the title of that test, since no title contains the word workflow)'
        - 'npx prettier .github/workflows/ci-build.yaml > /dev/null exits 0 (a YAML syntax error exits 2); if actionlint is on the path, actionlint .github/workflows/ci-build.yaml exits 0'
        - 'git diff -U0 -- .github/workflows/ci-build.yaml | grep -c "^-[^-]" prints at most 1 more than the count taken in the baseline before the task (only the comment line may change; the baseline already counts the removed lines of run 0211)'
        - 'git diff --stat -- src/site/index.html src/main scripts is unchanged from the baseline'
      risk: 'medium'
      confidence: 80
      human_review: 'after'
      escalation_triggers:
        - 'A change outside the step Assemble website seems needed (the Pages job structure is out of scope, TDD Scope)'
        - 'The step cannot be edited without touching a line of the Changes job or the Build gate that run 0211 owns (stop and log it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-005
      title: 'Rewrite src/site/index.html in place'
      source_requirements:
        prd:
          - 'REQ-1'
          - 'REQ-2'
          - 'REQ-3'
          - 'REQ-4'
          - 'REQ-5'
          - 'REQ-6'
          - 'REQ-7'
          - 'REQ-8'
          - 'REQ-9'
          - 'REQ-10'
        tdd:
          - 'Proposed Design'
          - 'DEC-1'
          - 'DEC-2'
          - 'DEC-3'
          - 'DEC-4'
          - 'DEC-5'
          - 'DEC-6'
          - 'DEC-7'
          - 'DEC-9'
          - 'CTR-1'
          - 'CTR-2'
          - 'IMP-1'
          - 'IF-1'
          - 'IF-2'
          - 'FLOW-1'
          - 'FLOW-2'
          - 'CON-1'
          - 'CON-2'
          - 'CON-3'
          - 'CON-4'
          - 'CON-8'
      outputs:
        - 'One file, inline CSS and SVG, no external font, script or image: bar, hero (the single h1, the lead, a figure with the overview SVG under its own marker id ah-hero, an aria-label and a visible figcaption, the hero link Try the editor on a realistic project to the Brightcart address, the Get started link, the two sentences of Context and Problem, the hint line), what it produces (model card, tabbed diagram card, Views, Queries kept), plateaus (four command lines read from the help and the manual, links to docs/#plateaus, docs/#diff, docs/#stories, docs/#plateau-list), For agents (id agents, the four commands, the links to llms.txt, to the model in the editor and to the github.com tree), Try it (both samples, Open the Brightcart sample and Open the model of ArchiCode, one button each), scope and limits moved up with its three bullets unchanged, Get started (install, init, views generate -i with the view id init prints, editor serve), footer (manual, releases, editor, container image, version)'
        - 'Head: title and description with C4, ArchiMate and PlantUML, canonical, Open Graph and twitter:card, one application/ld+json SoftwareApplication block (url the Pages root, sameAs the repository, no offers) that is not a bare script; the archicode-version stamp once and as is; the first bare script (the redirect) unchanged except its comment and the last bare script (version and tabs) kept'
        - 'Page ids: plateau-states for the plateaus section and site-version for the footer span (and the last bare script that fills it), so that no id of the page equals a manual [[id]] (gap-007); agents, try, start, limits, solution, main, top, ah, ah2 and ah-hero stay'
        - 'Tokens added in both the light and the dark block, lang, skip link, prefers-reduced-motion and focus-visible kept, no horizontal scroll at 360 px'
        - 'The options shown on the page are those printed by archicode diff --help, plateau fold --help and stories generate --help and by the manual, read when the page is written (Q-2)'
      verification:
        - 'node --test src/test/javascript/site.test.js exits 0 (all groups, including the redirect, stamp, anchors and footer cases that existed before)'
        - 'grep -c "<h1" src/site/index.html prints 1'
        - 'grep -c "sample=archicode" src/site/index.html prints at least 1'
        - 'grep -c "content=\"dev\"" src/site/index.html prints 1'
        - 'grep -c "id=\"version\"\|id=\"plateaus\"" src/site/index.html prints 0'
        - 'sed -n "/<title>/p;/name=\"description\"/p" src/site/index.html | grep -o "C4\|ArchiMate\|PlantUML" | sort -u prints the three words'
        - 'npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'git diff --stat -- src/main scripts .github src/test/e2e is unchanged from the baseline apart from the step of task-004 (src/test/e2e: empty)'
        - 'wc -c src/site/index.html is read and written in the Findings (about 60 KB expected, not a gate)'
      risk: 'medium'
      confidence: 68
      human_review: 'none'
      escalation_triggers:
        - 'A published address stops working (an old docs/#anchor redirect, editor/, editor/#/...sample=...): stop, restore the redirect script, log it (TG-4)'
        - 'The e2e spec cannot find the hero link by name (CON-1): change the page, never the spec'
        - 'A command or option of the design is not in the help or the manual: write what the help says and log the difference'
        - 'The page needs a binary or an external resource to hold its design (DEC-1, Non-Goals: stop and log it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
    - id: task-006
      title: 'Run the gates, the commands against the jar, the link and render checks, and write the run record'
      source_requirements:
        prd:
          - 'REQ-8'
          - 'REQ-9'
          - 'REQ-10'
        tdd:
          - 'Observability and Verification'
          - 'IMP-5'
          - 'ASM-3'
          - 'RISK-3'
          - 'RISK-4'
          - 'DEC-9'
          - 'Deployment and Rollout'
      outputs:
        - 'The run record lists: the gate commands and their exit codes; the commands run against the packaged jar (init into a temporary folder, views generate -i shop_overview there, query schemas manifest, diff --help, plateau fold --help, stories generate --help) and that the output of init names the view id used on the page; the link check (curl -sI of each external address, recorded and not a gate); the render check in light and dark at 360 and 1280 px described by eye; the dry run of the copy lines of the step into a temporary folder with bash -n of the run text; and the statement of what is proved on the pull request and what only by the next release tag'
        - 'The Findings of the prg hold the output that matters (jar commands, the weight of the page, any link that failed) and nothing is committed'
      verification:
        - 'node --test src/test/javascript/site.test.js, npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'git diff --stat shows, beyond the baseline of the introduction, only the files of IMP-1 to IMP-5, this run directory and the prg; git diff src/test/e2e prints nothing'
        - 'grep -q "next release" docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/run-0212-homepage.md succeeds'
        - 'grep -q "by eye" docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/run-0212-homepage.md succeeds, or the record says the render was not checked'
        - 'bash -n on the run text of the step Assemble website exits 0'
      risk: 'low'
      confidence: 78
      human_review: 'none'
      escalation_triggers:
        - 'A gate fails and the fix is in a file of another task (fix it there, log it, run the gates again)'
        - 'The jar cannot run (log not run against the jar, never claim the check)'
        - 'The browser pane is unavailable (record the render as not checked, never claim it)'
      delegation_tier: 'standard'
      results: 'tier standard, model sonnet, effort medium, profile low-cost, passed first time, inline (leaf), independently verified'
```

## 5. Parallelization Plan

```yaml
parallelization_plan:
  groups: []
```

No parallel group. The chain is the dependency order: the test before the files, the files before the step that copies them, the step before the page that links `llms.txt`, the page before the checks. task-003 and task-004 do not share a file, but both are verified by the same test file and the wave is sequential by the author's decision.

## 6. Human Review Gates

```yaml
human_review_gates:
  gates:
    - id: gate-001
      trigger: 'The step Assemble website publishes to production on a release tag and is proved only by the next release (ASM-3), so the author reads its diff at the pull request'
      required_before: []
      required_after: ['task-004']
      reviewer_focus:
        - 'Only the step Assemble website changed, and only by the copy, test -f and cmp lines of the three files'
        - 'The run text still runs under set -euo pipefail, so a missing file fails before Publish website'
        - 'The absolute URLs of the three files and the canonical are the address of ASM-1'
```

This run operates under the autonomy override of `complete-run`: gate-001 is a review the author does at the pull request after the run, not a stop inside it (the task is `review_after`, not `human_required`). The page itself needs no gate: it publishes only with a release, which this plan does not authorise.

## 7. Risk Assessment

```yaml
risk_assessment:
  by_task:
    - id: task-001
      risk: 'low'
      rationale: 'document edit of a draft, no code; the checks are greps'
    - id: task-002
      risk: 'medium'
      rationale: 'the existing cases pin published contracts (redirect, stamp, anchors); a test rewritten too loosely would stop guarding them'
    - id: task-003
      risk: 'low'
      rationale: 'three small static files with absolute URLs, checked by the files group'
    - id: task-004
      risk: 'medium'
      rationale: 'a production publish step that cannot be run on a pull request; fails closed and is limited to copy lines'
    - id: task-005
      risk: 'medium'
      rationale: 'a large rewrite of the file the e2e spec and the redirect read; the contracts are tested, the visual result is judged by eye'
    - id: task-006
      risk: 'low'
      rationale: 'reads and records; changes only the run record and the prg'
  by_area:
    - area: 'ui'
      risk: 'medium'
      rationale: 'light and dark themes and 360 px are checked by eye (DEC-9, DEF-4); the hero SVG is hand-drawn and can drift from the tool (RISK-2)'
    - area: 'infra'
      risk: 'medium'
      rationale: 'the tag-only step is proved for real only by the next release; a bad copy is stopped before Publish website'
    - area: 'docs'
      risk: 'low'
      rationale: 'every command, option and link on the page is checked against the jar and the manual once; the names by test, the options by the run record (RISK-4)'
    - area: 'security'
      risk: 'low'
      rationale: 'no script from another origin, no tracker, no form; JSON-LD and Open Graph carry public facts and claim no certification (RISK-6)'
```

## 8. Confidence Assessment

```yaml
confidence_assessment:
  by_task:
    - id: task-001
      score: 82
      rationale: 'ten findings, each with a located fix; none needs a decision beyond the three taken in this plan'
    - id: task-002
      score: 75
      rationale: 'the contracts are explicit in CTR-1 to CTR-4; the extraction of the commands and of the page ids is new code in a node test'
    - id: task-003
      score: 85
      rationale: 'three flat files with exact content in DEC-8; the manual ids are checked by the test'
    - id: task-004
      score: 80
      rationale: 'copy lines in the style of the samples; the text test and bash -n cover the shape, not the tag run'
    - id: task-005
      score: 68
      rationale: 'a large hand-written page with options to read from the binary and the manual and a render that is judged by eye; the contracts it must keep are tested'
    - id: task-006
      score: 78
      rationale: 'commands are listed in the TDD; the jar needs JDK 25 and the browser pane may be unavailable'
```

## 9. Agent Assignment Plan

```yaml
agent_assignment_plan:
  assignments:
    - task_id: task-001
      agent_role: 'Architecture Agent'
      objective: 'Absorb the review findings F-1 to F-10 into tdd-0212-homepage.md with the decisions of gap-001 to gap-010, without changing a source file.'
      context:
        prd_excerpts:
          - 'No PRD: REQ-1 to REQ-10 are in the TDD section PRD Traceability'
        tdd_excerpts:
          - 'TG-3, DEC-1, DEC-6, DEC-7, DEC-8, DEC-9, CTR-1, CTR-4, RISK-6'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/tdd-0212-homepage.md'
      acceptance_criteria:
        - 'Each finding is applied as its gap recommends and the TDD stays one coherent document'
      verification:
        - 'grep -c "14 lines of YAML" on the TDD prints 0'
        - 'grep -q "no id of the page equals a manual id" on the TDD succeeds'
        - 'grep -c "DEF-4 is not a deferral" on the TDD prints 0'
        - 'grep -c "codeRepository-style" on the TDD prints 0'
        - 'grep -c "reviewed in Stage 5" on the TDD prints 0'
        - 'grep -c "id=\"plateaus\"" on the TDD prints 0'
        - 'git diff --stat -- src scripts .github pom.xml package.json is unchanged from the baseline taken before the task (see the baseline paragraph of the introduction)'
      escalation_triggers:
        - 'A finding contradicts the repository when read'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-002
      agent_role: 'Test Generation Agent'
      objective: 'Extend site.test.js with the grouped tests of CTR-4 and adapt the two existing cases, leaving the group files, workflow, head, links, agents and figure red.'
      context:
        prd_excerpts:
          - 'REQ-2, REQ-7, REQ-8, REQ-9, REQ-10'
        tdd_excerpts:
          - 'CTR-1 to CTR-4, DEC-10, CON-1, CON-2, CON-5'
      likely_files:
        - 'src/test/javascript/site.test.js'
      acceptance_criteria:
        - 'The new tests are named by group in brackets, need no jar, network or browser, and fail for the right reason on the page as it is'
      verification:
        - 'node --check src/test/javascript/site.test.js exits 0'
        - 'npx prettier --check src/test/javascript/site.test.js exits 0'
        - 'npx eslint --max-warnings 0 src/test/javascript/site.test.js exits 0'
        - 'node --test src/test/javascript/site.test.js exits non-zero and names failing tests of the groups head, links, agents, figure, files and workflow (the red state: task-003 turns the files group green, task-004 the workflow group, task-005 the others)'
        - 'grep -c "^test(.\[" src/test/javascript/site.test.js counts at least 7 titles that start with a group in brackets'
        - 'git diff --stat -- src/site scripts .github src/main src/test/e2e is unchanged from the baseline (src/test/e2e: empty)'
      escalation_triggers:
        - 'An existing case cannot be kept'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-003
      agent_role: 'Documentation Agent'
      objective: 'Write the three static files as DEC-8 and CTR-3 say, with absolute URLs, and turn the files group green.'
      context:
        prd_excerpts:
          - 'REQ-8'
        tdd_excerpts:
          - 'DEC-8, CTR-3, IMP-2, ASM-1, ASM-2'
      likely_files:
        - 'src/site/robots.txt'
        - 'src/site/sitemap.xml'
        - 'src/site/llms.txt'
      acceptance_criteria:
        - 'The files group of site.test.js passes and every docs/#id resolves to a manual anchor'
      verification:
        - 'node --test --test-name-pattern="\[files\]" src/test/javascript/site.test.js exits 0'
        - 'test -f src/site/robots.txt && test -f src/site/sitemap.xml && test -f src/site/llms.txt'
        - 'grep -c "<loc>" src/site/sitemap.xml prints 3'
        - 'grep -c "^# " src/site/llms.txt prints 1'
        - 'git diff --stat -- src/site/index.html .github src/main is unchanged from the baseline'
      escalation_triggers:
        - 'The public address differs from ASM-1'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'low'
    - task_id: task-004
      agent_role: 'Infrastructure Agent'
      objective: 'Add the cp, test -f and cmp lines of the three files to the step Assemble website and nothing else.'
      context:
        prd_excerpts:
          - 'REQ-8'
        tdd_excerpts:
          - 'DEC-8, IMP-3, FLOW-3, ASM-3, CON-6'
      likely_files:
        - '.github/workflows/ci-build.yaml'
      acceptance_criteria:
        - 'The workflow group passes, the YAML parses, and the diff touches only that step'
      verification:
        - 'node --test --test-name-pattern="\[workflow\]" src/test/javascript/site.test.js exits 0'
        - 'node --test --test-name-pattern="folders that the CI assembles" src/test/javascript/site.test.js exits 0 and reports one passing test (the existing test that reads target/site/index.html, target/site/docs/ and target/site/editor/index.html stays green; the pattern is the title of that test, since no title contains the word workflow)'
        - 'npx prettier .github/workflows/ci-build.yaml > /dev/null exits 0 (a YAML syntax error exits 2); if actionlint is on the path, actionlint .github/workflows/ci-build.yaml exits 0'
        - 'git diff -U0 -- .github/workflows/ci-build.yaml | grep -c "^-[^-]" prints at most 1 more than the count taken in the baseline before the task (only the comment line may change; the baseline already counts the removed lines of run 0211)'
        - 'git diff --stat -- src/site/index.html src/main scripts is unchanged from the baseline'
      escalation_triggers:
        - 'A change outside the step seems needed'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
    - task_id: task-005
      agent_role: 'Frontend Implementation Agent'
      objective: 'Rewrite the presentation page in place in the order of the Proposed Design, keeping every published contract, and turn all groups of site.test.js green.'
      context:
        prd_excerpts:
          - 'REQ-1 to REQ-10'
        tdd_excerpts:
          - 'Proposed Design, DEC-1 to DEC-7, DEC-9, CTR-1, CTR-2, CON-1 to CON-4, CON-8'
      likely_files:
        - 'src/site/index.html'
      acceptance_criteria:
        - 'site.test.js, test:unit, format:check and lint exit 0, and the greps of the task pass'
      verification:
        - 'node --test src/test/javascript/site.test.js exits 0 (all groups, including the redirect, stamp, anchors and footer cases that existed before)'
        - 'grep -c "<h1" src/site/index.html prints 1'
        - 'grep -c "sample=archicode" src/site/index.html prints at least 1'
        - 'grep -c "content=\"dev\"" src/site/index.html prints 1'
        - 'grep -c "id=\"version\"\|id=\"plateaus\"" src/site/index.html prints 0'
        - 'sed -n "/<title>/p;/name=\"description\"/p" src/site/index.html | grep -o "C4\|ArchiMate\|PlantUML" | sort -u prints the three words'
        - 'npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'git diff --stat -- src/main scripts .github src/test/e2e is unchanged from the baseline apart from the step of task-004 (src/test/e2e: empty)'
        - 'wc -c src/site/index.html is read and written in the Findings (about 60 KB expected, not a gate)'
      escalation_triggers:
        - 'A published address stops working'
        - 'The e2e link name is lost'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'high'
    - task_id: task-006
      agent_role: 'QA Agent'
      objective: 'Run every gate and check of Observability and Verification, record what was run and what was proved where, and say plainly what was by eye or not run.'
      context:
        prd_excerpts:
          - 'REQ-8, REQ-9, REQ-10'
        tdd_excerpts:
          - 'Observability and Verification 1 to 7, IMP-5, ASM-3, RISK-3, RISK-4, DEC-9'
      likely_files:
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/run-0212-homepage.md'
        - 'docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/prg-0212-homepage.md'
      acceptance_criteria:
        - 'The run record holds the commands, the exit codes, the render description and the proved-where statement, with no claim of a check that was not run'
      verification:
        - 'node --test src/test/javascript/site.test.js, npm run test:unit, npm run format:check and npm run lint exit 0'
        - 'git diff --stat shows, beyond the baseline of the introduction, only the files of IMP-1 to IMP-5, this run directory and the prg; git diff src/test/e2e prints nothing'
        - 'grep -q "next release" docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/run-0212-homepage.md succeeds'
        - 'grep -q "by eye" docs/wav/wav-030-pages-ci-and-toolbar/run/run-0212-homepage/run-0212-homepage.md succeeds, or the record says the render was not checked'
        - 'bash -n on the run text of the step Assemble website exits 0'
      escalation_triggers:
        - 'A gate fails'
        - 'The jar or the browser pane is unavailable'
      suggested_subagent_type: 'general-purpose'
      suggested_model: '(default)'
      suggested_effort: 'medium'
```

## 10. Verification Plan

```yaml
verification_plan:
  checks:
    - task_id: task-001
      methods:
        - 'grep of the amended phrases and of the removed ones'
        - 'git diff --stat on the source folders'
      success_criteria:
        - 'The ten findings are in the TDD and no source file changed'
    - task_id: task-002
      methods:
        - 'node --check, prettier --check, eslint'
        - 'node --test run to confirm the red state'
      success_criteria:
        - 'The file is clean and fails in the groups head, links, agents, figure, files and workflow, for the expected reasons'
    - task_id: task-003
      methods:
        - 'node --test with the files pattern'
        - 'grep counts on the sitemap and llms.txt'
      success_criteria:
        - 'The files group is green and the three files exist'
    - task_id: task-004
      methods:
        - 'node --test with the workflow pattern'
        - 'prettier parse of the workflow, actionlint if present'
        - 'git diff of the removed lines'
      success_criteria:
        - 'The workflow group is green and only the step Assemble website changed'
    - task_id: task-005
      methods:
        - 'node --test of the whole file'
        - 'npm run test:unit, format:check, lint'
        - 'grep of the gate commands'
      success_criteria:
        - 'All groups are green, one h1, the three words in the head, one stamp, no change outside the page, the files and the step'
    - task_id: task-006
      methods:
        - 'the gates again'
        - 'the jar commands, the link check, the dry run of the copy lines, bash -n'
        - 'the render check in the browser pane'
      success_criteria:
        - 'The run record states what was run, what was proved on the pull request, what only by the next release tag and what was by eye'
```

## 11. Escalation Rules

```yaml
escalation_rules:
  rules:
    - condition: 'A published address stops working: an old docs/#anchor redirect, editor/, or editor/#/...sample=...'
      action: 'Stop the task, restore the redirect script and the address, log it in the Findings of the prg (TG-4); never weaken a test to pass'
    - condition: 'The e2e spec cannot find the hero link by name or its href shape (CON-1)'
      action: 'Change the page, never the spec; src/test/e2e stays untouched'
    - condition: 'The public address of the site is not the one of ASM-1'
      action: 'Stop: the three files, the canonical, the sitemap and the JSON-LD change together; log it and ask'
    - condition: 'A command or option of the design is not in the help or the manual'
      action: 'Write what the help says, log the difference against the TDD'
    - condition: 'The step Assemble website cannot be edited without touching another step, or the jobs of run 0211'
      action: 'Stop and log it; the Pages job structure and the Changes filter are out of scope'
    - condition: 'The jar cannot run, or the browser pane is unavailable'
      action: 'Record the check as not run, say so in the run record, never claim it'
    - condition: 'A task needs a commit, a push, a merge, a tag or a release'
      action: 'Do not do it: those are human steps outside the plan; the pln says what to state instead'
    - condition: 'A task fails its own verification'
      action: 'Re-dispatch once one rung up per the delegation policy; a second failure is handled inline and logged as a finding'
    - condition: 'The run operates under the autonomy override of complete-run'
      action: 'No task is human_required or critical, so the override changes no route; gate-001 is a review by the author at the pull request after the run, not a stop inside it'
```

## 12. Final Execution Manifest

```yaml
execution_manifest:
  status: 'done'
  recommendation: 'proceed_with_review'
  autonomy_level: 'medium'
  total_tasks: 6
  autonomous_tasks: 5
  review_before_tasks: 0
  review_after_tasks: 1
  human_required_tasks: 0
  blocked_tasks: 0
  critical_path_tasks:
    - task-001
    - task-002
    - task-003
    - task-004
    - task-005
    - task-006
  parallel_groups: []
  required_human_gates:
    - gate-001
  highest_risk_tasks:
    - task-004
    - task-005
  lowest_confidence_tasks:
    - task-005
    - task-002
  next_action: 'task-001: amend the TDD with the findings F-1 to F-10, then task-002 writes the test red.'
  criteria:
    - 'site.test.js, npm run test:unit, npm run format:check and npm run lint exit 0 and git diff src/test/e2e is empty'
    - 'The page, the three files and the step Assemble website satisfy the criteria of the summary, and no file outside IMP-1 to IMP-5 and the run record changed'
    - 'The run record says what is proved on the pull request and what only by the next release tag'
```
