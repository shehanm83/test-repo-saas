import { expect, test } from "@playwright/test";

test("signup → onboarding → generate → download", async ({ page }) => {
  await page.goto("/onboarding/brand/identify");
  await page.getByLabel(/brand name/i).fill("Test Brand");
  await page.getByRole("button", { name: /continue|next/i }).click();

  await page.goto("/generate");
  await page.getByLabel(/product name/i).fill("Holiday candle");
  await page.getByRole("button", { name: /add product draft/i }).click();
  await page.getByLabel(/creative brief/i).fill("Christmas sale 30% off, cozy living room with tree");
  await page.getByLabel(/cta/i).fill("Shop now");
  await expect(page.getByRole("button", { name: /^generate images/i })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: /^generate images/i }).click();

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

test("campaign builder submits a mocked campaign package", async ({ page }) => {
  await page.route("**/api/products", async (route) => {
    await route.fulfill({
      json: { id: "55555555-5555-4555-8555-555555555555", name: "Mock serum" },
    });
  });
  await page.route("**/api/generations/preflight", async (route) => {
    await route.fulfill({
      json: {
        blocking: [],
        warnings: [],
        estimate: { credits: 36, balance: 120, lineItems: [{ label: "Campaign formats", credits: 36 }] },
      },
    });
  });
  await page.route("**/api/generations", async (route) => {
    await route.fulfill({ json: { generationId: "66666666-6666-4666-8666-666666666666" } });
  });

  await page.goto("/generate");
  await page.getByRole("tab", { name: /campaign builder/i }).click();
  await page.getByRole("button", { name: /social ad pack/i }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByLabel(/product name/i).fill("Mock serum");
  await page.getByRole("button", { name: /add product draft/i }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByLabel(/creative brief/i).fill("Launch a polished skincare social campaign");
  await page.getByLabel(/campaign title/i).fill("Glow starts here");
  await page.getByLabel(/cta/i).fill("Shop now");
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /instagram story/i }).click();
  await page.getByRole("button", { name: /next/i }).click();

  await expect(page.getByRole("button", { name: /^generate package/i })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: /^generate package/i }).click();
  await expect(page).toHaveURL(/\/generations\/66666666-6666-4666-8666-666666666666/);
});
