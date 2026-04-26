import { expect, test } from "@playwright/test";

test("billing page shows top-up packs and current plan", async ({ page }) => {
  await page.goto("/billing");
  await expect(page.getByRole("heading", { name: /billing|plan/i }).first()).toBeVisible();
  await expect(page.getByText(/credits/i).first()).toBeVisible();

  const topupTrigger = page.getByRole("button", { name: /top up|750 credits/i }).first();
  await expect(topupTrigger).toBeVisible({ timeout: 10_000 });
});
