---
type: run
run: 0214
status: completed
profile: TDD+pln
wave: 030
---

# Run 0214: manual-concepts-and-voice

Run of wave 030 (pages, CI and toolbar), manifest id W-4.

Files outside likely_paths: README.md, src/test/javascript/manual-voice.test.js

## What the run did

The two old pieces about plateaus in Reference (the Domain section "States of an architecture (plateaus)" and "Comparing two plateaus") are one page, `== Plateaus`, under the part Concepts, with `== Limits of today` as the next chapter of that part. The `settings.manifests.paths` note went to the Upgrading chapter. The filler intros and filler words are cleared from the whole manual. `README.md` quotes the new title. No command, example, editor code or workflow changed. Nothing was committed by this task.

## Asciidoctor lines before and after

The Maven step `asciidoctor:3.2.0:process-asciidoc (convert-to-html)` prints one line for the manual, `Converted src/doc/README.adoc`, before and after (same text, same `BUILD SUCCESS`); no Asciidoctor WARNING, ERROR or INFO line matches `asciidoctor: (WARNING|ERROR|INFO)` either time (0 before, 0 after). The built page has 0 `href="#id"` without a matching id after the last edit. Lines of the source: 3770 before this task, 3793 after the structure of run 0213 and the page (the file was 3943 lines at tag ff3bacd; the comparison with the filler removed is in the fact comparison below).

## Generated ids that change

The 93 explicit ids (`[[id]]`) of `git show ff3bacd:src/doc/README.adoc` are all still defined (0 missing, 93 and 93). `plateaus-overview` is now defined once, inline, at the first paragraph of the page (it was a heading). The generated ids of the headings that change:

- gone with the old pieces: `_the_layout`, `_the_settings_in_short`, `_the_states` (headings of the old Domain piece), and the heading id `plateaus-overview` (now the inline anchor, same id, same text "Plateaus" for a link);
- new, under the page: `_the_files_of_a_plateau`, `_mistakes_and_warnings`, `_the_patches`, `_choosing_a_plateau`;
- kept: `plateaus`, `plateau-comparison`, `plateau-replaces`, `plateau-limits`, `plateaus-upgrade`, `_the_idea`;
- the part titles `_start_here`, `_tutorials`, `_how_to_guides`, `_reference`, `_concepts`, `_upgrading` come from run 0213.

## Fact comparison

`git show` of the file before task-003 against the file now (script in the scratchpad): numbers lost 0, added 0; listings (159 before, 146 now) with 0 missing from the new file as a text block (the count falls because identical blocks are counted once in the new set); link targets `<<plateaus>>` and `<<plateaus-overview>>` that were lost are the ones the old text wrote and the new text words differently (the pointer in Domain and the inline anchor); the code spans listed as lost by the script are the spans cut across a line by its pattern plus the `settings.manifests.paths` note, which is now in Upgrading with `../shared`, `/srv/manifests`, `C:\data` and `node_modules/<module>/manifests`. The two merged notes (the `settings.plateaus` note and the one on `manifests.paths`) are the only ones that lost their place.

## The read as a reader

Read top to bottom, lines 3203 to 3640, as someone who knows nothing of plateaus. Two things were not plain and were fixed:

- The paragraph "Views and stories belong to no plateau" (line 3293) was there twice, one right after the other with no blank line between: the rewritten one and the original, which task-004 left in place. The original (the longer one) is gone. Without it the rendered page said everything twice.
- "The manifest of the example, with all its patches, is in step 3 of the tutorial" linked to `plateaus-overview`, which is the first paragraph of this page, not the tutorial. It now links to the tutorial, "A tutorial: from one workspace to a review of the changes" (`<<_a_tutorial_from_one_workspace_to_a_review_of_the_changes,...>>`). A second blank line before "What a plateau changes" is gone.

No fact was lost by the read. The Asciidoctor build was repeated after the edits (exit 0, no warning, no missing link target).

## Paragraphs touched outside the page

Lines of the file now (line: first words), new or rewritten text since the file of run 0213, outside the page of Concepts (the page, lines 3203 to 3640, is rewritten as a whole):

```
18: This documentation is sorted by the kind of reading: Start h
77: ArchiCode provides a structured data model that lets archite
80: Define the structure of technology nodes in your architectur
89: Use pre-defined viewpoints to generate views that communicat
94: .CI/CD Integration
95: Run ArchiCode in your CI/CD pipelines to keep the architectu
97: .Plateaus
98: A plateau is one layer of the architecture, as it is or as i
111: This example designs an e-commerce platform in steps. It sta
135: - EcommercePlatform uses SocialIdentityProvider: A relations
137: - EcommercePlatform uses PaymentGateway: Another relationshi
186: This step goes deeper into the systems that compose the e-co
288: The second step focused on the composition of systems within
372: As the design evolves, later iterations may decompose other 
385: Complex architectural models are hard to read when details a
493: At the end of this step, we have a fully initialized workspa
497: The second phase integrates the authorization concern into t
501: We expand the `.archicode.yaml` file to add the __oidic__ re
525: By the end of Step #2, the authorization concern is part of 
529: Step 3 defines the facet for authorization, to focus on spec
557: Concluding Step 3, the _oidc_ facet is integrated: it turns 
593: Facets streamline complex workspace views: each step of this
878: The Best Practices part holds the guidelines below, from the
896: ArchiCode advocates an architectural design philosophy chara
898: - Iterative Refinement: ArchiCode encourages an iterative pr
904: - Clarity in Relationship Hierarchy: ArchiCode lets architec
908: By following ArchiCode's incremental and in-depth design app
912: Organizing your source code well is a cornerstone of success
916: - Scaling Challenges: As the architecture grows, the workspa
949: * Manifest Diversity: ArchiCode handles multiple manifest di
976: - Technology Layer: The Technology layer of the ArchiCode do
984: The sections below cover each facet of the ArchiCode domain.
991: - Plain Text Format: A workspace is a plain text file, in YA
1005: - Optional Plateaus: a plateau is a layer, written as manife
1139: Plateaus, the layers that describe an architecture as it is 
1144: In ArchiCode, the Application Layer is a key aspect of your 
1148: - Structural Focus: ArchiCode covers specifically the struct
1180: This hierarchical structure lets you systematically model an
1184: In the ArchiCode domain, "Solutions" matter when architectur
1188: - Holistic View: By grouping related Systems under a common 
1224: In the ArchiCode domain, the concept of a "Component" matche
1234: In the ArchiCode domain, the "Technology Layer" aligns with 
1236: - Correlation with ArchiMate: Mirroring the ArchiMate framew
1238: - Structural Focus: ArchiCode covers the structural aspect o
1244: Within the ArchiCode domain, the Technology Layer is a struc
1325: In the ArchiCode domain, relationships link elements. Their 
1327: - Interconnection of Elements: A "Relationship" within Archi
1331: - Striking the Balance: ArchiCode takes a deliberate approac
1348: ArchiCode generates views of both the Application and Techno
1352: - Viewpoint Definition in ArchiCode: A "Viewpoint" is a set 
1359: Within the ArchiCode workspace, "Views" portray architectura
1361: - View and Viewpoint Association: Every View is linked to a 
1382: ArchiCode generates views dynamically, which makes visualiza
1386: - Ad-Hoc View Definition: ArchiCode also lets architects def
1721: ArchiCode is configurable, so you can tailor the tool to you
1723: - Opinionated Default Configuration: Out of the box, ArchiCo
2445: - Triggering View Generation: The "Generate Views" command s
2447: - Default Behavior: By default, this command uses discovery.
2499: - Fine-Tuned View Properties: Further customization extends 
2527: - Focused Exploration: The "Query Views" command fine-tunes 
2533: - Dynamic Filtering: The command uses JSON Path, so you can 
2541: - Customizable Output Formats: ArchiCode's "Query Views" com
2839: The "Generate JSON Schema" command in ArchiCode creates the 
2841: - Workspace Model Schema: With the "Generate JSON Schema" co
2864: - IDE Integration and Coding: By integrating the generated J
3645: *From `settings.plateaus` to layers.* The key no longer exis
3647: [NOTE]
3648: ====
3649: *There is no `settings.plateaus` any more.* A plateau used t
3651: ----
3652: error: `settings.plateaus` no longer exists: a plateau is a 
3653: ----
3655: `--baseline` is a usage error (`Unknown options: '--baseline
3656: ====
3659: To convert a workspace by hand:
```

## The literal lines of Q-1

Open, blocker for the wave manifest. `grep -ciE 'journey|prowess|delve|unlock' src/doc/README.adoc` prints 7, and `grep -niE` shows only these lines, each inside a listing or a code span, which the run cannot change without a change to a command message or a fixture (the wave excludes both):

```
440:error: the facet name `a/b` cannot be the name of a folder: it holds `/`, which separates the folders of a path (write a plain word, such as `jour
1562:The last one is told for a workspace that has no plateau too. The command line checks the steps when it loads the workspace, and draws them with 
2605:writes `views-stories/migration/01-overview/` to `04-overview/` (the third is `03-detailed/`: that step uses the detailed viewpoint), one for eac
2752:error: the plateau `inhouse` is named by the story `fork_tour` (`shared/story.fork_tour.yaml`) step 3 (`at`), step 4 (`at`) and step 5 (`against`
2755:The sentences name the plateaus of the layered Brightcart of the repository, a test fixture; on your workspace they name yours. There the two sto
3735:error: the facet name `a/b` cannot be the name of a folder: it holds `/`, which separates the folders of a path (write a plain word, such as `jou
3758:. *More links in the technology views* (see <<using-environments>> and <<map-technology>>). A relationship whose destination is inside a deployed
```

Four strings: `journey` (the quoted error of the facet name, lines 440 and 3735, and the facet name in a code span at 3758), `order_journey` and `seller_journey` (ids of an example and of the layered Brightcart, a test fixture, in the listings and code spans of lines 1562, 2752 and 2755) and `01-shop_overview-journey` (a folder name in a listing, line 2605). The line numbers moved by two against the TDD (442 became 440, and so on) since the filler pass. Outside listings and code spans the count is 0, and `manual-voice.test.js` keeps it so. The request to the author of the wave: the first criterion of gate P2 reads "outside listings and code spans" (or "prints 7").

## Glossary variants left

In the text of the page (lines 3203 to 3640) the variants of the glossary are not used for a plateau: no "state of an architecture", no "snapshot", no "scenario", no "project" (except the literal `project_dir` of the folder listing). "State" stays only for the marks `new`, `changed`, `removed`, `contains-changes`, `moved`, `split` and `merged` of a comparison, the product's own word. Variants in text the run does not touch (the Editor and the Commands, outside the page) are left, as DEF-3 of the TDD says.

## What was read by eye

The built page, served from `target/generated-docs` over a local HTTP server and opened in the browser pane (the pane refused a `file://` address): the table of contents shows two entries under Concepts, Plateaus and Limits of today (then Upgrading); setting the address to `#plateaus`, `#plateaus-overview` and `#plateau-comparison` scrolled to the page at the heading or the first paragraph each time (checked by the position of the element after each jump, and by a screenshot of "Comparing two plateaus"). The server was stopped after. The pointer in Domain, the colours and the layout of the tables were not looked at.

## Commands run after the last edit

- `./mvnw -o -q generate-resources` (JAVA_HOME the JDK 25 of sdkman): exit 0, no Asciidoctor warning;
- `node --test src/test/javascript/manual-voice.test.js src/test/javascript/manual-skeleton.test.js`: 19 tests pass;
- the ten node tests that read `src/doc/README.adoc` (the voice and skeleton tests, `site`, `changes-map` and the six readers of `viewpoint-kernel/`): 145 tests pass;
- `npm run format:check`: exit 0.

Not rerun after the last two small edits (they touch two sentences of prose and one blank line): `ManualExamplesTest`, `PlateauComparisonTest`, `npm run lint` and `npm run test:unit`; they passed in task-006 on the file before the edits, and the node tests above cover every reader of the page that is not Java.

## Verification

Stage 11, run by the stage agent after the last edit: `./mvnw -o generate-resources` BUILD SUCCESS with no Asciidoctor warning line; `manual-voice.test.js` and `manual-skeleton.test.js` 19 of 19; `npm run test:unit` 3472 tests, 0 failed; `npm run format:check` and `npm run lint` exit 0; `ManualExamplesTest` and `PlateauComparisonTest` exit 0; `grep -c "^=\+ Plateaus$"` prints 1, under `= Concepts`, followed by `== Limits of today`; `git diff ff3bacd -- src/doc/examples` is empty; the gate words remain only on the seven literal lines of Q-1. Q-1 stays open for the author. The render was checked by eye by task-007 (the pointer in Domain and the table layout were not looked at). `tooling/docs/check-backlog.py` and `docs/bkg/` do not exist in this repository, so the backlog sweep had nothing to run.

Review pass: dispatched (the TDD review of Stage 5 was done by an agent other than the Stage 4 drafter; each task was verified by a separate agent).
