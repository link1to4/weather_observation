export interface AirQualityStation {
  id: string;
  name: string;
  county: string;
  aqi: number | null;
  pm25: number | null;
  status: string;
  publishTime: string;
  latitude: number;
  longitude: number;
}

export const AQI_LEVELS = [
  { max: 50, label: '良好', color: '#58b368', ink: '#102e16', range: '0–50' },
  { max: 100, label: '普通', color: '#f2d44c', ink: '#423600', range: '51–100' },
  { max: 150, label: '對敏感族群不健康', color: '#ef9244', ink: '#422000', range: '101–150' },
  { max: 200, label: '對所有族群不健康', color: '#db4b52', ink: '#ffffff', range: '151–200' },
  { max: 300, label: '非常不健康', color: '#9560a8', ink: '#ffffff', range: '201–300' },
  { max: Infinity, label: '危害', color: '#7e244b', ink: '#ffffff', range: '301+' },
];

export function getAqiLevel(aqi: number | null) {
  return aqi === null || !Number.isFinite(aqi) || aqi < 0
    ? { label: '無資料', color: '#a0a9ad', ink: '#18252a', range: '—' }
    : AQI_LEVELS.find(level => aqi <= level.max)!;
}

export function parseAirQualityRecords(records: Record<string, unknown>[]): AirQualityStation[] {
  const number = (value: unknown): number | null => {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  return records.flatMap((record) => {
    const latitude = number(record.latitude);
    const longitude = number(record.longitude);
    if (latitude === null || longitude === null || latitude === 0 || longitude === 0 || latitude > 90 || longitude > 180) return [];
    return [{
      id: String(record.siteid ?? ''),
      name: String(record.sitename ?? ''),
      county: String(record.county ?? ''),
      aqi: number(record.aqi),
      pm25: number(record['pm2.5']),
      status: String(record.status ?? ''),
      publishTime: String(record.publishtime ?? ''),
      latitude,
      longitude,
    }];
  });
}

export function findNearestAirQualityStation(stations: AirQualityStation[], latitude: number, longitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  let nearest: { station: AirQualityStation; distanceKm: number } | null = null;
  for (const station of stations) {
    const a = Math.sin(radians(station.latitude - latitude) / 2) ** 2
      + Math.cos(radians(latitude)) * Math.cos(radians(station.latitude))
      * Math.sin(radians(station.longitude - longitude) / 2) ** 2;
    const distanceKm = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { station, distanceKm };
  }
  return nearest;
}
