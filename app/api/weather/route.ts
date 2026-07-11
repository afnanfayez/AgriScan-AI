import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getWeather, getWeatherForCoordinates } from '@/services/weather-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location') || user?.location || 'Central Valley, CA';
    const latitude = searchParams.get('lat');
    const longitude = searchParams.get('lon');
    const isMetric = user?.units === 'metric';

    const result = latitude && longitude
      ? await getWeatherForCoordinates(Number(latitude), Number(longitude), isMetric)
      : await getWeather(location, isMetric);

    return NextResponse.json({
      success: true,
      location: result.location,
      resolvedLocation: result.resolvedLocation,
      coordinates: result.coordinates,
      source: result.source,
      current: result.current,
      forecast: result.forecast,
    });
  } catch (error: any) {
    console.error('Weather error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Weather data unavailable' }, { status: 502 });
  }
}
