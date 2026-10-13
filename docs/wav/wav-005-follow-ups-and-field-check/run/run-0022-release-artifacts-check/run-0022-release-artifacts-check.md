---
type: run
run: 0022
status: completed
wave: 005
---

# Run 0022: Release artifacts check

Document profile: `single-document`, an evidence run. Wave 005, item W-6. Closes the third unchecked item of
tmorin/archicode#8 ("Published artifacts of 0.6.0"), redone for release 0.10.0.

## Scope

Question: can what the 0.10.0 release published be pulled and run? Four artifacts, checked in this order: the release
workflow, the website, the container image, the Maven package. The run reads published artifacts and writes nothing
but this document: no repository, package or Pages setting was changed, nothing remote was deleted, no tag was moved,
and no token was typed, printed or stored (only the existing `gh` login was used; it has no `read:packages` scope).

Out of scope: repairing anything found. A failure would be stated plainly; a check that could not be made is recorded
with its reason and is not a failure of the release.

Checked on 2026-10-13, minutes after the release (tag pushed 17:19 UTC). Scratch material (the pulled image, the
example copies, the generated views) was kept outside the repository, in the session scratchpad; the pulled image was
removed afterwards.

## Result at a glance

Pass criteria: the workflow of the tag is green end to end; each site URL answers 200 with the expected content and
stamp; the image exists in the registry, pulls, starts and generates views from one valid example workspace; the Maven
version is listed in the registry (a download is a bonus that depends on credentials).

| # | Artifact | Verdict |
|---|----------|---------|
| 1 | Release workflow (tag and release commit) | pass: the run of the tag is green, every step, including publish and website; the run of the release commit on `main` was cancelled by the next push (expected, see 1.2) |
| 2 | Website (`/`, `/docs/`, `/editor/`) | pass: all three answer 200, the presentation page and the editor carry `0.10.0`, `/docs/` is the manual |
| 3 | Container image `ghcr.io/tmorin/archicode:0.10.0` | pass: tag exists, public, pulled, starts, generates 52 `.puml` files (26 per output tree) from an example workspace; two other attempts failed for repository reasons, not image reasons (F-1, F-2) |
| 4 | Maven package `io.morin.archicode:archicode:0.10.0` | partial: listed, version present; not downloaded, the registry demands credentials (reason given in 4.2) |

No real failure of the release. Two findings are about the repository, not about what was published (F-1, F-2).

## What was checked, and how

### 1. The release workflow

Workflow: `.github/workflows/ci-build.yaml` (`on: push` to `main` and to any tag). Its step "Publish release artifacts"
runs when the ref is a tag and the head commit message starts with `chore(release)`; "Assemble website" and "Publish
website" run on any tag.

1.1 The run of the tag.

```
gh api repos/tmorin/archicode/git/ref/tags/archicode-0.10.0 --jq .object.sha   -> 0df020af... (annotated tag)
git ls-remote --tags origin 'archicode-0.10.0*'    -> ...refs/tags/archicode-0.10.0^{} = c12a64c7 (the release commit)
gh run list --repo tmorin/archicode --limit 10
gh run view 38437782531 --repo tmorin/archicode --json headSha,headBranch,event,status,conclusion
gh run view 38437782531 --repo tmorin/archicode --json jobs --jq '.jobs[].steps[]|"\(.number) \(.name) \(.conclusion)"'
```

Came back: run 38437782531, branch `archicode-0.10.0`, event `push`, head `c12a64c7` (`chore(release):
archicode-0.10.0`), `completed` / `success`, 2m23s. Steps: tests of the kernel, check of the committed WebAssembly,
"Build artifacts" (`./mvnw verify`), "Publish release artifacts" (the `./mvnw deploy` with container image push),
"Assemble website" and "Publish website" all `success`; "Publish snapshot artifacts" `skipped` (as designed: it is for
`main` without a release commit). Annotations are only the Node.js 20 deprecation of `actions/setup-node@v4` and the
`ubuntu-latest` to Ubuntu 26 migration notice of 2026-10-19.

1.2 The run of the release commit on `main`.

```
gh run view 38437777506 --repo tmorin/archicode
```

Came back: `completed` / `cancelled` after 1m29s, with the annotation "Canceling since a higher priority waiting request
for Continuous Integration - Build-refs/heads/main exists". Cause: the workflow has `concurrency` with
`cancel-in-progress: true` per ref, and `release:prepare` pushes the release commit and the next-development commit to
`main` within seconds, so the first run is superseded by the second. The same happened to the release commits of 0.9.0, 0.8.0, 0.7.0 and 0.6.0 (`gh run list --workflow ci-build.yaml
--branch main`, filtered on the `chore(release)` titles: five of five `cancelled`). Not a release failure: this run
would have skipped
"Publish release artifacts" anyway (its ref is not a tag) and "Publish snapshot artifacts" (the commit message starts
with `chore(release)`); everything the release publishes comes from the run of the tag (1.1).

1.3 The run of the next-development commit on `main` (the one that cancelled 1.2).

```
gh run view 38437786293 --repo tmorin/archicode --json status,conclusion
```

Was `in_progress` when the check started; waited by re-reading until it ended. Came back `completed` / `success`
(3m48s). It published the `latest` image and the `0.11.0-SNAPSHOT` Maven package (see 3.1 and 4.1).

1.4 The Pages deployment.

```
gh run list ... -> "pages build and deployment" 38438081430, gh-pages, completed / success (build 6s, deploy 9s)
```

Came back: success, at 17:22 UTC, after the run of the tag. Nothing was still running when the site was fetched.

### 2. The published site

```
gh api repos/tmorin/archicode/pages
   -> status "built", build_type "legacy", source gh-pages branch path "/", html_url https://tmorin.github.io/archicode/, https_enforced true
curl -sS -o <scratch>/page_.html        -w '%{http_code} %{content_type} %{size_download}' https://tmorin.github.io/archicode/
curl -sS -o <scratch>/page_docs_.html   -w '...' https://tmorin.github.io/archicode/docs/
curl -sS -o <scratch>/page_editor_.html -w '...' https://tmorin.github.io/archicode/editor/
grep -o '<meta name="archicode-version"[^>]*>' <the three pages>
```

| URL | HTTP | size | `<title>` | `archicode-version` |
|-----|------|------|-----------|---------------------|
| `/` | 200 `text/html` | 22,873 B | ArchiCode · Architecture as code | `<meta name="archicode-version" content="0.10.0">` |
| `/docs/` | 200 `text/html` | 275,509 B | ArchiCode (Asciidoctor 2.0.23) | none (the manual is not stamped; the workflow does not stamp it) |
| `/editor/` | 200 `text/html` | 1,237,933 B | ArchiCode Editor | `<meta name="archicode-version" content="0.10.0">` |

`/docs/` is the manual: the generated Asciidoctor page, `<h1>ArchiCode`, 8 level-2 sections, with the anchors
`_introduction`, `_availability_license_and_deliverables`, `_features`, `_application_layer`, `_composition`,
`_solution`, `_system`, `_container`. `/docs/index.html` and `/editor/index.html` also answer 200. The `gh-pages` branch
could not be listed through the contents API (404), which is not needed: the HTTP answers are the evidence.

Limit of this check: the pages were fetched and their markers read; the editor was not opened in a browser here (that
is run W-5's field, the visual check item of #8).

### 3. The container image

Name and tags come from `src/main/resources/application.properties` (`quarkus.container-image.registry=ghcr.io`,
`group=tmorin`, `name=archicode`) and from the workflow (release push without a tag override, so the tag is the project
version; the snapshot push forces `latest`).

3.1 Registry.

```
gh api "users/tmorin/packages/container/archicode/versions" --jq '.[]|"\(.id) \(.created_at) \(.metadata.container.tags)"'
gh api "users/tmorin/packages/container/archicode" --jq '{visibility,html_url}'
```

Came back: package `archicode` is `public`; the version created 2026-10-13T17:21:52Z carries the tag `["0.10.0"]` (two
minutes after the tag was pushed, matching the "Publish release artifacts" step); the `latest` tag moved to the version
created 17:23:20Z (the next-development run of 1.3, as designed); `0.9.0` and older tags are still there.

3.2 Pull and run. A container runtime is available (Docker 29.9.0, Podman 4.9.3; Docker used, the user is in the
`docker` group).

```
docker pull ghcr.io/tmorin/archicode:0.10.0
   -> digest sha256:46d6a5bad5641bf2178131ae9a18ee6afeb2e528af2a4d51652d7c9c69edaa5f
docker image inspect ... -> amd64, 441,743,214 B, entrypoint [java -jar /home/jboss/quarkus-run.jar], user 185, workdir /home/jboss
docker run --rm ghcr.io/tmorin/archicode:0.10.0 --help        -> usage with the commands views, query, editor
docker run --rm ghcr.io/tmorin/archicode:0.10.0 views generate --help
```

The pull needed no credential (public package). The image starts and the CLI answers: `--help` lists `views`, `query`
and `editor`.

Run against an example workspace. Three attempts, kept because the first two taught something:

```
(a) src/doc/examples/domain_workspace, mounted read-only:  docker run --rm -v <copy>:/ws:ro -v <out>:/out <image> -w /ws/workspace.yaml views generate -o /out
      -> exit 1, UnrecognizedPropertyException: Unrecognized field "qualifier" ... (8 known properties: ... "qualifiers" ...)
(b) src/doc/examples/facet_example_step_3, mounted read-only, -o /out:
      -> exit 1, FileNotFoundException: /ws/out/plantuml/application/EcommercePlatform_ContentManagement-deep.puml
(c) facet_example_step_3 copy (generated views removed), mounted read-write, no -o:
      docker run --rm -v <copy>:/ws <image> -w /ws/workspace.yaml views generate
      -> exit 0, 52 .puml files, 26 under views/plantuml/application and 26 under views-oidc/plantuml/application
```

(c) is the pass: the image starts, reads the workspace, applies the `oidc` custom facet (two output trees, as the
workspace declares) and generates the views (the files open with `@startuml User-overview`, `title Person - User -
Overview`). (a) and (b) are not failures of the image; they are findings F-1 and F-2.

The pulled image was removed afterwards (`docker rmi`); only the scratch copies remain outside the repository.

### 4. The Maven package

Name from `pom.xml` (`distributionManagement` repository `github`, `https://maven.pkg.github.com/tmorin/archicode`) and
the project coordinates.

4.1 Listing.

```
gh api "users/tmorin/packages?package_type=maven" --jq '.[].name'    -> includes io.morin.archicode.archicode
gh api "users/tmorin/packages/maven/io.morin.archicode.archicode/versions?per_page=8" --jq '.[]|"\(.id) \(.name) \(.created_at)"'
```

Came back: version `0.10.0` (id 68877899) created 2026-10-13T17:21:53Z, one second after the image of 3.1 (the same
`./mvnw deploy`); next to it `0.11.0-SNAPSHOT` (17:23:21Z, from 1.3), `0.10.0-SNAPSHOT`, `0.9.0`, and older. The token
scopes do not include `read:packages`, yet the listing worked. The package is `public`
(`gh api users/tmorin/packages/maven/io.morin.archicode.archicode`).

4.2 Download. Not done.

```
curl -sS -o /dev/null -w '%{http_code}' https://maven.pkg.github.com/tmorin/archicode/io/morin/archicode/archicode/0.10.0/archicode-0.10.0.pom
   -> 401
```

GitHub Packages answered 401 to an anonymous request for this URL, although the package is public; reading the jar needs a token with
`read:packages`, which the existing `gh` login does not have, and giving one would mean entering a credential by hand,
which this run does not do. Recorded as "could not be checked, because the registry requires authentication and no
token with `read:packages` is in the existing login", not as a failure of the release. What the listing proves: the
version exists in the registry and was written by the release run. What it does not prove: that the jar downloads and
is intact.

## Findings

The verdict per artifact is the table under "Result at a glance". The findings below concern the repository.

- **F-1 (docs, small): `src/doc/examples/domain_workspace/workspace.yaml` does not load.** It uses `qualifier:` (line
  10, same in tag `archicode-0.10.0`: `git show archicode-0.10.0:src/doc/examples/domain_workspace/workspace.yaml |
  grep -n qualifier` prints `10:          qualifier:`), the field is `qualifiers` (`Container` has 8 known properties, none
  named `qualifier`), so `views generate` stops with `UnrecognizedPropertyException`. The file is a snippet included in
  the manual (`src/doc/README.adoc` line 104), so the manual shows a workspace that the tool refuses. Nothing in
  `src/test` runs it (the only reference is `GenerateResourceTest`, which writes `default.yaml`).
- **F-2 (CLI behavior, to document): the output directory of `views generate` is always below the workspace folder.**
  `-o`/`--output` is read into `settings.views.path` and resolved against the folder of the workspace file (at the
  tag, `GenerateViewsCommand.renderWorkspace`: `Path.of(<workspace file parent>, <views path>)`), so `-o /out` produces
  `<workspace folder>/out`, and a workspace folder mounted read-only (`:ro`) cannot be used at all. The option help says
  only "The output directory." The container usage of `README.md` mounts the current folder read-write, which works.
  Relevant to W-1 (CLI) if it touches the option; no change made here.

Both are candidates for the wave's progress log (or a backlog issue); the orchestrator decides. Neither blocks the
release, neither was repaired.

## Canonical impact

None. The run reads published artifacts and writes only this document; it changes no architecture description and no
domain invariant, so there is no `CI-arc-n` or `CI-dom-n` item to discharge. Reason, per item: no ArchiMate
element, relationship or viewpoint is added or altered (no model is touched), and no invariant is enforced by anything
this run adds. No analysis (`docs/ana/`) was fulfilled by this run.

## Review passes

The profile has no PRD, TDD or pln, so the passes run against this document.

- **KDMLLC review.** Run by a separate agent on the first draft. It found: an inconsistent findings count, verdicts
  stated three times, unsupported generalisations ("always", "every release"), an over-wide line range, speculative
  findings, token-scope noise, and an implicit pass criterion. Applied: the count fixed, the per-artifact verdict bullets
  removed (the table owns the verdicts), the "always" claim backed by a check of the five release commits, the line range
  corrected, two speculative or duplicate findings dropped, the scope list trimmed, the pass criteria stated.
- **Open questions.** (1) A workflow run was still in progress at the start (1.3): awaited, ended `success`. (2) Image
  name and tags: from `application.properties` and the workflow, confirmed in the registry (3.1). (3) Is the jar
  downloadable without a credential: no, 401 (4.2). Nothing is left open.
- **C scan.** Every descriptive claim was re-checked against the environment by a command whose output is summarized
  above (run ids and conclusions, tag target, Pages state, HTTP codes and meta tags, image tag and digest, package
  versions, the 401), and F-1 and F-2 against the source at the tag (`git show`). The wave plan said the example would
  be mounted read-only; the evidence shows that cannot work (F-2), so the document says what was done (a read-write
  scratch copy).

## Tasks

| Task | Status |
|------|--------|
| 1 Workflow: tag run, release-commit run, wait for running runs | done |
| 2 Site: fetch `/`, `/docs/`, `/editor/`, check the stamp | done |
| 3 Image: registry, pull, run against an example | done |
| 4 Maven package: list, download | listing done; download not possible (4.2) |
| 5 KDMLLC review of this document and C scan | done |
| 6 Commit the run directory | done by the commit that carries this document |

## Verification

Stage 11 for an evidence run: every check is a command whose output is reproduced (in summary) above; there is no
code, build or test suite touched by this run (no Maven run was made). What was confirmed: the workflow, the site and
the image (rows 1 to 3). What could not be confirmed, and why: the content and integrity of the Maven jar (needs
`read:packages`, 4.2); the look of the editor and the manual in a browser (not this run's field). `git status` before
the commit showed changes in this run's directory only from this run; the two wave documents modified in the worktree
(manifest and progress log) belong to the orchestrator and were not written.
