import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT ?? "3099";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  testIgnore: process.env.E2E_LIVE_ONLY
    ? ["**/smoke.spec.ts"]
    : ["**/live.optional.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bash scripts/e2e-webserver.sh",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
