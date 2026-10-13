import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];
const scatterSpec = spec({ width: 801 });
const fakeApi = () => ({ getColumns: async () => cols, getScatter: async () => scatterSpec, getLine: async () => spec() });

beforeEach(() => {
  window.SvgChart = { download: vi.fn() };
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(["png"], { type: "image/png" })));
  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();
});

describe("downloads and copy", () => {
  it("downloads the scatter as SVG through the shared exporter, named after both columns", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    await user.click(await screen.findByRole("button", { name: /download scatter \(svg\)/i }));
    expect(window.SvgChart.download).toHaveBeenCalledWith(scatterSpec, "scatter_falls_norm_vs_iphone_norm.svg");
  });

  it("downloads the scatter canvas as PNG", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    await user.click(await screen.findByRole("button", { name: /download scatter \(png\)/i }));
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake"), { timeout: 2500 });
  });

  it("copies the statistics as text and confirms it", async () => {
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    await user.click(await screen.findByRole("button", { name: /copy the statistics/i }));
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
    const text = await navigator.clipboard.readText(); // user-event's clipboard stub
    expect(text.startsWith("iPhone sales (normalized) vs. Fall deaths (normalized)\n")).toBe(true);
    expect(text).toContain("r = 0.9000");
  });
});
