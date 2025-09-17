import { test, expect } from '@playwright/test';

const mockWeatherData = {
  hourly: {
    time: Array.from({ length: 24 }, (_, i) => 
      `2024-01-15T${i.toString().padStart(2, '0')}:00`
    ),
    temperature_2m: Array.from({ length: 24 }, (_, i) => 20 + Math.sin(i / 24 * Math.PI * 2) * 10)
  }
};

const mockWeatherDataRio = {
  ...mockWeatherData,
  hourly: {
    ...mockWeatherData.hourly,
    temperature_2m: mockWeatherData.hourly.temperature_2m.map(temp => temp + 3)
  }
};

test.describe('Dashboard E2E @dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByTestId('login-username').fill('admin');
    await page.getByTestId('login-password').fill('admin123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should load weather data and display KPIs', async ({ page }) => {
    await test.step('Intercept weather API', async () => {
      await page.route('**/api.open-meteo.com/v1/forecast**', async route => {
        await route.fulfill({ 
          json: mockWeatherData 
        });
      });
    });

    await test.step('Verify dashboard loads', async () => {
      await page.reload();
      await expect(page.getByText('Dashboard de Clima')).toBeVisible();
      await expect(page.getByTestId('dash-city')).toBeVisible();
      await expect(page.getByTestId('dash-refresh')).toBeVisible();
    });

    await test.step('Verify KPIs are displayed', async () => {
      await expect(page.getByTestId('dash-kpi-avg')).toBeVisible();
      await expect(page.getByTestId('dash-kpi-max')).toBeVisible();
      await expect(page.getByTestId('dash-kpi-min')).toBeVisible();
    });

    await test.step('Verify chart is rendered', async () => {
      await expect(page.getByTestId('dash-chart')).toBeVisible();
    });

    await test.step('Verify data table', async () => {
      await expect(page.getByText('Dados Detalhados')).toBeVisible();
      await expect(page.getByText('Horário')).toBeVisible();
      await expect(page.getByText('Temperatura')).toBeVisible();
      
      // Check for at least some data rows
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(10); // Should show 10 rows as per spec
    });
  });

  test('should change city and update data', async ({ page }) => {
    let requestCount = 0;
    
    await test.step('Intercept weather API with different responses', async () => {
      await page.route('**/api.open-meteo.com/v1/forecast**', async route => {
        const url = route.request().url();
        requestCount++;
        
        if (url.includes('latitude=-22.91')) {
          // Rio de Janeiro coordinates
          await route.fulfill({ json: mockWeatherDataRio });
        } else {
          // Default (São Paulo)
          await route.fulfill({ json: mockWeatherData });
        }
      });
    });

    await test.step('Load initial data', async () => {
      await page.reload();
      await expect(page.getByTestId('dash-kpi-avg')).toBeVisible();
    });

    await test.step('Change city to Rio de Janeiro', async () => {
      await page.getByTestId('dash-city').click();
      await expect(page.getByText('Rio de Janeiro')).toBeVisible();
      await page.getByText('Rio de Janeiro').click();
    });

    await test.step('Verify new data loads', async () => {
      await expect(page.getByText('Rio de Janeiro', { exact: false })).toBeVisible();
      // Should have made at least 2 API calls (initial + city change)
      expect(requestCount).toBeGreaterThanOrEqual(2);
    });
  });

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    let requestCount = 0;
    
    await test.step('Intercept and count API calls', async () => {
      await page.route('**/api.open-meteo.com/v1/forecast**', async route => {
        requestCount++;
        await route.fulfill({ json: mockWeatherData });
      });
    });

    await test.step('Load initial data', async () => {
      await page.reload();
      await expect(page.getByTestId('dash-chart')).toBeVisible();
      const initialCount = requestCount;
      expect(initialCount).toBeGreaterThan(0);
    });

    await test.step('Click refresh button', async () => {
      const initialCount = requestCount;
      await page.getByTestId('dash-refresh').click();
      
      // Wait for new request
      await page.waitForTimeout(1000);
      expect(requestCount).toBe(initialCount + 1);
    });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await test.step('Intercept API with error response', async () => {
      await page.route('**/api.open-meteo.com/v1/forecast**', async route => {
        await route.fulfill({ 
          status: 429,
          json: { error: 'Rate limit exceeded' }
        });
      });
    });

    await test.step('Reload and verify error handling', async () => {
      await page.reload();
      
      // Should show error state
      await expect(page.getByText('Erro ao carregar dados')).toBeVisible();
      await expect(page.getByText('Limite de requisições atingido')).toBeVisible();
    });

    await test.step('Test retry functionality', async () => {
      // Mock successful response for retry
      await page.route('**/api.open-meteo.com/v1/forecast**', async route => {
        await route.fulfill({ json: mockWeatherData });
      });

      await page.getByText('Tentar novamente').click();
      await expect(page.getByTestId('dash-chart')).toBeVisible();
    });
  });
});