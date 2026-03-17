import { expect, test } from "@playwright/test";

test("BFF blocks high-risk mutation without action nonce", async ({ request }) => {
  const response = await request.post("/api/bff/payments/checkout", {
    data: {
      orderId: "00000000-0000-0000-0000-000000000001",
      payerEmail: "qa@example.com",
    },
  });

  expect(response.status()).toBe(403);
  const payload = (await response.json()) as { message?: string };
  expect(payload.message).toContain("Action nonce required");
});

test("BFF rejects oversized auth payload with 413", async ({ request }) => {
  const hugeEmail = `${"a".repeat(70 * 1024)}@example.com`;
  const response = await request.post("/api/bff/auth/login", {
    data: {
      email: hugeEmail,
      password: "irrelevant",
    },
  });

  expect(response.status()).toBe(413);
  const payload = (await response.json()) as { message?: string };
  expect(payload.message).toContain("Payload too large");
});
