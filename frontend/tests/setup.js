import "@testing-library/jest-dom/vitest";
import { FakeChart } from "./fakeChart.js";

// interactive.js is loaded by main.jsx in the real page; tests get the fake.
window.InteractiveChart = FakeChart;
beforeEach(() => FakeChart.reset());
