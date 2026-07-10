import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Label,
} from 'recharts';
import {
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
  Droplets,
  Search,
  RefreshCw,
  TrendingUp,
  MapPin,
  Activity,
  Info,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { CWALocation, CWAResponse, ChartDataPoint } from './types';
import WeatherMap from './components/WeatherMap';

// Regional classification of weather stations in Taiwan (Manned & Automatic)
const REGION_MAP: Record<string, string> = {
  // Northern Region (Manned)
  '466940': '北部地區', // 基隆
  '466920': '北部地區', // 臺北
  '466910': '北部地區', // 鞍部
  '466930': '北部地區', // 竹子湖
  '466900': '北部地區', // 淡水
  '466881': '北部地區', // 新北
  '466880': '北部地區', // 板橋
  '466850': '北部地區', // 五分山雷達站
  '466921': '北部地區', // 臺北(師院)
  '467050': '北部地區', // 新屋
  '467571': '北部地區', // 新竹
  '467570': '北部地區', // 新竹 (舊)
  // Northern Region (Automatic)
  'C0U650': '北部地區', // 七堵
  'C0A9C0': '北部地區', // 內湖
  'C0AK30': '北部地區', // 硬漢嶺
  'C0AH80': '北部地區', // 深坑
  'C0A530': '北部地區', // 坪林
  'C0AH50': '北部地區', // 林口
  'C0A890': '北部地區', // 雙溪
  'C0UA70': '北部地區', // 桃源谷
  'C0UA60': '北部地區', // 樟樹山
  'C0C460': '北部地區', // 復興
  
  // Central Region (Manned)
  '467280': '中部地區', // 後龍
  '467770': '中部地區', // 梧棲
  '467490': '中部地區', // 臺中
  '467270': '中部地區', // 田中
  '467650': '中部地區', // 日月潭
  '467530': '中部地區', // 阿里山
  '467480': '中部地區', // 嘉義
  // Central Region (Automatic)
  'C0HA10': '中部地區', // 奧萬大
  'C0HA20': '中部地區', // 杉林溪
  'C0FA60': '中部地區', // 鞍馬山
  'C0FA70': '中部地區', // 大雪山
  'C0F9V0': '中部地區', // 新社
  'C0I080': '中部地區', // 信義
  
  // Southern Region (Manned)
  '467290': '南部地區', // 古坑
  '467420': '南部地區', // 永康
  '467411': '南部地區', // 臺南(永康)
  '467410': '南部地區', // 臺南
  '467441': '南部地區', // 高雄
  '467440': '南部地區', // 高雄 (舊)
  '467590': '南部地區', // 恆春
  '467780': '南部地區', // 七股
  // Southern Region (Automatic)
  'C2V310': '南部地區', // 美濃
  'C0R690': '南部地區', // 墾丁
  'C0R840': '南部地區', // 牡丹池山
  
  // Eastern Region (Manned)
  '467080': '東部地區', // 宜蘭
  '467060': '東部地區', // 蘇澳
  '460010': '東部地區', // 金六結
  '466990': '東部地區', // 花蓮
  '467610': '東部地區', // 成功
  '467660': '東部地區', // 臺東
  '467540': '東部地區', // 大武
  // Eastern Region (Automatic)
  'C0TB40': '東部地區', // 崇德
  'C0TA40': '東部地區', // 秀林
  'C0TA50': '東部地區', // 和仁
  'C0TA80': '東部地區', // 立霧山
  'C0SD20': '東部地區', // 富山
  'C0U940': '東部地區', // 羅東
  'C0U600': '東部地區', // 礁溪
  'C0U710': '東部地區', // 太平山
  'C0S690': '東部地區', // 太麻里
  'C0U520': '東部地區', // 雙連埤
  'C0T820': '東部地區', // 天祥
  'C0T9B0': '東部地區', // 水源
  
  // Islands & High Altitude (Manned)
  '467550': '高山離島', // 玉山
  '460020': '高山離島', // 鹿林山
  '466950': '高山離島', // 彭佳嶼
  '467300': '高山離島', // 東吉島
  '467350': '高山離島', // 澎湖
  '467110': '高山離島', // 金門
  '467620': '高山離島', // 蘭嶼
  '467990': '高山離島', // 馬祖
  '467790': '高山離島', // 墾丁雷達站
  // Islands & High Altitude (Automatic)
  'C0SD30': '高山離島', // 東清
  'C0R270': '高山離島', // 琉球嶼
  'A0W080': '高山離島', // 吉貝
  'C0W160': '高山離島', // 烏坵
  'CAW010': '高山離島', // 東引
};

const formatRealtimeObsTime = (obsTime: string | undefined | null) => {
  if (!obsTime) return '';
  const d = new Date(obsTime);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const match = obsTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return obsTime;
};

export default function App() {
  const [data, setData] = useState<CWAResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string>(() => {
    try {
      return localStorage.getItem('defaultStationId') || '466920';
    } catch {
      return '466920';
    }
  }); // Default to Taipei (466920) or last saved station
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'manned' | 'auto'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Comparison states
  const [comparedStationIds, setComparedStationIds] = useState<string[]>(() => {
    try {
      const defaultId = localStorage.getItem('defaultStationId') || '466920';
      return [defaultId];
    } catch {
      return ['466920'];
    }
  });
  const [comparedMonthlyData, setComparedMonthlyData] = useState<Record<string, any[]>>({});

  // Hourly 24h scraped states
  const [hourlyData, setHourlyData] = useState<Record<string, any[]>>({});
  const [hourlyLoading, setHourlyLoading] = useState<boolean>(false);
  const [hourlyError, setHourlyError] = useState<string | null>(null);

  // Monthly 30-day historical states
  const [monthlyData, setMonthlyData] = useState<{ date: string; high: number; low: number; mean: number }[] | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hourly' | 'monthly'>('hourly');
  const [monthlyDisplayType, setMonthlyDisplayType] = useState<'all' | 'high' | 'mean' | 'low'>('all');

  // AI Climate analysis states
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch data on mount
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/weather');
      if (!response.ok) {
        throw new Error(`Failed to fetch weather data: ${response.statusText}`);
      }
      const json: CWAResponse = await response.json();
      if (!json.records || !json.records.location) {
        throw new Error('API response has unexpected format (missing records.location)');
      }
      setData(json);
      
      // If our selected station isn't in the response, pick the first available one
      const stations = json.records.location;
      const found = stations.find((loc) => loc.station.StationID === selectedStationId);
      if (!found && stations.length > 0) {
        setSelectedStationId(stations[0].station.StationID);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching weather data.');
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
      const response = await fetch(`/api/weather/monthly?stationId=${stationId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly data: ${response.statusText}`);
      }
      const json = await response.json();
      setMonthlyData(json.data || []);
      
      // Store in comparison cache too
      setComparedMonthlyData(prev => ({
        ...prev,
        [stationId]: json.data || []
      }));
    } catch (err: any) {
      console.error(err);
      setMonthlyError(err.message || '無法取得該測站之月報歷史氣溫數據');
    } finally {
      setMonthlyLoading(false);
    }
  };

  // Dedicated helper to fetch comparison monthly data silently
  const fetchMonthlyDataForComparison = async (stationId: string) => {
    try {
      const response = await fetch(`/api/weather/monthly?stationId=${stationId}`);
      if (response.ok) {
        const json = await response.json();
        setComparedMonthlyData(prev => ({
          ...prev,
          [stationId]: json.data || []
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch comparison monthly data for ${stationId}`, err);
    }
  };

  // Fetch 24-hour scraped hourly observations
  const fetchHourlyData = async (stationId: string) => {
    setHourlyLoading(true);
    setHourlyError(null);
    try {
      const response = await fetch(`/api/weather/hourly?stationId=${stationId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch hourly data: ${response.statusText}`);
      }
      const json = await response.json();
      setHourlyData(prev => ({
        ...prev,
        [stationId]: json.data || []
      }));
    } catch (err: any) {
      console.error(err);
      setHourlyError(err.message || '無法取得該測站之24小時變化數據');
    } finally {
      setHourlyLoading(false);
    }
  };

  // Helper to fetch comparison hourly data silently
  const fetchHourlyDataForComparison = async (stationId: string) => {
    try {
      const response = await fetch(`/api/weather/hourly?stationId=${stationId}`);
      if (response.ok) {
        const json = await response.json();
        setHourlyData(prev => ({
          ...prev,
          [stationId]: json.data || []
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch comparison hourly data for ${stationId}`, err);
    }
  };

  // Request AI-generated 1-month climate trend analysis
  const fetchAIAnalysis = async () => {
    if (!selectedStationId || !selectedStationData || !monthlyData) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch('/api/weather/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStationId,
          stationName: selectedStationData.station.StationName,
          monthlyData: monthlyData,
        }),
      });
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'AI 分析生成失敗');
      }
      const json = await response.json();
      setAiAnalysis(json.analysis);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'AI 分析服務暫時無法提供，請確認是否已設定 GEMINI_API_KEY 金鑰。');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch monthly data and reset AI report whenever selected station changes
  useEffect(() => {
    if (selectedStationId) {
      fetchHourlyData(selectedStationId);
      fetchMonthlyData(selectedStationId);
      setAiAnalysis(null);
      setAiError(null);
      try {
        localStorage.setItem('defaultStationId', selectedStationId);
      } catch (err) {
        console.error('Failed to save defaultStationId to localStorage', err);
      }
    }
  }, [selectedStationId]);

  // Fetch comparison monthly data whenever a new station is checked
  useEffect(() => {
    comparedStationIds.forEach(id => {
      if (!comparedMonthlyData[id]) {
        fetchMonthlyDataForComparison(id);
      }
      if (!hourlyData[id]) {
        fetchHourlyDataForComparison(id);
      }
    });
  }, [comparedStationIds, comparedMonthlyData, hourlyData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(true);
    if (selectedStationId) {
      fetchHourlyData(selectedStationId);
      fetchMonthlyData(selectedStationId);
      setAiAnalysis(null);
      setAiError(null);
    }
    // Refresh cached comparison data
    comparedStationIds.forEach(id => {
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
          const nonSelected = prev.filter(id => id !== selectedStationId);
          if (nonSelected.length > 0) {
            const keep = prev.filter(id => id === selectedStationId || id !== nonSelected[0]);
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
    return data.records.location.map((loc) => {
      const stationId = loc.station.StationID;
      
      let region = '其他地區';
      const county = loc.station.CountyName || '';
      
      if (['基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'].some(c => county.includes(c))) {
        region = '北部地區';
      } else if (['苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣'].some(c => county.includes(c))) {
        region = '中部地區';
      } else if (['嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣'].some(c => county.includes(c))) {
        region = '南部地區';
      } else if (['花蓮縣', '臺東縣'].some(c => county.includes(c))) {
        region = '東部地區';
      } else if (['澎湖縣', '金門縣', '連江縣'].some(c => county.includes(c))) {
        region = '高山離島';
      } else {
        region = REGION_MAP[stationId] || '其他地區';
      }
      
      // Get daily high
      const dailyTemps = loc.stationObsStatistics?.AirTemperature?.daily?.[0];
      const dailyHigh = dailyTemps?.Maximum ?? null;
      const dailyLow = dailyTemps?.Minimum ?? null;
      const dailyMean = dailyTemps?.Mean ?? null;

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
      
      const matchesRegion = selectedRegion === 'all' || st.region === selectedRegion;
      
      const matchesType = 
        selectedType === 'all' || 
        (selectedType === 'manned' && st.attribute === '署屬有人氣象站') ||
        (selectedType === 'auto' && st.attribute === '署屬自動氣象站');

      return matchesSearch && matchesRegion && matchesType;
    });
  }, [stationsList, searchQuery, selectedRegion, selectedType]);

  // Find the currently selected station details in the API payload
  const selectedStationData = useMemo(() => {
    if (!data?.records?.location) return null;
    return data.records.location.find(
      (loc) => loc.station.StationID === selectedStationId
    ) || null;
  }, [data, selectedStationId]);

  // Format hourly data for line chart
  const hourlyChartData = useMemo(() => {
    const records = hourlyData[selectedStationId] || [];
    if (records.length === 0) return [];

    return records
      .map((item) => {
        return {
          time: item.time, // Keep full original time (e.g. "07/10 16:00") to avoid duplicate keys in Recharts
          temperature: item.temperature,
          humidity: item.humidity,
          precipitation: item.precipitation,
        };
      })
      .filter((d) => d.temperature !== null); // Only plot hours with valid temperatures
  }, [hourlyData, selectedStationId]);

  // Generate hourly multi-station comparative dataset
  const comparisonHourlyChartData = useMemo(() => {
    const primaryRecords = hourlyData[selectedStationId] || [];
    if (primaryRecords.length === 0 || comparedStationIds.length === 0) return [];

    return primaryRecords.map((refItem) => {
      const point: Record<string, any> = { time: refItem.time }; // Keep full original time to avoid duplicate keys in Recharts

      comparedStationIds.forEach(id => {
        const stationName = stationsList.find(st => st.id === id)?.name || id;
        const stationRecords = hourlyData[id] || [];
        
        // Find matching record by matching the exact time string (e.g. "07/10 16:00")
        // fallback to matching just the hour if dates are different
        const matchRecord = stationRecords.find(r => r.time === refItem.time) || 
                            stationRecords.find(r => r.time.endsWith(refItem.time.substring(5)));

        if (matchRecord) {
          point[stationName] = matchRecord.temperature;
        } else {
          point[stationName] = null;
        }
      });

      return point;
    });
  }, [hourlyData, comparedStationIds, selectedStationId, stationsList]);

  // Generate monthly multi-station comparative dataset using daily average
  const comparisonMonthlyChartData = useMemo(() => {
    if (comparedStationIds.length === 0) return [];

    const baseMonthly = comparedMonthlyData[selectedStationId] || [];
    if (baseMonthly.length === 0) return [];

    return baseMonthly.map((day, idx) => {
      const point: Record<string, any> = { date: day.date };

      comparedStationIds.forEach(id => {
        const stationName = stationsList.find(st => st.id === id)?.name || id;
        const stationMonthly = comparedMonthlyData[id] || [];
        const matchDay = stationMonthly[idx] || stationMonthly.find(d => d.date === day.date);
        
        let valKey: 'high' | 'low' | 'mean' = 'mean';
        if (monthlyDisplayType === 'high') {
          valKey = 'high';
        } else if (monthlyDisplayType === 'low') {
          valKey = 'low';
        }
        
        point[stationName] = matchDay ? matchDay[valKey] : null;
      });

      return point;
    });
  }, [comparedStationIds, comparedMonthlyData, selectedStationId, stationsList, monthlyDisplayType]);

  // Find daily metrics
  const dailyMetrics = useMemo(() => {
    if (!selectedStationData?.stationObsStatistics?.AirTemperature?.daily?.[0]) {
      return { high: null, low: null, mean: null, date: '' };
    }
    const d = selectedStationData.stationObsStatistics.AirTemperature.daily[0];
    return {
      high: d.Maximum,
      low: d.Minimum,
      mean: d.Mean,
      date: d.Date,
    };
  }, [selectedStationData]);

  // Calculate stats across all of Taiwan
  const taiwanStats = useMemo(() => {
    if (stationsList.length === 0) return null;
    const highs = stationsList.map((st) => st.dailyHigh).filter((v): v is number => v !== null);
    const lows = stationsList.map((st) => st.dailyLow).filter((v): v is number => v !== null);
    
    if (highs.length === 0) return null;

    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);

    const maxHighStation = stationsList.find((st) => st.dailyHigh === maxHigh);
    const minLowStation = stationsList.find((st) => st.dailyLow === minLow);

    return {
      maxHigh,
      maxHighStation: maxHighStation?.name || '未知',
      minLow,
      minLowStation: minLowStation?.name || '未知',
      averageHigh: parseFloat((highs.reduce((a, b) => a + b, 0) / highs.length).toFixed(1)),
    };
  }, [stationsList]);

  // Custom tooltips for recharts
  const CustomHourlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const tempItem = payload.find((p: any) => p.dataKey === 'temperature');
      const humItem = payload.find((p: any) => p.dataKey === 'humidity');
      const precItem = payload.find((p: any) => p.dataKey === 'precipitation');

      return (
        <div className="bg-[#121214] border border-zinc-800 p-3.5 shadow-2xl rounded-xl text-xs font-sans text-zinc-100">
          <p className="font-semibold text-zinc-400 mb-1.5">時間: {label}</p>
          {tempItem && tempItem.value !== undefined && tempItem.value !== null && (
            <p className="text-amber-400 font-medium flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
              溫度: {tempItem.value} °C
            </p>
          )}
          {humItem && humItem.value !== undefined && humItem.value !== null && (
            <p className="text-sky-400 mt-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400"></span>
              濕度: {humItem.value} %
            </p>
          )}
          {precItem && precItem.value !== undefined && precItem.value !== null && (
            <p className="text-teal-400 mt-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-400"></span>
              雨量: {precItem.value === 0.05 ? '微量 (Trace)' : `${precItem.value} mm`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomComparisonTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#121214]/95 border border-zinc-800 p-3.5 shadow-2xl rounded-xl text-xs font-sans text-zinc-100 space-y-1.5 backdrop-blur-md">
          <p className="font-semibold text-zinc-400 mb-1">時間 / 日期: {label}</p>
          <div className="space-y-1">
            {payload.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                  <span className="text-zinc-300">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-amber-300">
                  {item.value !== null && item.value !== undefined ? `${item.value.toFixed(1)}°C` : 'NA'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-500 to-amber-300 p-2.5 rounded-xl text-zinc-950 shadow-md">
              <Sun className="h-6 w-6 animate-spin-slow" />
            </div>
            <div>
              <div className="font-serif italic text-xs text-amber-400 tracking-wider font-light uppercase mb-0.5">
                Meteorological Data Service
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                臺灣氣象局屬觀測日報
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  C-B0024-001
                </span>
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                中央氣象署 (CWA) 局屬氣象觀測站 - 24小時溫度與氣候日報折線圖
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-zinc-500 block">觀測數據日期</span>
              <span className="text-xs font-mono font-medium text-zinc-300">
                {selectedStationData?.realtime?.obsTime ? (
                  `${formatRealtimeObsTime(selectedStationData.realtime.obsTime)} (即時觀測)`
                ) : (
                  dailyMetrics.date ? `${dailyMetrics.date} (昨日完整日報)` : '載入中...'
                )}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-800 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              重新整理
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-3 bg-[#121214] border border-zinc-900 rounded-3xl shadow-sm">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-amber-500/10 border-t-amber-400 animate-spin" />
              <Sun className="h-6 w-6 text-amber-400 absolute top-3 left-3 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-zinc-400 animate-pulse">正在取得氣象日報資訊...</p>
          </div>
        ) : error ? (
          <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-400">載入氣象資料時出錯</h3>
              <p className="text-xs text-red-300">{error}</p>
              <button
                onClick={() => fetchData()}
                className="mt-3 inline-flex items-center text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
              >
                嘗試重新載入
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Compact Toolbar for Map Filters */}
            <div className="bg-[#121214] border border-zinc-900 rounded-3xl p-4 md:p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-gradient-to-tr from-amber-500/10 to-amber-400/5 p-2 rounded-xl text-amber-400 border border-amber-400/20 shrink-0">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">即時觀測地圖篩選</h3>
                    <p className="text-[10px] text-zinc-500">輸入關鍵字或選擇區域，地圖測站將會同步篩選與隱藏</p>
                  </div>
                </div>
                
                {/* Search query */}
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="搜尋測站名稱或代碼..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-colors"
                  />
                </div>
              </div>

              <div className="h-px bg-zinc-900/60" />

              <div className="flex flex-col md:flex-row md:items-center gap-5 text-xs">
                {/* Station Type Filter Tabs */}
                <div className="flex items-center gap-2.5">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">測站類型:</span>
                  <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850 gap-1 shadow-inner">
                    <button
                      onClick={() => setSelectedType('all')}
                      className={`px-3 py-1.5 font-semibold text-[11px] rounded-lg transition-all cursor-pointer ${
                        selectedType === 'all'
                          ? 'bg-zinc-900 border border-zinc-800 text-amber-400 font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      全部 ({stationsList.length})
                    </button>
                    <button
                      onClick={() => setSelectedType('manned')}
                      className={`px-3 py-1.5 font-semibold text-[11px] rounded-lg transition-all cursor-pointer ${
                        selectedType === 'manned'
                          ? 'bg-zinc-900 border border-zinc-800 text-amber-400 font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      有人站 ({stationsList.filter(s => s.attribute === '署屬有人氣象站').length})
                    </button>
                    <button
                      onClick={() => setSelectedType('auto')}
                      className={`px-3 py-1.5 font-semibold text-[11px] rounded-lg transition-all cursor-pointer ${
                        selectedType === 'auto'
                          ? 'bg-zinc-900 border border-zinc-800 text-amber-400 font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      自動站 ({stationsList.filter(s => s.attribute === '署屬自動氣象站').length})
                    </button>
                  </div>
                </div>

                {/* Region Filter Buttons */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">區域篩選:</span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setSelectedRegion('all')}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-xl border transition-all cursor-pointer ${
                        selectedRegion === 'all'
                          ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold shadow-md shadow-amber-950/20'
                          : 'bg-zinc-900/40 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
                      }`}
                    >
                      全部地區
                    </button>
                    {Array.from(new Set(Object.values(REGION_MAP))).map((reg) => {
                      const count = stationsList.filter(s => s.region === reg).length;
                      return (
                        <button
                          key={reg}
                          onClick={() => setSelectedRegion(reg)}
                          className={`px-3 py-1.5 text-[11px] font-medium rounded-xl border transition-all cursor-pointer ${
                            selectedRegion === reg
                              ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold shadow-md shadow-amber-950/20'
                              : 'bg-zinc-900/40 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
                          }`}
                        >
                          {reg.replace('地區', '')} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
              
              <div className="space-y-4">
                {/* Weather Map Display with dynamically filtered markers */}
                <WeatherMap 
                  stations={filteredStations} 
                  selectedStationId={selectedStationId} 
                  onSelectStation={setSelectedStationId} 
                />

                {/* Dynamic Comparison Chips Bar */}
                {comparedStationIds.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121214] border border-zinc-900 rounded-3xl p-4 shadow-sm text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-zinc-400 font-bold tracking-wider shrink-0 mr-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        溫度趨勢對比中 ({comparedStationIds.length}/5)：
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {comparedStationIds.map((id) => {
                          const st = stationsList.find((s) => s.id === id);
                          if (!st) return null;
                          const isSelected = st.id === selectedStationId;
                          return (
                            <div
                              key={id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                isSelected
                                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-300 shadow-md'
                                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                              }`}
                            >
                              <button
                                onClick={() => setSelectedStationId(id)}
                                className="hover:underline cursor-pointer"
                              >
                                {st.name}
                              </button>
                              <button
                                onClick={() => handleToggleComparison(id)}
                                className="hover:text-rose-400 text-zinc-500 font-bold transition-all text-[11px] cursor-pointer pl-0.5"
                                title="移出對比"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {comparedStationIds.length > 0 && (
                      <button
                        onClick={() => setComparedStationIds([selectedStationId].filter(Boolean))}
                        className="text-[11px] text-zinc-400 hover:text-rose-400 font-bold transition-all cursor-pointer hover:underline underline-offset-4 shrink-0 border border-zinc-850 hover:border-rose-900/30 px-3 py-1.5 rounded-xl bg-zinc-950/40"
                      >
                        一鍵取消對比 (只保留當前站)
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected Station Core Details & Stats Card */}
              {selectedStationData && (
                <div className="bg-[#121214] border border-zinc-900 rounded-3xl p-6 shadow-sm">
                  
                  {/* Station Title with Inline Toggle Comparison */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="bg-amber-400/10 p-3 rounded-2xl text-amber-400 border border-amber-400/20 shrink-0">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-white">{selectedStationData.station.StationName} 氣象站</h2>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-950 text-zinc-400 font-medium border border-zinc-850">
                            ID: {selectedStationData.station.StationID}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium border border-amber-400/20">
                            {REGION_MAP[selectedStationData.station.StationID] || '未知地區'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          英文名稱: {selectedStationData.station.StationNameEN} | 屬性: {selectedStationData.station.StationAttribute}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Toggle Comparison Button */}
                      <button
                        onClick={() => handleToggleComparison(selectedStationData.station.StationID)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer shadow-sm ${
                          comparedStationIds.includes(selectedStationData.station.StationID)
                            ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={comparedStationIds.includes(selectedStationData.station.StationID)}
                          onChange={() => {}} // Controlled by button click
                          className="h-3.5 w-3.5 rounded border-zinc-800 text-amber-400 focus:ring-amber-400/40 bg-zinc-950 accent-amber-400 pointer-events-none"
                        />
                        <span>納入多站溫度對比 ({comparedStationIds.length}/5)</span>
                      </button>
                    </div>
                  </div>

                  {/* Realtime Current Weather Block */}
                  {selectedStationData.realtime && (
                    <div className="mt-5 p-4 bg-zinc-950/80 rounded-2xl border border-emerald-500/15 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20">
                            <Activity className="h-5 w-5" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-zinc-100">今日即時觀測數據</h3>
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold uppercase tracking-wider animate-pulse">
                              LIVE 即時連線
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            最後更新觀測時間：{formatRealtimeObsTime(selectedStationData.realtime.obsTime)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
                        <div className="flex items-center gap-2.5 bg-zinc-900/40 py-1.5 px-3 rounded-xl border border-zinc-850">
                          <Thermometer className="h-4 w-4 text-amber-400 shrink-0" />
                          <div>
                            <span className="text-[9px] text-zinc-500 block leading-tight">目前氣溫</span>
                            <span className="text-xs font-mono font-bold text-amber-300">
                              {selectedStationData.realtime.temperature !== null ? `${selectedStationData.realtime.temperature.toFixed(1)}°C` : 'NA'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-zinc-900/40 py-1.5 px-3 rounded-xl border border-zinc-850">
                          <Droplets className="h-4 w-4 text-sky-400 shrink-0" />
                          <div>
                            <span className="text-[9px] text-zinc-500 block leading-tight">相對濕度</span>
                            <span className="text-xs font-mono font-bold text-sky-300">
                              {selectedStationData.realtime.humidity !== null ? `${selectedStationData.realtime.humidity}%` : '--'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-zinc-900/40 py-1.5 px-3 rounded-xl border border-zinc-850">
                          <CloudRain className="h-4 w-4 text-teal-400 shrink-0" />
                          <div>
                            <span className="text-[9px] text-zinc-500 block leading-tight">本日雨量</span>
                            <span className="text-xs font-mono font-bold text-teal-300">
                              {selectedStationData.realtime.precipitation !== null ? `${selectedStationData.realtime.precipitation.toFixed(1)} mm` : '0.0 mm'}
                            </span>
                          </div>
                        </div>

                        {selectedStationData.realtime.todayHigh !== null && (
                          <div className="flex items-center gap-2.5 bg-zinc-900/40 py-1.5 px-3 rounded-xl border border-zinc-850">
                            <TrendingUp className="h-4 w-4 text-rose-400 shrink-0" />
                            <div>
                              <span className="text-[9px] text-zinc-500 block leading-tight">今日最高</span>
                              <span className="text-xs font-mono font-bold text-rose-400">
                                {selectedStationData.realtime.todayHigh.toFixed(1)}°C
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3 Metric cards inside Station */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {/* Daily High */}
                    <div className="bg-gradient-to-b from-amber-500/10 to-zinc-950/20 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="text-xs font-semibold">最高溫度 (Daily High)</span>
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-mono font-bold text-amber-300">
                          {dailyMetrics.high !== null ? `${dailyMetrics.high.toFixed(1)}` : 'NA'}
                        </span>
                        {dailyMetrics.high !== null && <span className="text-xs text-amber-400 font-semibold ml-0.5">°C</span>}
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-2">一日中最高溫度點</span>
                    </div>

                    {/* Daily Low */}
                    <div className="bg-gradient-to-b from-sky-500/10 to-zinc-950/20 border border-sky-500/20 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-sky-400">
                        <span className="text-xs font-semibold">最低溫度 (Daily Low)</span>
                        <TrendingDown className="h-4 w-4" />
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-mono font-bold text-sky-300">
                          {dailyMetrics.low !== null ? `${dailyMetrics.low.toFixed(1)}` : 'NA'}
                        </span>
                        {dailyMetrics.low !== null && <span className="text-xs text-sky-400 font-semibold ml-0.5">°C</span>}
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-2">一日中最低溫度點</span>
                    </div>

                    {/* Daily Mean */}
                    <div className="bg-gradient-to-b from-teal-500/10 to-zinc-950/20 border border-teal-500/20 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-teal-400">
                        <span className="text-xs font-semibold">平均溫度 (Daily Mean)</span>
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-mono font-bold text-teal-300">
                          {dailyMetrics.mean !== null ? `${dailyMetrics.mean.toFixed(1)}` : 'NA'}
                        </span>
                        {dailyMetrics.mean !== null && <span className="text-xs text-teal-400 font-semibold ml-0.5">°C</span>}
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-2">一日平均觀測值</span>
                    </div>

                    {/* Hourly High Point Time */}
                    <div className="bg-gradient-to-b from-zinc-800/20 to-zinc-950/20 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-xs font-semibold">最高溫時間點</span>
                        <Sun className="h-4 w-4" />
                      </div>
                      <div className="mt-4">
                        <span className="text-xl font-bold text-zinc-200">
                          {(() => {
                            if (hourlyChartData.length === 0 || dailyMetrics.high === null) return '--:--';
                            // Find hour with temperature closest to daily high
                            const closestHour = hourlyChartData.reduce((prev, curr) => {
                              if (prev.temperature === null) return curr;
                              if (curr.temperature === null) return prev;
                              return Math.abs(curr.temperature - dailyMetrics.high!) < Math.abs(prev.temperature - dailyMetrics.high!)
                                ? curr
                                : prev;
                            }, hourlyChartData[0]);
                            return closestHour ? `${closestHour.time}` : '--:--';
                          })()}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-2">觀測最高溫發生的時刻</span>
                    </div>
                  </div>

                  {/* Tab Selector for Hourly vs Monthly Chart */}
                  <div className="mt-8">
                    <div className="flex border-b border-zinc-800 mb-6">
                      <button
                        onClick={() => setActiveTab('hourly')}
                        className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeTab === 'hourly'
                            ? 'border-amber-400 text-amber-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Activity className="h-4 w-4" />
                        24小時溫度與濕度觀測
                      </button>
                      <button
                        onClick={() => setActiveTab('monthly')}
                        className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeTab === 'monthly'
                            ? 'border-amber-400 text-amber-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4" />
                        <span>過去一個月逐日氣溫</span>
                        <span className="text-[9px] font-normal bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                          日資料
                        </span>
                      </button>
                    </div>

                    {activeTab === 'hourly' ? (
                      <div>
                        {/* 24-Hour Temperature Line Chart */}
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                                <span>24小時溫度與濕度變化折線圖</span>
                                {comparedStationIds.length > 1 ? (
                                  <span className="text-[10px] font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                                    多站對比模式
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-normal text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-850">單站觀測</span>
                                )}
                              </h3>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                {comparedStationIds.length > 1
                                  ? '對比已選取測站昨日 24 小時的溫度趨勢曲線'
                                  : '昨日 01:00 至 24:00 (00:00) 溫度趨勢、濕度與降雨量曲線'}
                              </p>
                            </div>
                            {comparedStationIds.length <= 1 && (
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                                  <span className="text-[10px] text-zinc-400 font-medium">溫度 (°C)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                                  <span className="text-[10px] text-zinc-400 font-medium">濕度 (%)</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="h-[340px] w-full bg-zinc-950/50 rounded-2xl p-3 border border-zinc-900">
                            <ResponsiveContainer width="100%" height="100%">
                              {comparedStationIds.length <= 1 ? (
                                <LineChart data={hourlyChartData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                                  <defs>
                                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                  <XAxis 
                                    dataKey="time" 
                                    stroke="#71717a" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(val) => {
                                      const match = val.match(/\d{2}\/\d{2}\s+(\d{2}:\d{2})/);
                                      return match ? match[1] : val;
                                    }}
                                  />
                                  <YAxis 
                                    yAxisId="left"
                                    stroke="#fbbf24" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    domain={['auto', 'auto']}
                                  >
                                    <Label value="溫度 (°C)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#fbbf24', fontSize: 9 }} offset={-10} />
                                  </YAxis>
                                  <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#38bdf8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    domain={[0, 100]}
                                  >
                                    <Label value="相對濕度 (%)" angle={90} position="insideRight" style={{ textAnchor: 'middle', fill: '#38bdf8', fontSize: 9 }} offset={-10} />
                                  </YAxis>
                                  <Tooltip content={<CustomHourlyTooltip />} />
                                  
                                  {/* Reference line for Daily High */}
                                  {dailyMetrics.high !== null && (
                                    <ReferenceLine
                                      yAxisId="left"
                                      y={dailyMetrics.high}
                                      stroke="#fbbf24"
                                      strokeDasharray="4 4"
                                      label={{
                                        value: `最高溫 ${dailyMetrics.high.toFixed(1)}°C`,
                                        position: 'top',
                                        fill: '#fbbf24',
                                        fontSize: 9,
                                        fontWeight: 'bold'
                                      }}
                                    />
                                  )}

                                  {/* Reference line for Daily Low */}
                                  {dailyMetrics.low !== null && (
                                    <ReferenceLine
                                      yAxisId="left"
                                      y={dailyMetrics.low}
                                      stroke="#38bdf8"
                                      strokeDasharray="4 4"
                                      label={{
                                        value: `最低溫 ${dailyMetrics.low.toFixed(1)}°C`,
                                        position: 'bottom',
                                        fill: '#38bdf8',
                                        fontSize: 9,
                                        fontWeight: 'bold'
                                      }}
                                    />
                                  )}

                                  {/* Temperature line */}
                                  <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="temperature"
                                    stroke="#fbbf24"
                                    strokeWidth={3}
                                    dot={{ r: 3, stroke: '#d97706', strokeWidth: 1.5, fill: '#09090b' }}
                                    activeDot={{ r: 6, stroke: '#fbbf24', strokeWidth: 2 }}
                                  />

                                  {/* Humidity line */}
                                  <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="humidity"
                                    stroke="#38bdf8"
                                    strokeWidth={1.5}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                  />
                                </LineChart>
                              ) : (
                                <LineChart data={comparisonHourlyChartData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                  <XAxis 
                                    dataKey="time" 
                                    stroke="#71717a" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(val) => {
                                      const match = val.match(/\d{2}\/\d{2}\s+(\d{2}:\d{2})/);
                                      return match ? match[1] : val;
                                    }}
                                  />
                                  <YAxis 
                                    yAxisId="left"
                                    stroke="#e4e4e7" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    domain={['auto', 'auto']}
                                  >
                                    <Label value="溫度對比 (°C)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#e4e4e7', fontSize: 9 }} offset={-10} />
                                  </YAxis>
                                  <Tooltip content={<CustomComparisonTooltip />} />
                                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', color: '#e4e4e7' }} />
                                  {comparedStationIds.map((id, idx) => {
                                    const stationName = stationsList.find(st => st.id === id)?.name || id;
                                    const colors = ['#fbbf24', '#38bdf8', '#34d399', '#f87171', '#c084fc'];
                                    const isSelected = id === selectedStationId;
                                    return (
                                      <Line
                                        key={id}
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey={stationName}
                                        stroke={colors[idx % colors.length]}
                                        strokeWidth={isSelected ? 3.5 : 1.8}
                                        dot={{ r: isSelected ? 3 : 1.5 }}
                                        activeDot={{ r: 6 }}
                                      />
                                    );
                                  })}
                                </LineChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                        </div>

                      {/* Hourly Wind / rain/ pressure details at selected station */}
                        <div className="mt-6 border-t border-zinc-800 pt-6">
                          <h4 className="text-xs font-bold text-zinc-400 mb-3">其他每小時觀測指標 (選取時間)</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            {hourlyChartData.slice(-4).map((h, i) => (
                              <div key={i} className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-850 flex flex-col justify-between">
                                <span className="font-mono font-bold text-zinc-500">{h.time}</span>
                                <div className="mt-2 space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">溫度</span>
                                    <span className="font-semibold text-amber-400">{h.temperature !== null ? `${h.temperature}°C` : 'NA'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">濕度</span>
                                    <span className="font-semibold text-sky-400">{h.humidity !== null ? `${h.humidity}%` : '--'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-zinc-500">降雨</span>
                                    <span className="font-semibold text-teal-400">
                                      {h.precipitation !== null ? (h.precipitation === 0.05 ? '微量' : `${h.precipitation}mm`) : '0.0mm'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 1-Month Daily Temperature Chart */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4 mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                              <span>過去一個月逐日氣溫波動圖</span>
                              <span className="text-[10px] font-normal text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-850">日資料 (30天)</span>
                            </h3>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              每日觀測最高、最低、平均氣溫趨勢變化
                              {monthlyData && monthlyData.length > 0 && (
                                <span className="font-mono text-zinc-400 ml-1.5 bg-zinc-900 px-1.5 py-0.5 rounded">
                                  ({monthlyData[0].date} 至 {monthlyData[monthlyData.length - 1].date})
                                </span>
                              )}
                            </p>
                          </div>
                          
                          {/* Segmented Selector for monthly temperature display type */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 mr-1 hidden sm:inline-block">顯示：</span>
                            <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-850 flex gap-0.5">
                              <button
                                onClick={() => setMonthlyDisplayType('all')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                  monthlyDisplayType === 'all'
                                    ? 'bg-zinc-900 text-amber-400 border border-zinc-800 shadow-sm font-bold'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                全部
                              </button>
                              <button
                                onClick={() => setMonthlyDisplayType('high')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                  monthlyDisplayType === 'high'
                                    ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm font-bold'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                                最高溫
                              </button>
                              <button
                                onClick={() => setMonthlyDisplayType('mean')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                  monthlyDisplayType === 'mean'
                                    ? 'bg-teal-400/10 text-teal-400 border border-teal-400/20 shadow-sm font-bold'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block animate-pulse" />
                                平均溫
                              </button>
                              <button
                                onClick={() => setMonthlyDisplayType('low')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                  monthlyDisplayType === 'low'
                                    ? 'bg-sky-400/10 text-sky-400 border border-sky-400/20 shadow-sm font-bold'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block animate-pulse" />
                                最低溫
                              </button>
                            </div>
                          </div>
                        </div>

                        {monthlyLoading ? (
                          <div className="h-[340px] w-full bg-zinc-950/20 border border-zinc-900 rounded-2xl flex flex-col items-center justify-center gap-3">
                            <div className="h-8 w-8 rounded-full border-2 border-amber-500/10 border-t-amber-400 animate-spin" />
                            <p className="text-xs text-zinc-500">正在加載一個月歷史日報資料...</p>
                          </div>
                        ) : monthlyError ? (
                          <div className="h-[340px] w-full bg-zinc-950/20 border border-zinc-900 rounded-2xl flex items-center justify-center p-6 text-center">
                            <p className="text-xs text-red-400">{monthlyError}</p>
                          </div>
                        ) : monthlyData && monthlyData.length > 0 ? (
                          <div className="h-[340px] w-full bg-zinc-950/50 rounded-2xl p-3 border border-zinc-900">
                            <ResponsiveContainer width="100%" height="100%">
                              {comparedStationIds.length <= 1 ? (
                                <LineChart data={monthlyData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#71717a" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(tick) => {
                                      try {
                                        const parts = tick.split('-');
                                        return `${parts[1]}/${parts[2]}`;
                                      } catch (e) {
                                        return tick;
                                      }
                                    }}
                                  />
                                  <YAxis 
                                    stroke="#71717a" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    domain={['auto', 'auto']}
                                  >
                                    <Label 
                                      value={
                                        monthlyDisplayType === 'high' ? '最高氣溫 (°C)' : 
                                        monthlyDisplayType === 'low' ? '最低氣溫 (°C)' : 
                                        monthlyDisplayType === 'mean' ? '平均氣溫 (°C)' : 
                                        '氣溫 (°C)'
                                      } 
                                      angle={-90} 
                                      position="insideLeft" 
                                      style={{ textAnchor: 'middle', fill: '#71717a', fontSize: 9 }} 
                                      offset={-10} 
                                    />
                                  </YAxis>
                                  <Tooltip 
                                    content={({ active, payload, label }: any) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div className="bg-[#121214] border border-zinc-800 p-3.5 shadow-2xl rounded-xl text-xs font-sans text-zinc-100 space-y-1">
                                            <p className="font-semibold text-zinc-400 mb-1.5">日期: {label}</p>
                                            {payload.map((p: any) => {
                                              let labelText = '';
                                              let dotColor = '';
                                              let textColor = '';
                                              if (p.dataKey === 'high') {
                                                labelText = '最高氣溫';
                                                dotColor = 'bg-amber-400';
                                                textColor = 'text-amber-400';
                                              } else if (p.dataKey === 'low') {
                                                labelText = '最低氣溫';
                                                dotColor = 'bg-sky-400';
                                                textColor = 'text-sky-400';
                                              } else if (p.dataKey === 'mean') {
                                                labelText = '平均氣溫';
                                                dotColor = 'bg-teal-400';
                                                textColor = 'text-teal-400';
                                              }
                                              return (
                                                <p key={p.dataKey} className={`${textColor} font-medium flex items-center gap-1.5`}>
                                                  <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`}></span>
                                                  {labelText}: {p.value !== undefined && p.value !== null ? `${p.value.toFixed(1)} °C` : 'NA'}
                                                </p>
                                              );
                                            })}
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  {(monthlyDisplayType === 'all' || monthlyDisplayType === 'high') && (
                                    <Line
                                      type="monotone"
                                      dataKey="high"
                                      stroke="#fbbf24"
                                      strokeWidth={2.5}
                                      dot={{ r: 2, stroke: '#d97706', strokeWidth: 1, fill: '#09090b' }}
                                      activeDot={{ r: 5 }}
                                    />
                                  )}
                                  {(monthlyDisplayType === 'all' || monthlyDisplayType === 'low') && (
                                    <Line
                                      type="monotone"
                                      dataKey="low"
                                      stroke="#38bdf8"
                                      strokeWidth={2}
                                      dot={{ r: 2, stroke: '#0284c7', strokeWidth: 1, fill: '#09090b' }}
                                      activeDot={{ r: 5 }}
                                    />
                                  )}
                                  {(monthlyDisplayType === 'all' || monthlyDisplayType === 'mean') && (
                                    <Line
                                      type="monotone"
                                      dataKey="mean"
                                      stroke="#2dd4bf"
                                      strokeWidth={1.5}
                                      strokeDasharray={monthlyDisplayType === 'mean' ? undefined : "4 4"}
                                      dot={monthlyDisplayType === 'mean' ? { r: 2, stroke: '#0d9488', strokeWidth: 1, fill: '#09090b' } : false}
                                      activeDot={{ r: 4 }}
                                    />
                                  )}
                                </LineChart>
                              ) : (
                                <LineChart data={comparisonMonthlyChartData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#71717a" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(tick) => {
                                      try {
                                        const parts = tick.split('-');
                                        return `${parts[1]}/${parts[2]}`;
                                      } catch (e) {
                                        return tick;
                                      }
                                    }}
                                  />
                                  <YAxis 
                                    stroke="#e4e4e7" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    domain={['auto', 'auto']}
                                  >
                                    <Label 
                                      value={
                                        monthlyDisplayType === 'high' ? '最高氣溫對比 (°C)' : 
                                        monthlyDisplayType === 'low' ? '最低氣溫對比 (°C)' : 
                                        '平均氣溫對比 (°C)'
                                      } 
                                      angle={-90} 
                                      position="insideLeft" 
                                      style={{ textAnchor: 'middle', fill: '#e4e4e7', fontSize: 9 }} 
                                      offset={-10} 
                                    />
                                  </YAxis>
                                  <Tooltip content={<CustomComparisonTooltip />} />
                                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', color: '#e4e4e7' }} />
                                  {comparedStationIds.map((id, idx) => {
                                    const stationName = stationsList.find(st => st.id === id)?.name || id;
                                    const colors = ['#fbbf24', '#38bdf8', '#34d399', '#f87171', '#c084fc'];
                                    const isSelected = id === selectedStationId;
                                    return (
                                      <Line
                                        key={id}
                                        type="monotone"
                                        dataKey={stationName}
                                        stroke={colors[idx % colors.length]}
                                        strokeWidth={isSelected ? 3.5 : 1.8}
                                        dot={{ r: isSelected ? 3 : 1.5 }}
                                        activeDot={{ r: 6 }}
                                      />
                                    );
                                  })}
                                </LineChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-[340px] w-full bg-zinc-950/20 border border-zinc-900 rounded-2xl flex items-center justify-center">
                            <p className="text-xs text-zinc-500">無可用之月報歷史氣溫數據</p>
                          </div>
                        )}

                        {/* AI Climate Trend Assistant Box */}
                        <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5 mt-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
                          <div className="flex items-start gap-4">
                            <div className="bg-amber-400/10 p-2.5 rounded-xl text-amber-400 border border-amber-400/20 shrink-0 mt-1">
                              <Sun className="h-5 w-5 animate-spin-slow" />
                            </div>
                            <div className="space-y-3 w-full">
                              <div>
                                <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                                  AI 歷史氣候分析小幫手
                                  <span className="text-[9px] font-normal text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                                    Gemini 3.5 Flash
                                  </span>
                                </h4>
                                <p className="text-[11px] text-zinc-500 mt-0.5">深度分析該測站過去 30 天的氣溫走向、地區性氣候特徵與活動建議</p>
                              </div>

                              {aiAnalysis ? (
                                <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-zinc-900 font-sans whitespace-pre-line">
                                  {aiAnalysis}
                                </div>
                              ) : aiLoading ? (
                                <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-900 flex items-center gap-3 justify-center">
                                  <div className="h-4 w-4 rounded-full border-2 border-amber-500/10 border-t-amber-400 animate-spin" />
                                  <span className="text-xs text-zinc-400 animate-pulse">正在利用 Gemini 深度剖析 30 日溫度數據...</span>
                                </div>
                              ) : (
                                <button
                                  onClick={fetchAIAnalysis}
                                  disabled={!monthlyData || monthlyData.length === 0}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Sun className="h-3.5 w-3.5 shrink-0" />
                                  開始 AI 30日溫度數據特徵分析
                                </button>
                              )}

                              {aiError && (
                                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                                  <span>⚠️</span> {aiError}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Taiwan Stats Summary overview Cards */}
              {taiwanStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Hottest Station in Taiwan */}
                  <div className="bg-gradient-to-br from-amber-950/25 via-[#121214] to-[#121214] border border-amber-500/20 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-amber-400">
                      <span className="text-xs font-bold font-serif italic tracking-wider">全臺最高溫測站</span>
                      <Sun className="h-4 w-4" />
                    </div>
                    <div className="mt-3">
                      <h4 className="text-2xl font-bold tracking-tight text-zinc-100">{taiwanStats.maxHighStation}</h4>
                      <p className="text-xs text-zinc-500 mt-1">昨日最高溫達到</p>
                    </div>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-3xl font-mono font-black text-amber-400">{taiwanStats.maxHigh.toFixed(1)}</span>
                      <span className="text-sm font-bold text-amber-500 ml-0.5">°C</span>
                    </div>
                  </div>

                  {/* Coolest Station in Taiwan */}
                  <div className="bg-gradient-to-br from-sky-950/25 via-[#121214] to-[#121214] border border-sky-500/20 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-sky-400">
                      <span className="text-xs font-bold font-serif italic tracking-wider">全臺最低溫測站</span>
                      <TrendingDown className="h-4 w-4" />
                    </div>
                    <div className="mt-3">
                      <h4 className="text-2xl font-bold tracking-tight text-zinc-100">{taiwanStats.minLowStation}</h4>
                      <p className="text-xs text-zinc-500 mt-1">昨日最低溫降至</p>
                    </div>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-3xl font-mono font-black text-sky-400">{taiwanStats.minLow.toFixed(1)}</span>
                      <span className="text-sm font-bold text-sky-500 ml-0.5">°C</span>
                    </div>
                  </div>

                  {/* Average temperature in Taiwan */}
                  <div className="bg-gradient-to-br from-zinc-900/30 via-[#121214] to-[#121214] border border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="text-xs font-bold font-serif italic tracking-wider">全臺測站平均高溫</span>
                      <Info className="h-4 w-4" />
                    </div>
                    <div className="mt-3">
                      <h4 className="text-2xl font-bold tracking-tight text-zinc-100">所有觀測站</h4>
                      <p className="text-xs text-zinc-500 mt-1">局屬31測站之平均值</p>
                    </div>
                    <div className="mt-4 flex items-baseline text-zinc-100">
                      <span className="text-3xl font-mono font-bold text-amber-400">{taiwanStats.averageHigh.toFixed(1)}</span>
                      <span className="text-sm font-semibold ml-0.5 text-zinc-500">°C</span>
                    </div>
                  </div>
                </div>
              )}



            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#050507] text-zinc-500 py-10 mt-12 border-t border-zinc-950">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-4">
          <p className="text-xs">
            本服務之氣象觀測數據源自
            <a
              href="https://opendata.cwa.gov.tw"
              target="_blank"
              rel="noreferrer noopener"
              className="text-amber-400 hover:underline mx-1"
            >
              交通部中央氣象署氣象開放資料平台
            </a>
            ，屬於局屬氣象站日報資料 (C-B0024-001)。
          </p>
          <div className="flex justify-center gap-6 text-[11px] text-zinc-600">
            <span>數據延遲：觀測數據每日更新昨日完整報表</span>
            <span>系統狀態：執行正常</span>
            <span>授權條款：政府資料開放授權條款</span>
          </div>
          <p className="text-[10px] text-zinc-700 font-mono">
            © 2026 Taiwan Weather Dashboard. Designed with Inter & Playfair Display.
          </p>
        </div>
      </footer>
    </div>
  );
}
