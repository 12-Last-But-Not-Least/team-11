import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];
const small = { n: 12, r: 0.96, r_squared: 0.92, t: 11.2, df: 10, p_value: 5e-7, slope: 1, intercept: 0 };

function fakeApi(stats) {
  return { getColumns: async () => cols, getScatter: async () => spec({ stats }), getLine: async () => spec({ stats }) };
}

describe("step 4: before you conclude", () => {
  it("shows the two caution cards this dataset triggers, and no try-it card", async () => {
    render(<App api={fakeApi(small)} />);
    const step = await screen.findByRole("region", { name: /before you conclude/i });
    const cards = within(step).getAllByRole("article");
    expect(cards.map((c) => within(c).getByRole("heading").textContent)).toEqual(["Both change over time", "Small sample"]);
    expect(cards[0]).toHaveClass("check--warn");
    expect(cards[1]).toHaveTextContent("12 points is not many");
    expect(within(step).queryByText(/try removing the trend/i)).not.toBeInTheDocument();
  });

  it("drops the small-sample card for a large n", async () => {
    render(<App api={fakeApi({ ...small, n: 200 })} />);
    const step = await screen.findByRole("region", { name: /before you conclude/i });
    expect(within(step).getAllByRole("article").map((c) => within(c).getByRole("heading").textContent)).toEqual(["Both change over time"]);
  });

  it("shows the try-it card with its action when the transform feature is on", async () => {
    render(<App api={fakeApi(small)} features={{ transform: true }} />);
    const step = await screen.findByRole("region", { name: /before you conclude/i });
    const card = within(step).getByRole("article", { name: /try removing the trend/i });
    expect(card).toHaveClass("check--try");
    expect(within(card).getByRole("button", { name: /compare year-over-year changes/i })).toBeInTheDocument();
  });

  it("re-evaluates the cards when the selection changes", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi(small)} />);
    await screen.findByRole("region", { name: /before you conclude/i });
    await user.selectOptions(screen.getByLabelText(/x axis/i), "year");
    const step = await screen.findByRole("region", { name: /before you conclude/i });
    expect(within(step).getAllByRole("article")).toHaveLength(2);
  });
});
