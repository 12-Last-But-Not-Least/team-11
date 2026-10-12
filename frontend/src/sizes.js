// Chart sizes offered in step 1, as "<width>x<height>" values for the API.
// The backend reserves ~280px of every canvas for margins and its stats
// panel, so anything narrower than ~600px clips the title and overlaps the
// year ticks. The default sits side by side unscaled at 1440px (the demo
// width) and shrinks by at most 12% at 1280px; larger sizes stack instead
// of scaling (see .charts / --chart-w in App.css).
export const SIZES = [
  ["620x440", "620 × 440"],
  ["800x500", "800 × 500"],
  ["1000x600", "1000 × 600"],
];
export const DEFAULT_SIZE = "620x440";

export function parseSize(value) {
  const [w, h] = value.split("x").map(Number);
  return { width: w, height: h };
}
