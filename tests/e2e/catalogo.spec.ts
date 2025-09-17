import { test, expect } from '@playwright/test';

const mockCountries = [
  {
    name: { common: 'Brazil', official: 'Federative Republic of Brazil' },
    region: 'Americas',
    capital: ['Brasília'],
    population: 215313498,
    flags: { png: 'https://flagcdn.com/w320/br.png', alt: 'Flag of Brazil' },
    languages: { por: 'Portuguese' },
    currencies: { BRL: { name: 'Brazilian real', symbol: 'R$' } },
    cca2: 'BR', cca3: 'BRA'
  },
  {
    name: { common: 'Argentina', official: 'Argentine Republic' },
    region: 'Americas',
    capital: ['Buenos Aires'],
    population: 45195777,
    flags: { png: 'https://flagcdn.com/w320/ar.png', alt: 'Flag of Argentina' },
    languages: { spa: 'Spanish' },
    currencies: { ARS: { name: 'Argentine peso', symbol: '$' } },
    cca2: 'AR', cca3: 'ARG'
  },
  {
    name: { common: 'Germany', official: 'Federal Republic of Germany' },
    region: 'Europe',
    capital: ['Berlin'],
    population: 83240525,
    flags: { png: 'https://flagcdn.com/w320/de.png', alt: 'Flag of Germany' },
    languages: { deu: 'German' },
    currencies: { EUR: { name: 'Euro', symbol: '€' } },
    cca2: 'DE', cca3: 'DEU'
  },
  {
    name: { common: 'France', official: 'French Republic' },
    region: 'Europe',
    capital: ['Paris'],
    population: 67391582,
    flags: { png: 'https://flagcdn.com/w320/fr.png', alt: 'Flag of France' },
    languages: { fra: 'French' },
    currencies: { EUR: { name: 'Euro', symbol: '€' } },
    cca2: 'FR', cca3: 'FRA'
  },
  // Add more countries to test pagination
  ...Array.from({ length: 20 }, (_, i) => ({
    name: { common: `Country ${i + 5}`, official: `Official Country ${i + 5}` },
    region: i % 2 === 0 ? 'Africa' : 'Asia',
    capital: [`Capital ${i + 5}`],
    population: 1000000 + i * 100000,
    flags: { png: `https://example.com/flag${i + 5}.png`, alt: `Flag of Country ${i + 5}` },
    languages: { eng: 'English' },
    currencies: { USD: { name: 'Dollar', symbol: '$' } },
    cca2: `C${i}`, cca3: `CO${i}`
  }))
];

test.describe('Catálogo E2E @catalogo', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to catalog
    await page.goto('/login');
    await page.getByTestId('login-username').fill('admin');
    await page.getByTestId('login-password').fill('admin123');
    await page.getByTestId('login-submit').click();
    
    await page.getByTestId('nav-catalogo').click();
    await expect(page).toHaveURL('/catalogo');
  });

  test('should load countries and display them', async ({ page }) => {
    await test.step('Intercept countries API', async () => {
      await page.route('**/restcountries.com/v3.1/all**', async route => {
        await route.fulfill({ json: mockCountries });
      });
    });

    await test.step('Verify catalog loads', async () => {
      await page.reload();
      await expect(page.getByText('Catálogo de Países')).toBeVisible();
      await expect(page.getByTestId('catalogo-search')).toBeVisible();
      await expect(page.getByTestId('catalogo-region')).toBeVisible();
    });

    await test.step('Verify countries are displayed', async () => {
      await expect(page.getByText('Brazil')).toBeVisible();
      await expect(page.getByText('Argentina')).toBeVisible();
      await expect(page.getByText('Germany')).toBeVisible();
      await expect(page.getByText('France')).toBeVisible();
    });

    await test.step('Verify table view is default', async () => {
      await expect(page.getByTestId('catalogo-table')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });
  });

  test('should filter countries by search term', async ({ page }) => {
    await test.step('Setup API mock', async () => {
      await page.route('**/restcountries.com/v3.1/all**', async route => {
        await route.fulfill({ json: mockCountries });
      });
    });

    await test.step('Load initial data', async () => {
      await page.reload();
      await expect(page.getByText('Brazil')).toBeVisible();
    });

    await test.step('Search for specific country', async () => {
      await page.getByTestId('catalogo-search').fill('Brazil');
      
      // Wait for debounce and filtering
      await page.waitForTimeout(350);
      
      await expect(page.getByText('Brazil')).toBeVisible();
      await expect(page.getByText('Argentina')).not.toBeVisible();
    });

    await test.step('Clear search and verify all countries return', async () => {
      await page.getByText('Limpar').click();
      
      await expect(page.getByTestId('catalogo-search')).toHaveValue('');
      await expect(page.getByText('Brazil')).toBeVisible();
      await expect(page.getByText('Argentina')).toBeVisible();
    });
  });

  test('should filter countries by region', async ({ page }) => {
    await test.step('Setup API mock', async () => {
      await page.route('**/restcountries.com/v3.1/all**', async route => {
        await route.fulfill({ json: mockCountries });
      });
    });

    await test.step('Load initial data', async () => {
      await page.reload();
      await expect(page.getByText('Brazil')).toBeVisible();
    });

    await test.step('Filter by Europe region', async () => {
      await page.getByTestId('catalogo-region').click();
      await expect(page.getByText('Europe')).toBeVisible();
      await page.getByText('Europe').click();
      
      await expect(page.getByText('Germany')).toBeVisible();
      await expect(page.getByText('France')).toBeVisible();
      await expect(page.getByText('Brazil')).not.toBeVisible();
    });

    await test.step('Filter by Americas region', async () => {
      await page.getByTestId('catalogo-region').click();
      await page.getByText('Americas').click();
      
      await expect(page.getByText('Brazil')).toBeVisible();
      await expect(page.getByText('Argentina')).toBeVisible();
      await expect(page.getByText('Germany')).not.toBeVisible();
    });
  });

  test('should toggle between table and cards view', async ({ page }) => {
    await test.step('Setup API mock', async () => {
      await page.route('**/restcountries.com/v3.1/all**', async route => {
        await route.fulfill({ json: mockCountries });
      });
    });

    await test.step('Load initial data in table view', async () => {
      await page.reload();
      await expect(page.getByTestId('catalogo-table')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    await test.step('Toggle to cards view', async () => {
      await page.getByTestId('catalogo-view-toggle').click();
      
      await expect(page.getByTestId('catalogo-cards')).toBeVisible();
      await expect(page.getByTestId('catalogo-table')).not.toBeVisible();
    });

    await test.step('Toggle back to table view', async () => {
      await page.getByTestId('catalogo-view-toggle').click();
      
      await expect(page.getByTestId('catalogo-table')).toBeVisible();
      await expect(page.getByTestId('catalogo-cards')).not.toBeVisible();
    });
  });

  test('should sort countries by population', async ({ page }) => {
    await test.step('Setup API mock', async () => {
      await page.route('**/restcountries.com/v3.1/all**', async route => {
        await route.fulfill({ json: mockCountries });
      });
    });

    await test.step('Load initial data', async () => {
      await page.reload();
      await expect(page.getByText('Brazil')).toBeVisible();
    });

    await test.step('Sort by population', async () => {
      // Click on population header to sort
      await page.getByText('População').click();
      
      // Brazil (215M) should be first, then Germany (83M), then France (67M), then Argentina (45M)
      const rows = page.locator('table tbody tr');
      await expect(rows.first()).toContainText('Brazil');
    });

    await test.step('Sort in reverse order', async () => {
      await page.getByText('População').click(); // Click again for descending
      
      // Now smallest population first
      const rows = page.locator('table tbody tr');
      await expect(rows.first()).toContainText('Argentina');
    });
  });

  test('should handle pagination', async ({ page }) => {
    await test.step('Setup API mock', async () => {
      await page.route('**/restcountries.com/v3.1/all**', async route => {
        await route.fulfill({ json: mockCountries });
      });
    });

    await test.step('Load initial data', async () => {
      await page.reload();
      await expect(page.getByTestId('catalogo-pagination')).toBeVisible();
    });

    await test.step('Navigate to next page', async () => {
      const pagination = page.getByTestId('catalogo-pagination');
      const nextButton = pagination.locator('button').last();
      
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        
        // Verify page changed (check if different countries are shown)
        await expect(page.getByText('Página 2')).toBeVisible();
      }
    });

    await test.step('Navigate back to previous page', async () => {
      const pagination = page.getByTestId('catalogo-pagination');
      const prevButton = pagination.locator('button').first();
      
      if (await prevButton.isEnabled()) {
        await prevButton.click();
        await expect(page.getByText('Página 1')).toBeVisible();
      }
    });
  });

  test('should maintain filters when toggling view', async ({ page }) => {
    await test.step('Setup API mock', async () => {
      await page.route('**/restcountries.com/v3.1/all**', async route => {
        await route.fulfill({ json: mockCountries });
      });
    });

    await test.step('Apply search filter', async () => {
      await page.reload();
      await page.getByTestId('catalogo-search').fill('Germany');
      await page.waitForTimeout(350);
      
      await expect(page.getByText('Germany')).toBeVisible();
      await expect(page.getByText('Brazil')).not.toBeVisible();
    });

    await test.step('Toggle to cards view and verify filter persists', async () => {
      await page.getByTestId('catalogo-view-toggle').click();
      
      await expect(page.getByTestId('catalogo-cards')).toBeVisible();
      await expect(page.getByText('Germany')).toBeVisible();
      await expect(page.getByText('Brazil')).not.toBeVisible();
    });

    await test.step('Toggle back to table view and verify filter still persists', async () => {
      await page.getByTestId('catalogo-view-toggle').click();
      
      await expect(page.getByTestId('catalogo-table')).toBeVisible();
      await expect(page.getByText('Germany')).toBeVisible();
      await expect(page.getByText('Brazil')).not.toBeVisible();
    });
  });
});