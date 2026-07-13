export interface WeatherResult {
  location: string;
  resolvedLocation: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  source: string;
  current: {
    temp: number;
    unit: string;
    humidity: number;
    wind: string;
    condition: string;
    soilMoisture: string;
    rainfall24h: number;
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

interface GeocodingResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

const weatherCodeLabels: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
};

function getCondition(code: number) {
  return weatherCodeLabels[code] || 'Current conditions';
}

function calculateBlightRisk(tempC: number, humidity: number, rainfall24h: number): 'Low' | 'Medium' | 'High' {
  let score = 0;
  if (tempC >= 10 && tempC <= 26) score += 2;
  if (tempC >= 16 && tempC <= 23) score += 1;
  if (humidity >= 90) score += 3;
  else if (humidity >= 80) score += 2;
  else if (humidity >= 70) score += 1;
  if (rainfall24h >= 5) score += 2;
  else if (rainfall24h > 0) score += 1;

  if (score >= 6) return 'High';
  if (score >= 3) return 'Medium';
  return 'Low';
}

function calculateSporeIndex(tempC: number, humidity: number, rainfall: number) {
  const tempFactor = tempC >= 10 && tempC <= 26 ? 3 : 1;
  const humidityFactor = Math.min(4, Math.max(0, Math.round((humidity - 55) / 10)));
  const rainFactor = rainfall >= 5 ? 3 : rainfall > 0 ? 1 : 0;
  return Math.min(10, Math.max(1, tempFactor + humidityFactor + rainFactor));
}

async function resolveLocation(location: string): Promise<GeocodingResult> {
  const candidates = Array.from(new Set([
    location.trim(),
    location.replace(/,\s*[A-Z]{2}\b/g, '').trim(),
    location.split(',')[0]?.trim(),
  ].filter(Boolean)));

  for (const candidate of candidates) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', candidate);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const response = await fetch(url, { next: { revalidate: 60 * 60 } });
    if (!response.ok) {
      throw new Error('Could not resolve location for weather data.');
    }

    const payload = await response.json();
    const result = payload.results?.[0];
    if (result) {
      return result;
    }
  }

  throw new Error(`No weather location found for "${location}".`);
}

async function fetchWeatherForPoint(
  location: string,
  resolvedLocation: string,
  latitude: number,
  longitude: number,
  isMetric: boolean
): Promise<WeatherResult> {
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', String(latitude));
  weatherUrl.searchParams.set('longitude', String(longitude));
  weatherUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index');
  weatherUrl.searchParams.set('hourly', 'rain,soil_moisture_0_to_1cm');
  weatherUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,relative_humidity_2m_mean,rain_sum');
  weatherUrl.searchParams.set('forecast_days', '5');
  weatherUrl.searchParams.set('timezone', 'auto');
  weatherUrl.searchParams.set('wind_speed_unit', isMetric ? 'kmh' : 'mph');
  weatherUrl.searchParams.set('temperature_unit', isMetric ? 'celsius' : 'fahrenheit');

  const response = await fetch(weatherUrl, { next: { revalidate: 15 * 60 } });
  if (!response.ok) {
    throw new Error('Weather provider request failed.');
  }

  const data = await response.json();
  const current = data.current || {};
  const daily = data.daily || {};
  const hourly = data.hourly || {};
  const tempUnit = data.current_units?.temperature_2m || (isMetric ? '°C' : '°F');
  const currentTempC = isMetric
    ? Number(current.temperature_2m)
    : Math.round((Number(current.temperature_2m) - 32) * 5 / 9);
  const rainfall24h = (hourly.rain || []).slice(0, 24).reduce((sum: number, value: number) => sum + Number(value || 0), 0);
  const latestSoilMoisture = (hourly.soil_moisture_0_to_1cm || []).find((value: number | null) => value !== null);
  const humidity = Math.round(Number(current.relative_humidity_2m || 0));
  const blightRisk = calculateBlightRisk(currentTempC, humidity, rainfall24h);
  return {
    location,
    resolvedLocation,
    coordinates: {
      latitude,
      longitude,
    },
    source: 'Open-Meteo live forecast and geocoding',
    current: {
      temp: Math.round(Number(current.temperature_2m)),
      unit: tempUnit,
      humidity,
      wind: `${Math.round(Number(current.wind_speed_10m || 0))} ${data.current_units?.wind_speed_10m || (isMetric ? 'km/h' : 'mph')}`,
      condition: getCondition(Number(current.weather_code)),
      soilMoisture: latestSoilMoisture == null ? 'Unavailable' : `${Math.round(Number(latestSoilMoisture) * 100)}%`,
      rainfall24h: Number(rainfall24h.toFixed(1)),
      uvIndex: Math.round(Number(current.uv_index || 0)),
      blightRisk,
      rootRotRisk: rainfall24h >= 10 || (latestSoilMoisture != null && Number(latestSoilMoisture) >= 0.38) ? 'High' : 'Low',
    },
    forecast: (daily.time || []).map((date: string, index: number) => {
      const dayTemp = Math.round(Number(daily.temperature_2m_max?.[index] || 0));
      const dayTempC = isMetric ? dayTemp : Math.round((dayTemp - 32) * 5 / 9);
      const dayHumidity = Math.round(Number(daily.relative_humidity_2m_mean?.[index] || humidity));
      const dayRain = Number(daily.rain_sum?.[index] || 0);

      return {
        day: new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
        temp: dayTemp,
        humidity: dayHumidity,
        condition: getCondition(Number(daily.weather_code?.[index] || 0)),
        sporeIndex: calculateSporeIndex(dayTempC, dayHumidity, dayRain),
      };
    }),
  };
}

export async function getWeather(location: string, isMetric: boolean): Promise<WeatherResult> {
  const geo = await resolveLocation(location);
  const resolvedLocation = [geo.name, geo.admin1, geo.country].filter(Boolean).join(', ');
  return fetchWeatherForPoint(location, resolvedLocation, geo.latitude, geo.longitude, isMetric);
}

export async function getWeatherForCoordinates(latitude: number, longitude: number, isMetric: boolean): Promise<WeatherResult> {
  return fetchWeatherForPoint(
    'Device location',
    `Device location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
    latitude,
    longitude,
    isMetric
  );
}
