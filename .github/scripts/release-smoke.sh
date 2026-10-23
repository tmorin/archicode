#!/usr/bin/env bash
# The smoke test of one file of a release, as it was downloaded from the release (job `Smoke`, on a runner of its
# target; also run by hand). It runs on Linux and on macOS (bash 3.2).
#
#   release-smoke.sh <folder of the downloaded files> <target> <version> <example folder> <plateau>
#
# 1. the file `archicode-<version>-<target>` matches its line of `SHA256SUMS` (the folder holds both);
# 2. made executable, `--version` prints `archicode <version>`;
# 3. `views generate --plateau <plateau>` on a copy of the example (a folder with `.archicode.yaml`; the folders of
#    views it ships are removed from the copy first) exits 0 and writes `views-<plateau>` with PlantUML files;
# 4. `editor serve --host 127.0.0.1 --port 0` on the same copy prints its address, answers the request for the page
#    with its token (HTTP 200, the standalone editor), and stops on a termination signal.
#
# BINARY overrides the file run (for a test of this script: a wrapper around the JVM jar); its checksum is still the
# one of the downloaded file. START_TIMEOUT and STOP_TIMEOUT are in seconds (60 and 20).
set -euo pipefail
# shellcheck source=SCRIPTDIR/release-lib.sh
. "$(dirname "$0")/release-lib.sh"

folder="${1:?the folder of the downloaded files}"
target="${2:?the target}"
version="${3:?the version}"
example="${4:?the example folder}"
plateau="${5:?the plateau}"
start_timeout="${START_TIMEOUT:-60}"
stop_timeout="${STOP_TIMEOUT:-20}"

folder="$(cd "${folder}" && pwd)"
example="$(cd "${example}" && pwd)"
name="archicode-${version}-${target}"

step() { echo "--- $*"; }

step "1. ${name} against SHA256SUMS"
[ -f "${folder}/${name}" ] || die "${name} is not among the downloaded files: $(cd "${folder}" && echo *)"
[ -f "${folder}/SHA256SUMS" ] || die "SHA256SUMS is not among the downloaded files"
work="$(mktemp -d)"
server=""
cleanup() {
  if [ -n "${server}" ] && kill -0 "${server}" 2>/dev/null; then
    kill -9 "${server}" 2>/dev/null || true
  fi
  rm -rf "${work}"
}
trap cleanup EXIT
awk -v name="${name}" '$2 == name' "${folder}/SHA256SUMS" >"${work}/one.sha256"
[ "$(grep -c . "${work}/one.sha256")" -eq 1 ] || die "SHA256SUMS has no line, or several, for ${name}"
(cd "${folder}" && sha256_check "${work}/one.sha256") || die "${name} does not match its line of SHA256SUMS"

chmod +x "${folder}/${name}"
binary="${BINARY:-${folder}/${name}}"

step "2. --version"
told="$("${binary}" --version)" || die "${name} --version failed: the binary does not run here"
echo "${told}"
[ "${told}" = "archicode ${version}" ] || die "${name} --version prints '${told}', expected 'archicode ${version}'"

step "3. views generate --plateau ${plateau} on a copy of ${example}"
cp -R "${example}" "${work}/workspace"
rm -rf "${work}"/workspace/views-*
(cd "${work}/workspace" && "${binary}" -w .archicode.yaml views generate --plateau "${plateau}") || die "views generate failed"
drawn="$(find "${work}/workspace/views-${plateau}" -type f -name '*.puml' 2>/dev/null | grep -c . || true)"
[ "${drawn}" -gt 0 ] || die "views generate wrote no PlantUML file in views-${plateau}"
echo "views-${plateau}: ${drawn} PlantUML files"

step "4. editor serve"
log="${work}/editor.log"
(cd "${work}/workspace" && exec "${binary}" -w .archicode.yaml editor serve --host 127.0.0.1 --port 0) >"${log}" 2>&1 &
server=$!
address=""
waited=0
while [ "${waited}" -lt "$((start_timeout * 5))" ]; do
  address="$(grep -Eo 'http://127\.0\.0\.1:[0-9]+/\?token=[0-9A-Za-z_-]+' "${log}" | head -n 1 || true)"
  [ -z "${address}" ] || break
  if ! kill -0 "${server}" 2>/dev/null; then
    cat "${log}"
    die "editor serve ended before it printed its address"
  fi
  sleep 0.2
  waited=$((waited + 1))
done
if [ -z "${address}" ]; then
  cat "${log}"
  die "editor serve printed no address within ${start_timeout} s"
fi
echo "editor serve listens: ${address%%\?*}?token=..."
status="$(curl --silent --show-error --max-time 30 --output "${work}/page.html" --write-out '%{http_code}' "${address}")" || die "no answer from editor serve at ${address%%\?*}"
[ "${status}" = "200" ] || die "the editor page answered HTTP ${status}, expected 200"
grep -q 'viewpoint-kernel-wasm' "${work}/page.html" || die "the page served is not the standalone editor"
echo "the editor page: HTTP 200, $(wc -c <"${work}/page.html" | tr -d ' ') bytes"

kill "${server}" 2>/dev/null || die "editor serve ended before it was asked to stop"
waited=0
while kill -0 "${server}" 2>/dev/null; do
  if [ "${waited}" -ge "$((stop_timeout * 5))" ]; then
    cat "${log}"
    die "editor serve did not stop within ${stop_timeout} s of a termination signal"
  fi
  sleep 0.2
  waited=$((waited + 1))
done
wait "${server}" 2>/dev/null || true
server=""
echo "editor serve stopped"
echo "smoke test of ${name}: passed"
