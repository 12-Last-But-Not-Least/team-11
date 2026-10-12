import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // interactive.js and svg_export.js live at the repo root (shared with
    // canvas_svg_demo.html); allow the dev server to serve them.
    fs: { allow: [".."] },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.js",
    include: ["tests/**/*.test.{js,jsx}"],
    coverage: { provider: "v8", include: ["src/**"], exclude: ["src/main.jsx"], reporter: ["text"] },
  },
});
