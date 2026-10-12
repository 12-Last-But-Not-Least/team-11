// Owner evaluation round 1 (2026-10-12): tagline and step hints removed,
// help buttons per step, reset-view per chart, stats table folded under the
// charts, step 3 sentences only, step 4 actions only.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { FakeChart, spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];
const stats = { n: 12, r: 0.9625562715881898, r_squared: 0.926514575973757, t: 11.228597794127518, df: 10, p_value: 5.443126328198838e-7, slope: 1.042544092290118, intercept: 0.052266580261948636 };
const fakeApi = () => ({ getColumns: async () => cols, getScatter: async () => spec({ stats }), getLine: async () => spec({ stats }) });

describe("2a/2b: no tagline, no step hints", () => {
  it("the header has only the name and the dataset control", async () => {
    render(<App api={fakeApi()} />);
    await screen.findByRole("combobox", { name: /dataset/i });
    expect(screen.queryByText(/find out in four steps/i)).not.toBeInTheDocument();
  });
  it("step heads carry no hint sentence", async () => {
    render(<App api={fakeApi()} />);
    await screen.findByRole("region", { name: /look at them two ways/i });
    expect(screen.queryByText(/the second one is the one people forget/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/any two columns from the dataset/i)).not.toBeInTheDocument();
  });
});

describe("6: help button per step", () => {
  it("each step has a help button that toggles that step's guidance", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    const step2 = await screen.findByRole("region", { name: /look at them two ways/i });
    const btn = within(step2).getByRole("button", { name: /help/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(within(step2).queryByRole("note")).not.toBeInTheDocument();
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(within(step2).getByRole("note")).toHaveTextContent(/both simply rise/i);
    await user.click(btn);
    expect(within(step2).queryByRole("note")).not.toBeInTheDocument();
  });
  it("all four steps offer help", async () => {
    render(<App api={fakeApi()} />);
    await screen.findByRole("region", { name: /save what you found/i });
    expect(screen.getAllByRole("button", { name: /help/i })).toHaveLength(4);
  });
});

describe("3: reset view per chart", () => {
  it("offers a Reset view button for each chart that calls the chart's reset()", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    const buttons = await screen.findAllByRole("button", { name: /reset view/i });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]);
    const scatter = FakeChart.instances.find((c) => c.canvas.getAttribute("aria-label") === "Scatter plot");
    expect(scatter.resets).toBe(1);
  });
});

describe("4: statistics folded under the charts, in-canvas box removed", () => {
  it("shows a 2-row statistics table with one column per stat, toggled by a Statistics button", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    const step2 = await screen.findByRole("region", { name: /look at them two ways/i });
    const toggle = await within(step2).findByRole("button", { name: /^statistics$/i }); // appears once the run lands
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const table = within(step2).getByRole("table", { name: /statistics/i });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["n", "r", "r²", "t", "df", "p-value", "slope", "intercept"]);
    expect(within(rows[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["12", "0.9626", "0.9265", "11.23", "10", "5.44e-7", "1.043", "0.052"]);
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(step2).queryByRole("table", { name: /statistics/i })).not.toBeInTheDocument();
  });
  it("passes the charts their specs without the backend's stats box", async () => {
    const api = fakeApi();
    api.getScatter = async () => {
      const s = spec({ stats });
      s.commands = [{ op: "text", x: 610, y: 90, text: "Correlation stats", font: "bold 12px sans-serif", fill: "#111827", align: "left", layer: "static" }];
      return s;
    };
    render(<App api={api} />);
    await screen.findByRole("img", { name: /scatter/i });
    const scatter = FakeChart.instances.find((c) => c.canvas.getAttribute("aria-label") === "Scatter plot");
    expect(scatter.spec.commands.some((c) => c.text === "Correlation stats")).toBe(false);
  });
  it("prints a dash for a null t (perfect correlation)", async () => {
    const api = fakeApi();
    api.getScatter = async () => spec({ stats: { ...stats, r: 1, r_squared: 1, t: null, p_value: 0 } });
    render(<App api={api} />);
    const step2 = await screen.findByRole("region", { name: /look at them two ways/i });
    const table = await within(step2).findByRole("table", { name: /statistics/i });
    expect(within(table).getAllByRole("cell")[3]).toHaveTextContent("—");
  });
  it("step 3 no longer repeats the table", async () => {
    render(<App api={fakeApi()} />);
    const step3 = await screen.findByRole("region", { name: /read what the numbers say/i });
    expect(within(step3).queryByRole("table")).not.toBeInTheDocument(); // its bar starts folded
    expect(within(step3).getByRole("list", { name: /what the statistics mean/i })).toBeInTheDocument();
  });
});

describe("5: no caution cards; step 4 holds the actions", () => {
  it("step 4 is 'Save what you found' with the three actions and no articles", async () => {
    render(<App api={fakeApi()} />);
    const step4 = await screen.findByRole("region", { name: /save what you found/i });
    expect(within(step4).queryAllByRole("article")).toHaveLength(0);
    expect(within(step4).getByRole("button", { name: /download scatter \(svg\)/i })).toBeInTheDocument();
    expect(within(step4).getByRole("button", { name: /copy the statistics/i })).toBeInTheDocument();
    expect(screen.queryByText(/both change over time/i)).not.toBeInTheDocument();
  });
});
