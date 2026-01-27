import { Page, expect } from "@playwright/test";

export async function goToApplications(page: Page) {
  const applicationsNav = page.locator('[data-testid="side-panel-items-applications"]');
  await expect(applicationsNav).toBeVisible({ timeout: 30_000 });
  await applicationsNav.click();

  // Ensure Applications list is loaded by waiting for the New Application button
  await expect(
    page.locator('[data-testid="applications-list-layout-add-button"]')
  ).toBeVisible({ timeout: 30_000 });
}
