export interface CWAStation {
  StationID: string;
  StationName: string;
  StationNameEN: string;
  StationAttribute: string;
}

export interface CWAWeatherElements {
  AirPressure?: string;
  AirTemperature?: string;
  RelativeHumidity?: string;
  WindSpeed?: string;
  WindDirection?: string;
  Precipitation?: string;
  SunshineDuration?: string;
}

export interface CWAObsTime {
  DateTime: string;
  weatherElements: CWAWeatherElements;
}

export interface CWADailyAirTemperature {
  Date: string;
  Maximum: number;
  Minimum: number;
  Mean: number;
}

export interface CWAObsStatistics {
  AirTemperature?: {
    daily?: CWADailyAirTemperature[];
  };
}

export interface CWALocation {
  station: CWAStation;
  stationObsTimes?: {
    stationObsTime?: CWAObsTime[];
  };
  stationObsStatistics?: CWAObsStatistics;
  realtime?: {
    stationId: string;
    obsTime: string;
    temperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    todayHigh: number | null;
    todayLow: number | null;
  };
}

export interface CWAResponse {
  success: string;
  result: {
    resource_id: string;
    fields: Array<{ id: string; type: string }>;
  };
  records: {
    location: CWALocation[];
  };
}

// Visual type used for charts
export interface ChartDataPoint {
  time: string;
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
}
