// Fetch selected values once, then compute statistics and render specs locally.
// createApi preserves the server adapter; createBrowserApi powers the app.
import { correlationStats, yearOverYearCorrelation, leaveOneOutCorrelation } from "./stats.js";
import { buildLine, buildScatter } from "./render.js";

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Query string with repeated keys for arrays; undefined values are skipped. */
export function buildQuery(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) q.append(k, String(item));
  }
  return q.toString();
}

function createRequest({ fetch, baseUrl, sessionId }) {
  const base = baseUrl.replace(/\/$/, "");
  return async function request(path, params, options) {
    const qs = params ? buildQuery(params) : "";
    const url = `${base}${path}${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...options?.headers, "X-Dataset-Session": sessionId },
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === "string") detail = body.detail;
      } catch {
        // non-JSON error body: keep the HTTP message
      }
      throw new ApiError(res.status, detail);
    }
    return res.json();
  };
}

/** Server-computation adapter retained for existing API consumers. */
export function createApi({ fetch, baseUrl, sessionId = globalThis.crypto.randomUUID() }) {
  const get = createRequest({ fetch, baseUrl, sessionId });
  return {
    getDatasets: () => get("/datasets"),
    importCsv: (file) => get("/datasets", { filename: file.name }, {
      method: "POST", headers: { "Content-Type": "text/csv" }, body: file,
    }),
    getColumns: (datasetId) => get("/columns", { dataset_id: datasetId }),
    getScatter: ({ x, y, width, height, datasetId }) => get("/plot/scatter", { x, y, width, height, dataset_id: datasetId }),
    getLine: ({ x, ys, width, height, datasetId }) => get("/plot/line", { x, y: ys, width, height, dataset_id: datasetId }),
  };
}

/** Browser-computation adapter used by the application. */
export function createBrowserApi({ fetch, baseUrl, sessionId = globalThis.crypto.randomUUID() }) {
  const get = createRequest({ fetch, baseUrl, sessionId });
  const datasetInfo = new Map();
  const datasetKeys = new Map([[undefined, "year"]]);
  // Share concurrent scatter/line reads without mixing identically named
  // columns from different datasets. Axis order and chart size reuse the data.
  const rowsCache = new Map();
  const statsCache = new WeakMap();

  function rememberDataset(dataset) {
    datasetInfo.set(dataset.id, dataset);
    datasetKeys.set(dataset.id, dataset.key);
    return dataset;
  }

  function joined(names, datasetId) {
    const keyName = datasetKeys.get(datasetId);
    const columns = [...new Set(names.filter((name) => name !== keyName))].sort();
    const cacheKey = JSON.stringify([datasetId ?? null, columns]);
    if (rowsCache.has(cacheKey)) {
      const pending = rowsCache.get(cacheKey);
      rowsCache.delete(cacheKey);
      rowsCache.set(cacheKey, pending);
      return pending;
    }
    const pending = get("/data", {
      column: columns.length ? columns : [keyName], dataset_id: datasetId,
    });
    rowsCache.set(cacheKey, pending);
    if (rowsCache.size > 8) rowsCache.delete(rowsCache.keys().next().value);
    pending.catch(() => {
      if (rowsCache.get(cacheKey) === pending) rowsCache.delete(cacheKey);
    });
    return pending;
  }

  function statsFor(data, x, y) {
    let pairs = statsCache.get(data);
    if (!pairs) statsCache.set(data, (pairs = new Map()));
    const pair = JSON.stringify([x, y]);
    if (!pairs.has(pair)) {
      try {
        const xs = data.values[x], ys = data.values[y];
        pairs.set(pair, {
          ...correlationStats(xs, ys),
          year_over_year: (data.is_yearly ?? data.key === "year")
            ? yearOverYearCorrelation(data.values[data.key], xs, ys) : null,
          leave_one_out: leaveOneOutCorrelation(xs, ys),
        });
      } catch (error) {
        throw new ApiError(422, error.message);
      }
    }
    return pairs.get(pair);
  }

  function sizeOf(width = 800, height = 500) {
    if (!Number.isInteger(width) || width < 300 || width > 4000 ||
        !Number.isInteger(height) || height < 200 || height > 4000) {
      throw new ApiError(422, "Chart size must be 300–4000 wide and 200–4000 high.");
    }
    return { width, height };
  }

  function withDataset(spec, data, datasetId) {
    const id = data.dataset_id ?? datasetId;
    const name = data.dataset_name ?? datasetInfo.get(id)?.name;
    if (id !== undefined) spec.meta.dataset_id = id;
    if (name !== undefined) spec.meta.dataset_name = name;
    return spec;
  }

  return {
    getDatasets: async () => (await get("/datasets")).map(rememberDataset),
    importCsv: async (file) => rememberDataset(await get("/datasets", { filename: file.name }, {
      method: "POST", headers: { "Content-Type": "text/csv" }, body: file,
    })),
    getColumns: async (datasetId) => {
      const columns = await get("/columns", { dataset_id: datasetId });
      datasetKeys.set(datasetId, columns.find((c) => c.source === "(join key)")?.name ?? "year");
      rowsCache.clear(); // explicitly reloading the catalog also reloads its data
      return columns;
    },
    getScatter: async ({ x, y, width, height, datasetId }) => {
      const size = sizeOf(width, height);
      const data = await joined([x, y], datasetId);
      const xLabel = data.labels[x], yLabel = data.labels[y];
      return withDataset(buildScatter(data.values[x], data.values[y], statsFor(data, x, y), {
        ...size, title: `${yLabel} vs. ${xLabel}`, xLabel, yLabel,
        labels: data.values[data.key].map(String),
      }), data, datasetId);
    },
    getLine: async ({ x, ys, width, height, datasetId }) => {
      const size = sizeOf(width, height);
      const names = [...new Set(ys)];
      if (!names.length) throw new ApiError(422, "Choose at least one line series.");
      const data = await joined([x, ...names], datasetId);
      const xLabel = data.labels[x];
      const stats = names.length > 1 ? statsFor(data, names[0], names[1]) : statsFor(data, x, names[0]);
      const title = names.length === 1 ? `${data.labels[names[0]]} vs. ${xLabel}` : `Line chart by ${xLabel}`;
      const yLabel = names.length === 1 ? data.labels[names[0]] :
        names.every((name) => name.endsWith("_norm")) ? "Normalized value (0-1)" : "Value";
      return withDataset(buildLine(data.values[x], names.map((name) => ({ name: data.labels[name], values: data.values[name] })), stats, {
        ...size, title, xLabel, yLabel,
      }), data, datasetId);
    },
  };
}

export const API_URL = import.meta.env?.VITE_API_URL ?? "http://127.0.0.1:8000";

function browserSessionId() {
  const fresh = globalThis.crypto.randomUUID();
  try {
    const key = "dataset-session";
    const token = globalThis.sessionStorage.getItem(key) || fresh;
    globalThis.sessionStorage.setItem(key, token);
    return token;
  } catch {
    return fresh; // Without browser storage, the token lasts until page reload.
  }
}

export const api = createBrowserApi({ fetch: (...args) => globalThis.fetch(...args), baseUrl: API_URL, sessionId: browserSessionId() });
