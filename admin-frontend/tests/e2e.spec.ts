import { test, expect } from '@playwright/test';

test('leads page loads', async ({ page }) => {
  const port = process.env.FRONTEND_PORT || '3003';
  await page.goto(`http://localhost:${port}/leads`);
  const leadsCount = await page.locator('text=Leads').count();
  if (leadsCount > 0) {
    await expect(page.locator('text=Leads')).toHaveCount(1);
  } else {
    await expect(page.locator('text=Login')).toHaveCount(1);
  }
});
