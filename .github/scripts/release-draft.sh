#!/usr/bin/env bash
# Puts the files of a release on a DRAFT release of GitHub (job `Release`); the job `Publish` publishes it once every
# smoke test passed on the files as they are there.
#
#   release-draft.sh <upload folder>
#
#   TAG             the tag of the release (`archicode-X.Y.Z`, or `rehearsal-<version>-<run id>`)
#   TITLE           its title
#   VERSION         the version of the files
#   REHEARSAL       `true` for a rehearsal: the draft is made on TARGET_COMMIT, whose tag does not exist and is never made
#   TARGET_COMMIT   the commit of a rehearsal (github.sha)
#   GH_REPO         owner/name; GH_TOKEN the token of the job (`contents: write`)
#   SITE_URL        the manual (default https://<owner>.github.io/<name>/docs/)
#
# With no release for the tag, a draft is created, with the notes GitHub generates (`--generate-notes`, from the
# previous release tag) after a paragraph that links the block of the manual that says what changes and tells how to
# check and run a file. With a draft already there (a job run again, a dispatch with `tag` after a failure), the files
# replace the ones it has (`--clobber`) and its notes are kept. A release that is already published is refused: its
# files would change before any smoke test; make it a draft again (`gh release edit <tag> --draft=true`) and run again.
set -euo pipefail
# shellcheck source=SCRIPTDIR/release-lib.sh
. "$(dirname "$0")/release-lib.sh"

upload="${1:?the upload folder}"
tag="${TAG:?TAG is required}"
title="${TITLE:?TITLE is required}"
version="${VERSION:?VERSION is required}"
rehearsal="${REHEARSAL:-false}"
repo="${GH_REPO:?GH_REPO is required}"
site="${SITE_URL:-https://${repo%%/*}.github.io/${repo#*/}/docs/}"

files=""
for file in "${upload}"/*; do
  [ -f "${file}" ] || die "nothing to upload in ${upload}"
  files="${files}${files:+
}${file}"
done
[ -f "${upload}/SHA256SUMS" ] || die "no SHA256SUMS in ${upload}"

work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

if state="$(gh release view "${tag}" --json isDraft --jq '.isDraft' 2>"${work}/view.err")"; then
  :
elif grep -qi 'not found' "${work}/view.err"; then
  state="absent"
else
  cat "${work}/view.err" >&2
  die "could not read the release ${tag}"
fi
echo "release ${tag}: ${state} (true: a draft, false: published)"

# gh takes the files as arguments; the names hold no space (archicode-<version>-<target>, SHA256SUMS)
# shellcheck disable=SC2086
set -- ${files}

case "${state}" in
  true)
    gh release upload "${tag}" "$@" --clobber
    ;;
  false)
    die "the release ${tag} is published: its files are replaced only on a draft, after which the smoke tests run on them. Make it a draft (gh release edit ${tag} --draft=true) and run the workflow again with this tag"
    ;;
  absent)
    previous="$(gh api "repos/${repo}/tags" --paginate --jq '.[].name' | previous_release_tag "${version}")"
    {
      if [ "${rehearsal}" = "true" ]; then
        echo "**Rehearsal** of the release job (workflow run ${RUN_ID:-}): a draft that is never published. Delete it once looked at (\`gh release delete ${tag} --yes\`)."
        echo
      fi
      if [ -n "${previous}" ]; then
        minor="$(version_of_tag "${previous}")"
        minor="${minor%.*}"
        echo "What changes for a reader who knows ${previous#archicode-}: [the manual](${site}#upgrade-${minor//./-})."
      else
        echo "The manual: ${site}"
      fi
      echo
      echo "The native \`archicode\` for Linux (amd64, arm64) and macOS (Apple Silicon), one file each, and \`SHA256SUMS\`. Check the file you downloaded, make it executable and run it (it prints \`archicode ${version}\`):"
      echo
      echo '```'
      echo "sha256sum --check --ignore-missing SHA256SUMS"
      echo "chmod +x archicode-${version}-linux-amd64"
      echo "./archicode-${version}-linux-amd64 --version"
      echo '```'
      echo
      echo "On macOS, check it with \`grep archicode-${version}-macos-arm64 SHA256SUMS | shasum -a 256 --check\`; a file downloaded with a browser is quarantined: \`xattr -d com.apple.quarantine archicode-${version}-macos-arm64\` before running it."
      echo
    } >"${work}/notes.md"
    cat "${work}/notes.md"
    if [ "${rehearsal}" = "true" ]; then
      set -- "$@" --target "${TARGET_COMMIT:?TARGET_COMMIT is required for a rehearsal}"
    else
      set -- "$@" --verify-tag
    fi
    if [ -n "${previous}" ]; then
      set -- "$@" --notes-start-tag "${previous}"
    fi
    gh release create "${tag}" --draft --title "${title}" --notes-file "${work}/notes.md" --generate-notes "$@"
    ;;
  *)
    die "unexpected answer about the release ${tag}: ${state}"
    ;;
esac

# what the draft holds now: every file of the upload folder, under its name
listed="$(gh release view "${tag}" --json isDraft,assets --jq '(.isDraft | tostring) + " " + ([.assets[].name] | sort | join(" "))')"
echo "the release ${tag} now: ${listed}"
case "${listed}" in
  "true "*) ;;
  *) die "the release ${tag} is not a draft any more" ;;
esac
for file in "${upload}"/*; do
  case " ${listed} " in
    *" $(basename "${file}") "*) ;;
    *) die "the draft ${tag} lacks $(basename "${file}")" ;;
  esac
done
