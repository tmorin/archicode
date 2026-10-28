// The end-to-end suite (wave 023, run 0175, T11): a real browser against `archicode editor serve` on the packaged
// application. Run it with `npm run test:e2e`, after `./mvnw verify` (or `./mvnw package`) has built
// target/quarkus-app/quarkus-run.jar; the browsers are installed once with `npx playwright install --with-deps chromium firefox webkit`.
// The specs and their harness are in src/test/e2e; the unit and integration suite (npm run test:unit) is apart.
//
// One worker, no retry, on purpose: a test starts a JVM and a browser, so parallel files make a busy machine time out
// (measured by run 0174), and a retry hides a flake, which the wave counts as a failure. A failure keeps its trace,
// screenshot and video under target/e2e (and nothing else is kept).

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'src/test/e2e',
  outputDir: 'target/e2e/test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'target/e2e/report' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // a click on something that never appears fails after 15 s naming the locator, not after the whole test's 60
    actionTimeout: 15000
  },
  // WebKit runs four specs only (run 0194, DEC-2): the ones that open the editor and the hosted page, the folder in the
  // browser, the sample and the hosted acceptance. Playwright's WebKit is not Safari, and it needs more system libraries.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /(open-and-pages|browser-workspace|sample|hosted-acceptance)\.spec\.js$/
    }
  ]
});
