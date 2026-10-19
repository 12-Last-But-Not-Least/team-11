// Chart bitmap size for the plot API. Charts fill the step-2 container;
// width is measured, height follows the same ~8:5 ratio as the old 800×500
// default. Anything narrower than ~600px clips backend-drawn titles, so we
// clamp to the API floor (300) but prefer at least MIN_COMFORTABLE in practice
// via the container layout.

export const ASPECT = 5 / 8; // height / width (800×500)
export const MIN_WIDTH = 300;
export const MAX_WIDTH = 4000;
export const MIN_HEIGHT = 200;
export const MAX_HEIGHT = 4000;
export const FALLBACK_WIDTH = 800;

/** Round to nearest 10 so tiny resize jitter does not re-fetch. */
export function roundSize(n) {
  return Math.round(n / 10) * 10;
}

export function sizeFromWidth(rawWidth) {
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, roundSize(rawWidth)));
  const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, roundSize(width * ASPECT)));
  return { width, height };
}

export function formatSize({ width, height }) {
  return `${width}x${height}`;
}

export function parseSize(value) {
  const [w, h] = value.split("x").map(Number);
  return { width: w, height: h };
}

/** Default when the container has not been measured yet (e.g. jsdom). */
export const DEFAULT_SIZE = formatSize(sizeFromWidth(FALLBACK_WIDTH));
