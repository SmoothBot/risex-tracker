import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "RISEX_API_MOCK=1 npm run dev",
    url: "http://localhost:3000/wallets",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
