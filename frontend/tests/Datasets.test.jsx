import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { FakeChart, spec } from "./fakeChart.js";

const catalog = ["alpha", "beta"].map((id) => ({
  id, name: `Dataset ${id}`, description: `${id} description`,
  default_x: "y", default_y: "x", key: "row",
}));
const columns = (id) => [
  { name: "row", label: "Row number", source: "(join key)" },
  { name: "x", label: `${id} X`, source: `${id}.csv` },
  { name: "y", label: `${id} Y`, source: `${id}.csv` },
];
const result = (id) => {
  const value = spec();
  value.stats = { ...value.stats, r: id === "alpha" ? 0.9 : -0.5 };
  value.meta.dataset_id = id;
  return value;
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const makeApi = () => ({
  getDatasets: vi.fn(async () => catalog),
  getColumns: vi.fn(async (id) => columns(id)),
  getScatter: vi.fn(async ({ datasetId }) => result(datasetId)),
  getLine: vi.fn(async ({ datasetId }) => result(datasetId)),
});
const saveButton = () => screen.findByRole("button", { name: "Copy the statistics" });

test("switching uses catalog defaults, refreshes all results, and exports dataset identity", async () => {
  const user = userEvent.setup();
  const api = makeApi();
  window.SvgChart = { download: vi.fn() };
  render(<App api={api} />);
  await saveButton();
  expect(screen.getByLabelText(/x axis/i)).toHaveValue("y");
  expect(api.getColumns).toHaveBeenCalledWith("alpha");
  await waitFor(() => expect(FakeChart.instances).toHaveLength(2));
  const firstCharts = [...FakeChart.instances];
  await user.selectOptions(screen.getByLabelText("Dataset"), "beta");
  await saveButton();
  expect(api.getScatter).toHaveBeenLastCalledWith(expect.objectContaining({ datasetId: "beta", x: "y", y: "x" }));
  expect(api.getLine).toHaveBeenLastCalledWith(expect.objectContaining({ datasetId: "beta", x: "row", ys: ["y", "x"] }));
  expect(within(screen.getByLabelText(/x axis/i)).getByRole("option", { name: "beta X" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "alpha X" })).not.toBeInTheDocument();
  expect(FakeChart.instances).toEqual(firstCharts);
  await waitFor(() => expect(firstCharts.every((chart) => chart.spec.meta.dataset_id === "beta")).toBe(true));
  const step2 = screen.getByRole("region", { name: /look at them two ways/i });
  expect(within(step2).getByRole("table")).toHaveTextContent("-0.5000");
  expect(document.querySelector(".verdict--changed, .sentence--changed")).toBeNull();
  await user.click(await saveButton());
  expect(await navigator.clipboard.readText()).toContain("Dataset: Dataset beta\nbeta X vs. beta Y");
  await user.click(screen.getByRole("button", { name: "Download scatter (SVG)" }));
  expect(window.SvgChart.download).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ dataset_id: "beta" }) }), "scatter_beta_y_vs_x.svg");
});

test("a failed switch hides old plots, explanations and exports; switching back waits for fresh results", async () => {
  const user = userEvent.setup();
  const api = makeApi();
  render(<App api={api} />);
  await saveButton();
  api.getScatter.mockRejectedValueOnce(new Error("Beta unavailable"));
  await user.selectOptions(screen.getByLabelText("Dataset"), "beta");
  await screen.findByText("Beta unavailable");
  expect(screen.queryByRole("img", { name: "Scatter plot" })).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.queryByRole("button", { name: "Copy the statistics" })).toBeNull();
  const pending = deferred();
  api.getScatter.mockReturnValueOnce(pending.promise);
  await user.selectOptions(screen.getByLabelText("Dataset"), "alpha");
  await waitFor(() => expect(api.getScatter).toHaveBeenCalledTimes(3));
  expect(screen.queryByRole("button", { name: "Copy the statistics" })).toBeNull();
  await act(async () => pending.resolve(result("alpha")));
  await saveButton();
});

test("late plot responses cannot overwrite a newer dataset", async () => {
  const user = userEvent.setup();
  const api = makeApi();
  const old = deferred();
  api.getScatter.mockReturnValueOnce(old.promise);
  render(<App api={api} />);
  await waitFor(() => expect(api.getScatter).toHaveBeenCalledTimes(1));
  await user.selectOptions(screen.getByLabelText("Dataset"), "beta");
  await saveButton();
  await act(async () => old.resolve(result("alpha")));
  expect(FakeChart.instances.every((chart) => chart.spec.meta.dataset_id === "beta")).toBe(true);
});

test("late column responses cannot replace the new dataset's axes", async () => {
  const user = userEvent.setup();
  const api = makeApi();
  const old = deferred();
  api.getColumns.mockReturnValueOnce(old.promise);
  render(<App api={api} />);
  await waitFor(() => expect(api.getColumns).toHaveBeenCalledWith("alpha"));
  await user.selectOptions(screen.getByLabelText("Dataset"), "beta");
  await saveButton();
  await act(async () => old.resolve(columns("alpha")));
  expect(screen.queryByRole("option", { name: "alpha X" })).toBeNull();
  expect(api.getScatter).toHaveBeenCalledTimes(1);
});

test("catalog failures and an empty catalog have explicit messages", async () => {
  const api = makeApi();
  api.getDatasets.mockRejectedValueOnce(new Error("Catalog unavailable"));
  const { unmount } = render(<App api={api} />);
  await screen.findByText(/Catalog unavailable/);
  expect(api.getColumns).not.toHaveBeenCalled();
  unmount();
  api.getDatasets.mockResolvedValueOnce([]);
  render(<App api={api} />);
  await screen.findByText("No datasets are available.");
  expect(api.getScatter).not.toHaveBeenCalled();
});

test("a successful CSV import joins the catalog and becomes the active dataset", async () => {
  const user = userEvent.setup();
  const api = makeApi();
  const pending = deferred();
  api.importCsv = vi.fn(() => pending.promise);
  render(<App api={api} />);
  await saveButton();
  const file = new File(["x,y\n1,2\n2,4\n3,5"], "custom.csv", { type: "text/csv" });
  await user.upload(screen.getByLabelText("CSV file"), file);
  await user.click(screen.getByRole("button", { name: "Import CSV" }));
  expect(screen.getByLabelText("Dataset")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Importing…" })).toBeDisabled();
  await act(async () => pending.resolve({ id: "custom", name: "custom", row_count: 3,
    default_x: "x", default_y: "y", warnings: ["Not available as numeric axes: name"] }));
  await screen.findByText("Imported custom: 3 rows.");
  await waitFor(() => expect(api.getScatter).toHaveBeenLastCalledWith(expect.objectContaining({ datasetId: "custom" })));
  expect(screen.getByLabelText("Dataset")).toHaveValue("custom");
  expect(screen.getByLabelText("Dataset")).toBeEnabled();
  expect(screen.getByRole("list", { name: "Dataset import notes" })).toHaveTextContent("name");
  expect(api.importCsv).toHaveBeenCalledWith(file);
  await user.selectOptions(screen.getByLabelText("Dataset"), "alpha");
  expect(screen.queryByText("Imported custom: 3 rows.")).toBeNull();
  expect(screen.getByLabelText("CSV file")).toHaveValue("");
});

test("invalid imports keep the current dataset and allow retry", async () => {
  const user = userEvent.setup();
  const api = makeApi();
  api.importCsv = vi.fn().mockRejectedValue(new Error("CSV needs two numeric columns"));
  render(<App api={api} />);
  await saveButton();
  await user.upload(screen.getByLabelText("CSV file"), new File(["invalid"], "invalid.csv", { type: "text/csv" }));
  await user.click(screen.getByRole("button", { name: "Import CSV" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("CSV needs two numeric columns");
  expect(screen.getByLabelText("Dataset")).toHaveValue("alpha");
  expect(screen.getByRole("img", { name: "Scatter plot" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Import CSV" })).toBeEnabled();
  expect(api.getScatter).toHaveBeenCalledTimes(1);
});
