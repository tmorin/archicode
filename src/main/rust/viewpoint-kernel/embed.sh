#!/usr/bin/env bash
# Builds the viewpoint kernel to WebAssembly into a file of your choice and touches nothing else.
#
#   embed.sh [--out FILE]   FILE defaults to target/kernel/viewpoint_kernel.wasm at the repository root
#
# The build runs with --locked, so Cargo.lock is the one that is built. Cargo's own folder is the folder "cargo" beside FILE.
# FILE is written through a temporary file and a move, and only when it is missing or its bytes differ, so that a build
# that changes nothing leaves its modification time alone. It needs rustup and no node.
#
# The compiler is the one of rust-toolchain.toml (rustup installs it and the wasm target by itself), and the paths
# of this machine are remapped, so that the same sources give the same bytes on every machine.
set -euo pipefail

# builtins only: dirname is an external command, and a PATH without rustup has none of them
if ! command -v rustup >/dev/null 2>&1; then
  echo "error: rustup is not installed, install it from https://rustup.rs" >&2
  exit 1
fi

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../../../.." && pwd)"
out="$repo/target/kernel/viewpoint_kernel.wasm"
while [ $# -gt 0 ]; do
  case "$1" in
    --out)
      if [ $# -lt 2 ]; then
        echo "error: --out needs a file" >&2
        exit 2
      fi
      out="$2"
      shift 2
      ;;
    *)
      echo "error: unknown option $1 (usage: embed.sh [--out FILE])" >&2
      exit 2
      ;;
  esac
done

# a relative FILE is relative to where the script is called from
case "$out" in
  /*) ;;
  *) out="$PWD/$out" ;;
esac
out_dir="$(dirname "$out")"
mkdir -p "$out_dir"
out_dir="$(cd "$out_dir" && pwd)"
out="$out_dir/$(basename "$out")"

# rustup looks for rust-toolchain.toml from the current directory
cd "$here"
export RUSTFLAGS="--remap-path-prefix=${CARGO_HOME:-$HOME/.cargo}=/cargo --remap-path-prefix=${RUSTUP_HOME:-$HOME/.rustup}=/rustup --remap-path-prefix=$here=/kernel"

cargo build --release --locked --target wasm32-unknown-unknown --manifest-path "$here/Cargo.toml" --target-dir "$out_dir/cargo"
built="$out_dir/cargo/wasm32-unknown-unknown/release/viewpoint_kernel.wasm"

if [ ! -f "$out" ] || ! cmp -s "$built" "$out"; then
  tmp="$(mktemp "$out_dir/.viewpoint_kernel.XXXXXX")"
  trap 'rm -f "$tmp"' EXIT
  cp "$built" "$tmp"
  mv "$tmp" "$out"
  echo "wrote $(wc -c < "$out") bytes of WebAssembly to $out"
else
  echo "$out is up to date ($(wc -c < "$out") bytes)"
fi
