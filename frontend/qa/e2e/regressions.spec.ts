import { test, expect } from '@playwright/test';

test.describe('Section 11.3 Audit Regressions Suite', () => {
  const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN || 'da3-secret-admin-token';

  test.beforeEach(async ({ page }) => {
    // Check if backend is reachable before running live tests
    try {
      const res = await page.request.get('http://127.0.0.1:8000/health');
      if (!res.ok()) {
        test.skip(true, 'Backend is not running on http://127.0.0.1:8000');
      }
    } catch {
      test.skip(true, 'Backend is offline on http://127.0.0.1:8000');
    }
  });

  test('1. Admin never blank on malformed parity response', async ({ page }) => {
    await page.goto('/');
    // Sign in as admin
    await page.click('button:has-text("Sign in as Administrator")');
    await page.fill('input[type="password"]', ADMIN_TOKEN);
    await page.click('button:has-text("Enter Administration")');
    await expect(page).toHaveURL(/\/app\/admin/);

    // Parity table renders rows
    await expect(page.locator('table')).toBeVisible();

    // Now intercept with malformed body
    await page.route('**/api/admin/parity', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unexpected: 'malformed_payload' }),
      });
    });

    await page.reload();
    // Error state appears with retry button, sidebar still visible
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('2. Wrong-paper bug: direct and parameter navigation', async ({ page }) => {
    // Log in as evaluator to have browseAll capability
    await page.goto('/');
    await page.click('button:has-text("Explore as Evaluator")');
    await expect(page).toHaveURL(/\/app\/walkthrough/);

    // Open /app/reviews/110 directly
    await page.goto('/app/reviews/110');
    await expect(page.locator('h1')).toContainText('#110');

    // Navigate to /app/reviews/1
    await page.goto('/app/reviews/1');
    await expect(page.locator('h1')).toContainText('#1');

    // Repeat for assignments
    await page.goto('/app/assignments/110');
    await expect(page.locator('h1')).toContainText('#110');
    await page.goto('/app/assignments/1');
    await expect(page.locator('h1')).toContainText('#1');
  });

  test('4. Login: wrong admin token rejected, author/reviewer resolve identities', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Sign in as Administrator")');
    await page.fill('input[type="password"]', 'completely-wrong-token');
    await page.click('button:has-text("Enter Administration")');
    // Stays on home and shows error
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Invalid token')).toBeVisible();

    // Author sign in
    await page.click('button:has-text("Sign in as Author")');
    await page.click('button:has-text("Emma Krishnan")');
    await expect(page).toHaveURL(/\/app\/my-papers/);
  });

  test('5. Guards: restricted persona sees view restriction state, not blank', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Sign in as Reviewer")');
    await page.click('button:has-text("Dr. David Nair")');
    await expect(page).toHaveURL(/\/app\/my-reviews/);

    // Attempt visiting admin
    await page.goto('/app/admin');
    await expect(page.locator('text=isn\'t part of your view')).toBeVisible();

    // Attempt visiting papers list
    await page.goto('/app/papers');
    await expect(page.locator('text=isn\'t part of your view')).toBeVisible();
  });

  test('6. No undefined, NaN, null, or raw object strings on Home', async ({ page }) => {
    await page.goto('/');
    const text = await page.innerText('body');
    expect(text).not.toMatch(/\bundefined\b/);
    expect(text).not.toMatch(/\bNaN\b/);
    expect(text).not.toMatch(/\bnull\b/);
    expect(text).not.toContain('[object Object]');
    expect(text).not.toContain('$\\');
  });

  test('7. Layout horizontal scroll boundaries at 1366 and 1920', async ({ page }) => {
    for (const width of [1366, 1920]) {
      await page.setViewportSize({ width, height: 768 });
      await page.goto('/');
      const isScrollable = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(isScrollable).toBe(false);
    }
  });

  test('13. Home live data: offline fallback when /api/health blocked', async ({ page }) => {
    await page.route('**/api/health', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('text=Backend offline')).toBeVisible();
  });
});
