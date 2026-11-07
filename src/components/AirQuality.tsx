import { AirQualityStation, findNearestAirQualityStation } from '../airQuality';

interface AirQualityProps {
  stations: AirQualityStation[];
  latitude?: number | null;
  longitude?: number | null;
  loading: boolean;
  error: string | null;
}

export default function AirQuality({ stations, latitude, longitude, loading, error }: AirQualityProps) {
  const nearest = latitude != null && longitude != null
    ? findNearestAirQualityStation(stations, latitude, longitude) : null;
  return (
    <section className="detail-card" aria-label="鄰近空氣品質">
      <h3>鄰近空氣品質</h3>
      {loading ? <p className="muted" role="status">空氣品質載入中…</p>
        : error ? <p className="muted" role="status">{error}</p>
        : nearest ? <>
          <p className="muted">{nearest.station.county} {nearest.station.name}空品測站 · 距離 {nearest.distanceKm.toFixed(1)} km</p>
          <dl className="key-values">
            <dt>AQI</dt><dd>{nearest.station.aqi ?? '—'} · {nearest.station.status || '暫無狀態'}</dd>
            <dt>PM2.5</dt><dd>{nearest.station.pm25 ?? '—'} μg/m³</dd>
            <dt>發布時間</dt><dd>{nearest.station.publishTime || '—'}</dd>
          </dl>
          <p className="muted">鄰近測站資料僅供參考，非本氣象站實測。資料每小時更新。</p>
        </> : <p className="muted">{latitude == null || longitude == null ? '氣象站缺少座標，無法配對空品測站。' : '目前無可用的空氣品質資料。'}</p>}
    </section>
  );
}
