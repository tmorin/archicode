#!/usr/bin/env bash
# Builds the viewpoint kernel to WebAssembly and puts it where it is used: the file
# src/main/resources/editor-webapp/assets/viewpoint_kernel.wasm, which Maven translates to JVM bytecode for the CLI
# (Chicory) and which the editor fetches beside the page (its ?v= hash is written in the page by scripts/build-editor.mjs).
#
#   embed.sh          rebuild, write the file, then assemble the page (node, after npm ci)
#   embed.sh --check  rebuild into a scratch directory and fail if the committed file differs from the build, or if the
#                     hash of the file in standalone.html is not the first 8 hex of its sha256 (needs rustup, no node)
#
# The compiler is the one of rust-toolchain.toml (rustup installs it and the wasm target by itself), and the paths
# of this machine are remapped, so that the same sources give the same bytes on every machine.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
html="$here/../../resources/editor-webapp/standalone.html"
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
  hash="$(sha256sum "$wasm" | cut -c1-8)"
  meta="$(grep -o '<meta name="archicode-asset:viewpoint_kernel.wasm" content="[^"]*"' "$html" | sed 's/.*?v=\([0-9a-f]*\)"$/\1/' || true)"
  if [ "$meta" != "$hash" ]; then
    problems="${problems:+$problems$'\n'}the hash of the kernel in standalone.html is not the build of the current sources"
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
