import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    ignoreHTTPSErrors: true,
    headless: true,
    baseURL: process.env.IS_CONSOLE_BASE_URL,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  },
});


