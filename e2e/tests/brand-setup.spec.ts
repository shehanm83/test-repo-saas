import { expect, test } from "@playwright/test";

test("brand setup wizard completes all 6 steps", async ({ page }) => {
  await page.goto("/onboarding/brand/1-identify");
  await page.getByLabel(/brand name/i).fill("Atlas Coffee");
  await page.getByRole("button", { name: /continue|next/i }).click();

  await expect(page).toHaveURL(/\/onboarding\/brand\/2-logo/);
  await page.getByRole("button", { name: /skip|continue|next/i }).first().click();

  await expect(page).toHaveURL(/\/onboarding\/brand\/3-palette/);
  await page.getByRole("button", { name: /continue|next/i }).click();

  await expect(page).toHaveURL(/\/onboarding\/brand\/4-fonts/);
  await page.getByRole("button", { name: /continue|next/i }).click();

  await expect(page).toHaveURL(/\/onboarding\/brand\/5-voice/);
  await page.getByRole("button", { name: /continue|next/i }).click();

  await expect(page).toHaveURL(/\/onboarding\/brand\/6-references/);
  await page.getByRole("button", { name: /finish|done|complete/i }).click();

  await expect(page).toHaveURL(/\/(generate|brands|$)/);
});
