import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { AirQualityStation, AirQualityTrendPoint } from '../airQuality';

const formatTime = (time: string) => new Date(time).toLocaleString('zh-TW', {
  timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export default function AirQualityTrend({ station }: { station: AirQualityStation }) {
  const [points, setPoints] = useState<AirQualityTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPoints([]);
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/air-quality/history?stationId=${encodeURIComponent(station.id)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '無法取得空品趨勢。');
        if (!controller.signal.aborted) setPoints(data.points);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '無法取得空品趨勢。');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchHistory();
    return () => controller.abort();
  }, [station.id, station.publishTime, retry]);

  return <section className="detail-card chart-card" aria-label="空氣品質趨勢">
    <h3>空氣品質趨勢 <small>近 24 小時 · {station.name}</small></h3>
    {loading ? <p className="muted" role="status">正在載入空品趨勢…</p>
      : error ? <p className="chart-error" role="alert">{error}<button className="outline-button" onClick={() => setRetry(value => value + 1)}>重試</button></p>
      : points.length === 0 ? <p className="empty">此測站暫無歷史資料。</p>
      : <>
        <p className="muted">{formatTime(points[0].time)} – {formatTime(points.at(-1)!.time)}（臺灣時間）</p>
        {(['aqi', 'pm25'] as const).map(metric => {
          const name = metric === 'aqi' ? 'AQI' : 'PM2.5';
          return <div className="air-trend" key={metric} role="group" aria-label={`${name} 趨勢圖`}>
            <h4>{name}{metric === 'pm25' && <small> μg/m³</small>}</h4>
            {points.every(point => point[metric] === null) ? <p className="empty">此時段無 {name} 有效測值。</p>
              : <div className="air-trend-chart"><ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fontSize: 9, fill: 'var(--muted)' }} minTickGap={35} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                  <Tooltip labelFormatter={value => formatTime(String(value))} formatter={value => [`${value}${metric === 'pm25' ? ' μg/m³' : ''}`, name]} contentStyle={{ background: 'var(--sheet)', border: '1px solid var(--rule)', borderRadius: 10, color: 'var(--ink)', fontSize: 12 }} />
                  <Line dataKey={metric} name={name} stroke={metric === 'aqi' ? '#0d8f84' : '#5489e3'} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer></div>}
          </div>;
        })}
        <p className="muted">缺測時保留斷線。歷史資料更新可能延遲。</p>
      </>}
  </section>;
}
