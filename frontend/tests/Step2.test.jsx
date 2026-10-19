import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { FakeChart, spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];

function fakeApi() {
  const calls = { scatter: [], line: [] };
  return {
    calls,
    getDatasets: async () => [{ id: "test", name: "Test dataset", default_x: "falls_norm", default_y: "iphone_norm" }], getColumns: async () => cols,
    getScatter: async (p) => { calls.scatter.push(p); return spec({ width: p.width, height: p.height }); },
    getLine: async (p) => { calls.line.push(p); return spec(); },
  };
}

describe("step 2a: the scatter chart", () => {
  it("fetches the scatter with explicit axes and size, and draws it on a canvas", async () => {
    const api = fakeApi();
    render(<App api={api} />);
    const canvas = await screen.findByRole("img", { name: /scatter/i });
    expect(api.calls.scatter[0]).toEqual({ datasetId: "test", x: "falls_norm", y: "iphone_norm", width: 800, height: 500 });
    const scatterChart = FakeChart.instances.find((c) => c.canvas === canvas);
    expect(scatterChart).toBeDefined();
  });

  it("re-fetches on an axis change and reuses the same chart instance", async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    render(<App api={api} />);
    await screen.findByRole("img", { name: /scatter/i });
    await user.click(screen.getByRole("button", { name: /swap/i }));
    await waitFor(() => expect(api.calls.scatter).toHaveLength(2));
    expect(api.calls.scatter.at(-1)).toMatchObject({ x: "iphone_norm", y: "falls_norm" });
    const scatterCharts = FakeChart.instances.filter((c) => c.canvas.getAttribute("aria-label") === "Scatter plot");
    expect(scatterCharts).toHaveLength(1);
    await waitFor(() => expect(scatterCharts[0].draws).toBeGreaterThanOrEqual(1));
  });

  it("explains the scatter without assuming yearly observations", async () => {
    render(<App api={fakeApi()} />);
    expect(await screen.findByText(/each dot is one observation/i)).toBeInTheDocument();
  });
});
