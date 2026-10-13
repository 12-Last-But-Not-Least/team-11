import { diffTexts } from "../src/diffSentences.js";

test("nothing is marked changed on the first run", () => {
  expect(diffTexts(null, ["a", "b", "c"])).toEqual([false, false, false]);
});

test("a sentence is changed when its text differs from the previous run at the same position", () => {
  expect(diffTexts(["a", "b", "c"], ["a", "B", "c"])).toEqual([false, true, false]);
});

test("extra sentences count as changed; missing previous ones do too", () => {
  expect(diffTexts(["a"], ["a", "b"])).toEqual([false, true]);
  expect(diffTexts(["a", "b"], ["a"])).toEqual([false]);
});
