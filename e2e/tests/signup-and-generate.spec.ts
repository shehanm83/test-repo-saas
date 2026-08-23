import { expect, test } from "@playwright/test";

test("signup → brand kit → generate → download", async ({ page }) => {
  await page.goto("/brands/new");
  await page.getByLabel(/brand name/i).fill("Test Brand");
  await page.getByLabel(/brand name/i).press("Tab");
  await expect(page).toHaveURL(/\/brands\/[0-9a-f-]+$/);

  await page.goto("/generate");
  await page.getByLabel(/product name/i).fill("Holiday candle");
  await page.getByRole("button", { name: /add product draft/i }).click();
  await page
    .getByLabel(/creative brief/i)
    .fill("Christmas sale 30% off, cozy living room with tree");
  await page.getByLabel(/enable promotion/i).check();
  await page.getByLabel(/cta/i).fill("Shop now");
  await expect(page.getByRole("button", { name: /^generate images/i })).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /^generate images/i }).click();
  await page.getByRole("button", { name: /start generation/i }).click();

  await expect(page).toHaveURL(/\/generations\//, { timeout: 30_000 });
  await expect(page.locator('[data-variant-status="completed"]').first()).toBeVisible({
    timeout: 60_000,
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("link", { name: /download/i })
      .first()
      .click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.(png|jpg|jpeg)$/i);
});

test("legacy campaign-builder links redirect to the dedicated campaign workflow", async ({
  page,
}) => {
  await page.goto("/generate?mode=campaign");
  await expect(page).toHaveURL(/\/campaigns\/new$/);
  await expect(page.getByRole("heading", { name: /new campaign/i })).toBeVisible();
});
