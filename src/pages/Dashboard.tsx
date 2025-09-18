import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { KPIBadge } from '@/components/KPIBadge';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, Thermometer } from 'lucide-react';
import { httpClient, cachedRequest } from '@/lib/http-client';

interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
}

interface ChartDataPoint {
  time: string;
  temperature: number;
  hour: string;
}

const cities = [
  { name: 'São Paulo', lat: -23.55, lon: -46.63 },
  { name: 'Rio de Janeiro', lat: -22.91, lon: -43.17 },
  { name: 'Recife', lat: -8.05, lon: -34.88 },
  { name: 'Brasília', lat: -15.78, lon: -47.93 },
];

export const Dashboard = () => {
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherData = async (city: typeof cities[0]) => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = `weather-${city.lat}-${city.lon}`;
      
      const response = await cachedRequest(cacheKey, () =>
        httpClient.get<WeatherData>(
          `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&hourly=temperature_2m&timezone=America%2FSao_Paulo&forecast_days=1`
        )
      );

      const data = 'data' in response ? response.data : response;
      setWeatherData(data);

      // Process data for chart (first 24 hours)
      const processedData = data.hourly.time.slice(0, 24).map((time, index) => ({
        time,
        temperature: data.hourly.temperature_2m[index],
        hour: new Date(time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }));

      setChartData(processedData);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Weather API error:', err);
      setError(err.response?.status === 429 ? 'Limite de requisições atingido. Tente novamente em alguns minutos.' : 'Erro ao carregar dados meteorológicos.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData(selectedCity);
  }, [selectedCity]);

  const handleCityChange = (cityName: string) => {
    const city = cities.find(c => c.name === cityName);
    if (city) {
      setSelectedCity(city);
    }
  };

  const handleRefresh = () => {
    fetchWeatherData(selectedCity);
  };

  // Calculate KPIs
  const temperatures = weatherData?.hourly.temperature_2m.slice(0, 24) || [];
  const avgTemp = temperatures.length ? (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1) : '0';
  const maxTemp = temperatures.length ? Math.max(...temperatures).toFixed(1) : '0';
  const minTemp = temperatures.length ? Math.min(...temperatures).toFixed(1) : '0';

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Dashboard de Clima</h1>
          </div>
          <ErrorState
            title="Erro ao carregar dados"
            message={error}
            onRetry={handleRefresh}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard de Clima</h1>
            <p className="text-muted-foreground">Monitoramento em tempo real</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedCity.name} onValueChange={handleCityChange}>
              <SelectTrigger className="w-48" data-testid="dash-city">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.name} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading}
              variant="outline"
              size="sm"
              data-testid="dash-refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPIBadge
            label="Temperatura Média"
            value={avgTemp}
            unit="°C"
            variant="neutral"
            isLoading={isLoading}
            testId="dash-kpi-avg"
          />
          <KPIBadge
            label="Máxima"
            value={maxTemp}
            unit="°C"
            variant="positive"
            isLoading={isLoading}
            testId="dash-kpi-max"
          />
          <KPIBadge
            label="Mínima"
            value={minTemp}
            unit="°C"
            variant="negative"
            isLoading={isLoading}
            testId="dash-kpi-min"
          />
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="w-5 h-5" />
              Temperatura por Hora - {selectedCity.name}
            </CardTitle>
            <CardDescription>
              Últimas 24 horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState type="chart" />
            ) : (
              <div className="h-64" data-testid="dash-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="hour" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}°C`}
                    />
                    <Tooltip 
                      labelFormatter={(label) => `Hora: ${label}`}
                      formatter={(value: any) => [`${value}°C`, 'Temperatura']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Detalhados</CardTitle>
            <CardDescription>
              Primeiras 10 horas do período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState type="table" rows={10} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Horário</th>
                      <th className="text-left py-2 px-4 font-medium">Temperatura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="py-2 px-4">{item.hour}</td>
                        <td className="py-2 px-4">{item.temperature}°C</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};