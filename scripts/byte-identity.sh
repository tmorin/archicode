#!/usr/bin/env bash
# byte-identity.sh: V-C of wave 023 (and of any later wave that must not move an output).
#
# Runs the commands of ArchiCode on every workspace the repository ships with two programs and compares what they do:
#   - the BASE jar, built from `git archive` of a tag (default: archicode-0.19.0) in a folder outside the repository;
#   - the NEW jar, built from the working tree.
# For each workspace (src/doc/examples/*, src/test/resources/**, every folder that holds a .archicode.yaml) and each command
#   views generate, stories generate, query graph, query views, diff, plateau list, query schemas workspace
# (and, for a workspace that has plateaus, the commands that take --plateau, once per plateau), the two programs each run on
# a fresh copy of the workspace. Compared: the exit code, the standard output, the error output and every file written
# (`diff -r` of the two copies). The folder of the copy is replaced by <WS> in the outputs.
#
# The only accepted differences are the error sentences a wave announced (its T1 exceptions), listed in an exceptions file:
# one rule per line, `BASE_REGEX<TAB>NEW_REGEX` (extended regular expressions, matched on a whole line of the error output;
# `#` starts a comment). A difference is accepted when the exit codes and the standard outputs are the same, the written
# files are the same, the two error outputs have the same number of lines, and every line that differs is matched by one rule
# (the BASE line by its BASE_REGEX, the NEW line by its NEW_REGEX). Anything else is reported and the exit code is 1.
#
# Then a self-check proves the comparison has teeth: a scratch workspace with a dangling relationship is run through the
# same comparison, which must find a difference with an empty exceptions file, and none with the real one.
#
# Usage: scripts/byte-identity.sh [options]
#   --exceptions FILE   the accepted sentences (default: scripts/byte-identity-exceptions.txt)
#   --new-files FILE    the files whose difference is the feature (default: scripts/byte-identity-new-files.txt): one extended
#                       regular expression per line on the path of a written file; a matching file is accepted when it exists in
#                       both copies and differs; any other difference is reported as before
#   --base-tag TAG      the tag of the base program (default: archicode-0.19.0)
#   --base-dir DIR      where the base program is built and kept (default: ~/.cache/archicode-byte-identity/<tag>)
#   --no-build          use target/quarkus-app as it is (else `./mvnw -o package -DskipTests -DskipITs` first)
#   --only NAME         only the workspaces whose path contains NAME
#   --no-self-check     skip the self-check (it relies on the dangling-reference sentence of wave 023, W-2)
#   --keep              keep the scratch folder (its path is printed)
# Needs: JAVA_HOME of a JDK 25 (the shell's java may be older: `export JAVA_HOME=$(ls -d ~/.sdkman/candidates/java/25* | head -1)`),
# git, tar, diff, and the Maven dependencies in ~/.m2 (the build is offline). Bash 3.2 compatible (it runs on macOS too).
# Prints the counts at the end; exit 0 when there is no unexpected difference, 1 otherwise.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXCEPTIONS="$ROOT/scripts/byte-identity-exceptions.txt"
NEWFILES="$ROOT/scripts/byte-identity-new-files.txt"
TAG="archicode-0.19.0"
BASE_DIR=""
BUILD=1
KEEP=0
ONLY=""
SELF_CHECK=1

while [ $# -gt 0 ]; do
  case "$1" in
    --exceptions) EXCEPTIONS="$2"; shift 2 ;;
    --new-files) NEWFILES="$2"; shift 2 ;;
    --base-tag) TAG="$2"; shift 2 ;;
    --base-dir) BASE_DIR="$2"; shift 2 ;;
    --no-build) BUILD=0; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --no-self-check) SELF_CHECK=0; shift ;;
    --keep) KEEP=1; shift ;;
    -h|--help) sed -n '2,/^set -u/p' "$0" | sed '$d'; exit 0 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done
[ -n "$BASE_DIR" ] || BASE_DIR="${HOME}/.cache/archicode-byte-identity/${TAG}"
JAVA="${JAVA_HOME:+$JAVA_HOME/bin/}java"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/byte-identity.XXXXXX")"
cleanup() { [ "$KEEP" = 1 ] && echo "scratch kept: $WORK" || rm -rf "$WORK"; }
trap cleanup EXIT

# ---- the two programs

if [ ! -f "$BASE_DIR/src/target/quarkus-app/quarkus-run.jar" ]; then
  echo "building the base program from the tag $TAG in $BASE_DIR"
  mkdir -p "$BASE_DIR/src" || exit 2
  (cd "$ROOT" && git archive "$TAG") | tar -x -C "$BASE_DIR/src" || exit 2
  (cd "$BASE_DIR/src" && ./mvnw -o -q package -DskipTests -DskipITs >"$BASE_DIR/build.log" 2>&1) \
    || { echo "the base build failed, see $BASE_DIR/build.log" >&2; exit 2; }
fi
BASE_JAR="$BASE_DIR/src/target/quarkus-app/quarkus-run.jar"
if [ "$BUILD" = 1 ]; then
  echo "building the working tree"
  (cd "$ROOT" && ./mvnw -o -q package -DskipTests -DskipITs >"$WORK/new-build.log" 2>&1) \
    || { echo "the build failed, see $WORK/new-build.log" >&2; KEEP=1; exit 2; }
fi
NEW_JAR="$ROOT/target/quarkus-app/quarkus-run.jar"
[ -f "$NEW_JAR" ] || { echo "no $NEW_JAR" >&2; exit 2; }

# ---- the comparison

TOTAL=0; SAME=0; ACCEPTED=0; UNEXPECTED=0
REPORT="$WORK/report.txt"; : >"$REPORT"

# prepare_run JAR WORKSPACE_SOURCE_DIR DEST: a fresh copy, and the program run in it; leaves DEST/{out,err,exit} beside the copy
run_one() { # jar src dest args...
  local jar="$1" src="$2" dest="$3"; shift 3
  rm -rf "$dest"; mkdir -p "$dest"
  cp -R "$src" "$dest/ws"
  (cd "$dest/ws" && "$JAVA" -jar "$jar" -w "$dest/ws/.archicode.yaml" "$@" >"$dest/out" 2>"$dest/err"; echo $? >"$dest/exit")
  sed "s#$dest/ws#<WS>#g" "$dest/out" >"$dest/out.n"
  sed "s#$dest/ws#<WS>#g" "$dest/err" >"$dest/err.n"
}

# the error lines of a pair are accepted when each differing line is covered by a rule
lines_accepted() { # base_err new_err exceptions
  local a="$1" b="$2" rules="$3"
  [ "$(wc -l <"$a")" -eq "$(wc -l <"$b")" ] || return 1
  [ -s "$rules" ] || return 1
  local n i la lb ok rule rb rn
  n=$(wc -l <"$a")
  i=1
  while [ "$i" -le "$n" ]; do
    la="$(sed -n "${i}p" "$a")"; lb="$(sed -n "${i}p" "$b")"
    if [ "$la" != "$lb" ]; then
      ok=0
      while IFS="$(printf '\t')" read -r rb rn; do
        case "$rb" in ''|'#'*) continue ;; esac
        if printf '%s\n' "$la" | grep -Eq -- "$rb" && printf '%s\n' "$lb" | grep -Eq -- "$rn"; then ok=1; break; fi
      done <"$rules"
      [ "$ok" = 1 ] || return 1
    fi
    i=$((i + 1))
  done
  return 0
}

# the written files of a pair differ only in files the new-files list names (and each of them exists in both copies)
files_accepted() { # base_ws new_ws list
  local b="$1" n="$2" list="$3" line path pat ok
  [ -s "$list" ] || return 1
  diff -r -q "$b" "$n" >"$WORK/run/filediff" 2>&1
  [ -s "$WORK/run/filediff" ] || return 1
  while IFS= read -r line; do
    case "$line" in
      "Files "*" differ") path="${line#Files $b/}"; path="${path%% and *}" ;;
      *) return 1 ;;
    esac
    ok=0
    while IFS= read -r pat; do
      case "$pat" in ''|'#'*) continue ;; esac
      if printf '%s\n' "$path" | grep -Eq -- "$pat"; then ok=1; break; fi
    done <"$list"
    [ "$ok" = 1 ] || return 1
  done <"$WORK/run/filediff"
  return 0
}

compare() { # label src rules args...
  local label="$1" src="$2" rules="$3"; shift 3
  local b="$WORK/run/base" n="$WORK/run/new"
  run_one "$BASE_JAR" "$src" "$b" "$@" &
  local p1=$!
  run_one "$NEW_JAR" "$src" "$n" "$@" &
  local p2=$!
  wait "$p1" "$p2"
  TOTAL=$((TOTAL + 1))
  local files_same=1 out_same=1 err_same=1 exit_same=1
  diff -r -q "$b/ws" "$n/ws" >/dev/null 2>&1 || files_same=0
  cmp -s "$b/out.n" "$n/out.n" || out_same=0
  cmp -s "$b/err.n" "$n/err.n" || err_same=0
  cmp -s "$b/exit" "$n/exit" || exit_same=0
  if [ $files_same = 1 ] && [ $out_same = 1 ] && [ $err_same = 1 ] && [ $exit_same = 1 ]; then
    SAME=$((SAME + 1)); return 0
  fi
  if [ $files_same = 0 ] && [ $out_same = 1 ] && [ $exit_same = 1 ] && [ $err_same = 1 ] && files_accepted "$b/ws" "$n/ws" "${NEWLIST:-$NEWFILES}"; then
    ACCEPTED=$((ACCEPTED + 1))
    { echo "ACCEPTED  $label (files of the feature)"; cat "$WORK/run/filediff" | sed 's/^/    /'; } >>"$REPORT"
    return 0
  fi
  if [ $files_same = 1 ] && [ $out_same = 1 ] && [ $exit_same = 1 ] && lines_accepted "$b/err.n" "$n/err.n" "$rules"; then
    ACCEPTED=$((ACCEPTED + 1))
    { echo "ACCEPTED  $label"; diff "$b/err.n" "$n/err.n" | sed 's/^/    /'; } >>"$REPORT"
    return 0
  fi
  UNEXPECTED=$((UNEXPECTED + 1))
  {
    echo "DIFFERENT $label (files:$files_same stdout:$out_same stderr:$err_same exit:$exit_same)"
    [ $exit_same = 1 ] || echo "    exit: base $(cat "$b/exit"), new $(cat "$n/exit")"
    [ $err_same = 1 ] || diff "$b/err.n" "$n/err.n" | sed 's/^/    err /' | head -10
    [ $out_same = 1 ] || diff "$b/out.n" "$n/out.n" | sed 's/^/    out /' | head -10
    [ $files_same = 1 ] || diff -r -q "$b/ws" "$n/ws" | sed 's/^/    files /' | head -10
  } >>"$REPORT"
  return 1
}

run_workspace() { # rules dir
  local rules="$1" dir="$2"
  local name="${dir#$ROOT/}"
  compare "$name: views generate" "$dir" "$rules" views generate
  compare "$name: stories generate" "$dir" "$rules" stories generate
  compare "$name: query graph" "$dir" "$rules" query graph
  compare "$name: query views" "$dir" "$rules" query views
  compare "$name: diff" "$dir" "$rules" diff
  compare "$name: plateau list" "$dir" "$rules" plateau list
  compare "$name: query schemas workspace" "$dir" "$rules" query schemas workspace
  # a workspace that has plateaus: the commands that take --plateau, once for each (the ids are the first column of plateau list)
  run_one "$BASE_JAR" "$dir" "$WORK/run/list" plateau list
  if [ "$(cat "$WORK/run/list/exit")" = 0 ]; then
    tail -n +2 "$WORK/run/list/out" | awk '{print $1}' | while read -r plateau; do
      echo "$plateau"
    done >"$WORK/run/plateaus"
    # (a subshell above cannot count, so the plateaus go through a file and the loop below runs in this shell)
    while read -r plateau; do
      [ -n "$plateau" ] || continue
      for cmd in "views generate" "stories generate" "query graph" "query views" "diff"; do
        # shellcheck disable=SC2086
        compare "$name: $cmd --plateau $plateau" "$dir" "$rules" $cmd --plateau "$plateau"
      done
    done <"$WORK/run/plateaus"
  fi
}

mkdir -p "$WORK/run"
echo "base: $TAG ($("$JAVA" -jar "$BASE_JAR" --version 2>&1)), new: working tree ($("$JAVA" -jar "$NEW_JAR" --version 2>&1))"

WORKSPACES=0
for file in $(cd "$ROOT" && find src -name .archicode.yaml | LC_ALL=C sort); do
  dir="$ROOT/$(dirname "$file")"
  if [ -n "$ONLY" ]; then
    case "$dir" in *"$ONLY"*) ;; *) continue ;; esac
  fi
  WORKSPACES=$((WORKSPACES + 1))
  run_workspace "$EXCEPTIONS" "$dir"
done

# ---- the self-check: the comparison has teeth

SELF_FAIL=0
if [ "$SELF_CHECK" = 1 ]; then
  SELF="$WORK/self"; mkdir -p "$SELF/manifests"
  printf 'settings: {}\n' >"$SELF/.archicode.yaml"
  printf 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n  relationships:\n    - destination: "nowhere"\n' >"$SELF/manifests/shop.yaml"
  EMPTY="$WORK/no-rules"; : >"$EMPTY"
  # with no rule the changed sentence must be found (and it is not counted: it is the proof)
  REPORT_REAL="$REPORT"; REPORT=/dev/null
  before=$UNEXPECTED
  compare "self-check (no rules)" "$SELF" "$EMPTY" query graph
  if [ "$UNEXPECTED" -gt "$before" ]; then UNEXPECTED=$before; else echo "SELF-CHECK FAILED: a changed sentence was not found without the exceptions" >&2; SELF_FAIL=1; fi
  REPORT="$REPORT_REAL"
  # with the rules it must be accepted
  before=$UNEXPECTED
  compare "self-check (rules)" "$SELF" "$EXCEPTIONS" query graph
  [ "$UNEXPECTED" -eq "$before" ] || SELF_FAIL=1
fi

# the list of new files has teeth too: a scratch workspace whose story differs between the programs only through a file the list
# does not name must be found, and a listed one accepted (the scratch copies are made here, by hand, not by the programs)
if [ "$SELF_CHECK" = 1 ]; then
  NF="$WORK/nf"; rm -rf "$NF"; mkdir -p "$NF/a/views-stories/order_flow" "$NF/a/views-stories/other" "$NF/b/views-stories/order_flow" "$NF/b/views-stories/other"
  echo one >"$NF/a/views-stories/order_flow/x.puml"; echo two >"$NF/b/views-stories/order_flow/x.puml"
  echo one >"$NF/a/views-stories/other/y.puml"; echo two >"$NF/b/views-stories/other/y.puml"
  mkdir -p "$WORK/run"
  if files_accepted "$NF/a" "$NF/b" "$NEWFILES"; then echo "SELF-CHECK FAILED: a file the list does not name was accepted" >&2; SELF_FAIL=1; fi
  rm -rf "$NF/a/views-stories/other" "$NF/b/views-stories/other"
  if ! files_accepted "$NF/a" "$NF/b" "$NEWFILES"; then echo "SELF-CHECK FAILED: a listed file was not accepted" >&2; SELF_FAIL=1; fi
fi

echo
cat "$REPORT"
echo "workspaces: $WORKSPACES; commands compared: $TOTAL; identical: $SAME; accepted by the exceptions: $ACCEPTED; unexpected: $UNEXPECTED; self-check: $([ $SELF_FAIL = 0 ] && echo ok || echo FAILED)"
[ "$UNEXPECTED" -eq 0 ] && [ "$SELF_FAIL" -eq 0 ]
