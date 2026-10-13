// Chart sizes offered in step 1, as "<width>x<height>" values for the API.
// Charts stack vertically at their chosen pixel size (never scaled), so the
// default is the backend's own 800×500. Anything narrower than ~600px clips
// the backend-drawn title and overlaps the year ticks (~280px of each canvas
// is fixed margin + legend space), so 620×440 is the smallest offered.
export const SIZES = [
  ["620x440", "620 × 440"],
  ["800x500", "800 × 500"],
  ["1000x600", "1000 × 600"],
];
export const DEFAULT_SIZE = "800x500";

export function parseSize(value) {
  const [w, h] = value.split("x").map(Number);
  return { width: w, height: h };
}
