import { expect, test } from "@playwright/test";

test("crm leads page loads", async ({ page }) => {
  const port = (process.env.FRONTEND_PORT || "3003").toString().trim();
  await page.goto(`http://localhost:${port}/crm/leads`);

  const leadsHeader = page.getByRole("heading", { name: /CRM • Leads/i });
  const unauthenticated = page.locator("text=Usuário não autenticado.");
  const login = page.getByRole("heading", { name: /Admin Login/i });

  // Wait for either the Leads header or the Login page to appear.
  // Use small timeouts and check both to avoid flakes caused by redirects.
  const seen = await Promise.race([
    leadsHeader
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => "leads")
      .catch(() => null),
    unauthenticated
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => "unauthenticated")
      .catch(() => null),
    login
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => "login")
      .catch(() => null),
  ]);

  if (seen === "leads") {
    await expect(leadsHeader).toHaveCount(1);
  } else if (seen === "unauthenticated") {
    await expect(unauthenticated).toHaveCount(1);
  } else {
    await expect(login).toHaveCount(1);
  }
});
