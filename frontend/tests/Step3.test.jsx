import { render, screen, within } from "@testing-library/react";
import App from "../src/App.jsx";
import { spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];
const stats = { n: 12, r: 0.9625562715881898, r_squared: 0.926514575973757, t: 11.228597794127518, df: 10, p_value: 5.443126328198838e-7, slope: 1.042544092290118, intercept: 0.052266580261948636 };

function fakeApi(s = stats) {
  return {
    getDatasets: async () => [{ id: "test", name: "Test dataset" }], getColumns: async () => cols,
    getScatter: async () => spec({ stats: s }),
    getLine: async () => spec({ stats: s }),
  };
}

describe("step 3: read what the numbers say", () => {
  it("leads with the plain-language verdict", async () => {
    render(<App api={fakeApi()} />);
    expect(await screen.findByRole("heading", { level: 3, name: /strongly related — but that does not mean one causes the other/i })).toBeInTheDocument();
  });

  it("places r on the Weak / Moderate / Strong ruler", async () => {
    render(<App api={fakeApi()} />);
    const scale = await screen.findByRole("img", { name: /strength of r/i });
    expect(scale).toHaveTextContent("Weak");
    expect(scale).toHaveTextContent("Moderate");
    expect(scale).toHaveTextContent("Strong");
    const marker = within(scale).getByTestId("r-marker");
    expect(marker.style.left).toBe("96.25562715881898%");
    expect(within(scale).getByText("r = 0.96")).toBeInTheDocument();
  });

  it("lists the sentences with their terms underlined", async () => {
    render(<App api={fakeApi()} />);
    const list = await screen.findByRole("list", { name: /what the statistics mean/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("93% of the variation in iPhone sales (normalized) moves together with Fall deaths (normalized) (r² = 0.93).");
    expect(within(items[0]).getByText("r²", { selector: ".term" })).toBeInTheDocument();
    expect(within(items[1]).getByText("p-value", { selector: ".term" })).toBeInTheDocument();
  });


});
