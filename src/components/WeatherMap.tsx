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
    }

    return () => {
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

      // Color coding for markers (heatmap effect)
      let colorClass = 'bg-zinc-800 text-zinc-100 border-zinc-700';
      if (temp !== null) {
        if (temp > 33) {
          colorClass = 'bg-rose-500 text-white font-extrabold border-rose-300 shadow-rose-950/40';
        } else if (temp > 28) {
          colorClass = 'bg-amber-500 text-zinc-950 font-extrabold border-amber-300 shadow-amber-950/40';
        } else if (temp > 22) {
          colorClass = 'bg-emerald-500 text-zinc-950 font-extrabold border-emerald-300 shadow-emerald-950/40';
        } else {
          colorClass = 'bg-sky-500 text-white font-extrabold border-sky-300 shadow-sky-950/40';
        }
      }

      const ringClass = isSelected 
        ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-[#121214] scale-110 z-[1000] border-2 font-black' 
        : 'hover:scale-105 hover:z-[999]';

      const iconHtml = `
        <div class="px-2.5 py-1.5 rounded-xl text-[10px] md:text-[11px] font-sans border transition-all duration-200 shadow-lg flex items-center justify-center gap-1.5 whitespace-nowrap ${colorClass} ${ringClass}">
          <span class="font-medium">${station.name}</span>
          <span class="font-mono font-bold">${temp !== null ? `${temp.toFixed(1)}°` : '--'}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-weather-marker',
        iconSize: [100, 28],
        iconAnchor: [50, 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupHtml = `
        <div class="p-4 font-sans text-zinc-100 min-w-[200px] rounded-2xl bg-zinc-950/95 border border-zinc-800 select-none">
          <div class="font-bold text-sm text-white border-b border-zinc-800 pb-2 mb-2 flex justify-between items-center gap-4">
            <span>${station.name} 觀測站</span>
            <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-zinc-400">#${station.id}</span>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between items-center py-0.5">
              <span class="text-zinc-500 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400" />目前溫度</span>
              <span class="font-mono font-bold text-amber-300 text-sm">${station.realtime?.temperature !== null ? `${station.realtime?.temperature?.toFixed(1)}°C` : (station.dailyHigh !== null ? `${station.dailyHigh?.toFixed(1)}°C` : '--')}</span>
            </div>
            <div class="flex justify-between items-center py-0.5">
              <span class="text-zinc-500 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-sky-400" />相對濕度</span>
              <span class="font-mono font-semibold text-sky-400">${station.realtime?.humidity !== null ? `${station.realtime?.humidity}%` : '--'}</span>
            </div>
            <div class="flex justify-between items-center py-0.5">
              <span class="text-zinc-500 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-teal-400" />今日雨量</span>
              <span class="font-mono font-semibold text-teal-400">${station.realtime?.precipitation !== null ? `${station.realtime?.precipitation?.toFixed(1)} mm` : '0.0 mm'}</span>
            </div>
            ${station.realtime?.windSpeed !== null ? `
            <div class="flex justify-between items-center py-0.5">
              <span class="text-zinc-500 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-zinc-400" />風速風向</span>
              <span class="font-mono font-semibold text-zinc-300">${station.realtime?.windSpeed?.toFixed(1)} m/s (${station.realtime?.windDirection ?? ''}°)</span>
            </div>
            ` : ''}
            <div class="flex justify-between text-[10px] text-zinc-500 pt-2 mt-2 border-t border-zinc-900">
              <span class="font-medium px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850">${station.region}</span>
              <span class="font-medium px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850">${station.attribute.replace('署屬', '')}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'custom-leaflet-popup',
        offset: [0, -10],
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
    <div className="bg-[#121214] border border-zinc-900 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col h-full min-h-[550px]">
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
      <div className="relative flex-1 rounded-2xl border border-zinc-900 overflow-hidden h-[450px]">
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#09090b]" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[999] bg-zinc-950/90 backdrop-blur-md border border-zinc-800 px-3.5 py-2.5 rounded-2xl shadow-xl flex flex-col gap-1.5 select-none text-[10px]">
          <span className="font-bold text-zinc-300 mb-0.5">即時氣溫色階</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-rose-500 border border-rose-400 inline-block" />
            <span className="text-zinc-400 font-mono">酷熱 (&gt; 33°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-500 border border-amber-400 inline-block" />
            <span className="text-zinc-400 font-mono">炎熱 (28°C ~ 33°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400 inline-block" />
            <span className="text-zinc-400 font-mono">舒適 (22°C ~ 28°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-sky-500 border border-sky-400 inline-block" />
            <span className="text-zinc-400 font-mono">涼爽 (&le; 22°C)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
