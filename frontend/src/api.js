// Thin client for the FastAPI graphing service (contract: USAGE.md).
// createApi takes fetch and the base URL so tests need no global mocking.

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

export function createApi({ fetch, baseUrl, sessionId = globalThis.crypto.randomUUID() }) {
  const base = baseUrl.replace(/\/$/, "");

  async function readResponse(res) {
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
  }

  async function get(path, params) {
    const qs = params ? buildQuery(params) : "";
    return readResponse(await fetch(`${base}${path}${qs ? `?${qs}` : ""}`, { headers: { "X-Dataset-Session": sessionId } }));
  }

  return {
    getDatasets: () => get("/datasets"),
    importCsv: async (file) => readResponse(await fetch(`${base}/datasets?${buildQuery({ filename: file.name })}`, {
      method: "POST", headers: { "Content-Type": "text/csv", "X-Dataset-Session": sessionId }, body: file,
    })),
    getColumns: (datasetId) => get("/columns", { dataset_id: datasetId }),
    getScatter: ({ x, y, width, height, datasetId }) => get("/plot/scatter", { x, y, width, height, dataset_id: datasetId }),
    getLine: ({ x, ys, width, height, datasetId }) => get("/plot/line", { x, y: ys, width, height, dataset_id: datasetId }),
  };
}

export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

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

export const api = createApi({ fetch: (...args) => globalThis.fetch(...args), baseUrl: API_URL, sessionId: browserSessionId() });
