#!/usr/bin/env bash
# Builds the viewpoint kernel to WebAssembly and puts it where it is used: the file
# src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm, which Maven translates to JVM bytecode for the CLI
# (Chicory), and from which scripts/build-editor.mjs writes the script viewpoint_kernel.js that the editor page loads beside
# itself (the base64 of the file, a classic script so that a page opened from a disk loads it; its ?v= hash is in the page).
#
#   embed.sh          rebuild, write the file, then write the script and assemble the page (node, after npm ci)
#   embed.sh --check  rebuild into a scratch directory and fail if the committed file differs from the build (needs rustup,
#                     no node; `npm run editor:check` checks that the script and the page follow the file)
#
# The compiler is the one of rust-toolchain.toml (rustup installs it and the wasm target by itself), and the paths
# of this machine are remapped, so that the same sources give the same bytes on every machine.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
committed="$here/../../resources/editor-webapp/assets/viewpoint_kernel.wasm"

# rustup looks for rust-toolchain.toml from the current directory
cd "$here"
export RUSTFLAGS="--remap-path-prefix=${CARGO_HOME:-$HOME/.cargo}=/cargo --remap-path-prefix=${RUSTUP_HOME:-$HOME/.rustup}=/rustup --remap-path-prefix=$here=/kernel"

if [ "${1:-}" = "--check" ]; then
  target="$(mktemp -d)"
  trap 'rm -rf "$target"' EXIT
else
  target="$here/target"
fi

cargo build --release --target wasm32-unknown-unknown --manifest-path "$here/Cargo.toml" --target-dir "$target"
wasm="$target/wasm32-unknown-unknown/release/viewpoint_kernel.wasm"
if [ "${1:-}" = "--check" ]; then
  problems=""
  if ! cmp -s "$wasm" "$committed"; then
    problems="src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm is not the build of the current sources"
  fi
  if [ -n "$problems" ]; then
    echo "$problems" >&2
    echo "run src/main/rust/viewpoint-kernel/embed.sh and commit the result" >&2
    exit 1
  fi
  echo "the committed WebAssembly is the one the sources build ($(wc -c < "$wasm") bytes)"
else
  cp "$wasm" "$committed"
  echo "wrote $(wc -c < "$wasm") bytes of WebAssembly"
  node "$here/../../../../scripts/build-editor.mjs"
fi
