import { defineConfig } from "@playwright/test";

// Happy-path test against the real backend and the Vite dev server.
// Uses the Chrome already installed on the machine (no browser download).
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5174",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: [
    {
      command: process.platform === "win32"
        ? ".venv\\Scripts\\python.exe -m uvicorn main:app --port 8001"
        : ".venv/bin/python -m uvicorn main:app --port 8001",
      cwd: "..",
      url: "http://localhost:8001/columns",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --port 5174 --strictPort",
      url: "http://localhost:5174",
      env: { VITE_API_URL: "http://127.0.0.1:8001" },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
