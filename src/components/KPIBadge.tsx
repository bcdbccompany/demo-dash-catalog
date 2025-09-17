import { cn } from "@/lib/utils";

interface KPIBadgeProps {
  label: string;
  value: number | string;
  unit?: string;
  variant?: 'neutral' | 'positive' | 'negative';
  isLoading?: boolean;
  testId?: string;
}

export const KPIBadge = ({ 
  label, 
  value, 
  unit, 
  variant = 'neutral', 
  isLoading = false,
  testId 
}: KPIBadgeProps) => {
  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border bg-card">
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-skeleton rounded"></div>
          <div className="h-8 bg-muted animate-skeleton rounded"></div>
        </div>
      </div>
    );
  }

  const variantStyles = {
    neutral: 'border-border bg-card text-foreground',
    positive: 'border-border bg-card text-foreground',
    negative: 'border-border bg-card text-foreground',
  };

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-custom",
        variantStyles[variant]
      )}
      role="status"
      aria-label={`${label}: ${value}${unit || ''}`}
      data-testid={testId}
    >
      <p className="text-sm font-medium text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
};