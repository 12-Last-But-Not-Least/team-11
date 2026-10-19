// Owner evaluation round 2: step 2 stacks scatter / statistics / line; step 3
// opens with its own statistics bar, closed by default.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];
const stats = { n: 12, r: 0.96, r_squared: 0.92, t: 11.2, df: 10, p_value: 5e-7, slope: 1, intercept: 0 };
const fakeApi = () => ({ getDatasets: async () => [{ id: "test", name: "Test dataset", default_x: "falls_norm", default_y: "iphone_norm" }], getColumns: async () => cols, getScatter: async () => spec({ stats }), getLine: async () => spec({ stats }) });
const before = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("step 2 order: scatter, statistics, line", () => {
  it("places the open statistics table between the two charts", async () => {
    render(<App api={fakeApi()} />);
    const step2 = await screen.findByRole("region", { name: /look at them two ways/i });
    const scatter = await within(step2).findByRole("img", { name: /scatter/i }); // wait for the run to land
    const line = within(step2).getByRole("img", { name: /line chart/i });
    const table = within(step2).getByRole("table", { name: /statistics/i });
    expect(before(scatter, table)).toBe(true);
    expect(before(table, line)).toBe(true);
    expect(within(step2).getByRole("button", { name: /^statistics$/i })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("step 3 opens with a folded statistics bar", () => {
  it("is closed by default and opens its own copy of the table", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    const step3 = await screen.findByRole("region", { name: /read what the numbers say/i });
    const toggle = within(step3).getByRole("button", { name: /^statistics$/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(step3).queryByRole("table")).not.toBeInTheDocument();
    const verdict = within(step3).getByRole("heading", { level: 3, name: /related/i });
    expect(before(toggle, verdict)).toBe(true); // bar sits above the verdict
    await user.click(toggle);
    const table = within(step3).getByRole("table", { name: /statistics/i });
    expect(within(table).getAllByRole("cell").map((c) => c.textContent)[1]).toBe("0.9600");
    // step 2's bar is independent and still open
    const step2 = screen.getByRole("region", { name: /look at them two ways/i });
    expect(within(step2).getByRole("button", { name: /^statistics$/i })).toHaveAttribute("aria-expanded", "true");
  });
});
