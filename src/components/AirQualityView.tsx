import { useMemo, useState } from 'react';
import { Wind, RefreshCw, Search, ArrowLeft } from 'lucide-react';
import { AirQualityStation, AQI_LEVELS, getAqiLevel } from '../airQuality';
import WeatherMap from './WeatherMap';

interface Props {
  stations: AirQualityStation[];
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRefresh: () => void;
}

const weatherStations = [];

export default function AirQualityView({ stations, loading, error, onBack, onRefresh }: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [metric, setMetric] = useState<'aqi' | 'pm25'>('aqi');
  const [sheetOpen, setSheetOpen] = useState(false);
  const filtered = useMemo(() => stations.filter(st => `${st.name}${st.county}${st.id}`.includes(query.trim())), [stations, query]);
  const selected = stations.find(st => st.id === selectedId);
  const select = (id: string) => { setSelectedId(id); setSheetOpen(true); };
  const latestTime = stations.map(st => st.publishTime).filter(Boolean).sort().at(-1);
  const level = getAqiLevel(selected?.aqi ?? null);

  return <div className={`weather-app air-view ${sheetOpen ? 'sheet-open' : ''}`}>
    <WeatherMap stations={weatherStations} selectedStationId={selectedId} onSelectStation={select} airQualityStations={filtered} airMetric={metric} />
    <header className="map-topbar air-topbar">
      <div className="air-view-controls">
        <button className="view-switch" onClick={onBack}><ArrowLeft size={16} /> 氣象觀測</button>
        <div className="air-metric-toggle" role="group" aria-label="空品顯示數值">
          <button aria-pressed={metric === 'aqi'} onClick={() => setMetric('aqi')}>AQI</button>
          <button aria-pressed={metric === 'pm25'} onClick={() => setMetric('pm25')}>PM2.5 <small>μg/m³</small></button>
        </div>
      </div>
      <label className="search-form air-search"><Search size={18} /><input type="search" aria-label="搜尋空品測站" placeholder="搜尋空品測站、縣市或代碼" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </header>
    <aside className="weather-sheet" aria-label="空氣品質資訊">
      <button className="sheet-handle" aria-expanded={sheetOpen} aria-controls="air-details" onClick={() => setSheetOpen(!sheetOpen)}><span /><b>{sheetOpen ? '▾ 收合空品資訊' : `▴ 查看空品資訊 · ${filtered.length} 站`}</b></button>
      <div className="sheet-body" id="air-details">
        <div className="side-brand"><h1><Wind size={25} /> 全臺空氣品質</h1><p>環境部測站實測 · AQI / PM2.5</p></div>
        <button className="update-badge" disabled={loading} onClick={onRefresh}><RefreshCw size={13} className={loading ? 'spin' : ''} />{loading ? '正在更新空品資料…' : '更新空品資料'}</button>
        <p className="muted air-timestamp">資料時間 {latestTime || '—'} · 每小時更新</p>
        {error && <div className="notice error" role="alert">{error}<button onClick={onRefresh}>重試</button></div>}
        {selected ? <section className="detail-card air-selected" aria-label="空品測站詳情">
          <div className="station-heading"><h2>{selected.name} 空品測站</h2><span className="tag">{selected.county}</span></div>
          <div className="air-reading" style={{ background: level.color, color: level.ink }}><div><small>AQI</small><strong>{selected.aqi ?? '—'}</strong></div><b>{level.label}</b></div>
          <dl className="key-values"><dt>PM2.5</dt><dd>{selected.pm25 ?? '—'} μg/m³</dd><dt>發布時間</dt><dd>{selected.publishTime || '—'}</dd><dt>測站代碼</dt><dd>{selected.id}</dd></dl>
        </section> : <p className="empty">點選地圖色塊或下方測站，查看空氣品質。</p>}
        <section className="detail-card air-scale" aria-label="AQI 狀態圖例">
          <h3>AQI 空氣品質分級</h3>
          <div className="air-scale-bar">{AQI_LEVELS.map(item => <i key={item.label} style={{ background: item.color }} />)}</div>
          {AQI_LEVELS.map(item => <div className="air-scale-row" key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><b>{item.range}</b><small>{stations.filter(st => st.aqi !== null && getAqiLevel(st.aqi).label === item.label).length} 站</small></div>)}
          <p className="muted">地圖色彩代表 AQI 狀態；數字可切換 AQI 或 PM2.5。灰色為 AQI 無資料。</p>
        </section>
        <section className="air-station-list" aria-label="空品測站列表"><h3 className="section-title">空品測站 <small>{filtered.length} 站</small></h3>
          {!loading && filtered.length === 0 && <p className="empty">找不到空品測站，請調整搜尋條件。</p>}
          {filtered.map(st => { const state = getAqiLevel(st.aqi); return <button className="air-station-row" key={st.id} aria-pressed={selectedId === st.id} onClick={() => select(st.id)}><span className="air-list-value" style={{ background: state.color, color: state.ink }}>{metric === 'aqi' ? st.aqi ?? '—' : st.pm25 ?? '—'}</span><span><b>{st.name}</b><small>{st.county} · {state.label}</small></span><span className="air-list-unit">{metric === 'aqi' ? 'AQI' : 'μg/m³'}</span></button>; })}
        </section>
        <footer className="data-note"><p>資料來源：<a href="https://data.moenv.gov.tw/dataset/detail/AQX_P_432" target="_blank" rel="noreferrer">環境部環境資料開放平臺</a></p><p>色塊表示測站位置與實測狀態；觀測資料可能延遲。</p></footer>
      </div>
    </aside>
    <div className="air-map-key"><b>{metric === 'aqi' ? 'AQI' : 'PM2.5 · μg/m³'}</b><span>{AQI_LEVELS.map(item => <i key={item.label} title={`${item.label} ${item.range}`} style={{ background: item.color }} />)}</span><small>色彩：AQI 狀態 · 點選測站查看</small></div>
  </div>;
}
