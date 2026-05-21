import { expect, test } from "@playwright/test";

/**
 * Optional live VPS tests. Not run in default `npm run test:e2e`.
 *
 * E2E_LIVE_URL=https://panel-test.example.com
 * E2E_LIVE_USER=admin
 * E2E_LIVE_PASS=your-password
 * npx playwright test e2e/live.optional.spec.ts
 */
const liveUrl = process.env.E2E_LIVE_URL;

test.describe("live VirtualMin VPS", () => {
  test.skip(!liveUrl, "Set E2E_LIVE_URL to run live E2E");

  test.use({ baseURL: liveUrl });

  test("health and login", async ({ page, request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mock).toBe(false);

    await page.goto("/login");
    await page.getByLabel("Username").fill(process.env.E2E_LIVE_USER ?? "admin");
    await page.getByLabel("Password").fill(process.env.E2E_LIVE_PASS ?? "");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
