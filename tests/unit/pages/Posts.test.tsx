import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Posts } from '@/pages/Posts';
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

describe('Posts', () => {
  it('renders posts header and search', async () => {
    renderWithRouter(<Posts />);

    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByTestId('posts-search')).toBeInTheDocument();
  });

  it('loads and displays posts data', async () => {
    renderWithRouter(<Posts />);

    await waitFor(() => {
      expect(screen.getByText('sunt aut facere repellat provident')).toBeInTheDocument();
      expect(screen.getByText('qui est esse')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('searches posts by title', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Posts />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('sunt aut facere repellat provident')).toBeInTheDocument();
    }, { timeout: 10000 });

    const searchInput = screen.getByTestId('posts-search');
    await user.type(searchInput, 'esse');

    await waitFor(() => {
      expect(screen.getByText('qui est esse')).toBeInTheDocument();
      expect(screen.queryByText('sunt aut facere repellat provident')).not.toBeInTheDocument();
    });
  });

  it('renders post form', async () => {
    renderWithRouter(<Posts />);

    await waitFor(() => {
      expect(screen.getByTestId('post-form')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByTestId('post-title')).toBeInTheDocument();
    expect(screen.getByTestId('post-body')).toBeInTheDocument();
    expect(screen.getByTestId('post-author')).toBeInTheDocument();
    expect(screen.getByTestId('post-submit')).toBeInTheDocument();
  });

  it('creates new post', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Posts />);

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByTestId('post-form')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Fill form
    await user.type(screen.getByTestId('post-title'), 'New Test Post');
    await user.type(screen.getByTestId('post-body'), 'This is a test post content');
    
    // Select author
    const authorSelect = screen.getByTestId('post-author');
    await user.click(authorSelect);
    
    await waitFor(() => {
      expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Leanne Graham'));

    // Submit form
    const submitButton = screen.getByTestId('post-submit');
    await user.click(submitButton);

    // Check if new post appears in the list
    await waitFor(() => {
      expect(screen.getByText('New Test Post')).toBeInTheDocument();
    });
  });

  it('handles pagination', async () => {
    renderWithRouter(<Posts />);

    await waitFor(() => {
      expect(screen.getByTestId('posts-pagination')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Check pagination controls
    const pagination = screen.getByTestId('posts-pagination');
    expect(pagination).toBeInTheDocument();
  });
});