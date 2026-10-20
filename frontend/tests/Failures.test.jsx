import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { spec } from "./fakeChart.js";

const cols = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
  { name: "deaths_norm", label: "Deaths (normalized)", source: "normalized_merged_set.csv" },
];

beforeEach(() => {
  window.SvgChart = { download: vi.fn() };
});

describe("failure paths", () => {
  it("keeps the previous charts and verdict when a later run rejects with a network error", async () => {
    let fail = false;
    const api = {
      getColumns: async () => cols,
      getScatter: async () => {
        if (fail) throw new TypeError("Failed to fetch");
        return spec();
      },
      getLine: async () => spec(),
    };
    const user = userEvent.setup();
    render(<App api={api} />);
    await screen.findByRole("button", { name: /copy the statistics/i });

    fail = true;
    await user.click(screen.getByRole("button", { name: /swap/i }));

    expect(await screen.findByText(/failed to fetch/i)).toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: /copy the statistics/i })).toBeInTheDocument();
  });

  it("tells the user when copying to the clipboard is refused", async () => {
    const user = userEvent.setup();
    const api = { getColumns: async () => cols, getScatter: async () => spec(), getLine: async () => spec() };
    render(<App api={api} />);
    const button = await screen.findByRole("button", { name: /copy the statistics/i });
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    await user.click(button);
    await new Promise((r) => setTimeout(r, 50));
    process.off("unhandledRejection", unhandled);

    expect(await screen.findByText(/couldn.t copy/i)).toBeInTheDocument();
    expect(screen.queryByText(/copied to the clipboard/i)).not.toBeInTheDocument();
    expect(unhandled).not.toHaveBeenCalled();
  });
});
