// ============================================================
// SIDERUM – Geocoding Utility
// Uses Nominatim (OpenStreetMap) for free geocoding
// ============================================================

export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SIDERUM-App/1.0',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) return [];
    const data = await response.json();

    return data.map((item: any) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality,
      country: item.address?.country,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SIDERUM-App/1.0',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    const data = await response.json();

    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
    const country = data.address?.country || '';

    if (city && country) return `${city}, ${country}`;
    if (country) return country;
    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  } catch {
    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  }
}
