import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Filter, Grid, List, ArrowUpDown } from 'lucide-react';
import { httpClient } from '@/lib/http-client';
import { useDebounce } from '@/hooks/use-debounce';

interface Country {
  name: {
    common: string;
    official: string;
  };
  region: string;
  capital?: string[];
  population: number;
  flags: {
    png: string;
    alt: string;
  };
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string }>;
}

const ITEMS_PER_PAGE = 20;
const REGIONS = ['All', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

export const Catalogo = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'population'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const fetchCountries = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await httpClient.get<Country[]>('https://restcountries.com/v3.1/all?fields=name,region,capital,population,flags,languages,currencies,cca2,cca3');
      const data = 'data' in response ? response.data : response;
      setCountries(data);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Countries API error:', err);
      setError(err.response?.status === 429 ? 'Limite de requisições atingido. Tente novamente em alguns minutos.' : 'Erro ao carregar países.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  // Filter and sort countries
  const filteredAndSortedCountries = useMemo(() => {
    let filtered = countries.filter(country => {
      const matchesSearch = country.name.common.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesRegion = selectedRegion === 'All' || country.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.common.localeCompare(b.name.common);
      } else if (sortBy === 'population') {
        comparison = a.population - b.population;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [countries, debouncedSearchTerm, selectedRegion, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCountries.length / ITEMS_PER_PAGE);
  const paginatedCountries = filteredAndSortedCountries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedRegion('All');
    setCurrentPage(1);
  };

  const toggleSort = (field: 'name' | 'population') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatPopulation = (population: number) => {
    return new Intl.NumberFormat('pt-BR').format(population);
  };

  const getLanguages = (languages?: Record<string, string>) => {
    if (!languages) return 'N/A';
    return Object.values(languages).slice(0, 3).join(', ');
  };

  const getCurrency = (currencies?: Record<string, { name: string }>) => {
    if (!currencies) return 'N/A';
    return Object.values(currencies)[0]?.name || 'N/A';
  };

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Catálogo de Países</h1>
          <ErrorState
            title="Erro ao carregar países"
            message={error}
            onRetry={fetchCountries}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Países</h1>
          <p className="text-muted-foreground">Explore informações sobre países do mundo</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros e Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Buscar por nome</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Digite o nome do país..."
                    className="pl-10"
                    data-testid="catalogo-search"
                  />
                </div>
              </div>

              <div className="md:w-48">
                <Label>Região</Label>
                <Select value={selectedRegion} onValueChange={handleRegionChange} data-testid="catalogo-region">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region === 'All' ? 'Todas as regiões' : region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={handleClearFilters} variant="outline">
                  Limpar
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="view-mode"
                    checked={viewMode === 'cards'}
                    onCheckedChange={(checked) => setViewMode(checked ? 'cards' : 'table')}
                    data-testid="catalogo-view-toggle"
                  />
                  <Label htmlFor="view-mode" className="flex items-center gap-2">
                    {viewMode === 'table' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                    {viewMode === 'table' ? 'Tabela' : 'Cards'}
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label>Ordenar por:</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('name')}
                    className="gap-2"
                  >
                    Nome
                    {sortBy === 'name' && <ArrowUpDown className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('population')}
                    className="gap-2"
                  >
                    População
                    {sortBy === 'population' && <ArrowUpDown className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredAndSortedCountries.length} países encontrados
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <LoadingState type={viewMode} rows={ITEMS_PER_PAGE} />
        ) : filteredAndSortedCountries.length === 0 ? (
          <EmptyState
            icon="search"
            title="Nenhum país encontrado"
            message="Tente ajustar os filtros de busca ou região."
            action={
              <Button onClick={handleClearFilters} variant="outline">
                Limpar filtros
              </Button>
            }
          />
        ) : viewMode === 'table' ? (
          <Card data-testid="catalogo-table">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bandeira</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Capital</TableHead>
                    <TableHead>População</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCountries.map((country) => (
                    <TableRow key={country.name.common}>
                      <TableCell>
                        <img
                          src={country.flags.png}
                          alt={country.flags.alt || `Bandeira de ${country.name.common}`}
                          className="w-8 h-6 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {country.name.common}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{country.region}</Badge>
                      </TableCell>
                      <TableCell>
                        {country.capital?.[0] || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {formatPopulation(country.population)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="catalogo-cards">
            {paginatedCountries.map((country) => (
              <Card key={country.name.common} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={country.flags.png}
                    alt={country.flags.alt || `Bandeira de ${country.name.common}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{country.name.common}</CardTitle>
                  <CardDescription>{country.name.official}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Região:</span>
                    <Badge variant="secondary">{country.region}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Capital:</span>
                    <span className="text-sm">{country.capital?.[0] || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">População:</span>
                    <span className="text-sm font-medium">{formatPopulation(country.population)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Idiomas:</span>
                    <span className="text-sm text-right">{getLanguages(country.languages)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Moeda:</span>
                    <span className="text-sm">{getCurrency(country.currencies)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between" data-testid="catalogo-pagination">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"  
                size="sm"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};