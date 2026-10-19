import { createApi, buildQuery, ApiError } from "../src/api.js";

function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const r = responses.shift();
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  return { fetch, calls };
}

describe("buildQuery", () => {
  it("repeats array params and skips undefined", () => {
    expect(buildQuery({ x: "year", y: ["a", "b"], width: 800, height: undefined })).toBe("x=year&y=a&y=b&width=800");
  });
  it("encodes values", () => {
    expect(buildQuery({ x: "a b" })).toBe("x=a+b");
  });
});

describe("createApi", () => {
  it("uploads the CSV body and filename and preserves validation errors", async () => {
    const file = new File(["x,y\n1,2"], "my data.csv", { type: "text/csv" });
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: "uploaded" }) })
      .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ detail: "Invalid CSV" }) });
    const api = createApi({ fetch, baseUrl: "http://api.test", sessionId: "session-a" });
    expect(await api.importCsv(file)).toEqual({ id: "uploaded" });
    expect(fetch).toHaveBeenCalledWith("http://api.test/datasets?filename=my+data.csv", {
      method: "POST", headers: { "Content-Type": "text/csv", "X-Dataset-Session": "session-a" }, body: file,
    });
    await expect(api.importCsv(file)).rejects.toMatchObject({ status: 422, detail: "Invalid CSV" });
  });
  it("loads the catalog and scopes columns and both plots to a dataset", async () => {
    const { fetch, calls } = fakeFetch(Array.from({ length: 4 }, () => ({ status: 200, body: [] })));
    const api = createApi({ fetch, baseUrl: "http://api.test", sessionId: "session-a" });
    await api.getDatasets();
    await api.getColumns("example");
    await api.getScatter({ datasetId: "example", x: "a", y: "b" });
    await api.getLine({ datasetId: "example", x: "row", ys: ["a", "b"] });
    expect(calls).toEqual([
      "http://api.test/datasets",
      "http://api.test/columns?dataset_id=example",
      "http://api.test/plot/scatter?x=a&y=b&dataset_id=example",
      "http://api.test/plot/line?x=row&y=a&y=b&dataset_id=example",
    ]);
  });
  it("getColumns hits /columns on the configured base URL", async () => {
    const { fetch, calls } = fakeFetch([{ status: 200, body: [{ name: "year" }] }]);
    const api = createApi({ fetch, baseUrl: "http://api.test", sessionId: "session-a" });
    expect(await api.getColumns()).toEqual([{ name: "year" }]);
    expect(calls).toEqual(["http://api.test/columns"]);
  });

  it("getScatter sends explicit x, y, width and height", async () => {
    const { fetch, calls } = fakeFetch([{ status: 200, body: { width: 800 } }]);
    const api = createApi({ fetch, baseUrl: "http://api.test", sessionId: "session-a" });
    await api.getScatter({ x: "a", y: "b", width: 800, height: 500 });
    expect(calls[0]).toBe("http://api.test/plot/scatter?x=a&y=b&width=800&height=500");
  });

  it("getLine repeats y for each series", async () => {
    const { fetch, calls } = fakeFetch([{ status: 200, body: {} }]);
    const api = createApi({ fetch, baseUrl: "http://api.test", sessionId: "session-a" });
    await api.getLine({ x: "year", ys: ["a", "b"], width: 800, height: 500 });
    expect(calls[0]).toBe("http://api.test/plot/line?x=year&y=a&y=b&width=800&height=500");
  });

  it("turns a 422 into an ApiError carrying the backend detail unchanged", async () => {
    const detail = "unknown column 'zzz'. Available columns: year, falls_norm";
    const { fetch } = fakeFetch([{ status: 422, body: { detail } }]);
    const api = createApi({ fetch, baseUrl: "http://api.test", sessionId: "session-a" });
    await expect(api.getScatter({ x: "zzz", y: "b", width: 1, height: 1 })).rejects.toMatchObject({
      name: "ApiError", status: 422, detail,
    });
  });

  it("falls back to an HTTP message when the error body has no detail", async () => {
    const { fetch } = fakeFetch([{ status: 500, body: {} }]);
    const api = createApi({ fetch, baseUrl: "http://api.test", sessionId: "session-a" });
    await expect(api.getColumns()).rejects.toMatchObject({ status: 500, detail: "HTTP 500" });
  });

  it("strips a trailing slash from the base URL", async () => {
    const { fetch, calls } = fakeFetch([{ status: 200, body: [] }]);
    await createApi({ fetch, baseUrl: "http://api.test/" }).getColumns();
    expect(calls[0]).toBe("http://api.test/columns");
  });
});

test("ApiError is an Error", () => {
  const e = new ApiError(422, "bad");
  expect(e).toBeInstanceOf(Error);
  expect(e.message).toBe("bad");
});
