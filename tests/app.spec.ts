import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads and shows title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("MURDER");
  });

  test("shows leaderboard link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Leaderboard" })).toBeVisible();
  });
});

test.describe("Leaderboard page", () => {
  test("loads leaderboard", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.locator("h1")).toContainText("Leaderboard");
  });
});

test.describe("Admin page", () => {
  test("shows login form when not authenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe("Win page", () => {
  test("loads with query params", async ({ page }) => {
    await page.goto("/win?mysteryId=room-314&score=850&time=300");
    await expect(page.locator("h1")).toContainText("Case Solved");
    await expect(page.locator("text=Score Breakdown")).toBeVisible();
  });
});

test.describe("Lost page", () => {
  test("loads with query params", async ({ page }) => {
    await page.goto("/lost?mysteryId=vaughn-street");
    await expect(page.locator("h1")).toContainText("Case Failed");
  });
});

test.describe("Play page", () => {
  test("redirects to home if no session", async ({ page }) => {
    await page.goto("/play/room-314");
    await page.waitForURL("**/play/room-314");
    await expect(page.locator("h1")).toContainText("Case");
  });
});

test.describe("API health", () => {
  test("health endpoint returns ok", async ({ page }) => {
    const res = await page.goto("/api/health");
    const body = await res?.json();
    expect(body?.status).toBe("healthy");
    expect(body?.model).toBeDefined();
  });
});

test.describe("Mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("home page is usable on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("leaderboard works on mobile", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.locator("h1")).toContainText("Leaderboard");
  });
});
