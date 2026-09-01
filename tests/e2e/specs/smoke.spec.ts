import { expect, test } from "@playwright/test";

test("home page renders the default (OWNER) dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Orbix Pulse")).toBeVisible();
  await expect(page.getByText("Faturamento (mês)")).toBeVisible();
});
