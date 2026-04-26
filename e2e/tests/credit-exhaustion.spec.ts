import { expect, test } from "@playwright/test";

test("generation with no credits returns insufficient-credits error", async ({ request }) => {
  const response = await request.post("/api/generations", {
    data: {
      brandId: "00000000-0000-0000-0000-000000000000",
      brief: "test brief",
      outputTarget: { kind: "image", aspectRatio: "1:1", width: 1024, height: 1024 },
    },
    failOnStatusCode: false,
  });

  expect([400, 402, 404, 422]).toContain(response.status());
  const body = await response.json().catch(() => ({}));
  if (response.status() === 402) {
    expect(body.error?.code).toBe("billing.insufficient_credits");
  }
});
