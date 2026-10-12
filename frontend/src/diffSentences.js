/** Per-position "did this text change since the previous run?" flags. */
export function diffTexts(prevTexts, nextTexts) {
  if (!prevTexts) return nextTexts.map(() => false);
  return nextTexts.map((t, i) => prevTexts[i] !== t);
}
