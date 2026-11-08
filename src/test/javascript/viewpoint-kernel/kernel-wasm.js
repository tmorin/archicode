'use strict';
// The kernel's WebAssembly as `npm run kernel:build` writes it: the file the node tests instantiate.
const fs = require('node:fs');
const path = require('node:path');

const KERNEL_WASM = path.resolve(__dirname, '../../../../target/kernel/viewpoint_kernel.wasm');

/** The bytes of the kernel, or one line of advice when it was not built. */
function readKernelWasm() {
  if (!fs.existsSync(KERNEL_WASM)) {
    throw new Error('the kernel is missing: target/kernel/viewpoint_kernel.wasm (run npm run kernel:build)');
  }
  return fs.readFileSync(KERNEL_WASM);
}

module.exports = { KERNEL_WASM, readKernelWasm };
