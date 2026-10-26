#!/usr/bin/env bash
# Checks the commits that promise to move code (wave 024, run 0183, step 5.3a; design: this run's DEC-6 and CTR-6).
#
# Usage: scripts/check-editor-moves.sh <base> <head>
#
# For each commit of `git rev-list --reverse <base>..<head>`, in the repository of the current folder:
#   - a subject that begins `refactor: move` must be a pure move: in a detached worktree of the commit, the assembly of
#     the page must be the page of the parent, byte for byte (node scripts/build-editor.mjs --check-identical);
#   - a subject that begins `refactor: relocate` must keep the declarations and the comments of the page of the parent
#     (node scripts/check-editor.mjs --statements);
#   - any other subject is not checked.
# The scripts that run are the ones next to this file (those of the checked-out head), on the tree of each commit.
# One line per checked commit: `<short hash> <subject> ok`. The first failure is named and ends the run with exit 1.
# Hashes and subjects are passed to git and node as arguments only, never to a shell.

set -u

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

if [ "$#" -ne 2 ]; then
  fail "usage: scripts/check-editor-moves.sh <base> <head>"
fi
base=$1
head=$2
if [ "${base#-}" != "$base" ] || [ "${head#-}" != "$head" ]; then
  fail "\`$base\` and \`$head\` must be revisions, not options"
fi

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd) || fail "cannot find the folder of the script"
git rev-parse --git-dir > /dev/null 2>&1 || fail "the current folder is not in a git repository"

if ! git rev-parse --verify --quiet "$base^{commit}" > /dev/null; then
  fail "the base \`$base\` is not in this clone (a shallow clone? fetch the history of the pull request first, for example with fetch-depth: 0)"
fi
if ! git rev-parse --verify --quiet "$head^{commit}" > /dev/null; then
  fail "the head \`$head\` is not in this clone"
fi

work=$(mktemp -d) || fail "cannot make a temporary folder"
cleanup() {
  if [ -d "$work/tree" ]; then
    git worktree remove --force "$work/tree" > /dev/null 2>&1
  fi
  rm -rf "$work"
  git worktree prune > /dev/null 2>&1
}
trap cleanup EXIT

commits=$(git rev-list --reverse "$base..$head") || fail "cannot list the commits of \`$base..$head\`"

checked=0
for commit in $commits; do
  subject=$(git log -1 --format=%s "$commit")
  case "$subject" in
    "refactor: move"*) kind=move ;;
    "refactor: relocate"*) kind=relocate ;;
    *) continue ;;
  esac
  short=$(git rev-parse --short "$commit")
  git worktree add --detach "$work/tree" "$commit" > /dev/null 2>&1 || fail "cannot make a worktree of $short"
  if [ "$kind" = move ]; then
    output=$(node "$script_dir/build-editor.mjs" --root "$work/tree" --check-identical "$commit^" 2>&1)
  else
    output=$(node "$script_dir/check-editor.mjs" --root "$work/tree" --statements "$commit^" 2>&1)
  fi
  status=$?
  git worktree remove --force "$work/tree" > /dev/null 2>&1
  if [ "$status" -ne 0 ]; then
    printf 'error: the commit %s "%s" says it is a %s and it is not: %s\n' "$short" "$subject" "$kind" "$output" >&2
    exit 1
  fi
  printf '%s %s ok\n' "$short" "$subject"
  checked=$((checked + 1))
done

if [ "$checked" -eq 0 ]; then
  printf 'no refactor: move or refactor: relocate commit in %s..%s\n' "$base" "$head"
fi
