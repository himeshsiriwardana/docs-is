import { test, expect } from "@playwright/test";
import path from "path";

import { loginAsAdmin } from "../../../../../../../helpers/loginAsAdmin";
import { goToApplications } from "../../../../../../../helpers/goToApplications";
import { goToNewApplication } from "../../../../../../../helpers/goToNewApplication";

test("docs screenshot: select app type", async ({ page }) => {

  await loginAsAdmin(page);
  await goToApplications(page);
  await goToNewApplication(page);

  const region = page.locator(
    '[data-testid="application-templates-page-layout"]'
  );
  await expect(region).toBeVisible();

  const outputPath = path.resolve(
    "en/identity-server/next/docs/assets/img/guides/applications/select-app-type.png"
  );

  await page.addStyleTag({
  content: `
    .oxygen-app-bar,
    .oxygen-header,
    .mui-fixed {
      display: none !important;
    }
  `
});

  await region.screenshot({ path: outputPath });
});
