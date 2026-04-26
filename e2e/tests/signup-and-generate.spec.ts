import { expect, test } from "@playwright/test";

test("signup → onboarding → generate → download", async ({ page }) => {
  await page.goto("/onboarding/brand/1-identify");
  await page.getByLabel(/brand name/i).fill("Test Brand");
  await page.getByRole("button", { name: /continue|next/i }).click();

  await page.goto("/generate");
  const target = page.getByRole("button", { name: /instagram post/i }).first();
  if (await target.isVisible({ timeout: 5000 }).catch(() => false)) {
    await target.click();
  }
  await page.getByRole("textbox").first().fill("Christmas sale 30% off, cozy living room with tree");
  await page.getByRole("button", { name: /^generate/i }).click();

  await expect(page).toHaveURL(/\/generations\//, { timeout: 30_000 });
  await expect(page.locator('[data-variant-status="completed"]').first()).toBeVisible({
    timeout: 60_000,
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("a[download]").first().click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.(png|jpg|jpeg)$/i);
});
