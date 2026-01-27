import { Page, expect } from "@playwright/test";

export async function goToNewApplication(page: Page) {
  // Click Applications in side panel first
  const applicationsNav = page.locator('[data-testid="side-panel-items-applications"]');
  await expect(applicationsNav).toBeVisible({ timeout: 30_000 });
  await applicationsNav.click();

  // Now click New Application
  const newApplicationButton = page.locator(
    '[data-testid="applications-list-layout-add-button"]'
  );
  await expect(newApplicationButton).toBeVisible({ timeout: 30_000 });
  await newApplicationButton.click();

  // Wait for templates layout
  const templatesLayout = page.locator(
    '[data-testid="application-templates-page-layout"]'
  );
  await expect(templatesLayout).toBeVisible({ timeout: 30_000 });
}
