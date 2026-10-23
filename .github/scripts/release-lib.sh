# shellcheck shell=bash
# Functions shared by the scripts of the release (sourced, not run). They run on the Linux and the macOS runners of
# GitHub, so they keep to bash 3.2 (the bash of macOS): no `mapfile`, no associative arrays, no `${x,,}`, no expansion
# of an empty array under `set -u`, no `case` inside `$(...)`, and a subshell that must succeed is followed by
# `|| die ...`: bash 3.2 does not stop on `(cd x && false)` under `set -e`.

# The targets a release builds, one per line: `<target> <runner>`. The target is the last two words of the name of the
# file (`archicode-<version>-<target>`), the runner the GitHub-hosted runner that builds it and smoke-tests it. The
# first line is the one target a pull request and a push to main build.
release_targets() {
  cat <<'EOF'
linux-amd64 ubuntu-24.04
linux-arm64 ubuntu-24.04-arm
macos-arm64 macos-15
EOF
}

# Fails the step with a message GitHub shows as an annotation.
die() {
  echo "::error::$*" >&2
  exit 1
}

# `<hash>  <file>` for a file of the current folder, the line `sha256sum --check` reads (`shasum -a 256` where there is
# no `sha256sum`, as on macOS: it writes and reads the same line).
sha256_line() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  else
    shasum -a 256 "$1"
  fi
}

# Checks the files a checksum file lists, from the current folder; prints `<file>: OK` for each, fails on any other.
sha256_check() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum --check "$1"
  else
    shasum -a 256 --check "$1"
  fi
}

# The version of a release tag `archicode-<major>.<minor>.<patch>` (numbers only), or nothing when the name is not one.
version_of_tag() {
  case "$1" in
    archicode-*)
      if version_key "${1#archicode-}" >/dev/null; then
        printf '%s\n' "${1#archicode-}"
      fi
      ;;
  esac
  return 0
}

# `true` when the version is not lower than any release tag given on the standard input (one per line): the release
# becomes "Latest" when it is published; an older release published again does not take it from a newer one.
is_latest_release() {
  local key tag version
  key="$(version_key "$1")" || return 1
  while IFS= read -r tag; do
    version="$(version_of_tag "${tag}")"
    [ -n "${version}" ] || continue
    if [ "${key}" \< "$(version_key "${version}")" ]; then
      echo false
      return 0
    fi
  done
  echo true
}

# Writes `key=value` to the outputs of the step (GITHUB_OUTPUT), or to the standard output outside GitHub.
set_output() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf '%s=%s\n' "$1" "$2" >>"${GITHUB_OUTPUT}"
  fi
  printf '%s=%s\n' "$1" "$2"
}

# The release tag that comes before a version, from the tags given on the standard input (one per line): the greatest
# `archicode-X.Y.Z` lower than X.Y.Z (a `-SNAPSHOT` or another suffix is cut first). Nothing when there is none.
previous_release_tag() {
  local base="${1%%-*}"
  local best="" best_key="" tag version key
  while IFS= read -r tag; do
    version="$(version_of_tag "${tag}")"
    [ -n "${version}" ] || continue # not a release tag
    key="$(version_key "${version}")"
    if [ "${key}" \< "$(version_key "${base}")" ] && { [ -z "${best_key}" ] || [ "${best_key}" \< "${key}" ]; }; then
      best="${tag}"
      best_key="${key}"
    fi
  done
  if [ -n "${best}" ]; then
    printf '%s\n' "${best}"
  fi
}

# A key that sorts like the version X.Y.Z (each number on 6 digits), for `previous_release_tag`.
version_key() {
  local IFS=.
  # shellcheck disable=SC2086 # the version is split on its dots on purpose
  set -- $1
  if [ "$#" -ne 3 ]; then
    return 1
  fi
  case "$1$2$3" in
    *[!0-9]*) return 1 ;;
  esac
  printf '%06d.%06d.%06d\n' "$((10#$1))" "$((10#$2))" "$((10#$3))"
}
