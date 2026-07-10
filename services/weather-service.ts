export interface WeatherResult {
  location: string;
  current: {
    temp: number;
    unit: string;
    humidity: number;
    wind: string;
    condition: string;
    soilMoisture: string;
    uvIndex: number;
    blightRisk: 'Low' | 'Medium' | 'High';
    rootRotRisk: 'Low' | 'High';
  };
  forecast: Array<{
    day: string;
    temp: number;
    humidity: number;
    condition: string;
    sporeIndex: number;
  }>;
}

// Generates realistic, highly structured weather data based on the location name.
// This supports the weather widget AND the smart predictive crop alerts.
export function getWeather(location: string, isMetric: boolean): WeatherResult {
  // Deterministic simulation based on location name string length
  const hash = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseTempC = 20 + (hash % 12); // 20 to 32C
  const humidity = 45 + (hash % 40); // 45% to 85%
  const windKmh = 10 + (hash % 20); // 10 to 30 kmh

  const temp = isMetric ? baseTempC : Math.round((baseTempC * 9 / 5) + 32);
  const wind = isMetric ? windKmh : Math.round(windKmh * 0.621371);

  const condition = humidity > 75
    ? 'Humid / Wet'
    : humidity < 55
      ? 'Sunny / Dry'
      : 'Mild / Partially Cloudy';

  // Predictive alert calculation for plant disease risk.
  // High humidity + high temperature is the perfect incubation zone for Late Blight and Mildews.
  const blightRisk = (humidity > 70 && baseTempC > 18) ? 'High' : (humidity > 55) ? 'Medium' : 'Low';
  const rootRotRisk = (humidity > 80) ? 'High' : 'Low';

  const forecast = Array.from({ length: 5 }).map((_, i) => {
    const dayHash = hash + i;
    const dayTempC = baseTempC + (dayHash % 5) - 2;
    const dayHum = humidity + (dayHash % 10) - 5;

    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(new Date().getDay() + i) % 7],
      temp: isMetric ? dayTempC : Math.round((dayTempC * 9 / 5) + 32),
      humidity: Math.min(100, Math.max(0, dayHum)),
      condition: dayHum > 75 ? 'Showers' : dayHum < 55 ? 'Sunny' : 'Cloudy',
      sporeIndex: Math.min(10, Math.round((dayHum * dayTempC) / 200)), // agricultural index (1 to 10 scale)
    };
  });

  return {
    location,
    current: {
      temp,
      unit: isMetric ? '°C' : '°F',
      humidity,
      wind: isMetric ? `${wind} km/h` : `${wind} mph`,
      condition,
      soilMoisture: `${Math.round(40 + (hash % 30))}%`,
      uvIndex: 4 + (hash % 6),
      blightRisk,
      rootRotRisk,
    },
    forecast,
  };
}
