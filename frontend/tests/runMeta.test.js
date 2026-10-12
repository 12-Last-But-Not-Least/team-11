import { keyRange } from "../src/runMeta.js";
import { spec } from "./fakeChart.js";

test("keyRange reads n and the key's min/max from the landed scatter's point labels", () => {
  const s = spec();
  s.stats.n = 3;
  s.data.series[0].points = [
    { x: 0, y: 0, label: "2009\nA: 0\nB: 0" },
    { x: 1, y: 1, label: "2007\nA: 1\nB: 1" },
    { x: 2, y: 2, label: "2018\nA: 2\nB: 2" },
  ];
  expect(keyRange(s)).toEqual({ n: 3, min: 2007, max: 2018 });
});

test("keyRange is null without a landed spec or without parsable labels", () => {
  expect(keyRange(null)).toBeNull();
  const s = spec();
  s.data.series[0].points = [{ x: 0, y: 0, label: "no number here" }];
  expect(keyRange(s)).toBeNull();
});
