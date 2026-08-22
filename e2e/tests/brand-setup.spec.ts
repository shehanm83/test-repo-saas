import { expect, test } from "@playwright/test";

const brandId = "11111111-1111-4111-8111-111111111111";

test("legacy onboarding opens the single brand screen and autosaves the kit", async ({ page }) => {
  let createPayload: Record<string, unknown> | null = null;
  const patches: Record<string, unknown>[] = [];

  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("**/api/brands", async (route) => {
    createPayload = (await route.request().postDataJSON()) as Record<string, unknown>;
    await route.fulfill({ json: { id: brandId } });
  });
  await page.route(`**/api/brands/${brandId}`, async (route) => {
    patches.push((await route.request().postDataJSON()) as Record<string, unknown>);
    await route.fulfill({ json: { id: brandId } });
  });

  await page.goto("/onboarding/brand/identify");
  await expect(page).toHaveURL(/\/brands\/new$/);
  await expect(page.getByRole("heading", { name: "New brand" })).toBeVisible();

  await page.getByLabel("Brand name").fill("Atlas Coffee");
  await page.getByLabel("Brand name").press("Tab");

  await expect(page).toHaveURL(new RegExp(`/brands/${brandId}$`));
  await expect.poll(() => createPayload).toEqual({ name: "Atlas Coffee" });

  await page.getByLabel("Website").fill("atlas.example");
  await page.getByLabel("Website").press("Tab");
  await expect.poll(() => patches).toContainEqual({ sourceUrl: "https://atlas.example" });

  await page.getByRole("combobox", { name: "Headline font family" }).click();
  await page.getByLabel("Search headline fonts").fill("Pacifico");
  await page.getByRole("option", { name: /Pacifico/i }).click();

  await expect
    .poll(() => patches)
    .toContainEqual({
      fonts: {
        heading: { family: "Pacifico", weight: "400" },
        body: { family: "Inter", weight: "400" },
      },
    });
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
});
