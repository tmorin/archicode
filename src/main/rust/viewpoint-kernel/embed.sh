#!/usr/bin/env bash
# Builds the viewpoint kernel to WebAssembly and puts it where it is used:
#   - src/main/wasm/viewpoint_kernel.wasm, which Maven translates to JVM bytecode for the CLI (Chicory);
#   - base64-encoded in the standalone editor (the <script id="viewpoint-kernel-wasm"> block of standalone.html).
# Both must come from the same build; a test checks that they do.
#
#   embed.sh          rebuild and write both
#   embed.sh --check  rebuild into a scratch directory and fail if either differs (what CI runs)
#
# The compiler is the one of rust-toolchain.toml (rustup installs it and the wasm target by itself), and the paths
# of this machine are remapped, so that the same sources give the same bytes on every machine.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
html="$here/../../resources/editor-webapp/standalone.html"
committed="$here/../../wasm/viewpoint_kernel.wasm"

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

python3 - "$html" "$wasm" "$committed" "${1:-}" <<'PY'
import base64, re, sys
html_path, wasm_path, committed_path, mode = sys.argv[1:5]
built = open(wasm_path, 'rb').read()
b64 = base64.b64encode(built).decode('ascii')
block = '<script type="application/octet-stream" id="viewpoint-kernel-wasm">' + b64 + '</script>'
html = open(html_path, encoding='utf-8').read()
pattern = re.compile(r'<script type="application/octet-stream" id="viewpoint-kernel-wasm">.*?</script>', re.S)
if mode == '--check':
    found = pattern.search(html)
    problems = []
    if open(committed_path, 'rb').read() != built:
        problems.append('src/main/wasm/viewpoint_kernel.wasm is not the build of the current sources')
    if not found or found.group(0) != block:
        problems.append('the kernel embedded in standalone.html is not the build of the current sources')
    if problems:
        sys.exit('\n'.join(problems) + '\nrun src/main/rust/viewpoint-kernel/embed.sh and commit the result')
    print('the committed WebAssembly is the one the sources build (%d bytes)' % len(built))
else:
    html = pattern.sub(lambda m: block, html, count=1) if pattern.search(html) else html.replace('</body>', block + '\n</body>', 1)
    open(html_path, 'w', encoding='utf-8').write(html)
    open(committed_path, 'wb').write(built)
    print('embedded %d bytes of WebAssembly (%d base64 characters)' % (len(built), len(b64)))
PY
