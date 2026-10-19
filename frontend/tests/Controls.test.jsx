import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
  { name: "deaths_norm", label: "Fall deaths (normalized)", source: "normalized_merged_set.csv" },
];

function fakeApi() {
  return {
    getDatasets: async () => [{ id: "test", name: "Test dataset", default_x: "falls_norm", default_y: "iphone_norm" }], getColumns: async () => cols,
    getScatter: async () => spec(),
    getLine: async () => spec(),
  };
}

describe("step 1: choose two things to compare", () => {
  it("fills both pickers from /columns and selects the default pair", async () => {
    render(<App api={fakeApi()} />);
    const x = await screen.findByLabelText(/x axis/i);
    const y = screen.getByLabelText(/y axis/i);
    expect(x).toHaveValue("falls_norm");
    expect(y).toHaveValue("iphone_norm");
    // every column is offered on both axes, year included
    expect(within(x).getByRole("option", { name: "Year" })).toBeInTheDocument();
    expect(within(y).getAllByRole("option")).toHaveLength(cols.length);
  });

  it("shows the source file under each picker", async () => {
    render(<App api={fakeApi()} />);
    await screen.findByLabelText(/x axis/i);
    expect(screen.getByText(/^falls_normalized\.csv/)).toBeInTheDocument();
    expect(screen.getByText(/^iphone_normalized\.csv/)).toBeInTheDocument();
  });

  it("disables the column already chosen on the other axis", async () => {
    render(<App api={fakeApi()} />);
    const x = await screen.findByLabelText(/x axis/i);
    const y = screen.getByLabelText(/y axis/i);
    expect(within(x).getByRole("option", { name: "iPhone sales (normalized)" })).toBeDisabled();
    expect(within(y).getByRole("option", { name: "Fall deaths (normalized) — falls_normalized" })).toBeDisabled();
  });

  it("disambiguates columns that share a label by appending their source file", async () => {
    render(<App api={fakeApi()} />);
    const x = await screen.findByLabelText(/x axis/i);
    const names = within(x).getAllByRole("option").map((o) => o.textContent);
    expect(names).toEqual([
      "Year",
      "Fall deaths (normalized) — falls_normalized",
      "iPhone sales (normalized)",
      "Fall deaths (normalized) — normalized_merged_set",
    ]);
  });

  it("Swap exchanges the two axes", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    const x = await screen.findByLabelText(/x axis/i);
    await user.click(screen.getByRole("button", { name: /swap/i }));
    expect(x).toHaveValue("iphone_norm");
    expect(screen.getByLabelText(/y axis/i)).toHaveValue("falls_norm");
  });

  it("changing a picker updates the selection and the meta line", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    const y = await screen.findByLabelText(/y axis/i);
    await user.selectOptions(y, "deaths_norm");
    expect(y).toHaveValue("deaths_norm");
    expect(screen.getByText(/^normalized_merged_set\.csv/)).toBeInTheDocument();
  });

  it("offers chart sizes with 800 × 500 selected by default", async () => {
    render(<App api={fakeApi()} />);
    const size = await screen.findByLabelText(/chart size/i);
    expect(size).toHaveValue("800x500");
    expect(within(size).getAllByRole("option").length).toBeGreaterThanOrEqual(3);
  });

  it("reports a backend failure instead of an empty page", async () => {
    const api = fakeApi();
    api.getColumns = async () => { throw new Error("Failed to fetch"); };
    render(<App api={api} />);
    expect(await screen.findByText(/Could not load dataset: Failed to fetch/i)).toBeInTheDocument();
  });
});

describe("picker meta line", () => {
  it("shows the file alone before a run lands, then file · n keys · range", async () => {
    const api = fakeApi();
    api.getScatter = async () => {
      const s = spec();
      s.stats.n = 2;
      s.data.series[0].points = [{ x: 0, y: 0, label: "2007\na: 0\nb: 0" }, { x: 1, y: 1, label: "2018\na: 1\nb: 1" }];
      return s;
    };
    render(<App api={api} />);
    await screen.findByLabelText(/x axis/i);
    expect(await screen.findByText("falls_normalized.csv · 2 observations · year: 2007–2018")).toBeInTheDocument();
  });
});

describe("header dataset picker", () => {
  it("lists dataset names from the catalog", async () => {
    render(<App api={fakeApi()} />);
    const picker = await screen.findByRole("combobox", { name: /dataset/i });
    const options = within(picker).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Test dataset");
    expect(picker).toHaveValue("test");
  });
});
