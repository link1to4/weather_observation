import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Sun, Droplets, CloudRain, Shield } from 'lucide-react';

interface StationItem {
  id: string;
  name: string;
  nameEn: string;
  attribute: string;
  region: string;
  dailyHigh: number | null;
  dailyLow: number | null;
  dailyMean: number | null;
  realtime: {
    stationId: string;
    obsTime: string;
    temperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    todayHigh: number | null;
    todayLow: number | null;
    latitude: number | null;
    longitude: number | null;
    altitude?: number | null;
  } | null;
}

interface WeatherMapProps {
  stations: StationItem[];
  selectedStationId: string;
  onSelectStation: (id: string) => void;
}

const FALLBACK_COORDINATES: Record<string, [number, number]> = {
  '466920': [25.03746, 121.51485], // 臺北
  '466940': [25.13331, 121.74047], // 基隆
  '466910': [25.18258, 121.51733], // 鞍部
  '466930': [25.16244, 121.54453], // 竹子湖
  '466900': [25.16488, 121.44201], // 淡水
  '466881': [25.01458, 121.46231], // 新北
  '466880': [25.01458, 121.46231], // 板橋
  '466850': [25.07111, 121.78119], // 五分山雷達站
  '467050': [25.00667, 121.04753], // 新屋
  '467571': [24.80395, 120.96465], // 新竹
  '467280': [24.60623, 120.79691], // 後龍
  '467770': [24.25603, 120.52251], // 梧棲
  '467490': [24.14574, 120.68413], // 臺中
  '467270': [23.86539, 120.59011], // 田中
  '467650': [23.88126, 120.90807], // 日月潭
  '467530': [23.50812, 120.81326], // 阿里山
  '467480': [23.49593, 120.43283], // 嘉義
  '467290': [23.63944, 120.53164], // 古坑
  '467420': [23.02531, 120.24589], // 永康
  '467410': [22.99318, 120.20404], // 臺南
  '467441': [22.56584, 120.31575], // 高雄
  '467590': [21.94319, 120.79633], // 恆春
  '467780': [23.14139, 120.08278], // 七股
  '467080': [24.76402, 121.75653], // 宜蘭
  '467060': [24.59689, 121.84851], // 蘇澳
  '466990': [23.97513, 121.61327], // 花蓮
  '467610': [23.13733, 121.37344], // 成功
  '467660': [22.75218, 121.15449], // 臺東
  '467540': [22.35514, 120.89314], // 大武
  '467550': [23.48714, 120.95947], // 玉山
  '460020': [23.46831, 120.87364], // 鹿林山
  '466950': [25.62719, 122.07889], // 彭佳嶼
  '467300': [23.25914, 119.66751], // 東吉島
  '467350': [23.56541, 119.56291], // 澎湖
  '467110': [24.40731, 118.28892], // 金門
  '467620': [22.03697, 121.55831], // 蘭嶼
  '467990': [26.16911, 119.92348], // 馬祖
};

const MANNED_STATIONS_ALTITUDE: Record<string, number> = {
  '466920': 5.3,     // 臺北
  '466940': 26.7,    // 基隆
  '466910': 825.8,   // 鞍部
  '466930': 607.6,   // 竹子湖
  '466900': 19.0,    // 淡水
  '466881': 9.7,     // 新北
  '466880': 9.7,     // 板橋
  '466850': 757.0,   // 五分山雷達站
  '467050': 20.6,    // 新屋
  '467571': 26.9,    // 新竹
  '467280': 27.0,    // 後龍
  '467770': 31.7,    // 梧棲
  '467490': 84.4,    // 臺中
  '467270': 48.6,    // 田中
  '467650': 1017.5,  // 日月潭
  '467530': 2200.4,  // 阿里山
  '467480': 26.9,    // 嘉義
  '467290': 135.0,   // 古坑
  '467420': 12.0,    // 永康
  '467410': 13.9,    // 臺南
  '467441': 2.3,     // 高雄
  '467590': 22.3,    // 恆春
  '467780': 2.0,     // 七股
  '467080': 7.2,     // 宜蘭
  '467060': 24.8,    // 蘇澳
  '466990': 16.0,    // 花蓮
  '467610': 33.5,    // 成功
  '467660': 9.0,     // 臺東
  '467540': 8.1,     // 大武
  '467550': 3844.8,  // 玉山
  '460020': 2862.0,  // 鹿林山
  '466950': 99.0,    // 彭佳嶼
  '467300': 43.0,    // 東吉島
  '467350': 10.7,    // 澎湖
  '467110': 48.2,    // 金門
  '467620': 324.0,   // 蘭嶼
  '467990': 97.8,    // 馬祖
};

function getTemperatureColor(temp: number | null): string {
  if (temp === null) return '#71717a'; // gray-500
  if (temp >= 38) return '#8126c0';      // 紫色 (>= 38°C)
  if (temp >= 37) return '#9a004c';      // 深桃紅 (37°C ~ 38°C)
  if (temp >= 35) return '#b30000';      // 深紅 (35°C ~ 37°C)
  if (temp >= 33) return '#ff0000';      // 鮮紅 (33°C ~ 35°C)
  if (temp >= 31) return '#ff5500';      // 橘紅 (31°C ~ 33°C)
  if (temp >= 29) return '#ff8c00';      // 深橘 (29°C ~ 31°C)
  if (temp >= 27) return '#ffb300';      // 橙黃/淺橘 (27°C ~ 29°C)
  if (temp >= 25) return '#ffebad';      // 鵝黃/米白 (25°C ~ 27°C)
  if (temp >= 23) return '#d1f2a5';      // 嫩綠/淺黃綠 (23°C ~ 25°C)
  if (temp >= 21) return '#9ade73';      // 淺綠 (21°C ~ 23°C)
  if (temp >= 19) return '#5cd65c';      // 草綠 (19°C ~ 21°C)
  if (temp >= 17) return '#2eb82e';      // 綠色 (17°C ~ 19°C)
  if (temp >= 15) return '#1f7a1f';      // 深綠 (15°C ~ 17°C)
  if (temp >= 13) return '#145214';      // 墨綠 (13°C ~ 15°C)
  if (temp >= 11) return '#0a290a';      // 極深綠 (11°C ~ 13°C)
  if (temp >= 9)  return '#ade8f4';      // 粉藍/極淺藍 (9°C ~ 11°C)
  if (temp >= 7)  return '#48cae4';      // 淺天藍 (7°C ~ 9°C)
  if (temp >= 5)  return '#0096c7';      // 天藍 (5°C ~ 7°C)
  if (temp >= 3)  return '#0077b6';      // 藍色 (3°C ~ 5°C)
  if (temp >= 1)  return '#023e8a';      // 深藍 (1°C ~ 3°C)
  if (temp >= -1) return '#03045e';      // 暗藍 (-1°C ~ 1°C)
  return '#120136';                      // 極暗紫藍 (< -1°C)
}

export default function WeatherMap({ stations, selectedStationId, onSelectStation }: WeatherMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'streets'>('dark');

  // Track manual selections to prevent zoom loops
  const lastSelectedIdRef = useRef<string>('');

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let resizeObserver: ResizeObserver | null = null;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.7, 121.0], // Center of Taiwan
        zoom: 7.5,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
      markersGroupRef.current = L.layerGroup().addTo(map);

      // Trigger automatic layout recalculation shortly after mounting
      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      // Watch container for dimension changes and auto-correct Leaflet sizing
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  // 2. Change Tile Layer (Dark vs Light Streets)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const url = mapStyle === 'dark' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const attribution = mapStyle === 'dark'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    L.tileLayer(url, {
      attribution,
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map);

  }, [mapStyle]);

  // 3. Render Custom Markers
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    stations.forEach((station) => {
      // Resolve coordinates
      const lat = station.realtime?.latitude ?? FALLBACK_COORDINATES[station.id]?.[0];
      const lng = station.realtime?.longitude ?? FALLBACK_COORDINATES[station.id]?.[1];

      if (!lat || !lng) return;

      const temp = station.realtime?.temperature ?? station.dailyHigh ?? null;
      const isSelected = station.id === selectedStationId;
      const altitude = station.realtime?.altitude ?? MANNED_STATIONS_ALTITUDE[station.id] ?? null;

      const color = getTemperatureColor(temp);

      const marker = L.circleMarker([lat, lng], {
        radius: isSelected ? 11 : 7.5,
        fillColor: color,
        fillOpacity: 0.95,
        color: isSelected ? '#ffffff' : '#18181b',
        weight: isSelected ? 3.5 : 1.5,
      });

      // Hover Tooltip content
      const tooltipHtml = `
        <div class="px-3 py-2 text-xs text-zinc-100 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-lg select-none min-w-[140px] font-sans">
          <div class="font-bold text-white border-b border-zinc-800 pb-1 mb-1.5 flex justify-between items-center gap-2">
            <span>${station.name}</span>
            <span class="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-zinc-500">#${station.id}</span>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between items-center gap-4">
              <span class="text-zinc-500">觀測氣溫</span>
              <span class="font-mono font-bold text-amber-400 text-sm">${temp !== null ? `${temp.toFixed(1)}°C` : '--'}</span>
            </div>
            <div class="flex justify-between items-center gap-4">
              <span class="text-zinc-500">測站海拔</span>
              <span class="font-mono font-medium text-zinc-300">${altitude !== null ? `${altitude.toFixed(0)} m` : '-- m'}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipHtml, {
        permanent: false,
        direction: 'top',
        opacity: 0.98,
        offset: [0, -6],
        className: 'custom-leaflet-tooltip'
      });

      const popupHtml = tooltipHtml;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'custom-leaflet-popup',
        offset: [0, -6],
      });

      marker.on('click', () => {
        lastSelectedIdRef.current = station.id;
        onSelectStation(station.id);
      });

      markersGroup.addLayer(marker);
    });
  }, [stations, selectedStationId, mapStyle]);

  // 4. Smooth Panning on Station Change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedStationId) return;

    const selectedStation = stations.find((st) => st.id === selectedStationId);
    if (!selectedStation) return;

    const lat = selectedStation.realtime?.latitude ?? FALLBACK_COORDINATES[selectedStationId]?.[0];
    const lng = selectedStation.realtime?.longitude ?? FALLBACK_COORDINATES[selectedStationId]?.[1];

    if (lat && lng) {
      // Smoothly pan and center the station
      map.setView([lat, lng], 10, {
        animate: true,
        duration: 1.2,
      });

      // Find marker in group and open its popup
      const markersGroup = markersGroupRef.current;
      if (markersGroup) {
        markersGroup.eachLayer((layer: any) => {
          const latlng = layer.getLatLng();
          if (Math.abs(latlng.lat - lat) < 0.001 && Math.abs(latlng.lng - lng) < 0.001) {
            layer.openPopup();
          }
        });
      }
    }
  }, [selectedStationId, stations]);

  // Handle map centering to Taiwan
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([23.7, 121.0], 7.5, {
        animate: true,
        duration: 1,
      });
    }
  };

  return (
    <div className="bg-[#121214] border border-zinc-900 rounded-3xl p-4 sm:p-5 shadow-sm relative overflow-hidden flex flex-col h-[70vh] md:h-[calc(100vh-220px)] min-h-[450px] sm:min-h-[550px] md:min-h-[650px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              全臺即時氣溫 OpenStreetMap 地圖分佈
            </h3>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            整合中央氣象署各氣象測站即時經緯度與最新氣溫觀測，點擊測站即可定位切換
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Map style toggles */}
          <div className="inline-flex items-center bg-zinc-950 border border-zinc-850 p-1 rounded-xl">
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                mapStyle === 'dark'
                  ? 'bg-zinc-850 text-amber-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              暗色主題
            </button>
            <button
              onClick={() => setMapStyle('streets')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                mapStyle === 'streets'
                  ? 'bg-zinc-850 text-amber-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              明亮彩色
            </button>
          </div>

          <button
            onClick={handleRecenter}
            className="px-3 py-1.5 text-[11px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-850 active:bg-zinc-800 transition-all cursor-pointer shadow-sm"
          >
            全臺灣視角
          </button>
        </div>
      </div>

      {/* Map Element */}
      <div className="relative flex-1 rounded-2xl border border-zinc-900 overflow-hidden min-h-[250px] sm:min-h-[350px] md:min-h-[450px]">
        <div ref={mapContainerRef} className="w-full h-full min-h-[250px] sm:min-h-[350px] md:min-h-[450px] z-0 bg-[#09090b]" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[999] bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 p-3.5 rounded-2xl shadow-xl flex-col gap-1.5 select-none w-[115px] hidden sm:flex">
          <div className="text-[10px] font-bold text-zinc-300 border-b border-zinc-800/50 pb-1 mb-1 text-center">
            溫度分布色階
            <span className="text-[8px] text-zinc-500 block font-normal mt-0.5">攝氏(°C)</span>
          </div>
          <div className="flex items-stretch h-[220px] justify-center">
            {/* Gradient vertical strip */}
            <div 
              className="w-2.5 rounded-full border border-zinc-800/60 shadow-inner" 
              style={{ 
                background: 'linear-gradient(to bottom, #8126c0, #9a004c, #b30000, #ff0000, #ff5500, #ff8c00, #ffb300, #ffebad, #d1f2a5, #9ade73, #5cd65c, #2eb82e, #1f7a1f, #145214, #0a290a, #ade8f4, #48cae4, #0096c7, #0077b6, #023e8a, #03045e, #120136)' 
              }} 
            />
            {/* Numerical Ticks aligned next to the bar */}
            <div className="flex flex-col justify-between pl-2 text-[9px] font-mono font-bold text-zinc-400 leading-none">
              <span>38</span>
              <span>35</span>
              <span>31</span>
              <span>27</span>
              <span>23</span>
              <span>19</span>
              <span>15</span>
              <span>11</span>
              <span>7</span>
              <span>3</span>
              <span>-1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
