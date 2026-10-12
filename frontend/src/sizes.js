// Chart sizes offered in step 1, as "<width>x<height>" values for the API.
export const SIZES = [
  ["640x400", "640 × 400"],
  ["800x500", "800 × 500"],
  ["1000x600", "1000 × 600"],
];
export const DEFAULT_SIZE = "800x500";

export function parseSize(value) {
  const [w, h] = value.split("x").map(Number);
  return { width: w, height: h };
}
