import { AirQualityStation, AQI_LEVELS, getAqiLevel } from '../airQuality';
import AirQualityTrend from './AirQualityTrend';

export function AirQualityDetails({ station }: { station: AirQualityStation }) {
  const level = getAqiLevel(station.aqi);
  return <><section className="detail-card air-selected" aria-label="空品測站詳情">
    <div className="station-heading"><h2>{station.name} 空品測站</h2><span className="tag">{station.county}</span></div>
    <div className="air-reading" style={{ background: level.color, color: level.ink }}><div><small>AQI</small><strong>{station.aqi ?? '—'}</strong></div><b>{level.label}</b></div>
    <dl className="key-values"><dt>PM2.5</dt><dd>{station.pm25 ?? '—'} μg/m³</dd><dt>發布時間</dt><dd>{station.publishTime || '—'}</dd><dt>測站代碼</dt><dd>{station.id}</dd></dl>
  </section><AirQualityTrend station={station} /></>;
}

interface Props {
  stations: AirQualityStation[];
  selectedId: string;
  metric: 'aqi' | 'pm25';
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export function AirQualityOverview({ stations, selectedId, metric, loading, error, onSelect, onRefresh }: Props) {
  return <section className="detail-card air-scale" aria-label="空氣品質概況">
    <h3>AQI 空氣品質分級</h3>
    <div className="air-scale-bar">{AQI_LEVELS.map(item => <i key={item.label} style={{ background: item.color }} />)}</div>
    {AQI_LEVELS.map(item => <div className="air-scale-row" key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><b>{item.range}</b><small>{stations.filter(st => st.aqi !== null && getAqiLevel(st.aqi).label === item.label).length} 站</small></div>)}
    <p className="muted">圓點為氣象站，方塊為空品站。空品色彩依 AQI 分級，灰色為無資料。</p>
    {error && <p role="alert">{error}</p>}
    <button className="outline-button" onClick={onRefresh} disabled={loading}>{loading ? '正在更新空品資料…' : '更新空品資料'}</button>
    <h3 className="section-title">空品測站 <small>{stations.length} 站</small></h3>
    <div className="station-list">
      {stations.map(st => { const value = metric === 'aqi' ? st.aqi : st.pm25; const state = getAqiLevel(value === null ? null : st.aqi); return <button className="air-station-row" key={st.id} aria-pressed={selectedId === st.id} onClick={() => onSelect(st.id)}><span className="air-list-value" style={{ background: state.color, color: state.ink }}>{value ?? '—'}</span><span><b>{st.name}</b><small>{st.county} · {state.label}</small></span><span className="air-list-unit">{metric === 'aqi' ? 'AQI' : 'μg/m³'}</span></button>; })}
      {!loading && !stations.length && <p className="empty">沒有符合條件的空品測站。</p>}
    </div>
  </section>;
}
