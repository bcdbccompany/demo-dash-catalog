import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Catalogo } from '@/pages/Catalogo';
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
  
  // Mock timers for debounce testing
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Catalogo', () => {
  it('renders catalog header and filters', async () => {
    renderWithRouter(<Catalogo />);

    expect(screen.getByText('Catálogo de Países')).toBeInTheDocument();
    expect(screen.getByTestId('catalogo-search')).toBeInTheDocument();
    expect(screen.getByTestId('catalogo-region')).toBeInTheDocument();
  });

  it('loads and displays countries data', async () => {
    renderWithRouter(<Catalogo />);

    await waitFor(() => {
      expect(screen.getByText('Brazil')).toBeInTheDocument();
      expect(screen.getByText('Argentina')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
    });
  });

  it('filters countries by search term with debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter(<Catalogo />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Brazil')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('catalogo-search');
    await user.type(searchInput, 'Brazil');

    // Before debounce - should still show all countries
    expect(screen.getByText('Argentina')).toBeInTheDocument();

    // Advance timers to trigger debounce
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Brazil')).toBeInTheDocument();
      expect(screen.queryByText('Argentina')).not.toBeInTheDocument();
    });
  });

  it('filters countries by region', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Catalogo />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Brazil')).toBeInTheDocument();
    });

    // Open region select
    const regionSelect = screen.getByTestId('catalogo-region');
    await user.click(regionSelect);

    await waitFor(() => {
      expect(screen.getByText('Europe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Europe'));

    await waitFor(() => {
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.queryByText('Brazil')).not.toBeInTheDocument();
    });
  });

  it('toggles between table and cards view', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Catalogo />);

    await waitFor(() => {
      expect(screen.getByTestId('catalogo-view-toggle')).toBeInTheDocument();
    });

    const toggleButton = screen.getByTestId('catalogo-view-toggle');
    
    // Initially should be in table view
    expect(screen.getByTestId('catalogo-table')).toBeInTheDocument();

    // Toggle to cards view
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId('catalogo-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('catalogo-table')).not.toBeInTheDocument();
    });
  });

  it('sorts countries by population', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Catalogo />);

    await waitFor(() => {
      expect(screen.getByText('Brazil')).toBeInTheDocument();
    });

    // Find and click sort button
    const sortButton = screen.getByText(/População/);
    await user.click(sortButton);

    // Nigeria (218M) should be first, then Brazil (215M)
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Nigeria'); // First data row after header
    });
  });

  it('handles pagination correctly', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Catalogo />);

    await waitFor(() => {
      expect(screen.getByTestId('catalogo-pagination')).toBeInTheDocument();
    });

    // With only 5 countries in fixture, pagination buttons should be disabled
    const pagination = screen.getByTestId('catalogo-pagination');
    const nextButton = pagination.querySelector('button:last-child');
    const prevButton = pagination.querySelector('button:first-child');

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('clears filters when clear button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter(<Catalogo />);

    await waitFor(() => {
      expect(screen.getByText('Brazil')).toBeInTheDocument();
    });

    // Apply search filter
    const searchInput = screen.getByTestId('catalogo-search');
    await user.type(searchInput, 'Germany');
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.queryByText('Brazil')).not.toBeInTheDocument();
    });

    // Clear filters
    const clearButton = screen.getByText('Limpar');
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Brazil')).toBeInTheDocument();
      expect(searchInput).toHaveValue('');
    });
  });
});