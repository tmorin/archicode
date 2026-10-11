#!/usr/bin/env bash
# Builds the viewpoint kernel to WebAssembly and puts it where it is used:
#   - src/main/wasm/viewpoint_kernel.wasm, which Maven translates to JVM bytecode for the CLI (Chicory);
#   - base64-encoded in the standalone editor (the <script id="viewpoint-kernel-wasm"> block of standalone.html).
# Both must come from the same build; a test checks that they do.
# Needs: rustup target add wasm32-unknown-unknown
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
html="$here/../../resources/editor-webapp/standalone.html"

cargo build --release --target wasm32-unknown-unknown --manifest-path "$here/Cargo.toml"
wasm="$here/target/wasm32-unknown-unknown/release/viewpoint_kernel.wasm"
mkdir -p "$here/../../wasm"
cp "$wasm" "$here/../../wasm/viewpoint_kernel.wasm"

python3 - "$html" "$wasm" <<'PY'
import base64, re, sys
html_path, wasm_path = sys.argv[1], sys.argv[2]
b64 = base64.b64encode(open(wasm_path, 'rb').read()).decode('ascii')
block = '<script type="application/octet-stream" id="viewpoint-kernel-wasm">' + b64 + '</script>'
html = open(html_path, encoding='utf-8').read()
pattern = re.compile(r'<script type="application/octet-stream" id="viewpoint-kernel-wasm">.*?</script>', re.S)
if pattern.search(html):
    html = pattern.sub(lambda m: block, html, count=1)
else:
    html = html.replace('</body>', block + '\n</body>', 1)
open(html_path, 'w', encoding='utf-8').write(html)
print('embedded %d bytes of WebAssembly (%d base64 characters)' % (len(base64.b64decode(b64)), len(b64)))
PY
