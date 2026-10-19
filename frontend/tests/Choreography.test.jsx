import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];
const strong = { n: 12, r: 0.96, r_squared: 0.92, t: 11.2, df: 10, p_value: 5e-7, slope: 1, intercept: 0 };
const moderate = { n: 12, r: 0.5, r_squared: 0.25, t: 1.8, df: 10, p_value: 0.1, slope: 0.4, intercept: 0.2 };

function fakeApi(sequence) {
  let i = 0;
  const next = () => sequence[Math.min(i++, sequence.length - 1)];
  return { getDatasets: async () => [{ id: "test", name: "Test dataset", default_x: "falls_norm", default_y: "iphone_norm" }], getColumns: async () => cols, getScatter: async () => spec({ stats: next() }), getLine: async () => spec() };
}

const changedItems = () => within(screen.getByRole("list", { name: /what the statistics mean/i })).getAllByRole("listitem").map((li) => li.classList.contains("sentence--changed"));

describe("re-run choreography", () => {
  it("highlights nothing on the first run", async () => {
    render(<App api={fakeApi([strong])} />);
    await screen.findByRole("list", { name: /what the statistics mean/i });
    expect(changedItems()).toEqual([false, false, false]);
    expect(screen.getByRole("heading", { level: 3, name: /related/i }).closest(".verdict")).not.toHaveClass("verdict--changed");
  });

  it("after a change, highlights only the sentences whose text changed, and the verdict if it changed", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi([strong, moderate])} />);
    await screen.findByRole("list", { name: /what the statistics mean/i });
    await user.click(screen.getByRole("button", { name: /swap/i }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 3, name: /moderately related/i })).toBeInTheDocument());
    expect(changedItems()).toEqual([true, true, false]); // r² and p changed; n did not
    expect(screen.getByRole("heading", { level: 3, name: /related/i }).closest(".verdict")).toHaveClass("verdict--changed");
  });

  it("clears highlights when the next run lands with identical sentences", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi([strong, moderate, moderate])} />);
    await screen.findByRole("list", { name: /what the statistics mean/i });
    await user.click(screen.getByRole("button", { name: /swap/i }));
    await waitFor(() => expect(changedItems()).toEqual([true, true, false]));
    await user.selectOptions(screen.getByLabelText(/chart size/i), "620x440"); // same labels, same stats
    await waitFor(() => expect(changedItems()).toEqual([false, false, false]));
  });
});
