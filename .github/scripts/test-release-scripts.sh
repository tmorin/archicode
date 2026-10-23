#!/usr/bin/env bash
# Tests of the scripts of the release, with fakes: no network, no GitHub, no native image (a fake `gh` and a fake
# `archicode`; the smoke test needs python3 for the fake `editor serve`). The job `Targets` runs them on every run of
# the workflow, so that a script broken by a change fails on its pull request and not on the day of a release.
#
#   .github/scripts/test-release-scripts.sh
set -euo pipefail
export LC_ALL=C # the order of a glob
here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=SCRIPTDIR/release-lib.sh
. "${here}/release-lib.sh"
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT
failures=0
count=0

check() { # check <what> <actual> <expected>
  count=$((count + 1))
  if [ "$2" = "$3" ]; then
    echo "ok   $1"
  else
    echo "FAIL $1"
    echo "     expected: $3"
    echo "     actual:   $2"
    failures=$((failures + 1))
  fi
}
fails() { # fails <what> <command...>: the command must exit non-zero
  local what="$1"
  shift
  count=$((count + 1))
  if "$@" >"${work}/fails.out" 2>&1; then
    echo "FAIL $what (it succeeded)"
    sed 's/^/     /' "${work}/fails.out"
    failures=$((failures + 1))
  else
    echo "ok   $what"
  fi
}
output() { # output <key> <file of key=value lines>
  sed -n "s/^$1=//p" "$2" | tail -n 1
}

# --- release-plan.sh ------------------------------------------------------------------------------------------------
all='[{"target":"linux-amd64","runner":"ubuntu-24.04"},{"target":"linux-arm64","runner":"ubuntu-24.04-arm"},{"target":"macos-arm64","runner":"macos-15"}]'
one='[{"target":"linux-amd64","runner":"ubuntu-24.04"}]'
cat >"${work}/pom.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <parent><version>9.9.9</version></parent>
    <artifactId>archicode</artifactId>
    <version>1.2.3-SNAPSHOT</version>
    <dependencies><dependency><version>7.7.7</version></dependency></dependencies>
</project>
EOF
plan() { # plan <out file> VAR=value...: release-plan.sh in a clean environment
  local out="$1"
  shift
  env -i PATH="${PATH}" HOME="${HOME}" POM="${work}/pom.xml" RUN_ID=42 "$@" bash "${here}/release-plan.sh" >"${out}"
}

plan "${work}/p1" EVENT_NAME=pull_request REF=refs/pull/7/merge
check "plan: a pull request builds linux-amd64 only" "$(output matrix "${work}/p1")" "${one}"
check "plan: a pull request makes no release" "$(output release "${work}/p1")" "false"

plan "${work}/p2" EVENT_NAME=push REF=refs/heads/main "HEAD_COMMIT_MESSAGE=chore(release): archicode-1.0.0"
check "plan: a push to main builds linux-amd64 only, even a release commit" "$(output matrix "${work}/p2")" "${one}"
check "plan: a push to main makes no release" "$(output release "${work}/p2")" "false"

plan "${work}/p3" EVENT_NAME=push REF=refs/tags/archicode-0.19.0 "HEAD_COMMIT_MESSAGE=chore(release): archicode-0.19.0"
check "plan: a release tag builds the three targets" "$(output matrix "${work}/p3")" "${all}"
check "plan: a release tag makes a release" "$(output release "${work}/p3")" "true"
check "plan: a release tag is published" "$(output publish "${work}/p3")" "true"
check "plan: a release tag is no rehearsal" "$(output rehearsal "${work}/p3")" "false"
check "plan: the tag" "$(output tag "${work}/p3")" "archicode-0.19.0"
check "plan: the version comes from the tag" "$(output version "${work}/p3")" "0.19.0"
check "plan: the title" "$(output title "${work}/p3")" "ArchiCode 0.19.0"
check "plan: a tag push builds its own commit" "$(output source "${work}/p3")" ""
check "plan: a release with no tags to compare with is the latest" "$(output latest "${work}/p3")" "true"

plan "${work}/p4" EVENT_NAME=push REF=refs/tags/archicode-0.19.0 "HEAD_COMMIT_MESSAGE=feat: not a release"
check "plan: a tag whose commit is no release commit makes no release" "$(output release "${work}/p4")" "false"
check "plan: ... and builds linux-amd64 only" "$(output matrix "${work}/p4")" "${one}"

fails "plan: a release commit tagged with another name is refused" \
  plan "${work}/p5" EVENT_NAME=push REF=refs/tags/v1 "HEAD_COMMIT_MESSAGE=chore(release): v1"

plan "${work}/p6" EVENT_NAME=workflow_dispatch REF=refs/heads/main INPUT_TAG=archicode-0.18.0 INPUT_DRAFT=true
check "plan: a dispatch with a tag builds the three targets" "$(output matrix "${work}/p6")" "${all}"
check "plan: a dispatch with a tag builds the tag" "$(output source "${work}/p6")" "refs/tags/archicode-0.18.0"
check "plan: a dispatch with a tag and draft=true is not published" "$(output publish "${work}/p6")" "false"
check "plan: a dispatch with a tag has the version of the tag" "$(output version "${work}/p6")" "0.18.0"
check "plan: a dispatch with a tag is no rehearsal" "$(output rehearsal "${work}/p6")" "false"

plan "${work}/p7" EVENT_NAME=workflow_dispatch REF=refs/heads/main INPUT_TAG=archicode-0.18.0 INPUT_DRAFT=false
check "plan: a dispatch with a tag and draft=false is published" "$(output publish "${work}/p7")" "true"

plan "${work}/p8" EVENT_NAME=workflow_dispatch REF=refs/heads/feature INPUT_TAG= INPUT_DRAFT=false
check "plan: a dispatch without a tag is a rehearsal" "$(output rehearsal "${work}/p8")" "true"
check "plan: a rehearsal makes a release (a draft)" "$(output release "${work}/p8")" "true"
check "plan: a rehearsal is never published, even with draft=false" "$(output publish "${work}/p8")" "false"
check "plan: a rehearsal has the version of the pom" "$(output version "${work}/p8")" "1.2.3-SNAPSHOT"
check "plan: the tag of a rehearsal" "$(output tag "${work}/p8")" "rehearsal-1.2.3-SNAPSHOT-42"
check "plan: the title of a rehearsal" "$(output title "${work}/p8")" "ArchiCode 1.2.3-SNAPSHOT (rehearsal, run 42)"
check "plan: a rehearsal builds the three targets" "$(output matrix "${work}/p8")" "${all}"
check "plan: a rehearsal builds the dispatched commit" "$(output source "${work}/p8")" ""

fails "plan: a dispatch with a tag that is not a release tag is refused" \
  plan "${work}/p9" EVENT_NAME=workflow_dispatch INPUT_TAG=v1.0 INPUT_DRAFT=true
fails "plan: a dispatch with a tag and draft=false from another ref than main is refused" \
  plan "${work}/p11" EVENT_NAME=workflow_dispatch REF=refs/heads/feature INPUT_TAG=archicode-0.18.0 INPUT_DRAFT=false
check "plan: a dispatch with a tag and draft=true from another ref is allowed (a draft)" "$(plan "${work}/p12" EVENT_NAME=workflow_dispatch REF=refs/heads/feature INPUT_TAG=archicode-0.18.0 INPUT_DRAFT=true >/dev/null 2>&1; output publish "${work}/p12")" "false"
fails "plan: a dispatch with a draft that is not a boolean is refused" \
  plan "${work}/p10" EVENT_NAME=workflow_dispatch INPUT_TAG=archicode-0.18.0 INPUT_DRAFT=maybe

git init --quiet --bare "${work}/remote.git"
git -c init.defaultBranch=main init --quiet "${work}/clone"
git -C "${work}/clone" -c user.name=t -c user.email=t@example.org commit --quiet --allow-empty -m one
git -C "${work}/clone" tag archicode-0.18.0
git -C "${work}/clone" push --quiet "${work}/remote.git" HEAD:refs/heads/main refs/tags/archicode-0.18.0
plan "${work}/p11" EVENT_NAME=workflow_dispatch INPUT_TAG=archicode-0.18.0 INPUT_DRAFT=true REMOTE="${work}/remote.git"
check "plan: a dispatched tag that exists is accepted" "$(output tag "${work}/p11")" "archicode-0.18.0"
check "plan: the newest release tag is the latest" "$(output latest "${work}/p11")" "true"
git -C "${work}/clone" tag archicode-0.20.0
git -C "${work}/clone" push --quiet "${work}/remote.git" refs/tags/archicode-0.20.0
plan "${work}/p13" EVENT_NAME=workflow_dispatch REF=refs/heads/main INPUT_TAG=archicode-0.18.0 INPUT_DRAFT=false REMOTE="${work}/remote.git"
check "plan: an older release published again is not the latest" "$(output latest "${work}/p13")" "false"
check "plan: a rehearsal is never the latest" "$(output latest "${work}/p8")" "false"
fails "plan: a dispatched tag that does not exist is refused" \
  plan "${work}/p12" EVENT_NAME=workflow_dispatch INPUT_TAG=archicode-0.17.9 INPUT_DRAFT=true REMOTE="${work}/remote.git"

# --- release-lib.sh: previous_release_tag ---------------------------------------------------------------------------
tags="$(printf '%s\n' archicode-0.2.0 archicode-0.9.0 archicode-0.10.0 archicode-0.18.0 archicode-0.19.0 v1 archicode-0.19.1-RC1)"
check "previous tag of 0.19.0" "$(printf '%s\n' "${tags}" | previous_release_tag 0.19.0)" "archicode-0.18.0"
check "previous tag of 0.19.0-SNAPSHOT" "$(printf '%s\n' "${tags}" | previous_release_tag 0.19.0-SNAPSHOT)" "archicode-0.18.0"
check "previous tag of 0.11.0 (numbers, not text)" "$(printf '%s\n' "${tags}" | previous_release_tag 0.11.0)" "archicode-0.10.0"
check "previous tag of 0.20.0 (not a suffixed tag)" "$(printf '%s\n' "${tags}" | previous_release_tag 0.20.0)" "archicode-0.19.0"
check "no previous tag" "$(printf '%s\n' "${tags}" | previous_release_tag 0.1.0)" ""
check "0.19.0 is the latest when it is the newest tag" "$(printf '%s\n' "${tags}" | is_latest_release 0.19.0)" "true"
check "0.18.0 is not the latest when 0.19.0 exists" "$(printf '%s\n' "${tags}" | is_latest_release 0.18.0)" "false"
check "a suffixed tag is no release tag" "$(version_of_tag archicode-0.19.1-RC1)" ""
check "four numbers are no release tag" "$(version_of_tag archicode-1.2.3.4)" ""
check "a release tag" "$(version_of_tag archicode-0.19.0)" "0.19.0"

# --- native-collect.sh ----------------------------------------------------------------------------------------------
fake_runner() { # fake_runner <folder> <version it tells>
  mkdir -p "$1/target/archicode-x-native-image-source-jar"
  printf '#!/bin/sh\necho "archicode %s"\n' "$2" >"$1/target/archicode-$2-runner"
  chmod +x "$1/target/archicode-$2-runner"
  touch "$1/target/archicode-x-native-image-source-jar/archicode-$2-runner.jar"
}
collect() { # collect <folder> VAR=value...
  local folder="$1"
  shift
  (cd "${folder}" && env -i PATH="${PATH}" HOME="${HOME}" "$@" bash "${here}/native-collect.sh")
}
fake_runner "${work}/c1" 1.2.3
collect "${work}/c1" TARGET=linux-amd64 POM_VERSION=1.2.3 >"${work}/c1.out"
check "collect: the artifact" "$(output artifact "${work}/c1.out")" "archicode-1.2.3-linux-amd64"
check "collect: the version" "$(output version "${work}/c1.out")" "1.2.3"
check "collect: the binary is copied" "$(cmp -s "${work}/c1/target/archicode-1.2.3-runner" "${work}/c1/native-dist/archicode-1.2.3-linux-amd64" && echo same)" "same"
check "collect: its .sha256 checks" "$(cd "${work}/c1/native-dist" && sha256_check archicode-1.2.3-linux-amd64.sha256)" "archicode-1.2.3-linux-amd64: OK"
fails "collect: a pom that is not the version of the release is refused" \
  collect "${work}/c1" TARGET=linux-amd64 POM_VERSION=1.2.3 EXPECTED_VERSION=1.2.4
fake_runner "${work}/c2" 1.2.3
fails "collect: a binary that tells another version is refused" collect "${work}/c2" TARGET=linux-amd64 POM_VERSION=1.2.4
mkdir -p "${work}/c3/target"
fails "collect: no runner is refused" collect "${work}/c3" TARGET=linux-amd64 POM_VERSION=1.2.3
fake_runner "${work}/c4" 1.2.3
fake_runner "${work}/c4" 1.2.4
fails "collect: two runners are refused" collect "${work}/c4" TARGET=linux-amd64 POM_VERSION=1.2.3

# --- release-assemble.sh --------------------------------------------------------------------------------------------
artifacts() { # artifacts <folder> <version>: what the three Native jobs upload, without the executable bit
  mkdir -p "$1"
  while read -r target _; do
    printf 'binary of %s\n' "${target}" >"$1/archicode-$2-${target}"
    (cd "$1" && sha256_line "archicode-$2-${target}" >"archicode-$2-${target}.sha256")
  done < <(release_targets)
}
artifacts "${work}/a1" 1.2.3
bash "${here}/release-assemble.sh" "${work}/a1" 1.2.3 "${work}/u1" >/dev/null
check "assemble: the files of the release" "$(cd "${work}/u1" && echo *)" \
  "SHA256SUMS archicode-1.2.3-linux-amd64 archicode-1.2.3-linux-arm64 archicode-1.2.3-macos-arm64"
check "assemble: SHA256SUMS lists the three in the order of the targets" "$(awk '{ print $2 }' "${work}/u1/SHA256SUMS" | tr '\n' ' ')" \
  "archicode-1.2.3-linux-amd64 archicode-1.2.3-linux-arm64 archicode-1.2.3-macos-arm64 "
check "assemble: SHA256SUMS checks" "$(cd "${work}/u1" && sha256_check SHA256SUMS | grep -c ': OK$')" "3"
check "assemble: the binaries are executable" "$(test -x "${work}/u1/archicode-1.2.3-linux-arm64" && echo yes)" "yes"
bash "${here}/release-assemble.sh" "${work}/a1" 1.2.3 "${work}/u1" >/dev/null
check "assemble: run again, SHA256SUMS is written anew" "$(grep -c . "${work}/u1/SHA256SUMS")" "3"
artifacts "${work}/a2" 1.2.3
rm "${work}/a2/archicode-1.2.3-macos-arm64"
fails "assemble: a missing target is refused" bash "${here}/release-assemble.sh" "${work}/a2" 1.2.3 "${work}/u2"
artifacts "${work}/a3" 1.2.3
echo corrupted >>"${work}/a3/archicode-1.2.3-linux-arm64"
fails "assemble: a binary that does not match its .sha256 is refused" bash "${here}/release-assemble.sh" "${work}/a3" 1.2.3 "${work}/u3"
artifacts "${work}/a4" 1.2.3
artifacts "${work}/a4" 1.2.2
fails "assemble: the files of another version are refused" bash "${here}/release-assemble.sh" "${work}/a4" 1.2.3 "${work}/u4"
fails "assemble: the files of another version are not the release" bash "${here}/release-assemble.sh" "${work}/a1" 1.2.4 "${work}/u5"

# --- release-draft.sh, with a fake gh -------------------------------------------------------------------------------
mkdir -p "${work}/bin"
cat >"${work}/bin/gh" <<'EOF'
#!/usr/bin/env bash
# a fake gh: logs its arguments, answers from FAKE_STATE (absent, true: a draft, false: published) and FAKE_FOLDER
printf '%s\n' "$*" >>"${FAKE_LOG}"
case "$1 $2" in
  "release view")
    case "$*" in
      *isDraft,assets*) echo "true $(cd "${FAKE_FOLDER}" && echo * | tr ' ' '\n' | sort | tr '\n' ' ' | sed 's/ $//')" ;;
      *)
        if [ "${FAKE_STATE}" = "absent" ]; then
          echo "release not found" >&2
          exit 1
        fi
        echo "${FAKE_STATE}"
        ;;
    esac
    ;;
  "api repos/o/r/tags") printf '%s\n' archicode-0.17.0 archicode-0.18.0 ;;
  "release create")
    for a in "$@"; do
      if [ "${prev:-}" = "--notes-file" ]; then cp "$a" "${FAKE_LOG}.notes"; fi
      prev="$a"
    done
    ;;
  "release upload") ;;
  *) echo "fake gh: unexpected $*" >&2; exit 2 ;;
esac
EOF
chmod +x "${work}/bin/gh"
draft() { # draft <log> VAR=value...
  local log="$1"
  shift
  : >"${log}"
  env -i PATH="${work}/bin:${PATH}" HOME="${HOME}" GH_REPO=o/r FAKE_LOG="${log}" FAKE_FOLDER="${work}/u1" "$@" \
    bash "${here}/release-draft.sh" "${work}/u1" >"${log}.out" 2>&1
}
draft "${work}/d1" FAKE_STATE=absent TAG=archicode-1.2.3 "TITLE=ArchiCode 1.2.3" VERSION=1.2.3
created="$(grep '^release create' "${work}/d1" | sed 's/--notes-file [^ ]* /--notes-file <notes> /')"
check "draft: a new release is created as a draft, for the tag, with the files" "${created}" \
  "release create archicode-1.2.3 --draft --title ArchiCode 1.2.3 --notes-file <notes> --generate-notes ${work}/u1/SHA256SUMS ${work}/u1/archicode-1.2.3-linux-amd64 ${work}/u1/archicode-1.2.3-linux-arm64 ${work}/u1/archicode-1.2.3-macos-arm64 --verify-tag --notes-start-tag archicode-0.18.0"
check "draft: the notes link the block of the manual" \
  "$(grep -c 'https://o.github.io/r/docs/#upgrade-0-18' "${work}/d1.notes")" "1"
check "draft: nothing is published" "$(grep -c -- '--draft=false\|release edit' "${work}/d1" || true)" "0"
draft "${work}/d2" FAKE_STATE=absent TAG=rehearsal-1.2.3-SNAPSHOT-42 "TITLE=r" VERSION=1.2.3-SNAPSHOT REHEARSAL=true TARGET_COMMIT=abc RUN_ID=42
check "draft: a rehearsal is made on its commit, its tag is not verified" \
  "$(grep '^release create' "${work}/d2" | grep -c -- '--draft .*--target abc --notes-start-tag archicode-0.18.0$')" "1"
check "draft: the notes say it is a rehearsal" "$(grep -c '^\*\*Rehearsal\*\*' "${work}/d2.notes")" "1"
draft "${work}/d3" FAKE_STATE=true TAG=archicode-1.2.3 "TITLE=ArchiCode 1.2.3" VERSION=1.2.3
check "draft: a draft already there gets the files again" \
  "$(grep -c "^release upload archicode-1.2.3 .*/SHA256SUMS .* --clobber$" "${work}/d3")" "1"
check "draft: ... and is not created again" "$(grep -c '^release create' "${work}/d3" || true)" "0"
fails "draft: a published release is refused" \
  draft "${work}/d4" FAKE_STATE=false TAG=archicode-1.2.3 "TITLE=ArchiCode 1.2.3" VERSION=1.2.3
check "draft: ... and nothing is uploaded to it" "$(grep -c '^release upload\|^release create' "${work}/d4" || true)" "0"

# --- release-smoke.sh, with a fake archicode ------------------------------------------------------------------------
if command -v python3 >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then
  mkdir -p "${work}/s1" "${work}/example/views-old"
  printf 'settings: {}\n' >"${work}/example/.archicode.yaml"
  cat >"${work}/s1/archicode-1.2.3-linux-amd64" <<'EOF'
#!/usr/bin/env bash
# a fake archicode: --version, views generate --plateau <p>, editor serve (python3)
set -euo pipefail
case "$*" in
  --version) echo "archicode ${FAKE_VERSION:-1.2.3}" ;;
  *"views generate --plateau "*)
    [ ! -d views-old ] || { echo "the views of the example were not removed" >&2; exit 1; }
    mkdir -p "views-${!#}/plantuml" && echo '@startuml' >"views-${!#}/plantuml/a.puml" ;;
  *"editor serve"*)
    exec python3 -c '
import http.server
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        ok = self.path == "/?token=abc_1-Z"
        self.send_response(200 if ok else 403)
        self.end_headers()
        if ok:
            self.wfile.write(b"<html><script id=\"viewpoint-kernel-wasm\"></script></html>")
    def log_message(self, *args):
        pass
server = http.server.HTTPServer(("127.0.0.1", 0), H)
print("ArchiCode editor: http://127.0.0.1:%d/?token=abc_1-Z" % server.server_port, flush=True)
server.serve_forever()
' ;;
  *) echo "fake archicode: unexpected $*" >&2; exit 2 ;;
esac
EOF
  (cd "${work}/s1" && sha256_line archicode-1.2.3-linux-amd64 >SHA256SUMS && printf '%064d  archicode-1.2.3-macos-arm64\n' 0 >>SHA256SUMS)
  smoke() { bash "${here}/release-smoke.sh" "${work}/s1" linux-amd64 1.2.3 "${work}/example" to-be; }
  if smoke >"${work}/s1.out" 2>&1; then
    check "smoke: the fake passes" "$(tail -n 1 "${work}/s1.out")" "smoke test of archicode-1.2.3-linux-amd64: passed"
  else
    check "smoke: the fake passes" "$(cat "${work}/s1.out")" "smoke test of archicode-1.2.3-linux-amd64: passed"
  fi
  check "smoke: the example is left as it was" "$(cd "${work}/example" && echo *)" "views-old"
  FAKE_VERSION=9.9.9 fails "smoke: a binary that tells another version fails" smoke
  cp "${work}/s1/SHA256SUMS" "${work}/SHA256SUMS.good"
  sed 's/^./0/' "${work}/SHA256SUMS.good" >"${work}/s1/SHA256SUMS"
  fails "smoke: a file that does not match SHA256SUMS fails" smoke
  grep -v linux-amd64 "${work}/SHA256SUMS.good" >"${work}/s1/SHA256SUMS"
  fails "smoke: a file that SHA256SUMS does not list fails" smoke
  cp "${work}/SHA256SUMS.good" "${work}/s1/SHA256SUMS"
else
  echo "skip the smoke test of release-smoke.sh: it needs python3 and curl"
fi

echo "${count} checks, ${failures} failed"
[ "${failures}" -eq 0 ]
