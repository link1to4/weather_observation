import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Sun,
  CloudRain,
  Thermometer,
  Wind,
  Droplets,
  Search,
  RefreshCw,
  MapPin,
  Activity,
  AlertCircle,
} from "lucide-react";
import { CWAResponse } from "./types";
import WeatherMap from "./components/WeatherMap";

// Regional classification of weather stations in Taiwan (Manned & Automatic)
const REGION_MAP: Record<string, string> = {
  // Northern Region (Manned)
  "466940": "北部地區", // 基隆
  "466920": "北部地區", // 臺北
  "466910": "北部地區", // 鞍部
  "466930": "北部地區", // 竹子湖
  "466900": "北部地區", // 淡水
  "466881": "北部地區", // 新北
  "466880": "北部地區", // 板橋
  "466850": "北部地區", // 五分山雷達站
  "466921": "北部地區", // 臺北(師院)
  "467050": "北部地區", // 新屋
  "467571": "北部地區", // 新竹
  "467570": "北部地區", // 新竹 (舊)
  // Northern Region (Automatic)
  C0U650: "北部地區", // 七堵
  C0A9C0: "北部地區", // 內湖
  C0AK30: "北部地區", // 硬漢嶺
  C0AH80: "北部地區", // 深坑
  C0A530: "北部地區", // 坪林
  C0AH50: "北部地區", // 林口
  C0A890: "北部地區", // 雙溪
  C0UA70: "北部地區", // 桃源谷
  C0UA60: "北部地區", // 樟樹山
  C0C460: "北部地區", // 復興

  // Central Region (Manned)
  "467280": "中部地區", // 後龍
  "467770": "中部地區", // 梧棲
  "467490": "中部地區", // 臺中
  "467270": "中部地區", // 田中
  "467650": "中部地區", // 日月潭
  "467530": "中部地區", // 阿里山
  "467480": "中部地區", // 嘉義
  // Central Region (Automatic)
  C0HA10: "中部地區", // 奧萬大
  C0HA20: "中部地區", // 杉林溪
  C0FA60: "中部地區", // 鞍馬山
  C0FA70: "中部地區", // 大雪山
  C0F9V0: "中部地區", // 新社
  C0I080: "中部地區", // 信義

  // Southern Region (Manned)
  "467290": "南部地區", // 古坑
  "467420": "南部地區", // 永康
  "467411": "南部地區", // 臺南(永康)
  "467410": "南部地區", // 臺南
  "467441": "南部地區", // 高雄
  "467440": "南部地區", // 高雄 (舊)
  "467590": "南部地區", // 恆春
  "467780": "南部地區", // 七股
  // Southern Region (Automatic)
  C2V310: "南部地區", // 美濃
  C0R690: "南部地區", // 墾丁
  C0R840: "南部地區", // 牡丹池山

  // Eastern Region (Manned)
  "467080": "東部地區", // 宜蘭
  "467060": "東部地區", // 蘇澳
  "460010": "東部地區", // 金六結
  "466990": "東部地區", // 花蓮
  "467610": "東部地區", // 成功
  "467660": "東部地區", // 臺東
  "467540": "東部地區", // 大武
  // Eastern Region (Automatic)
  C0TB40: "東部地區", // 崇德
  C0TA40: "東部地區", // 秀林
  C0TA50: "東部地區", // 和仁
  C0TA80: "東部地區", // 立霧山
  C0SD20: "東部地區", // 富山
  C0U940: "東部地區", // 羅東
  C0U600: "東部地區", // 礁溪
  C0U710: "東部地區", // 太平山
  C0S690: "東部地區", // 太麻里
  C0U520: "東部地區", // 雙連埤
  C0T820: "東部地區", // 天祥
  C0T9B0: "東部地區", // 水源

  // Islands & High Altitude (Manned)
  "467550": "高山離島", // 玉山
  "460020": "高山離島", // 鹿林山
  "466950": "高山離島", // 彭佳嶼
  "467300": "高山離島", // 東吉島
  "467350": "高山離島", // 澎湖
  "467110": "高山離島", // 金門
  "467620": "高山離島", // 蘭嶼
  "467990": "高山離島", // 馬祖
  "467790": "高山離島", // 墾丁雷達站
  // Islands & High Altitude (Automatic)
  C0SD30: "高山離島", // 東清
  C0R270: "高山離島", // 琉球嶼
  A0W080: "高山離島", // 吉貝
  C0W160: "高山離島", // 烏坵
  CAW010: "高山離島", // 東引
};

const formatRealtimeObsTime = (obsTime: string | undefined | null) => {
  if (!obsTime) return "";
  const d = new Date(obsTime);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const match = obsTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return obsTime;
};

// Safe helper to parse weather numbers from API responses
const parseWeatherNumber = (val: any): number | null => {
  if (
    val === null ||
    val === undefined ||
    val === "" ||
    val === "-99" ||
    val === "-999" ||
    val === "X"
  )
    return null;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
};

export default function App() {
  const [data, setData] = useState<CWAResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string>(() => {
    try {
      return localStorage.getItem("defaultStationId") || "466920";
    } catch {
      return "466920";
    }
  }); // Default to Taipei (466920) or last saved station
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"all" | "manned" | "auto">(
    "all",
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const [sheetDragHeight, setSheetDragHeight] = useState<number | null>(null);
  const suppressSheetClickRef = useRef(false);

  useEffect(() => {
    const sheet = sheetRef.current;
    const handle = sheet?.querySelector<HTMLButtonElement>(".sheet-handle");
    if (!sheet || !handle) return;
    let gesture: { x: number; y: number; height: number; min: number; max: number; current: number; moved: boolean; body: boolean } | null = null;
    const start = (x: number, y: number, target: EventTarget | null) => {
      gesture = null;
      if (!window.matchMedia("(max-width: 899px)").matches || !(target instanceof Element)) return;
      const fromBody = !handle.contains(target);
      if (fromBody) {
        if (!sheetOpen) return;
        // Preserve scrolling inside the details and nested station lists.
        for (let node: Element | null = target; node && node !== sheet; node = node.parentElement) {
          if (node.scrollTop > 0) return;
        }
      }
      suppressSheetClickRef.current = false;
      const min = 60 + parseFloat(getComputedStyle(sheet).paddingBottom);
      const max = (window.visualViewport?.height ?? window.innerHeight) * 0.76;
      const height = sheet.getBoundingClientRect().height;
      gesture = { x, y, height, min, max, current: height, moved: false, body: fromBody };
    };
    const move = (x: number, y: number, event: Event) => {
      if (!gesture) return;
      const dx = x - gesture.x;
      const dy = y - gesture.y;
      if (!gesture.moved) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if (Math.abs(dx) >= Math.abs(dy) || (gesture.body && dy < 0)) {
          gesture = null;
          return;
        }
        gesture.moved = true;
        suppressSheetClickRef.current = true;
      }
      if (event.cancelable) event.preventDefault();
      gesture.current = Math.max(gesture.min, Math.min(gesture.max, gesture.height - dy));
      setSheetDragHeight(gesture.current);
    };
    const finish = (cancelled = false) => {
      if (gesture?.moved && !cancelled) {
        const delta = gesture.current - gesture.height;
        setSheetOpen(Math.abs(delta) >= 40 ? delta > 0 : sheetOpen);
      }
      gesture = null;
      setSheetDragHeight(null);
    };
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) { finish(true); return; }
      start(event.touches[0].clientX, event.touches[0].clientY, event.target);
    };
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) { finish(true); return; }
      move(event.touches[0].clientX, event.touches[0].clientY, event);
    };
    const touchEnd = () => finish();
    const cancel = () => finish(true);
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
      start(event.clientX, event.clientY, event.target);
      if (gesture) handle.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch") move(event.clientX, event.clientY, event);
    };
    const pointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch") finish();
    };
    sheet.addEventListener("touchstart", touchStart, { passive: true });
    sheet.addEventListener("touchmove", touchMove, { passive: false });
    sheet.addEventListener("touchend", touchEnd);
    sheet.addEventListener("touchcancel", cancel);
    handle.addEventListener("pointerdown", pointerDown);
    handle.addEventListener("pointermove", pointerMove);
    handle.addEventListener("pointerup", pointerUp);
    handle.addEventListener("pointercancel", cancel);
    return () => {
      sheet.removeEventListener("touchstart", touchStart);
      sheet.removeEventListener("touchmove", touchMove);
      sheet.removeEventListener("touchend", touchEnd);
      sheet.removeEventListener("touchcancel", cancel);
      handle.removeEventListener("pointerdown", pointerDown);
      handle.removeEventListener("pointermove", pointerMove);
      handle.removeEventListener("pointerup", pointerUp);
      handle.removeEventListener("pointercancel", cancel);
    };
  }, [sheetOpen]);
  const [searchOpen, setSearchOpen] = useState(false);

  // Comparison states
  const [comparedStationIds, setComparedStationIds] = useState<string[]>(() => {
    try {
      const defaultId = localStorage.getItem("defaultStationId") || "466920";
      return [defaultId];
    } catch {
      return ["466920"];
    }
  });
  const [comparedMonthlyData, setComparedMonthlyData] = useState<
    Record<string, any[]>
  >({});

  // Hourly 24h scraped states
  const [hourlyData, setHourlyData] = useState<Record<string, any[]>>({});
  const [hourlyLoading, setHourlyLoading] = useState<boolean>(false);
  const [hourlyError, setHourlyError] = useState<string | null>(null);

  // Monthly 30-day historical states
  const [monthlyData, setMonthlyData] = useState<
    { date: string; high: number; low: number; mean: number }[] | null
  >(null);
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hourly" | "monthly">("hourly");
  const [monthlyDisplayType, setMonthlyDisplayType] = useState<
    "all" | "high" | "mean" | "low"
  >("all");
  const [countdown, setCountdown] = useState<number>(1800); // 30 minutes in seconds
  const targetTimeRef = useRef<number>(Date.now() + 1800 * 1000);

  // Keep a ref of comparedStationIds to avoid closure stale state
  const comparedStationIdsRef = useRef(comparedStationIds);
  useEffect(() => {
    comparedStationIdsRef.current = comparedStationIds;
  }, [comparedStationIds]);

  // Keep a ref of selectedStationId to avoid closure stale state
  const selectedStationIdRef = useRef(selectedStationId);
  useEffect(() => {
    selectedStationIdRef.current = selectedStationId;
  }, [selectedStationId]);

  // In-flight fetch tracking to prevent infinite loops and duplicate network requests
  const inFlightMonthlyRef = useRef<Set<string>>(new Set());
  const inFlightHourlyRef = useRef<Set<string>>(new Set());

  // AI Climate analysis states
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch data on mount
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/weather?_t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch weather data: ${response.statusText}`);
      }
      const json: CWAResponse = await response.json();
      if (!json.records || !json.records.location) {
        throw new Error(
          "API response has unexpected format (missing records.location)",
        );
      }
      setData(json);

      // If our selected station isn't in the response, pick the first available one
      const stations = json.records.location;
      const currentSelectedId = selectedStationIdRef.current;
      const found = stations.find(
        (loc) => loc.station.StationID === currentSelectedId,
      );
      if (!found && stations.length > 0) {
        setSelectedStationId(stations[0].station.StationID);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching weather data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch 1-month daily historical temperature data
  const fetchMonthlyData = async (stationId: string) => {
    setMonthlyLoading(true);
    setMonthlyError(null);
    try {
      const response = await fetch(
        `/api/weather/monthly?stationId=${stationId}&_t=${Date.now()}`,
      );
      if (!response.ok) {
        let msg = `無法取得該測站之月報歷史氣溫數據 (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) msg = errData.error;
        } catch (_) {}
        throw new Error(msg);
      }
      const json = await response.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setMonthlyData(list);

      // Store in comparison cache too
      setComparedMonthlyData((prev) => ({
        ...prev,
        [stationId]: list,
      }));
    } catch (err: any) {
      console.error(err);
      setMonthlyError(err.message || "無法取得該測站之月報歷史氣溫數據");
      setMonthlyData([]);
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Dedicated helper to fetch comparison monthly data silently
  const fetchMonthlyDataForComparison = async (stationId: string) => {
    if (inFlightMonthlyRef.current.has(stationId)) return;
    inFlightMonthlyRef.current.add(stationId);
    try {
      const response = await fetch(
        `/api/weather/monthly?stationId=${stationId}&_t=${Date.now()}`,
      );
      if (response.ok) {
        const json = await response.json();
        setComparedMonthlyData((prev) => ({
          ...prev,
          [stationId]: Array.isArray(json.data) ? json.data : [],
        }));
      } else {
        setComparedMonthlyData((prev) => ({
          ...prev,
          [stationId]: [],
        }));
      }
    } catch (err) {
      console.error(
        `Failed to fetch comparison monthly data for ${stationId}`,
        err,
      );
      setComparedMonthlyData((prev) => ({
        ...prev,
        [stationId]: [],
      }));
    } finally {
      inFlightMonthlyRef.current.delete(stationId);
    }
  };

  // Fetch 24-hour scraped hourly observations
  const fetchHourlyData = async (stationId: string) => {
    setHourlyLoading(true);
    setHourlyError(null);
    try {
      const response = await fetch(
        `/api/weather/hourly?stationId=${stationId}&_t=${Date.now()}`,
      );
      if (!response.ok) {
        let errMsg = `無法取得該測站之24小時變化數據 (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.error) {
            errMsg = errJson.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }
      const json = await response.json();
      const records = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];
      setHourlyData((prev) => ({
        ...prev,
        [stationId]: records,
      }));
    } catch (err: any) {
      console.error(err);
      setHourlyError(err.message || "無法取得該測站之24小時變化數據");
      setHourlyData((prev) => ({
        ...prev,
        [stationId]: prev[stationId] || [],
      }));
    } finally {
      setHourlyLoading(false);
    }
  };

  // Helper to fetch comparison hourly data silently
  const fetchHourlyDataForComparison = async (stationId: string) => {
    if (inFlightHourlyRef.current.has(stationId)) return;
    inFlightHourlyRef.current.add(stationId);
    try {
      const response = await fetch(
        `/api/weather/hourly?stationId=${stationId}&_t=${Date.now()}`,
      );
      if (response.ok) {
        const json = await response.json();
        const records = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : [];
        setHourlyData((prev) => ({
          ...prev,
          [stationId]: records,
        }));
      } else {
        setHourlyData((prev) => ({
          ...prev,
          [stationId]: prev[stationId] || [],
        }));
      }
    } catch (err) {
      console.error(
        `Failed to fetch comparison hourly data for ${stationId}`,
        err,
      );
      setHourlyData((prev) => ({
        ...prev,
        [stationId]: prev[stationId] || [],
      }));
    } finally {
      inFlightHourlyRef.current.delete(stationId);
    }
  };

  // Request AI-generated 1-month climate trend analysis
  const fetchAIAnalysis = async () => {
    if (!selectedStationId || !selectedStationData || !monthlyData) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/weather/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: selectedStationId,
          stationName: selectedStationData.station.StationName,
          monthlyData: monthlyData,
        }),
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "AI 分析生成失敗");
      }
      const json = await response.json();
      setAiAnalysis(json.analysis);
    } catch (err: any) {
      console.error(err);
      setAiError(
        err.message ||
          "AI 分析服務暫時無法提供，請確認是否已設定 GEMINI_API_KEY 金鑰。",
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Refs for callbacks to prevent stale closures in setInterval
  const fetchDataRef = useRef(fetchData);
  const fetchHourlyDataRef = useRef(fetchHourlyData);
  const fetchMonthlyDataRef = useRef(fetchMonthlyData);
  const fetchHourlyDataForComparisonRef = useRef(fetchHourlyDataForComparison);

  useEffect(() => {
    fetchDataRef.current = fetchData;
    fetchHourlyDataRef.current = fetchHourlyData;
    fetchMonthlyDataRef.current = fetchMonthlyData;
    fetchHourlyDataForComparisonRef.current = fetchHourlyDataForComparison;
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Background auto-refresh timer (30 minutes)
  useEffect(() => {
    const syncCountdownAndRefresh = () => {
      const now = Date.now();
      const diff = targetTimeRef.current - now;
      if (diff <= 0) {
        // Perform background refresh silently
        fetchDataRef.current(true);
        const currentId = selectedStationIdRef.current;
        if (currentId) {
          fetchHourlyDataRef.current(currentId);
          fetchMonthlyDataRef.current(currentId);
        }
        comparedStationIdsRef.current.forEach((id) => {
          if (id !== currentId) {
            fetchHourlyDataForComparisonRef.current(id);
          }
        });
        // Reset target time to 30 minutes from now
        targetTimeRef.current = Date.now() + 1800 * 1000;
        setCountdown(1800);
      } else {
        setCountdown(Math.ceil(diff / 1000));
      }
    };

    // Run once at mounting to sync initial target
    syncCountdownAndRefresh();

    const timer = setInterval(syncCountdownAndRefresh, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncCountdownAndRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Fetch monthly data and reset AI report whenever selected station changes
  useEffect(() => {
    if (selectedStationId) {
      fetchHourlyData(selectedStationId);
      fetchMonthlyData(selectedStationId);
      setAiAnalysis(null);
      setAiError(null);
      try {
        localStorage.setItem("defaultStationId", selectedStationId);
      } catch (err) {
        console.error("Failed to save defaultStationId to localStorage", err);
      }
    }
  }, [selectedStationId]);

  // Fetch comparison monthly and hourly data whenever a new station is added to comparison
  useEffect(() => {
    comparedStationIds.forEach((id) => {
      if (comparedMonthlyData[id] === undefined) {
        fetchMonthlyDataForComparison(id);
      }
      if (hourlyData[id] === undefined) {
        fetchHourlyDataForComparison(id);
      }
    });
  }, [comparedStationIds, comparedMonthlyData, hourlyData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    targetTimeRef.current = Date.now() + 1800 * 1000; // Reset background countdown target
    setCountdown(1800); // Reset background countdown state
    fetchData(true);
    if (selectedStationId) {
      fetchHourlyData(selectedStationId);
      fetchMonthlyData(selectedStationId);
      setAiAnalysis(null);
      setAiError(null);
    }
    // Refresh cached comparison data
    comparedStationIds.forEach((id) => {
      fetchHourlyDataForComparison(id);
      if (id !== selectedStationId) {
        fetchMonthlyDataForComparison(id);
      }
    });
  };

  const handleToggleComparison = (stationId: string) => {
    setComparedStationIds((prev) => {
      if (prev.includes(stationId)) {
        return prev.filter((id) => id !== stationId);
      } else {
        // Limit comparison to 5 stations max
        if (prev.length >= 5) {
          const nonSelected = prev.filter((id) => id !== selectedStationId);
          if (nonSelected.length > 0) {
            const keep = prev.filter(
              (id) => id === selectedStationId || id !== nonSelected[0],
            );
            return [...keep, stationId];
          }
          return prev;
        }
        return [...prev, stationId];
      }
    });
  };

  // Extract and format all available stations from the payload
  const stationsList = useMemo(() => {
    if (!data?.records?.location) return [];
    const seenStationIds = new Set<string>();
    const uniqueLocations = data.records.location.filter((location) => {
      const id = location.station.StationID;
      if (seenStationIds.has(id)) return false;
      seenStationIds.add(id);
      return true;
    });
    return uniqueLocations.map((loc) => {
      const stationId = loc.station.StationID;

      let region = "其他地區";
      const county = loc.station.CountyName || "";

      if (
        [
          "基隆市",
          "臺北市",
          "新北市",
          "桃園市",
          "新竹市",
          "新竹縣",
          "宜蘭縣",
        ].some((c) => county.includes(c))
      ) {
        region = "北部地區";
      } else if (
        ["苗栗縣", "臺中市", "彰化縣", "南投縣", "雲林縣"].some((c) =>
          county.includes(c),
        )
      ) {
        region = "中部地區";
      } else if (
        ["嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣"].some((c) =>
          county.includes(c),
        )
      ) {
        region = "南部地區";
      } else if (["花蓮縣", "臺東縣"].some((c) => county.includes(c))) {
        region = "東部地區";
      } else if (
        ["澎湖縣", "金門縣", "連江縣"].some((c) => county.includes(c))
      ) {
        region = "高山離島";
      } else {
        region = REGION_MAP[stationId] || "其他地區";
      }

      // Get daily high
      const dailyTemps = loc.stationObsStatistics?.AirTemperature?.daily?.[0];
      const dailyHigh = parseWeatherNumber(dailyTemps?.Maximum);
      const dailyLow = parseWeatherNumber(dailyTemps?.Minimum);
      const dailyMean = parseWeatherNumber(dailyTemps?.Mean);

      return {
        id: stationId,
        name: loc.station.StationName,
        nameEn: loc.station.StationNameEN,
        attribute: loc.station.StationAttribute,
        region,
        dailyHigh,
        dailyLow,
        dailyMean,
        realtime: loc.realtime || null,
      };
    });
  }, [data]);

  // Filter stations list by type, region & search query
  const filteredStations = useMemo(() => {
    return stationsList.filter((st) => {
      const matchesSearch =
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.id.includes(searchQuery);

      const matchesRegion =
        selectedRegion === "all" || st.region === selectedRegion;

      const matchesType =
        selectedType === "all" ||
        (selectedType === "manned" && st.attribute === "署屬有人氣象站") ||
        (selectedType === "auto" && st.attribute === "署屬自動氣象站");

      return matchesSearch && matchesRegion && matchesType;
    });
  }, [stationsList, searchQuery, selectedRegion, selectedType]);

  // Find the currently selected station details in the API payload
  const selectedStationData = useMemo(() => {
    if (!data?.records?.location) return null;
    return (
      data.records.location.find(
        (loc) => loc.station.StationID === selectedStationId,
      ) || null
    );
  }, [data, selectedStationId]);

  // Format hourly data for line chart
  const hourlyChartData = useMemo(() => {
    let records = hourlyData[selectedStationId] || [];

    // Fallback: If hourlyData for this station is empty, use stationObsTimes from selectedStationData
    if (
      records.length === 0 &&
      selectedStationData?.stationObsTimes?.stationObsTime
    ) {
      records = selectedStationData.stationObsTimes.stationObsTime.map(
        (obs) => {
          const dt = obs.DateTime ? new Date(obs.DateTime) : null;
          const timeStr =
            dt && !isNaN(dt.getTime())
              ? `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:00`
              : obs.DateTime || "";
          const temp = parseWeatherNumber(obs.weatherElements?.AirTemperature);
          const hum = parseWeatherNumber(obs.weatherElements?.RelativeHumidity);
          const precRaw = obs.weatherElements?.Precipitation;
          const prec = precRaw === "T" ? 0.05 : parseWeatherNumber(precRaw);
          return {
            time: timeStr,
            dateTime: obs.DateTime,
            temperature: temp,
            humidity: hum,
            precipitation: prec,
          };
        },
      );
    }

    if (records.length === 0) return [];

    return records
      .map((item) => {
        return {
          time: item.time, // Keep full original time (e.g. "07/10 16:00") to avoid duplicate keys in Recharts
          temperature:
            item.temperature !== null && item.temperature !== undefined
              ? Number(item.temperature)
              : null,
          humidity:
            item.humidity !== null && item.humidity !== undefined
              ? Number(item.humidity)
              : null,
          precipitation:
            item.precipitation !== null && item.precipitation !== undefined
              ? Number(item.precipitation)
              : null,
        };
      })
      .filter((d) => d.temperature !== null && !isNaN(d.temperature as number)); // Only plot hours with valid temperatures
  }, [hourlyData, selectedStationId, selectedStationData]);

  // Generate hourly multi-station comparative dataset
  const comparisonHourlyChartData = useMemo(() => {
    // If selected station has records, use it as baseline; otherwise search other compared stations
    let primaryRecords = hourlyData[selectedStationId] || [];
    if (primaryRecords.length === 0) {
      for (const id of comparedStationIds) {
        if (hourlyData[id] && hourlyData[id].length > 0) {
          primaryRecords = hourlyData[id];
          break;
        }
      }
    }

    if (primaryRecords.length === 0) {
      if (selectedStationData?.stationObsTimes?.stationObsTime) {
        primaryRecords = selectedStationData.stationObsTimes.stationObsTime.map(
          (obs) => {
            const dt = obs.DateTime ? new Date(obs.DateTime) : null;
            return {
              time:
                dt && !isNaN(dt.getTime())
                  ? `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:00`
                  : obs.DateTime || "",
              temperature: parseWeatherNumber(
                obs.weatherElements?.AirTemperature,
              ),
            };
          },
        );
      }
    }

    if (primaryRecords.length === 0 || comparedStationIds.length === 0)
      return [];

    return primaryRecords.map((refItem) => {
      const point: Record<string, any> = { time: refItem.time }; // Keep full original time to avoid duplicate keys in Recharts

      comparedStationIds.forEach((id) => {
        const stationName = stationsList.find((st) => st.id === id)?.name || id;
        const stationRecords = hourlyData[id] || [];

        // Find matching record by matching the exact time string (e.g. "07/10 16:00")
        // fallback to matching just the hour if dates are different
        const matchRecord =
          stationRecords.find((r) => r.time === refItem.time) ||
          stationRecords.find(
            (r) =>
              r.time &&
              refItem.time &&
              r.time.slice(-5) === refItem.time.slice(-5),
          );

        if (
          matchRecord &&
          matchRecord.temperature !== null &&
          !isNaN(Number(matchRecord.temperature))
        ) {
          point[stationName] = Number(matchRecord.temperature);
        } else {
          point[stationName] = null;
        }
      });

      return point;
    });
  }, [
    hourlyData,
    comparedStationIds,
    selectedStationId,
    stationsList,
    selectedStationData,
  ]);

  // Generate monthly multi-station comparative dataset using daily average
  const comparisonMonthlyChartData = useMemo(() => {
    if (comparedStationIds.length === 0) return [];

    const baseMonthly = comparedMonthlyData[selectedStationId] || [];
    if (baseMonthly.length === 0) return [];

    return baseMonthly.map((day, idx) => {
      const point: Record<string, any> = { date: day.date };

      comparedStationIds.forEach((id) => {
        const stationName = stationsList.find((st) => st.id === id)?.name || id;
        const stationMonthly = comparedMonthlyData[id] || [];
        const matchDay =
          stationMonthly[idx] ||
          stationMonthly.find((d) => d.date === day.date);

        let valKey: "high" | "low" | "mean" = "mean";
        if (monthlyDisplayType === "high") {
          valKey = "high";
        } else if (monthlyDisplayType === "low") {
          valKey = "low";
        }

        point[stationName] = matchDay ? matchDay[valKey] : null;
      });

      return point;
    });
  }, [
    comparedStationIds,
    comparedMonthlyData,
    selectedStationId,
    stationsList,
    monthlyDisplayType,
  ]);

  // Find daily metrics
  const dailyMetrics = useMemo(() => {
    if (
      !selectedStationData?.stationObsStatistics?.AirTemperature?.daily?.[0]
    ) {
      return { high: null, low: null, mean: null, date: "" };
    }
    const d = selectedStationData.stationObsStatistics.AirTemperature.daily[0];
    return {
      high: parseWeatherNumber(d.Maximum),
      low: parseWeatherNumber(d.Minimum),
      mean: parseWeatherNumber(d.Mean),
      date: d.Date || "",
    };
  }, [selectedStationData]);

  // Calculate stats across all of Taiwan
  const taiwanStats = useMemo(() => {
    if (stationsList.length === 0) return null;
    const highs = stationsList
      .map((st) => st.dailyHigh)
      .filter((v): v is number => v !== null && !isNaN(v));
    const lows = stationsList
      .map((st) => st.dailyLow)
      .filter((v): v is number => v !== null && !isNaN(v));

    if (highs.length === 0) return null;

    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);

    const maxHighStation = stationsList.find((st) => st.dailyHigh === maxHigh);
    const minLowStation = stationsList.find((st) => st.dailyLow === minLow);

    return {
      maxHigh,
      maxHighStation: maxHighStation?.name || "未知",
      minLow,
      minLowStation: minLowStation?.name || "未知",
      averageHigh: parseFloat(
        (highs.reduce((a, b) => a + b, 0) / highs.length).toFixed(1),
      ),
    };
  }, [stationsList]);

  const formatValue = (value: number | null | undefined, unit = "°C") =>
    value != null && Number.isFinite(Number(value))
      ? `${Number(value).toFixed(1)}${unit}`
      : "—";
  const chartColors = ["#0d8f84", "#d23a2e", "#1d4ed8", "#b07800", "#7a3fc4"];
  const chooseStation = (id: string) => {
    setSelectedStationId(id);
    setSearchOpen(false);
  };
  const realtime = selectedStationData?.realtime;
  const currentChart =
    activeTab === "hourly" ? hourlyChartData : monthlyData || [];

  return (
    <div className={`weather-app ${sheetOpen ? "sheet-open" : ""}`}>
      <WeatherMap
        stations={filteredStations}
        selectedStationId={selectedStationId}
        onSelectStation={chooseStation}
      />

      <div className="status-bar-glass" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <header className="map-topbar">
        <div className="mobile-brand">
          <Sun size={22} />
          <div>
            <b>全台即時氣溫</b>
            <span>臺灣即時氣象觀測地圖</span>
          </div>
        </div>
        <div className="search-wrap" role="search">
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (filteredStations[0]) chooseStation(filteredStations[0].id);
            }}
          >
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="搜尋測站"
              type="search"
              placeholder="搜尋測站：臺北、阿里山、或測站代碼"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchOpen(false);
              }}
            />
            <button type="submit">查詢</button>
          </form>
          {searchOpen && (
            <div className="search-results">
              <div className="results-heading">
                <span>符合條件的測站 · {filteredStations.length}</span>
                <button type="button" onClick={() => setSearchOpen(false)}>
                  關閉
                </button>
              </div>
              {filteredStations.length === 0 ? (
                <p className="empty">找不到測站，請調整關鍵字或篩選條件。</p>
              ) : (
                filteredStations.map((station) => (
                  <button
                    className="search-result"
                    key={station.id}
                    onClick={() => chooseStation(station.id)}
                  >
                    <span>
                      <b>{station.name}</b>
                      <small>
                        {station.region} · {station.id}
                      </small>
                    </span>
                    <strong>
                      {formatValue(station.realtime?.temperature)}
                    </strong>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="filter-chips" role="group" aria-label="地區篩選">
          {[
            "all",
            "北部地區",
            "中部地區",
            "南部地區",
            "東部地區",
            "高山離島",
          ].map((region, index) => (
            <button
              className="filter-chip"
              key={region}
              aria-pressed={selectedRegion === region}
              onClick={() => setSelectedRegion(region)}
            >
              <i
                style={{
                  background: [
                    "#0d8f84",
                    "#1d4ed8",
                    "#c99a00",
                    "#d23a2e",
                    "#2f8a4e",
                    "#7a3fc4",
                  ][index],
                }}
              />
              {region === "all" ? "全臺測站" : region.replace("地區", "")}
            </button>
          ))}
        </div>
      </header>

      <aside
        ref={sheetRef}
        className={`weather-sheet${sheetDragHeight !== null ? " sheet-dragging" : ""}`}
        style={sheetDragHeight !== null ? { height: sheetDragHeight } : undefined}
        aria-label="測站觀測資訊"
      >
        <button
          className="sheet-handle"
          aria-expanded={sheetOpen}
          aria-controls="station-details"
          onClick={() => {
            if (suppressSheetClickRef.current) {
              suppressSheetClickRef.current = false;
              return;
            }
            setSheetOpen(!sheetOpen);
          }}
        >
          <span />
          <b>{sheetOpen ? "▾ 下滑收合" : "▴ 上滑查看詳細資訊"}</b>
        </button>
        <div className="sheet-body" id="station-details">
          <div className="side-brand">
            <h1>
              <Sun size={25} />
              全台即時氣溫
            </h1>
            <p>臺灣即時氣象觀測地圖 · 中央氣象署公開資料</p>
          </div>
          <button
            className="update-badge"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
          >
            <i />
            <span>
              {isRefreshing || loading
                ? "正在更新觀測資料…"
                : `自動更新 ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`}
            </span>
            <RefreshCw
              size={12}
              className={isRefreshing || loading ? "spin" : ""}
            />
          </button>
          {loading && (
            <div className="notice" role="status">
              正在載入全臺測站，請稍候…
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              <AlertCircle size={18} />
              <span>觀測資料載入失敗：{error}</span>
              <button onClick={handleRefresh}>重試</button>
            </div>
          )}

          {selectedStationData && (
            <>
              <section className="station-status">
                <div className="station-heading">
                  <h2>
                    <i />
                    {selectedStationData.station.StationName} 氣象站
                  </h2>
                  <span className="tag">
                    {
                      stationsList.find(
                        (station) => station.id === selectedStationId,
                      )?.region
                    }
                  </span>
                </div>
                <div className="current-weather">
                  <strong>
                    {formatValue(realtime?.temperature, "")}
                    <small>°C</small>
                  </strong>
                  <Thermometer size={34} strokeWidth={1.3} />
                </div>
                <p className="muted">
                  {realtime?.obsTime
                    ? `觀測時間 ${formatRealtimeObsTime(realtime.obsTime)}`
                    : "目前無即時觀測資料"}
                </p>
                <div className="weather-metrics">
                  <span>
                    <Droplets size={15} />
                    濕度 <b>{formatValue(realtime?.humidity, "%")}</b>
                  </span>
                  <span>
                    <CloudRain size={15} />
                    雨量 <b>{formatValue(realtime?.precipitation, " mm")}</b>
                  </span>
                  <span>
                    <Wind size={15} />
                    風速 <b>{formatValue(realtime?.windSpeed, " m/s")}</b>
                  </span>
                </div>
              </section>
              <section className="detail-card">
                <h3>測站資訊</h3>
                <dl className="key-values">
                  <dt>測站代碼</dt>
                  <dd className="mono">{selectedStationId}</dd>
                  <dt>英文名稱</dt>
                  <dd>{selectedStationData.station.StationNameEN}</dd>
                  <dt>測站類型</dt>
                  <dd>{selectedStationData.station.StationAttribute}</dd>
                  <dt>測站海拔</dt>
                  <dd>{formatValue(realtime?.altitude, " m")}</dd>
                </dl>
                <button
                  className="outline-button"
                  aria-pressed={comparedStationIds.includes(selectedStationId)}
                  onClick={() => handleToggleComparison(selectedStationId)}
                >
                  <Activity size={15} />
                  {comparedStationIds.includes(selectedStationId)
                    ? "移出溫度比較"
                    : "加入溫度比較"}{" "}
                  · {comparedStationIds.length}/5
                </button>
              </section>
              <section>
                <h3 className="section-title">
                  單日氣溫摘要 <small>{dailyMetrics.date || "暫無日報"}</small>
                </h3>
                <div className="daily-metrics">
                  <div>
                    <span>最高溫</span>
                    <b className="warm">{formatValue(dailyMetrics.high)}</b>
                  </div>
                  <div>
                    <span>最低溫</span>
                    <b className="cool">{formatValue(dailyMetrics.low)}</b>
                  </div>
                  <div>
                    <span>平均溫</span>
                    <b>{formatValue(dailyMetrics.mean)}</b>
                  </div>
                </div>
              </section>
              <section className="detail-card chart-card">
                <div className="tab-bar" role="tablist" aria-label="觀測時段">
                  <button
                    role="tab"
                    aria-selected={activeTab === "hourly"}
                    onClick={() => setActiveTab("hourly")}
                  >
                    24 小時觀測
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === "monthly"}
                    onClick={() => setActiveTab("monthly")}
                  >
                    近一個月氣溫
                  </button>
                </div>
                {activeTab === "monthly" && (
                  <label className="select-row">
                    顯示數據
                    <select
                      value={monthlyDisplayType}
                      onChange={(event) =>
                        setMonthlyDisplayType(
                          event.target.value as typeof monthlyDisplayType,
                        )
                      }
                    >
                      <option value="all">全部氣溫</option>
                      <option value="high">最高溫</option>
                      <option value="mean">平均溫</option>
                      <option value="low">最低溫</option>
                    </select>
                  </label>
                )}
                {(activeTab === "hourly" ? hourlyLoading : monthlyLoading) && (
                  <p className="muted" role="status">
                    正在更新歷史資料…
                  </p>
                )}
                {(activeTab === "hourly" ? hourlyError : monthlyError) && (
                  <p className="chart-error" role="alert">
                    {activeTab === "hourly" ? hourlyError : monthlyError}
                  </p>
                )}
                {currentChart.length ? (
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={currentChart}
                        margin={{ top: 12, right: 4, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="var(--rule)"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey={activeTab === "hourly" ? "time" : "date"}
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          minTickGap={35}
                        />
                        <YAxis
                          yAxisId="temperature"
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          unit="°"
                        />
                        <YAxis
                          yAxisId="humidity"
                          orientation="right"
                          domain={[0, 100]}
                          hide
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--sheet)",
                            border: "1px solid var(--rule)",
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {activeTab === "hourly" ? (
                          <>
                            <Line
                              yAxisId="temperature"
                              dataKey="temperature"
                              name="氣溫 °C"
                              stroke="#0d8f84"
                              dot={false}
                              strokeWidth={2}
                            />
                            <Line
                              yAxisId="humidity"
                              dataKey="humidity"
                              name="濕度 %"
                              stroke="#1d4ed8"
                              dot={false}
                              strokeWidth={1.5}
                            />
                            <Line
                              yAxisId="rain"
                              dataKey="precipitation"
                              name="雨量 mm"
                              stroke="#7a3fc4"
                              dot={false}
                            />
                            <YAxis yAxisId="rain" orientation="right" hide />
                          </>
                        ) : (
                          (["high", "mean", "low"] as const)
                            .filter(
                              (key) =>
                                monthlyDisplayType === "all" ||
                                monthlyDisplayType === key,
                            )
                            .map((key) => (
                              <Line
                                key={key}
                                yAxisId="temperature"
                                dataKey={key}
                                name={
                                  {
                                    high: "最高溫 °C",
                                    mean: "平均溫 °C",
                                    low: "最低溫 °C",
                                  }[key]
                                }
                                stroke={
                                  {
                                    high: "#d23a2e",
                                    mean: "#0d8f84",
                                    low: "#1d4ed8",
                                  }[key]
                                }
                                dot={false}
                                strokeWidth={2}
                              />
                            ))
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="empty">目前沒有這個時段的觀測資料。</p>
                )}
              </section>
            </>
          )}

          <section className="detail-card">
            <h3>
              多站溫度比較 <small>{comparedStationIds.length}/5</small>
            </h3>
            <div className="comparison-chips">
              {comparedStationIds.map((id) => (
                <span key={id}>
                  <button onClick={() => chooseStation(id)}>
                    {stationsList.find((station) => station.id === id)?.name ||
                      id}
                  </button>
                  <button
                    aria-label={`移除 ${stationsList.find((station) => station.id === id)?.name || id}`}
                    onClick={() => handleToggleComparison(id)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {comparedStationIds.length > 0 && (
              <>
                <button
                  className="text-button"
                  onClick={() => setComparedStationIds([selectedStationId])}
                >
                  只保留目前測站
                </button>
                {(activeTab === "hourly"
                  ? comparisonHourlyChartData
                  : comparisonMonthlyChartData
                ).length > 0 && (
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={
                          activeTab === "hourly"
                            ? comparisonHourlyChartData
                            : comparisonMonthlyChartData
                        }
                        margin={{ top: 12, right: 4, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="var(--rule)"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey={activeTab === "hourly" ? "time" : "date"}
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          minTickGap={35}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          unit="°"
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--sheet)",
                            border: "1px solid var(--rule)",
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {comparedStationIds.map((id, index) => (
                          <Line
                            key={id}
                            dataKey={
                              stationsList.find((station) => station.id === id)
                                ?.name || id
                            }
                            stroke={chartColors[index]}
                            dot={false}
                            strokeWidth={2}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
            {comparedStationIds.length === 0 && (
              <p className="muted">選擇測站後，按「加入溫度比較」即可比較。</p>
            )}
          </section>
          {selectedStationData && (
            <section className="detail-card">
              <h3>AI 氣候趨勢分析</h3>
              <p className="muted">依據目前測站近一個月的氣溫資料產生分析。</p>
              <button
                className="outline-button"
                disabled={aiLoading || monthlyLoading || !monthlyData?.length}
                onClick={fetchAIAnalysis}
              >
                <Activity size={15} />
                {aiLoading
                  ? "分析中…"
                  : aiAnalysis
                    ? "重新產生分析"
                    : "產生氣候分析"}
              </button>
              {aiError && (
                <p className="chart-error" role="alert">
                  {aiError}
                </p>
              )}
              {aiAnalysis && <p className="analysis-copy">{aiAnalysis}</p>}
            </section>
          )}
          <section className="station-browser">
            <h3 className="section-title">
              測站列表 <small>{filteredStations.length} 站</small>
            </h3>
            <label className="select-row">
              測站類型
              <select
                value={selectedType}
                onChange={(event) =>
                  setSelectedType(event.target.value as typeof selectedType)
                }
              >
                <option value="all">全部類型</option>
                <option value="manned">有人氣象站</option>
                <option value="auto">自動氣象站</option>
              </select>
            </label>
            <div className="station-list">
              {filteredStations.map((station) => (
                <button
                  className="station-row"
                  key={station.id}
                  aria-pressed={selectedStationId === station.id}
                  onClick={() => chooseStation(station.id)}
                >
                  <MapPin size={14} />
                  <span>
                    {station.name}
                    <small>{station.id}</small>
                  </span>
                  <b>{formatValue(station.realtime?.temperature)}</b>
                </button>
              ))}
              {!loading && !filteredStations.length && (
                <p className="empty">沒有符合條件的測站。</p>
              )}
            </div>
          </section>
          {taiwanStats && (
            <section className="detail-card">
              <h3>全臺單日氣溫概況</h3>
              <dl className="key-values">
                <dt>最高溫</dt>
                <dd className="warm">
                  {taiwanStats.maxHighStation} ·{" "}
                  {formatValue(taiwanStats.maxHigh)}
                </dd>
                <dt>最低溫</dt>
                <dd className="cool">
                  {taiwanStats.minLowStation} ·{" "}
                  {formatValue(taiwanStats.minLow)}
                </dd>
                <dt>平均高溫</dt>
                <dd>{formatValue(taiwanStats.averageHigh)}</dd>
              </dl>
            </section>
          )}
          <footer className="data-note">
            <p>點選地圖測站查看觀測資訊，或按右下角定位按鈕尋找最近測站。</p>
            <p>
              資料來源：
              <a
                href="https://opendata.cwa.gov.tw"
                target="_blank"
                rel="noreferrer"
              >
                交通部中央氣象署
              </a>
              。觀測資料可能延遲，日報為完整單日統計。
            </p>
            <span className="mono">TAIWAN WEATHER OBSERVATION</span>
          </footer>
        </div>
      </aside>
    </div>
  );
}
