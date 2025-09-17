import { Search, FileX, Database } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'search' | 'file' | 'database';
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({
  icon = 'search',
  title = 'Nenhum resultado encontrado',
  message = 'Tente ajustar os filtros ou fazer uma nova busca.',
  action,
}: EmptyStateProps) => {
  const icons = {
    search: Search,
    file: FileX,
    database: Database,
  };

  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{message}</p>
      
      {action && action}
    </div>
  );
};