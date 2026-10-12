import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { ApiError } from "../src/api.js";
import { FakeChart, spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fakeApi({ scatter, line } = {}) {
  const calls = { scatter: [], line: [] };
  return {
    calls,
    getColumns: async () => cols,
    getScatter: (p) => { calls.scatter.push(p); return scatter ? scatter(p, calls.scatter.length) : Promise.resolve(spec({ width: p.width, height: p.height })); },
    getLine: (p) => { calls.line.push(p); return line ? line(p, calls.line.length) : Promise.resolve(spec({ width: p.width, height: p.height })); },
  };
}

describe("step 2b: line chart, parallel fetch, run guard, states", () => {
  it("fetches the line chart alongside the scatter, both columns over the key", async () => {
    const api = fakeApi();
    render(<App api={api} />);
    await screen.findByRole("img", { name: /line chart/i });
    expect(api.calls.line[0]).toEqual({ x: "year", ys: ["falls_norm", "iphone_norm"], width: 800, height: 500 });
    expect(screen.getByRole("img", { name: /scatter/i })).toBeInTheDocument();
    expect(FakeChart.instances).toHaveLength(2);
  });

  it("when the key is on an axis, the line chart plots the other column alone over the key", async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    render(<App api={api} />);
    const x = await screen.findByLabelText(/x axis/i);
    await user.selectOptions(x, "year");
    await waitFor(() => expect(api.calls.line).toHaveLength(2));
    expect(api.calls.line[1]).toMatchObject({ x: "year", ys: ["iphone_norm"] });
    expect(api.calls.scatter[1]).toMatchObject({ x: "year", y: "iphone_norm" });
  });

  it("drops a slower, earlier response so the newest selection always wins", async () => {
    const user = userEvent.setup();
    const first = deferred();
    const api = fakeApi({ scatter: (p, n) => (n === 1 ? first.promise : Promise.resolve(spec({ width: 802, height: 500 }))) });
    render(<App api={api} />);
    await screen.findByLabelText(/x axis/i);
    await user.click(screen.getByRole("button", { name: /swap/i })); // run 2 resolves immediately
    await screen.findByRole("img", { name: /scatter/i });
    first.resolve(spec({ width: 801, height: 500 })); // run 1 lands late
    await new Promise((r) => setTimeout(r, 0));
    expect(FakeChart.instances.find((c) => c.canvas.getAttribute("aria-label") === "Scatter plot").spec.width).toBe(802);
  });

  it("shows the backend's detail on a 422 and keeps the previous charts", async () => {
    const user = userEvent.setup();
    const detail = "correlation is undefined when x or y is constant";
    const api = fakeApi({ scatter: (p, n) => (n === 1 ? Promise.resolve(spec()) : Promise.reject(new ApiError(422, detail))) });
    render(<App api={api} />);
    await screen.findByRole("img", { name: /scatter/i });
    await user.click(screen.getByRole("button", { name: /swap/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(detail);
    expect(screen.getByRole("img", { name: /scatter/i })).toBeInTheDocument();
  });

  it("marks step 2 as busy while a run is in flight", async () => {
    const pending = deferred();
    const api = fakeApi({ line: () => pending.promise });
    render(<App api={api} />);
    await screen.findByLabelText(/x axis/i);
    await waitFor(() => expect(screen.getByText(/running/i)).toBeInTheDocument());
    pending.resolve(spec());
    await waitFor(() => expect(screen.queryByText(/running/i)).not.toBeInTheDocument());
  });

  it("explains the line chart in one sentence", async () => {
    render(<App api={fakeApi()} />);
    expect(await screen.findByText(/climb year after year/i)).toBeInTheDocument();
  });
});
