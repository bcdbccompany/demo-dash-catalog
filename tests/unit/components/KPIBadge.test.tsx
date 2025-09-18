import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KPIBadge } from '@/components/KPIBadge';

describe('KPIBadge', () => {
  it('renders label and value correctly', () => {
    render(
      <KPIBadge 
        label="Temperature" 
        value="25.5" 
        unit="°C" 
        testId="temp-badge"
      />
    );

    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('25.5')).toBeInTheDocument();
    expect(screen.getByText('°C')).toBeInTheDocument();
    expect(screen.getByTestId('temp-badge')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(
      <KPIBadge 
        label="Average Temperature" 
        value="23.4" 
        unit="°C"
      />
    );

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Average Temperature: 23.4°C');
  });

  it('renders without unit when not provided', () => {
    render(
      <KPIBadge 
        label="Count" 
        value="150"
      />
    );

    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.queryByText('°C')).not.toBeInTheDocument();
  });

  it('shows loading state with skeleton', () => {
    const { container } = render(
      <KPIBadge 
        label="Temperature" 
        value="25.5" 
        unit="°C" 
        isLoading={true}
      />
    );

    expect(screen.queryByText('Temperature')).not.toBeInTheDocument();
    expect(screen.queryByText('25.5')).not.toBeInTheDocument();
    
    // Check for skeleton elements
    const skeletons = container.querySelectorAll('.animate-skeleton');
    expect(skeletons).toHaveLength(2);
  });

  it('applies correct variant styling', () => {
    const { rerender } = render(
      <KPIBadge 
        label="Positive" 
        value="100" 
        variant="positive"
        testId="positive-badge"
      />
    );

    expect(screen.getByTestId('positive-badge')).toHaveClass('text-foreground');

    rerender(
      <KPIBadge 
        label="Negative" 
        value="-50" 
        variant="negative"
        testId="negative-badge"
      />
    );

    expect(screen.getByTestId('negative-badge')).toHaveClass('text-foreground');

    rerender(
      <KPIBadge 
        label="Neutral" 
        value="0" 
        variant="neutral"
        testId="neutral-badge"
      />
    );

    expect(screen.getByTestId('neutral-badge')).toHaveClass('text-foreground');
  });
});