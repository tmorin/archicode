#!/usr/bin/env bash
# Collects the native binary the build wrote, for the artifact of the job `Native` (run from the root of the checkout,
# after `./mvnw verify -Dnative`).
#
#   TARGET            the target the binary is built for, the last two words of the name of the file (`linux-amd64`)
#   EXPECTED_VERSION  for a release: the version of its tag; the pom must have it (empty: the pom's, whatever it is)
#   POM_VERSION       the version of the pom, when it is already known (default: asked to Maven)
#
# The runner is `target/archicode-<version>-runner`; the name is looked for rather than built, in `target` and one
# folder below it (the folder `archicode-<version>-native-image-source-jar` holds the `-runner.jar` the image is made
# from, which the pattern does not match), and there must be exactly one executable. The binary must tell the version
# of the pom (`archicode --version`: a first smoke test of the file as it is uploaded). `native-dist` holds what is
# uploaded: `archicode-<version>-<target>` and `<that name>.sha256`, the line `sha256sum --check` reads.
# Outputs: `version`, `artifact` (the name of the file and of the artifact).
set -euo pipefail
# shellcheck source=SCRIPTDIR/release-lib.sh
. "$(dirname "$0")/release-lib.sh"

target="${TARGET:?TARGET is required}"
version="${POM_VERSION:-}"
if [ -z "${version}" ]; then
  version="$(./mvnw --batch-mode --quiet help:evaluate -Dexpression=project.version -DforceStdout)"
fi
if [ -n "${EXPECTED_VERSION:-}" ] && [ "${version}" != "${EXPECTED_VERSION}" ]; then
  die "the pom says version ${version}, the release is ${EXPECTED_VERSION}: build the tag of the release"
fi

runners="$(find target -maxdepth 2 -type f -name 'archicode-*-runner' -perm -u+x | sort)"
count="$(printf '%s' "${runners}" | grep -c . || true)"
if [ "${count}" -ne 1 ]; then
  echo "::error::expected exactly one native runner (target/archicode-*-runner), found ${count}: ${runners:-none}"
  find target -maxdepth 2 -name 'archicode-*' | sort
  exit 1
fi
runner="${runners}"

told="$("${runner}" --version)" || die "${runner} --version failed: the binary does not run here"
if [ "${told}" != "archicode ${version}" ]; then
  die "${runner} --version prints '${told}', expected 'archicode ${version}'"
fi

name="archicode-${version}-${target}"
mkdir -p native-dist
cp "${runner}" "native-dist/${name}"
(cd native-dist && sha256_line "${name}" >"${name}.sha256" && sha256_check "${name}.sha256") || die "the checksum of ${name} does not check"
ls -l native-dist
case "$(uname -s)" in
  Darwin) # for the reader of the log: the oldest macOS the binary says it runs on (`minos`)
    otool -l "native-dist/${name}" | grep -E -A4 'LC_BUILD_VERSION|LC_VERSION_MIN_MACOSX' | grep -E 'minos|version' || true
    ;;
  Linux) # for the reader of the log: the newest glibc symbol version the binary needs
    { objdump -T "native-dist/${name}" 2>/dev/null | grep -Eo 'GLIBC_[0-9.]+' | sort -u -V | tail -n 1; } || true
    ;;
esac
set_output version "${version}"
set_output artifact "${name}"
