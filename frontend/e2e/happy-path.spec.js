import { test, expect } from "@playwright/test";

// The six-step happy path from SPEC.md, end to end, with the real API.
test("a student can open, choose, look, read and save", async ({ page }) => {
  // 1. Open the app: a chart is already there, nothing to explain.
  await page.goto("/");
  await expect(page).toHaveTitle("Coincidence? I Think Not");
  const scatter = page.getByRole("img", { name: "Scatter plot" });
  const line = page.getByRole("img", { name: "Line chart" });
  await expect(scatter).toBeVisible();
  await expect(line).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Dataset" })).toHaveValue("current");

  // 2. Pick columns: both pickers are filled from /columns; swap works.
  const x = page.getByLabel(/x axis/i);
  const y = page.getByLabel(/y axis/i);
  const xBefore = await x.inputValue();
  const yBefore = await y.inputValue();
  expect(xBefore).not.toBe(yBefore);
  await page.getByRole("button", { name: "Swap" }).click();
  await expect(x).toHaveValue(yBefore);
  await expect(y).toHaveValue(xBefore);
  await expect(page.locator(".picker__meta").first()).toContainText(/\d+ years · \d{4}–\d{4}/);

  // 3. Both charts and the statistics, once, between them.
  const step2 = page.getByRole("region", { name: /look at them two ways/i });
  const stats = step2.getByRole("table", { name: "Statistics" });
  await expect(stats).toBeVisible();
  await expect(stats.getByRole("columnheader")).toHaveCount(8);
  await expect(stats.getByRole("cell").first()).toHaveText(/^\d+$/); // n
  await expect(step2.getByRole("button", { name: "Reset view" })).toHaveCount(2);

  // 4. Read the verdict and the sentences; a glossary term opens on hover.
  const step3 = page.getByRole("region", { name: /read what the numbers say/i });
  await expect(step3.getByRole("heading", { level: 3 })).toContainText(/related|relationship/i);
  await expect(step3.getByRole("list", { name: /what the statistics mean/i }).getByRole("listitem")).toHaveCount(3);
  await step3.locator(".term", { hasText: "p-value" }).first().hover();
  await expect(step3.getByRole("tooltip")).toContainText(/chance/i);

  // 5. Hover a point; the help button explains the step.
  const box = await scatter.boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await step2.getByRole("button", { name: /help for step 2/i }).click();
  await expect(step2.getByRole("note")).toContainText(/reset view/i);

  // 6. Save: SVG download and copied statistics.
  await expect(stats).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download scatter (SVG)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^scatter_.+_vs_.+\.svg$/);
  await page.getByRole("button", { name: "Copy the statistics" }).click();
  await expect(page.getByText("Copied to the clipboard.")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^.+ vs\. .+\nn = \d+\nr = -?\d\.\d{4}\n/);
});
