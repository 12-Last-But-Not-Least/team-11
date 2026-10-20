/**
 * Integration coverage for createBrowserApi: /columns → /data → local
 * stats + render. App RTL tests inject stub APIs and never hit this path.
 */
import { createBrowserApi, ApiError } from "../src/api.js";

const COLUMNS = [
  { name: "year", label: "Year", source: "(join key)" },
  { name: "falls_norm", label: "Fall deaths (normalized)", source: "falls_normalized.csv" },
  { name: "iphone_norm", label: "iPhone sales (normalized)", source: "iphone_normalized.csv" },
];

const JOINED = {
  key: "year",
  values: {
    year: [2007, 2008, 2009, 2010, 2011],
    falls_norm: [0.1, 0.3, 0.5, 0.7, 0.9],
    iphone_norm: [0.2, 0.35, 0.55, 0.7, 0.95],
  },
  labels: {
    year: "Year",
    falls_norm: "Fall deaths (normalized)",
    iphone_norm: "iPhone sales (normalized)",
  },
};

function fakeRouter(handlers) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const handler = handlers.find((h) => h.match(path));
    if (!handler) {
      return { ok: false, status: 404, json: async () => ({ detail: `no handler for ${path}` }) };
    }
    const body = typeof handler.body === "function" ? handler.body(path) : handler.body;
    return { ok: true, status: 200, json: async () => body };
  };
  return { fetch, calls };
}

describe("createBrowserApi", () => {
  it("loads columns, fetches /data, and builds a scatter with YoY and leave-one-out", async () => {
    const { fetch, calls } = fakeRouter([
      { match: (p) => p === "/columns", body: COLUMNS },
      { match: (p) => p.startsWith("/data?"), body: JOINED },
    ]);
    const api = createBrowserApi({ fetch, baseUrl: "http://api.test" });

    const cols = await api.getColumns();
    expect(cols).toHaveLength(3);

    const spec = await api.getScatter({
      x: "falls_norm", y: "iphone_norm", width: 800, height: 500,
    });

    expect(calls[0]).toBe("http://api.test/columns");
    expect(calls[1]).toMatch(/^http:\/\/api\.test\/data\?/);
    expect(calls[1]).toContain("column=falls_norm");
    expect(calls[1]).toContain("column=iphone_norm");
    expect(calls[1]).not.toContain("column=year"); // join key omitted from query

    expect(spec.width).toBe(800);
    expect(spec.stats.n).toBe(5);
    expect(spec.stats.year_over_year).toBeDefined();
    expect(spec.stats.leave_one_out).toBeDefined();
    expect(spec.meta.x_label).toBe("Fall deaths (normalized)");
    expect(spec.data.series[0].points[0].label).toMatch(/^2007\n/);
    expect(spec.commands.some((c) => c.op === "circle")).toBe(true);
  });

  it("supports the join key as an axis (year on x)", async () => {
    const { fetch, calls } = fakeRouter([
      { match: (p) => p === "/columns", body: COLUMNS },
      { match: (p) => p.startsWith("/data?"), body: JOINED },
    ]);
    const api = createBrowserApi({ fetch, baseUrl: "http://api.test" });
    await api.getColumns();

    const spec = await api.getScatter({
      x: "year", y: "falls_norm", width: 620, height: 440,
    });

    // Only the non-key column is requested; key values still come back in the payload.
    expect(calls[1]).toBe("http://api.test/data?column=falls_norm");
    expect(spec.meta.x_label).toBe("Year");
    expect(spec.meta.y_label).toBe("Fall deaths (normalized)");
    expect(spec.stats.n).toBe(5);
    expect(spec.data.series[0].points.map((p) => p.x)).toEqual(JOINED.values.year);
  });

  it("reuses the /data cache across resize and axis swap", async () => {
    let dataHits = 0;
    const { fetch, calls } = fakeRouter([
      { match: (p) => p === "/columns", body: COLUMNS },
      {
        match: (p) => p.startsWith("/data?"),
        body: () => {
          dataHits += 1;
          return JOINED;
        },
      },
    ]);
    const api = createBrowserApi({ fetch, baseUrl: "http://api.test" });
    await api.getColumns();

    await api.getScatter({ x: "falls_norm", y: "iphone_norm", width: 800, height: 500 });
    await api.getScatter({ x: "falls_norm", y: "iphone_norm", width: 1000, height: 600 });
    await api.getScatter({ x: "iphone_norm", y: "falls_norm", width: 800, height: 500 });

    expect(dataHits).toBe(1);
    expect(calls.filter((u) => u.includes("/data?")).length).toBe(1);
  });

  it("builds a line chart when x is the join key", async () => {
    const { fetch } = fakeRouter([
      { match: (p) => p === "/columns", body: COLUMNS },
      { match: (p) => p.startsWith("/data?"), body: JOINED },
    ]);
    const api = createBrowserApi({ fetch, baseUrl: "http://api.test" });
    await api.getColumns();

    const spec = await api.getLine({
      x: "year",
      ys: ["falls_norm", "iphone_norm"],
      width: 800,
      height: 500,
    });

    expect(spec.meta.title).toMatch(/Line chart by Year/i);
    expect(spec.data.series).toHaveLength(2);
    expect(spec.stats.year_over_year).toBeDefined();
  });

  it("rejects an out-of-range chart size before fetching data", async () => {
    const { fetch, calls } = fakeRouter([
      { match: (p) => p === "/columns", body: COLUMNS },
    ]);
    const api = createBrowserApi({ fetch, baseUrl: "http://api.test" });
    await api.getColumns();
    await expect(
      api.getScatter({ x: "falls_norm", y: "iphone_norm", width: 10, height: 10 }),
    ).rejects.toMatchObject({ name: "ApiError", status: 422 });
    expect(calls.some((u) => u.includes("/data"))).toBe(false);
  });

  it("surfaces constant-column failures as ApiError 422", async () => {
    const constant = {
      ...JOINED,
      values: {
        ...JOINED.values,
        falls_norm: [0.5, 0.5, 0.5, 0.5, 0.5],
      },
    };
    const { fetch } = fakeRouter([
      { match: (p) => p === "/columns", body: COLUMNS },
      { match: (p) => p.startsWith("/data?"), body: constant },
    ]);
    const api = createBrowserApi({ fetch, baseUrl: "http://api.test" });
    await api.getColumns();
    await expect(
      api.getScatter({ x: "falls_norm", y: "iphone_norm", width: 800, height: 500 }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
