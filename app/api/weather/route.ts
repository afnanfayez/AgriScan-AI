import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getWeather } from '@/services/weather-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location') || user?.location || 'Central Valley, CA';
    const isMetric = user?.units === 'metric';

    const result = getWeather(location, isMetric);

    return NextResponse.json({
      success: true,
      location: result.location,
      current: result.current,
      forecast: result.forecast,
    });
  } catch (error: any) {
    console.error('Weather error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
