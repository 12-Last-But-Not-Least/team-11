import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { FakeChart } from "./fakeChart.js";

// The suite runs files in parallel; the first render + fetch of App can
// exceed Testing Library's default 1s wait under load.
configure({ asyncUtilTimeout: 4000 });

// jsdom does not implement IntersectionObserver; App's scroll-spy needs a stub.
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// interactive.js is loaded by main.jsx in the real page; tests get the fake.
window.InteractiveChart = FakeChart;
beforeEach(() => FakeChart.reset());
