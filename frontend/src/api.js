// Stage 1: compute statistics in the browser; Python still builds chart specs.
// createApi preserves the server adapter; createBrowserApi powers the app.
import { correlationStats } from "./stats.js";

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

function createRequest({ fetch, baseUrl }) {
  const base = baseUrl.replace(/\/$/, "");
  return async function get(path, params, stats) {
    const qs = params ? buildQuery(params) : "";
    const res = await fetch(`${base}${path}${qs ? `?${qs}` : ""}`, stats === undefined ? undefined : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stats),
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
export function createApi({ fetch, baseUrl }) {
  const get = createRequest({ fetch, baseUrl });
  return {
    getColumns: () => get("/columns"),
    getScatter: ({ x, y, width, height }) => get("/plot/scatter", { x, y, width, height }),
    getLine: ({ x, ys, width, height }) => get("/plot/line", { x, y: ys, width, height }),
  };
}

/** Browser-computation adapter used by the application. */
export function createBrowserApi({ fetch, baseUrl }) {
  const get = createRequest({ fetch, baseUrl });
  let keyName = "year";
  // Bounded session cache, shared by concurrent scatter/line requests. Size and
  // axis order do not affect the joined data, so swaps and resizes reuse it.
  const rowsCache = new Map();
  const statsCache = new WeakMap();

  function joined(names) {
    const columns = [...new Set(names.filter((name) => name !== keyName))].sort();
    const cacheKey = JSON.stringify(columns);
    if (rowsCache.has(cacheKey)) {
      const pending = rowsCache.get(cacheKey);
      rowsCache.delete(cacheKey);
      rowsCache.set(cacheKey, pending);
      return pending;
    }
    const pending = get("/data", { column: columns.length ? columns : [keyName] });
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
        pairs.set(pair, correlationStats(data.values[x], data.values[y]));
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

  return {
    getColumns: async () => {
      const columns = await get("/columns");
      keyName = columns.find((c) => c.source === "(join key)")?.name ?? "year";
      rowsCache.clear(); // explicitly reloading the catalog also reloads its data
      return columns;
    },
    getScatter: async ({ x, y, width, height }) => {
      const size = sizeOf(width, height);
      const data = await joined([x, y]);
      return get("/render/scatter", { x, y, ...size }, statsFor(data, x, y));
    },
    getLine: async ({ x, ys, width, height }) => {
      const size = sizeOf(width, height);
      const names = [...new Set(ys)];
      if (!names.length) throw new ApiError(422, "Choose at least one line series.");
      const data = await joined([x, ...names]);
      const stats = names.length > 1 ? statsFor(data, names[0], names[1]) : statsFor(data, x, names[0]);
      return get("/render/line", { x, y: names, ...size }, stats);
    },
  };
}

export const API_URL = import.meta.env?.VITE_API_URL ?? "http://127.0.0.1:8000";

export const api = createBrowserApi({ fetch: (...args) => globalThis.fetch(...args), baseUrl: API_URL });
