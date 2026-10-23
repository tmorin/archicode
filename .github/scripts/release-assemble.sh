#!/usr/bin/env bash
# Assembles the files of a release from the artifacts of the jobs `Native` (job `Release`, on Linux).
#
#   release-assemble.sh <folder of the artifacts> <version> <upload folder>
#
# The folder holds, for each target of `release_targets`, `archicode-<version>-<target>` and its `.sha256` (the
# artifacts downloaded with `merge-multiple`). Each binary is checked against its `.sha256` and made executable (an
# artifact is a zip that loses the executable bit), and `SHA256SUMS` is the `.sha256` lines in the order of the
# targets, checked once more. The upload folder receives the binaries and `SHA256SUMS`, nothing else: every target
# must be there, and a file the targets do not name is refused (a stale artifact, a wrong version).
set -euo pipefail
# shellcheck source=SCRIPTDIR/release-lib.sh
. "$(dirname "$0")/release-lib.sh"

from="${1:?the folder of the artifacts}"
version="${2:?the version}"
upload="${3:?the upload folder}"

[ -d "${from}" ] || die "no folder ${from}: no artifact was downloaded"
mkdir -p "${upload}"
upload="$(cd "${upload}" && pwd)"
rm -f "${upload}/SHA256SUMS"
cd "${from}"

expected=""
while read -r target _; do
  name="archicode-${version}-${target}"
  expected="${expected} ${name} ${name}.sha256"
  [ -f "${name}" ] || die "the binary ${name} is missing: the Native job of ${target} did not upload it"
  [ -f "${name}.sha256" ] || die "${name}.sha256 is missing"
  if [ "$(grep -c . "${name}.sha256")" -ne 1 ] || [ "$(awk '{ print $2 }' "${name}.sha256")" != "${name}" ]; then
    die "${name}.sha256 is not the one line \`<hash>  ${name}\`"
  fi
  sha256_check "${name}.sha256"
  chmod +x "${name}"
  cp -p "${name}" "${upload}/${name}"
  cat "${name}.sha256" >>"${upload}/SHA256SUMS"
done < <(release_targets)

for file in *; do
  case " ${expected} " in
    *" ${file} "*) ;;
    *) die "unexpected file ${file} among the artifacts (expected:${expected})" ;;
  esac
done

cd "${upload}"
sha256_check SHA256SUMS
ls -l
