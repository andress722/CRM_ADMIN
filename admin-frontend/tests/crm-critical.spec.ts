import { expect, test } from "@playwright/test";

const routes = [
  { path: "/crm", heading: /Dashboard CRM/i },
  { path: "/crm/leads", heading: /CRM • Leads/i },
  { path: "/crm/deals", heading: /CRM • Deals/i },
  { path: "/crm/deals/pipeline", heading: /CRM • Pipeline/i },
  { path: "/crm/contacts", heading: /CRM • Contatos/i },
  { path: "/crm/activities", heading: /CRM • Atividades/i },
] as const;

const visibleTimeoutMs = 60_000;

for (const route of routes) {
  test(`crm critical route: ${route.path}`, async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await page.goto(`${baseURL}${route.path}`, { waitUntil: "commit", timeout: 15_000 });

    const pageHeading = page.getByRole("heading", { name: route.heading });
    const unauthenticated = page.getByText("Usuário não autenticado.");
    const loginHeading = page.getByRole("heading", { name: /Admin Login/i });
    const routeError = page.getByText(/Erro ao carregar|Usuário não autenticado\.|Failed to fetch/i);

    const seen = await Promise.race([
      pageHeading
        .waitFor({ state: "visible", timeout: visibleTimeoutMs })
        .then(() => "crm")
        .catch(() => null),
      unauthenticated
        .waitFor({ state: "visible", timeout: visibleTimeoutMs })
        .then(() => "unauthenticated")
        .catch(() => null),
      loginHeading
        .waitFor({ state: "visible", timeout: visibleTimeoutMs })
        .then(() => "login")
        .catch(() => null),
      routeError
        .waitFor({ state: "visible", timeout: visibleTimeoutMs })
        .then(() => "error")
        .catch(() => null),
    ]);

    if (seen === "crm") {
      await expect(pageHeading).toHaveCount(1);
      return;
    }

    if (seen === "unauthenticated") {
      await expect(unauthenticated).toHaveCount(1);
      return;
    }

    if (seen === "error") {
      await expect(routeError).toHaveCount(1);
      return;
    }

    await expect(loginHeading).toHaveCount(1);
  });
}
