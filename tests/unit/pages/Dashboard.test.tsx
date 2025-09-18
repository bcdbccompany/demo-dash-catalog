import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { useAuth } from '@/hooks/use-auth';

// Mock hooks
vi.mock('@/hooks/use-auth');

const mockUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    user: { username: 'admin', role: 'administrator' },
    login: vi.fn(),
    logout: vi.fn(),
  });
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Dashboard', () => {
  it('renders dashboard header and controls', async () => {
    renderWithRouter(<Dashboard />);

    expect(screen.getByText('Dashboard de Clima')).toBeInTheDocument();
    expect(screen.getByText('Monitoramento em tempo real')).toBeInTheDocument();
    expect(screen.getByTestId('dash-city')).toBeInTheDocument();
    expect(screen.getByTestId('dash-refresh')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    const { container } = renderWithRouter(<Dashboard />);

    // Check for skeleton loading in KPIs
    const skeletons = container.querySelectorAll('.animate-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays weather data after loading', async () => {
    renderWithRouter(<Dashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('dash-kpi-avg')).toBeInTheDocument();
      expect(screen.getByTestId('dash-kpi-max')).toBeInTheDocument();
      expect(screen.getByTestId('dash-kpi-min')).toBeInTheDocument();
    });

    // Check if chart container is present
    await waitFor(() => {
      expect(screen.getByTestId('dash-chart')).toBeInTheDocument();
    });
  });

  it('calculates KPIs correctly', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('dash-kpi-avg')).toBeInTheDocument();
    });

    // Based on openmeteo.json fixture, temperatures are 17.5 to 32.1
    // Average should be around 23.8, max 32.1, min 17.5
    const avgElement = screen.getByTestId('dash-kpi-avg');
    const maxElement = screen.getByTestId('dash-kpi-max');
    const minElement = screen.getByTestId('dash-kpi-min');

    expect(avgElement).toHaveTextContent(/23\.\d+|24\.\d+/); // Allow some variance in calculation
    expect(maxElement).toHaveTextContent('32.1');
    expect(minElement).toHaveTextContent('17.5');
  });

  it('changes city and updates data', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Dashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('dash-city')).toBeInTheDocument();
    });

    // Change city
    const citySelect = screen.getByTestId('dash-city');
    await user.click(citySelect);
    
    // Choose option within the listbox
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: 'Rio de Janeiro' }));

    // Verify title updates
    await waitFor(() => {
      expect(screen.getByText(/Rio de Janeiro/)).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('dash-refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTestId('dash-refresh');
    
    // Check that button is initially enabled
    expect(refreshButton).toBeEnabled();
    
    // Click the button
    await user.click(refreshButton);

    // Button should be disabled during loading
    await waitFor(() => {
      expect(refreshButton).toBeDisabled();
    });

    // And eventually re-enable
    await waitFor(() => {
      expect(refreshButton).toBeEnabled();
    });
  });

  it('renders detailed data table', async () => {
    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dados Detalhados')).toBeInTheDocument();
    });

    // Should show table with hourly data
    expect(screen.getByText('Horário')).toBeInTheDocument();
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
  });
});