import { Page, expect } from "@playwright/test";

async function dismissCookiePopupIfPresent(page: Page) {
  const cookieButton = page.locator(
    '[data-testid="cookie-consent-banner-confirm-button"]'
  );

  if (await cookieButton.isVisible().catch(() => false)) {
    await cookieButton.click();
  }
}

export async function loginAsAdmin(page: Page) {
  // Go to tenant-qualified console root (baseURL is set in Playwright config)
  await page.goto("/");

  // Cookie banner can block inputs
  await dismissCookiePopupIfPresent(page);

  // ---- Path A: New Console login UI ----
  const usernameNew = page.locator('[data-testid="login-page-username-input"]');

  if (await usernameNew.isVisible().catch(() => false)) {
    await usernameNew.fill(process.env.IS_USERNAME ?? "admin");

    const passwordNew = page.locator(
      '[data-testid="login-page-password-input"]'
    );
    await expect(passwordNew).toBeVisible({ timeout: 10_000 });
    await passwordNew.fill(process.env.IS_PASSWORD ?? "admin");

    const submitNew = page.locator(
      '[data-testid="login-page-continue-login-button"]'
    );
    await expect(submitNew).toBeVisible({ timeout: 10_000 });
    await submitNew.click();
  } else {
    // ---- Path B: Classic IS login page (/authenticationendpoint/login.do) ----
    const usernameClassic = page.locator(
      '#usernameUserInput, input[name="usernameUserInput"]'
    );
    await expect(usernameClassic).toBeVisible({ timeout: 30_000 });
    await usernameClassic.fill(process.env.IS_USERNAME ?? "admin");

    const passwordClassic = page.locator(
      '#password, input[type="password"][name="password"]'
    );
    await expect(passwordClassic).toBeVisible({ timeout: 10_000 });
    await passwordClassic.fill(process.env.IS_PASSWORD ?? "admin");

    const submitClassic = page.locator(
      '#sign-in-button, button[type="submit"]'
    );
    await expect(submitClassic).toBeVisible({ timeout: 10_000 });

    // Banner can re-appear after navigation
    await dismissCookiePopupIfPresent(page);

    await submitClassic.click();
  }

  // Confirm console shell is loaded (post-login)
  await expect(page).toHaveURL(/\/console\/?$/, { timeout: 30_000 });
  await expect(
    page.locator('[data-testid="side-panel-items-applications"]')
  ).toBeVisible({ timeout: 30_000 });
}
