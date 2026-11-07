import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Map, Layers, Scan } from "lucide-react";
import { AirQualityStation, getAqiLevel, AQI_LEVELS, findNearestAirQualityStation } from '../airQuality';

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
  airQualityStations?: AirQualityStation[];
  airMetric?: 'aqi' | 'pm25';
  selectedAirStationId: string;
  onSelectAirStation: (id: string) => void;
  mapLayer: 'all' | 'weather' | 'air' | 'none';
}

const FALLBACK_COORDINATES: Record<string, [number, number]> = {
  "466920": [25.03746, 121.51485], // 臺北
  "466940": [25.13331, 121.74047], // 基隆
  "466910": [25.18258, 121.51733], // 鞍部
  "466930": [25.16244, 121.54453], // 竹子湖
  "466900": [25.16488, 121.44201], // 淡水
  "466881": [25.01458, 121.46231], // 新北
  "466880": [25.01458, 121.46231], // 板橋
  "466850": [25.07111, 121.78119], // 五分山雷達站
  "467050": [25.00667, 121.04753], // 新屋
  "467571": [24.80395, 120.96465], // 新竹
  "467280": [24.60623, 120.79691], // 後龍
  "467770": [24.25603, 120.52251], // 梧棲
  "467490": [24.14574, 120.68413], // 臺中
  "467270": [23.86539, 120.59011], // 田中
  "467650": [23.88126, 120.90807], // 日月潭
  "467530": [23.50812, 120.81326], // 阿里山
  "467480": [23.49593, 120.43283], // 嘉義
  "467290": [23.63944, 120.53164], // 古坑
  "467420": [23.02531, 120.24589], // 永康
  "467410": [22.99318, 120.20404], // 臺南
  "467441": [22.56584, 120.31575], // 高雄
  "467590": [21.94319, 120.79633], // 恆春
  "467780": [23.14139, 120.08278], // 七股
  "467080": [24.76402, 121.75653], // 宜蘭
  "467060": [24.59689, 121.84851], // 蘇澳
  "466990": [23.97513, 121.61327], // 花蓮
  "467610": [23.13733, 121.37344], // 成功
  "467660": [22.75218, 121.15449], // 臺東
  "467540": [22.35514, 120.89314], // 大武
  "467550": [23.48714, 120.95947], // 玉山
  "460020": [23.46831, 120.87364], // 鹿林山
  "466950": [25.62719, 122.07889], // 彭佳嶼
  "467300": [23.25914, 119.66751], // 東吉島
  "467350": [23.56541, 119.56291], // 澎湖
  "467110": [24.40731, 118.28892], // 金門
  "467620": [22.03697, 121.55831], // 蘭嶼
  "467990": [26.16911, 119.92348], // 馬祖
};

const MANNED_STATIONS_ALTITUDE: Record<string, number> = {
  "466920": 5.3, // 臺北
  "466940": 26.7, // 基隆
  "466910": 825.8, // 鞍部
  "466930": 607.6, // 竹子湖
  "466900": 19.0, // 淡水
  "466881": 9.7, // 新北
  "466880": 9.7, // 板橋
  "466850": 757.0, // 五分山雷達站
  "467050": 20.6, // 新屋
  "467571": 26.9, // 新竹
  "467280": 27.0, // 後龍
  "467770": 31.7, // 梧棲
  "467490": 84.4, // 臺中
  "467270": 48.6, // 田中
  "467650": 1017.5, // 日月潭
  "467530": 2200.4, // 阿里山
  "467480": 26.9, // 嘉義
  "467290": 135.0, // 古坑
  "467420": 12.0, // 永康
  "467410": 13.9, // 臺南
  "467441": 2.3, // 高雄
  "467590": 22.3, // 恆春
  "467780": 2.0, // 七股
  "467080": 7.2, // 宜蘭
  "467060": 24.8, // 蘇澳
  "466990": 16.0, // 花蓮
  "467610": 33.5, // 成功
  "467660": 9.0, // 臺東
  "467540": 8.1, // 大武
  "467550": 3844.8, // 玉山
  "460020": 2862.0, // 鹿林山
  "466950": 99.0, // 彭佳嶼
  "467300": 43.0, // 東吉島
  "467350": 10.7, // 澎湖
  "467110": 48.2, // 金門
  "467620": 324.0, // 蘭嶼
  "467990": 97.8, // 馬祖
};

function getTemperatureColor(temp: number | null): string {
  if (temp === null) return "#71717a"; // gray-500
  if (temp >= 38) return "#8126c0"; // 紫色 (>= 38°C)
  if (temp >= 37) return "#9a004c"; // 深桃紅 (37°C ~ 38°C)
  if (temp >= 35) return "#b30000"; // 深紅 (35°C ~ 37°C)
  if (temp >= 33) return "#ff0000"; // 鮮紅 (33°C ~ 35°C)
  if (temp >= 31) return "#ff5500"; // 橘紅 (31°C ~ 33°C)
  if (temp >= 29) return "#ff8c00"; // 深橘 (29°C ~ 31°C)
  if (temp >= 27) return "#ffb300"; // 橙黃/淺橘 (27°C ~ 29°C)
  if (temp >= 25) return "#ffebad"; // 鵝黃/米白 (25°C ~ 27°C)
  if (temp >= 23) return "#d1f2a5"; // 嫩綠/淺黃綠 (23°C ~ 25°C)
  if (temp >= 21) return "#9ade73"; // 淺綠 (21°C ~ 23°C)
  if (temp >= 19) return "#5cd65c"; // 草綠 (19°C ~ 21°C)
  if (temp >= 17) return "#2eb82e"; // 綠色 (17°C ~ 19°C)
  if (temp >= 15) return "#1f7a1f"; // 深綠 (15°C ~ 17°C)
  if (temp >= 13) return "#145214"; // 墨綠 (13°C ~ 15°C)
  if (temp >= 11) return "#0a290a"; // 極深綠 (11°C ~ 13°C)
  if (temp >= 9) return "#ade8f4"; // 粉藍/極淺藍 (9°C ~ 11°C)
  if (temp >= 7) return "#48cae4"; // 淺天藍 (7°C ~ 9°C)
  if (temp >= 5) return "#0096c7"; // 天藍 (5°C ~ 7°C)
  if (temp >= 3) return "#0077b6"; // 藍色 (3°C ~ 5°C)
  if (temp >= 1) return "#023e8a"; // 深藍 (1°C ~ 3°C)
  if (temp >= -1) return "#03045e"; // 暗藍 (-1°C ~ 1°C)
  return "#120136"; // 極暗紫藍 (< -1°C)
}

export default function WeatherMap({
  stations,
  selectedStationId,
  onSelectStation,
  airQualityStations,
  airMetric = 'aqi',
  selectedAirStationId,
  onSelectAirStation,
  mapLayer,
}: WeatherMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const topTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");
  const [legendOpen, setLegendOpen] = useState(true);

  // Track manual selections to prevent zoom loops
  const lastSelectedIdRef = useRef<string>("");

  const [locating, setLocating] = useState<boolean>(false);
  const [locateStatus, setLocateStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.7, 121.0], // Center of Taiwan
        zoom: 7.5,
        zoomControl: false,
        scrollWheelZoom: true,
        maxZoom: 20,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
      markersGroupRef.current = L.layerGroup().addTo(map);

      // Trigger automatic layout recalculation shortly after mounting
      resizeTimer = setTimeout(() => {
        map.invalidateSize();
      }, 100);

      // Watch container for dimension changes and auto-correct Leaflet sizing
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }
    }

    return () => {
      clearTimeout(resizeTimer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersGroupRef.current = null;
        baseTileLayerRef.current = null;
        topTileLayerRef.current = null;
      }
    };
  }, []);

  // 2. Change Tile Layer (Taiwan NLSC Latest Official Maps with Ocean Fallback)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous tile layers if they exist
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (topTileLayerRef.current) {
      map.removeLayer(topTileLayerRef.current);
      topTileLayerRef.current = null;
    }

    // Double check and remove any orphaned tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapStyle === "satellite") {
      // 1. Global satellite base
      const satBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxNativeZoom: 18,
          maxZoom: 20,
          zIndex: 1,
        },
      ).addTo(map);
      baseTileLayerRef.current = satBase;

      // 2. Taiwan NLSC Latest High-Res Aerial Orthophoto with Road & Place Overlays (EMAP2 正射影像標註套疊)
      const nlscPhoto = L.tileLayer(
        "https://wmts.nlsc.gov.tw/wmts/EMAP2/default/GoogleMapsCompatible/{z}/{y}/{x}",
        {
          attribution:
            '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank" rel="noopener noreferrer">國土測繪中心 (最新航照正射影像)</a>',
          maxNativeZoom: 20,
          maxZoom: 20,
          zIndex: 2,
        },
      ).addTo(map);
      topTileLayerRef.current = nlscPhoto;
    } else {
      // 'streets' - Taiwan NLSC Official Latest Electronic Map (臺灣最新通用版電子地圖 EMAP - 2025/2026 最新路網與地標)
      const baseLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxNativeZoom: 18,
          maxZoom: 20,
          zIndex: 1,
        },
      ).addTo(map);
      baseTileLayerRef.current = baseLayer;

      const nlscLayer = L.tileLayer(
        "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}",
        {
          attribution:
            '&copy; <a href="https://maps.nlsc.gov.tw/" target="_blank" rel="noopener noreferrer">內政部國土測繪中心 (NLSC 最新通用地圖)</a>',
          maxNativeZoom: 20,
          maxZoom: 20,
          zIndex: 2,
        },
      ).addTo(map);
      topTileLayerRef.current = nlscLayer;
    }

    // Re-validate map sizing on layer change
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 50);
    return () => clearTimeout(resizeTimer);
  }, [mapStyle]);

  // 3. Render Custom Markers
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Render user location marker if available
    if (userLocation) {
      const userMarker = L.circleMarker(userLocation, {
        radius: 9,
        fillColor: "#3b82f6", // Bright blue for user position
        fillOpacity: 0.95,
        color: "#ffffff",
        weight: 2.5,
      });

      const userTooltipHtml = `
        <div class="map-tooltip">
          📍 您的目前位置
        </div>
      `;

      userMarker.bindTooltip(userTooltipHtml, {
        permanent: false,
        direction: "top",
        opacity: 0.98,
        offset: [0, -6],
      });

      markersGroup.addLayer(userMarker);
    }

    if (airQualityStations) {
      airQualityStations.forEach(station => {
        const level = getAqiLevel(station.aqi);
        const value = airMetric === 'aqi' ? station.aqi : station.pm25;
        const selected = station.id === selectedAirStationId;
        const marker = L.marker([station.latitude, station.longitude], {
          icon: L.divIcon({
            className: `air-map-marker${selected ? ' selected' : ''}`,
            html: `<span style="background:${level.color};color:${level.ink}">${value ?? '—'}</span>`,
            iconSize: [36, 36], iconAnchor: [18, 18],
          }),
          title: `${station.county} ${station.name} · ${airMetric === 'aqi' ? 'AQI' : 'PM2.5'} ${value ?? '無資料'} · ${level.label}`,
        });
        const tooltip = document.createElement('div');
        tooltip.textContent = `${station.name} · ${level.label} · AQI ${station.aqi ?? '—'} / PM2.5 ${station.pm25 ?? '—'} μg/m³`;
        marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -16] });
        marker.on('click', () => onSelectAirStation(station.id));
        markersGroup.addLayer(marker);
      });
    }

    stations.forEach((station) => {
      // Resolve coordinates
      const lat =
        station.realtime?.latitude ?? FALLBACK_COORDINATES[station.id]?.[0];
      const lng =
        station.realtime?.longitude ?? FALLBACK_COORDINATES[station.id]?.[1];

      if (!lat || !lng) return;

      const temp = station.realtime
        ? station.realtime.temperature
        : (station.dailyHigh ?? null);
      const isSelected = station.id === selectedStationId;
      const altitude =
        station.realtime?.altitude ??
        MANNED_STATIONS_ALTITUDE[station.id] ??
        null;

      const color = getTemperatureColor(temp);

      const marker = L.circleMarker([lat, lng], {
        radius: isSelected ? 11 : 7.5,
        fillColor: color,
        fillOpacity: 0.95,
        color: isSelected ? "#0a6c8a" : "#ffffff",
        weight: isSelected ? 3.5 : 1.5,
      });

      // Hover Tooltip content
      const tooltipHtml = `
        <div class="map-tooltip">
          <div class="tooltip-heading">
            <span>${station.name}</span>
            <span class="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-900 border border-zinc-850 tooltip-muted">#${station.id}</span>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between items-center gap-4">
              <span class="tooltip-muted">觀測氣溫</span>
              <span class="font-mono font-bold tooltip-accent text-sm">${temp !== null && !isNaN(Number(temp)) ? `${Number(temp).toFixed(1)}°C` : "NA"}</span>
            </div>
            <div class="flex justify-between items-center gap-4">
              <span class="tooltip-muted">測站海拔</span>
              <span class="font-mono font-medium tooltip-ink">${altitude !== null && !isNaN(Number(altitude)) ? `${Number(altitude).toFixed(0)} m` : "-- m"}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipHtml, {
        permanent: false,
        direction: "top",
        opacity: 0.98,
        offset: [0, -6],
        className: "custom-leaflet-tooltip",
      });

      const popupHtml = tooltipHtml;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: "custom-leaflet-popup",
        offset: [0, -6],
      });

      marker.on("click", () => {
        lastSelectedIdRef.current = station.id;
        onSelectStation(station.id);
      });

      markersGroup.addLayer(marker);
    });
  }, [stations, selectedStationId, mapStyle, userLocation, airQualityStations, airMetric, selectedAirStationId]);

  // 4. Smooth Panning on Station Change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedAirStationId) {
      const station = airQualityStations?.find(st => st.id === selectedAirStationId);
      if (station) map.setView([station.latitude, station.longitude], 10, { animate: true });
      return;
    }
    if (!selectedStationId) return;

    const selectedStation = stations.find((st) => st.id === selectedStationId);
    if (!selectedStation) return;

    const lat =
      selectedStation.realtime?.latitude ??
      FALLBACK_COORDINATES[selectedStationId]?.[0];
    const lng =
      selectedStation.realtime?.longitude ??
      FALLBACK_COORDINATES[selectedStationId]?.[1];

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
          if (
            Math.abs(latlng.lat - lat) < 0.001 &&
            Math.abs(latlng.lng - lng) < 0.001
          ) {
            layer.openPopup();
          }
        });
      }
    }
  }, [selectedStationId, stations, airQualityStations, selectedAirStationId]);

  // Handle locating user's position and selecting nearest weather station
  const handleLocateNearest = () => {
    if (!navigator.geolocation) {
      setLocateStatus({ type: "error", text: "您的瀏覽器不支援定位功能" });
      setTimeout(() => setLocateStatus(null), 3500);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);

        if (mapLayer === 'air') {
          const nearest = findNearestAirQualityStation(airQualityStations || [], latitude, longitude);
          if (nearest) onSelectAirStation(nearest.station.id);
          setLocateStatus(nearest ? { type: 'success', text: `最近空品測站：${nearest.station.name}` } : { type: 'error', text: '目前無可用的空品測站' });
          setLocating(false);
          setTimeout(() => setLocateStatus(null), 4000);
          return;
        }

        if (stations.length === 0) {
          setLocating(false);
          setLocateStatus({ type: "error", text: "目前無可用的測站資料" });
          setTimeout(() => setLocateStatus(null), 3500);
          return;
        }

        let nearestStation = stations[0];
        let minDistance = Infinity;

        stations.forEach((station) => {
          const lat =
            station.realtime?.latitude ?? FALLBACK_COORDINATES[station.id]?.[0];
          const lng =
            station.realtime?.longitude ??
            FALLBACK_COORDINATES[station.id]?.[1];

          if (lat && lng) {
            // Euclidean distance squared
            const dist =
              Math.pow(latitude - lat, 2) + Math.pow(longitude - lng, 2);
            if (dist < minDistance) {
              minDistance = dist;
              nearestStation = station;
            }
          }
        });

        // Select the nearest station
        onSelectStation(nearestStation.id);

        // Center on the user's location
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 11, {
            animate: true,
            duration: 1.2,
          });
        }

        setLocateStatus({
          type: "success",
          text: `定位成功！最近測站：${nearestStation.name}`,
        });
        setLocating(false);
        setTimeout(() => setLocateStatus(null), 4000);
      },
      (error) => {
        console.error(error);
        let errorMsg = "定位失敗，請確認是否開啟定位權限";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "定位失敗：使用者拒絕定位請求";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "定位失敗：無法取得位置資訊";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "定位失敗：定位請求超時";
        }
        setLocateStatus({ type: "error", text: errorMsg });
        setLocating(false);
        setTimeout(() => setLocateStatus(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
    );
  };

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
    <div className="map-stage" role="region" aria-label="全臺氣象與空品測站地圖">
      <div ref={mapContainerRef} className="map-canvas" />
      <div className="map-tools" role="group" aria-label="地圖底圖">
        <button
          aria-pressed={mapStyle === "streets"}
          onClick={() => setMapStyle("streets")}
        >
          <Map size={15} />
          通用地圖
        </button>
        <button
          aria-pressed={mapStyle === "satellite"}
          onClick={() => setMapStyle("satellite")}
        >
          <Layers size={15} />
          航照影像
        </button>
        <button onClick={handleRecenter} title="回到全臺灣視角">
          <Scan size={16} />
          <span>全臺</span>
        </button>
      </div>
      <button
        className={`locate-button ${locating ? "spin-icon" : ""}`}
        onClick={handleLocateNearest}
        disabled={locating}
        aria-label="定位目前位置並選擇最近測站"
        title="定位我的位置"
      >
        <LocateFixed size={32} />
      </button>
      {locateStatus && (
        <div className={`locate-toast ${locateStatus.type}`} role="status">
          {locateStatus.text}
        </div>
      )}
      <button
        type="button"
        className={`map-legend combined-legend${legendOpen ? '' : ' legend-collapsed'}`}
        aria-label={legendOpen ? '隱藏圖例' : '顯示圖例'}
        aria-expanded={legendOpen}
        onClick={() => setLegendOpen(!legendOpen)}
        title={legendOpen ? '點擊隱藏圖例' : '顯示圖例'}
      >
        {legendOpen ? <>
        {mapLayer === 'none' && <span>未顯示測站</span>}
        {(mapLayer === 'all' || mapLayer === 'weather') && <>
        <span>● 氣象站 · 氣溫 °C</span>
        <div className="temperature-gradient" />
        <div className="legend-ticks">
          <span>−1</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>38+</span>
        </div>
        </>}
        {(mapLayer === 'all' || mapLayer === 'air') && <>
        <span className="air-legend-title">■ 空品站 · {airMetric === 'aqi' ? 'AQI' : 'PM2.5 μg/m³'}</span>
        <div className="combined-aqi-scale">{AQI_LEVELS.map(level => <i key={level.label} title={`${level.label} ${level.range}`} style={{ background: level.color }} />)}</div>
        <div className="legend-ticks"><span>良好</span><span>普通</span><span>不健康 → 危害</span></div>
        <small>空品色彩依 AQI 分級</small>
        </>}
        </> : <span>顯示圖例</span>}
      </button>
    </div>
  );
}
