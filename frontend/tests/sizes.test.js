import { SIZES, DEFAULT_SIZE, parseSize } from "../src/sizes.js";

test("the default size is one of the offered sizes", () => {
  expect(SIZES.map(([v]) => v)).toContain(DEFAULT_SIZE);
});

test("parseSize turns the option value into width and height numbers", () => {
  expect(parseSize("800x500")).toEqual({ width: 800, height: 500 });
});
