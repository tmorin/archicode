#!/usr/bin/env bash
# What a run of the workflow builds and releases, decided once (job `Targets`), from the event (environment, set by the
# workflow from the `github` and `inputs` contexts, never interpolated into a script):
#
#   EVENT_NAME           github.event_name
#   REF                  github.ref
#   HEAD_COMMIT_MESSAGE  github.event.head_commit.message (a push)
#   INPUT_TAG            inputs.tag (a workflow_dispatch; empty for a rehearsal)
#   INPUT_DRAFT          inputs.draft (a workflow_dispatch: `true` or `false`)
#   RUN_ID               github.run_id (names the draft of a rehearsal)
#   POM                  the pom to read the version of a rehearsal from (default: pom.xml)
#   REMOTE               when set, the repository whose tags are read (`git ls-remote`): a dispatched tag must exist
#                        there, and a release is the "Latest" only when no tag there is newer
#
# Outputs (GITHUB_OUTPUT):
#
#   matrix     the targets to build, JSON for `strategy.matrix.include`: `{"target": ..., "runner": ...}`
#   release    `true` when the run makes or completes a release (the jobs Release and Smoke run), else `false`
#   publish    `true` when the release is published once every smoke test passed (job Publish), else `false`
#   rehearsal  `true` for a dispatch without a tag: a draft named for the version of the pom, never published
#   latest     `true` when the release, once published, is the "Latest" of the repository: no release tag of REMOTE is
#              newer (an older release published again, a fix of 0.19 after 0.20, does not take it)
#   tag        the tag of the release (`archicode-X.Y.Z`; `rehearsal-<version>-<run id>` for a rehearsal)
#   version    the version the files are named with and that `archicode --version` must print
#   title      the title of the release
#   source     the ref the jobs build and smoke-test (the tag for a dispatch with a tag; empty: the event's commit)
#
# The cases:
#   - push of a tag whose head commit message begins `chore(release)` (the commit the maven-release-plugin tags, the
#     condition of the Maven publish of the Build job): the three targets, a draft, smoke tests, then published;
#   - workflow_dispatch with `tag`: the three targets built from that tag, attached to its release (a new draft, or
#     the draft already there), smoke tests, then published unless `draft` is true (the default);
#   - workflow_dispatch without `tag`: a rehearsal: the three targets built from the dispatched commit, a draft
#     `rehearsal-<version>-<run id>`, smoke tests, and never published;
#   - anything else (a pull request, a push to main, a tag that is not a release): the first target only, no release.
set -euo pipefail
# shellcheck source=SCRIPTDIR/release-lib.sh
. "$(dirname "$0")/release-lib.sh"

matrix_of() { # the JSON of the targets named (all of them with no argument)
  local json="" target runner wanted
  while read -r target runner; do
    if [ "$#" -gt 0 ]; then
      wanted=""
      for name in "$@"; do
        if [ "${name}" = "${target}" ]; then wanted="yes"; fi
      done
      [ -n "${wanted}" ] || continue
    fi
    json="${json}${json:+,}{\"target\":\"${target}\",\"runner\":\"${runner}\"}"
  done < <(release_targets)
  printf '[%s]\n' "${json}"
}

pom_version() {
  python3 - "${POM:-pom.xml}" <<'EOF'
import sys
import xml.etree.ElementTree as ET
ns = {"m": "http://maven.apache.org/POM/4.0.0"}
version = ET.parse(sys.argv[1]).getroot().find("m:version", ns)
print(version.text.strip() if version is not None and version.text else "")
EOF
}

require_release_tag() {
  if [ -z "$(version_of_tag "$1")" ]; then
    die "\`$1\` is not a release tag: a release tag is \`archicode-<major>.<minor>.<patch>\`, the tag the maven-release-plugin makes"
  fi
}

event="${EVENT_NAME:?EVENT_NAME is required}"
ref="${REF:-}"
message="${HEAD_COMMIT_MESSAGE:-}"
input_tag="${INPUT_TAG:-}"
input_draft="${INPUT_DRAFT:-true}"

release=false publish=false rehearsal=false latest=false tag="" version="" title="" source=""
first_target="$(release_targets | head -n 1 | cut -d ' ' -f 1)"
matrix="$(matrix_of "${first_target}")"

case "${event}" in
  push)
    case "${ref}" in
      refs/tags/*)
        case "${message}" in
          "chore(release)"*)
            tag="${ref#refs/tags/}"
            require_release_tag "${tag}"
            release=true publish=true
            ;;
        esac
        ;;
    esac
    ;;
  workflow_dispatch)
    release=true
    if [ -n "${input_tag}" ]; then
      tag="${input_tag}"
      require_release_tag "${tag}"
      if [ -n "${REMOTE:-}" ] && ! git ls-remote --exit-code --tags "${REMOTE}" "refs/tags/${tag}" >/dev/null; then
        die "the tag \`${tag}\` does not exist in ${REMOTE}: give the tag of a release that was cut (\`git tag -l 'archicode-*'\`)"
      fi
      source="refs/tags/${tag}"
      case "${input_draft}" in
        false) publish=true ;;
        true) publish=false ;;
        *) die "the input draft is \`${input_draft}\`, not true or false" ;;
      esac
    else
      rehearsal=true
      version="$(pom_version)"
      [ -n "${version}" ] || die "no version in ${POM:-pom.xml}"
      tag="rehearsal-${version}-${RUN_ID:?RUN_ID is required for a rehearsal}"
      title="ArchiCode ${version} (rehearsal, run ${RUN_ID})"
      if [ "${input_draft}" = "false" ]; then
        echo "::warning::a rehearsal (no tag) is never published: the input draft=false is ignored"
      fi
    fi
    ;;
esac

if [ "${release}" = "true" ]; then
  matrix="$(matrix_of)"
  if [ "${rehearsal}" = "false" ]; then
    version="$(version_of_tag "${tag}")"
    title="ArchiCode ${version}"
    latest=true
    if [ -n "${REMOTE:-}" ]; then
      latest="$(git ls-remote --tags --refs "${REMOTE}" 'refs/tags/archicode-*' | sed 's|.*refs/tags/||' | is_latest_release "${version}")"
    fi
  fi
fi

set_output matrix "${matrix}"
set_output release "${release}"
set_output publish "${publish}"
set_output rehearsal "${rehearsal}"
set_output latest "${latest}"
set_output tag "${tag}"
set_output version "${version}"
set_output title "${title}"
set_output source "${source}"
