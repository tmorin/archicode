// The harness of the end-to-end suite (wave 023, run 0175, T11): it starts `archicode editor serve` from the packaged
// application (target/quarkus-app/quarkus-run.jar, which `./mvnw verify` builds) on a free port, on a COPY of a folder
// in a temporary folder, and gives a test the URL, the folder, a way to read and write its files, and a way to stop it.
// The copy is the test's own: nothing a test does reaches the repository, and no two tests share a server.
//
// To run the suite on another program (the native runner), change SPAWN below: the arguments after the program are the
// same.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
// ARCHICODE_E2E_JAR names another build of the application (a copy of target/quarkus-app with a page broken on purpose,
// to see the suite fail: run 0175, V-I).
const JAR = process.env.ARCHICODE_E2E_JAR || path.join(ROOT, 'target', 'quarkus-app', 'quarkus-run.jar');
const EXAMPLES = path.join(ROOT, 'src', 'doc', 'examples');
const START_TIMEOUT_MS = 60000;

// The program and its leading arguments: the java of JAVA_HOME (else the one on the PATH) on the jar.
function spawnLine() {
  const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : 'java';
  return [java, ['-jar', JAR]];
}

// A free port: the operating system gives one, the server takes it a moment later.
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Starts `editor serve` on `folder` (a folder that holds, or lacks, a .archicode.yaml) and resolves with the line it
// prints when it is up: the URL carries the token, a request without it is refused.
async function serveFolder(folder) {
  if (!fs.existsSync(JAR)) {
    throw new Error(`${JAR} does not exist: run ./mvnw verify (or ./mvnw package) first`);
  }
  const port = await freePort();
  const [program, leading] = spawnLine();
  const child = spawn(
    program,
    [
      ...leading,
      'editor',
      'serve',
      '--host',
      '127.0.0.1',
      '-p',
      String(port),
      '-w',
      path.join(folder, '.archicode.yaml')
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  let output = '';
  const exited = new Promise((resolve) => child.once('exit', resolve));
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`editor serve was not up after ${START_TIMEOUT_MS} ms; it printed:\n${output}`)),
      START_TIMEOUT_MS
    );
    const onData = (chunk) => {
      output += chunk.toString();
      const found = /editor serve is up and running: (http:\/\/\S+)/.exec(output);
      if (found) {
        clearTimeout(timer);
        resolve(found[1]);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`editor serve exited with ${code} before it was up; it printed:\n${output}`));
    });
  });
  return {
    url,
    stop: async () => {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
      }
      await exited;
    }
  };
}

// A server on a copy of the shipped example `example` (a folder of src/doc/examples), or on an empty folder when
// `example` is null (a folder that has no .archicode.yaml). `files` (path from the folder -> text) are written into the
// copy after it is made: a workspace a test writes itself, or a change to the example. `dir` is the copy, `read`,
// `write` and `exists` take a path from it.
async function startServer(example, files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-e2e-'));
  if (example) {
    fs.cpSync(path.join(EXAMPLES, example), dir, { recursive: true });
  }
  for (const [relative, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, relative)), { recursive: true });
    fs.writeFileSync(path.join(dir, relative), text);
  }
  let server;
  try {
    server = await serveFolder(dir);
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw error;
  }
  return {
    url: server.url,
    dir,
    read: (relative) => fs.readFileSync(path.join(dir, relative), 'utf8'),
    write: (relative, text) => fs.writeFileSync(path.join(dir, relative), text),
    exists: (relative) => fs.existsSync(path.join(dir, relative)),
    stop: async () => {
      await server.stop();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

module.exports = { startServer, EXAMPLES, ROOT };
