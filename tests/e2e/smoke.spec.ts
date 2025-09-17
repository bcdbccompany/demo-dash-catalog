import { test, expect } from '@playwright/test';

test.describe('Smoke Tests @smoke', () => {
  test('should login and access dashboard', async ({ page }) => {
    await test.step('Navigate to login page', async () => {
      await page.goto('/');
      await expect(page).toHaveURL('/login');
    });

    await test.step('Fill login form and submit', async () => {
      await page.getByTestId('login-username').fill('admin');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
    });

    await test.step('Verify redirect to dashboard', async () => {
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Dashboard de Clima')).toBeVisible();
      await expect(page.getByTestId('dash-chart')).toBeVisible();
    });

    await test.step('Navigate to other pages', async () => {
      // Test navigation to catalog
      await page.getByTestId('nav-catalogo').click();
      await expect(page).toHaveURL('/catalogo');
      await expect(page.getByText('Catálogo de Países')).toBeVisible();

      // Test navigation to posts
      await page.getByTestId('nav-posts').click();
      await expect(page).toHaveURL('/posts');
      await expect(page.getByText('Posts')).toBeVisible();

      // Back to dashboard
      await page.getByTestId('nav-dashboard').click();
      await expect(page).toHaveURL('/dashboard');
    });

    await test.step('Logout functionality', async () => {
      await page.getByTestId('nav-logout').click();
      await expect(page).toHaveURL('/login');
    });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await test.step('Try to access protected route', async () => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });

    await test.step('Try to access catalog', async () => {
      await page.goto('/catalogo');
      await expect(page).toHaveURL('/login');
    });

    await test.step('Try to access posts', async () => {
      await page.goto('/posts');
      await expect(page).toHaveURL('/login');
    });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');

    await test.step('Submit invalid credentials', async () => {
      await page.getByTestId('login-username').fill('invalid');
      await page.getByTestId('login-password').fill('invalid');
      await page.getByTestId('login-submit').click();
    });

    await test.step('Verify error message', async () => {
      await expect(page.getByTestId('login-error')).toBeVisible();
      await expect(page).toHaveURL('/login');
    });
  });
});