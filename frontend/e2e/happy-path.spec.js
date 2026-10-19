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
  await expect(page.getByRole("combobox", { name: "Dataset" })).toHaveValue("iphone-falls");

  // 2. Pick columns: both pickers are filled from /columns; swap works.
  const x = page.getByLabel(/x axis/i);
  const y = page.getByLabel(/y axis/i);
  const xBefore = await x.inputValue();
  const yBefore = await y.inputValue();
  expect(xBefore).not.toBe(yBefore);
  await page.getByRole("button", { name: "Swap" }).click();
  await expect(x).toHaveValue(yBefore);
  await expect(y).toHaveValue(xBefore);
  await expect(page.locator(".picker__meta").first()).toContainText(/\d+ observations · year: \d{4}–\d{4}/);

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

  // 6. Change the size, then save: SVG download and copied statistics.
  await page.getByLabel(/chart size/i).selectOption("1000x600");
  await expect(scatter).toHaveAttribute("width", "1000");
  await expect(stats).toBeVisible(); // re-run landed
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download scatter (SVG)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^scatter_.+_vs_.+\.svg$/);
  await page.getByRole("button", { name: "Copy the statistics" }).click();
  await expect(page.getByText("Copied to the clipboard.")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.replace(/\r\n/g, "\n")).toMatch(/^Dataset: .+\n.+ vs\. .+\nn = \d+\nr = -?\d\.\d{4}\n/);
});

test("switching datasets updates axes, charts, statistics and exports", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Scatter plot" })).toBeVisible();
  const response = page.waitForResponse((res) => res.url().includes("/plot/scatter?") && res.url().includes("dataset_id=icecream-sharks"));
  await page.getByLabel("Dataset", { exact: true }).selectOption("icecream-sharks");
  const scatter = await (await response).json();
  await expect(page.getByLabel(/x axis/i)).toHaveValue("ice_cream_index_norm");
  await expect(page.getByLabel(/y axis/i)).toHaveValue("attacks_norm");
  await expect(page.getByRole("img", { name: "Line chart" })).toBeVisible();
  const table = page.getByRole("region", { name: /look at them two ways/i }).getByRole("table");
  await expect(table.getByRole("cell").first()).toHaveText(String(scatter.stats.n));
  await expect(table.getByRole("cell").nth(1)).toHaveText(scatter.stats.r.toFixed(4));
  await page.getByRole("button", { name: "Copy the statistics" }).click();
  await expect(page.getByText("Copied to the clipboard.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Dataset: Ice cream vs. shark attacks");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download scatter (SVG)" }).click();
  expect((await download).suggestedFilename()).toBe("scatter_icecream-sharks_ice_cream_index_norm_vs_attacks_norm.svg");
  await page.getByLabel("Dataset", { exact: true }).selectOption("iphone-falls");
  await expect(page.getByLabel(/x axis/i)).toHaveValue("iphone_units_sold_millions_norm");
  await expect(page.getByRole("button", { name: "Copy the statistics" })).toBeVisible();
});

test("a temporary CSV survives reload and is hidden from other sessions", async ({ page, browser }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Scatter plot" })).toBeVisible();
  await page.getByLabel("CSV file").setInputFiles({ name: "custom-observations.csv", mimeType: "text/csv",
    buffer: Buffer.from("rownames,measurement,result\n1,1,5\n2,2,4\n3,NA,NA\n4,3,2\n5,4,1\n") });
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await expect(page.getByText("Imported custom-observations: 5 rows.")).toBeVisible();
  const datasetId = await page.getByLabel("Dataset", { exact: true }).inputValue();
  expect(datasetId).toMatch(/^import-/);
  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    await otherPage.goto("/");
    await expect(otherPage.getByRole("img", { name: "Scatter plot" })).toBeVisible();
    await expect(otherPage.locator(`option[value="${datasetId}"]`)).toHaveCount(0);
  } finally {
    await otherContext.close();
  }
  await expect(page.getByLabel(/x axis/i)).toHaveValue("rownames");
  await expect(page.getByRole("button", { name: "Copy the statistics" })).toBeVisible();
  await page.getByRole("button", { name: "Copy the statistics" }).click();
  await expect(page.getByText("Copied to the clipboard.")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("Dataset: custom-observations");
  expect(text).toContain("n = 4");
  await page.reload();
  await page.getByLabel("Dataset", { exact: true }).selectOption(datasetId);
  await expect(page.getByLabel(/x axis/i)).toHaveValue("rownames");
  await expect(page.getByRole("img", { name: "Line chart" })).toBeVisible();
  await page.getByLabel("CSV file").setInputFiles({ name: "invalid.csv", mimeType: "text/csv", buffer: Buffer.from("x,y\n1,2\n") });
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("at least three");
  await expect(page.getByLabel("Dataset", { exact: true })).toHaveValue(datasetId);
  await expect(page.getByRole("img", { name: "Scatter plot" })).toBeVisible();
});
