// Chart sizes offered in step 1, as "<width>x<height>" values for the API.
// The default fits two charts side by side at 1280px without scaling the
// bitmap (content column ≈1100px, 28px gap). Larger sizes stack instead.
export const SIZES = [
  ["520x400", "520 × 400"],
  ["640x440", "640 × 440"],
  ["800x500", "800 × 500"],
  ["1000x600", "1000 × 600"],
];
export const DEFAULT_SIZE = "520x400";

export function parseSize(value) {
  const [w, h] = value.split("x").map(Number);
  return { width: w, height: h };
}
