import { expect, test } from "@playwright/test";

test("browse, filter and open a recipe with G9-only details", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: /Find a look/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Portra 400/i }).first()).toBeVisible();
  await page.getByLabel("Character").selectOption("monochrome");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=monochrome/);
  await expect(page.getByText("Grainy Documentary", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Grainy Documentary/ }).first().click();
  await expect(page.getByRole("heading", { name: "Grainy Documentary" })).toBeVisible();
  await expect(page.getByText(/Illustrative preview/i).first()).toBeVisible();
  await page.getByRole("link", { name: "Set up on my G9" }).click();
  await expect(page).toHaveURL(/\/guide\?recipe=grainy-documentary/);
  await expect(page.getByRole("heading", { name: "Are you using the original DC-G9?" })).toBeVisible();
});

test("personal recipe and favourite survive a reload", async ({ page }) => {
  await page.goto("/recipes");
  const recipeTitle = page.getByRole("link", { name: /Portra 400/i }).first();
  await recipeTitle.click();
  const favorite = page.getByRole("button", { name: "Add to favourites" });
  await favorite.click();
  await expect(page.getByRole("button", { name: "Remove from favourites" })).toBeVisible();
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: /Find the look/i })).toBeVisible();
  await page.getByLabel("Recipe name").fill("My field test");
  await page.getByRole("button", { name: /Save to My Recipes/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved on this device" })).toBeVisible();
  await page.goto("/my-recipes");
  await page.reload();
  await expect(page.getByText("My field test", { exact: true })).toBeVisible();
});

test("public pages avoid horizontal document overflow at target widths", async ({ browser }) => {
  for (const width of [375, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const path of ["/", "/recipes", "/studio", "/my-recipes", "/guide", "/compare"]) {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, `${path} overflows at ${width}px`).toBe(false);
    }
    await context.close();
  }
});
