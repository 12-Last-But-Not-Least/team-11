import {
  ASPECT,
  CONTAINER_FRACTION,
  DEFAULT_SIZE,
  FALLBACK_WIDTH,
  formatSize,
  parseSize,
  roundSize,
  sizeFromWidth,
} from "../src/sizes.js";

test("DEFAULT_SIZE matches the fallback width at the chart aspect ratio", () => {
  expect(DEFAULT_SIZE).toBe(formatSize(sizeFromWidth(FALLBACK_WIDTH)));
  expect(parseSize(DEFAULT_SIZE)).toEqual({ width: 800, height: 500 });
});

test("charts use 80% of the measured container width", () => {
  expect(CONTAINER_FRACTION).toBe(0.8);
  expect(sizeFromWidth(1000 * CONTAINER_FRACTION)).toEqual({
    width: 800,
    height: roundSize(800 * ASPECT),
  });
});

test("parseSize turns a WxH string into width and height numbers", () => {
  expect(parseSize("800x500")).toEqual({ width: 800, height: 500 });
});

test("sizeFromWidth keeps the 8:5 aspect and rounds to tens", () => {
  expect(roundSize(1007)).toBe(1010);
  expect(sizeFromWidth(1000)).toEqual({ width: 1000, height: roundSize(1000 * ASPECT) });
  expect(sizeFromWidth(50).width).toBe(300); // API floor
  expect(sizeFromWidth(99999).width).toBe(4000); // API ceiling
});
