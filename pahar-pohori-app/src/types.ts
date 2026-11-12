/** Shapes returned by the FastAPI backend (`../backend`). */

export type Level = 'SAFE' | 'WATCH' | 'DANGER' | 'NO_DATA';

export interface HillStatus {
  level: Level;
  probability: number | null;
  reasons: string[];
  verified_by_nisar: boolean;
  danger_until: string | null;
  updated_at: string | null;
  /** Sensor rainfall summed over the model window (~5 h). */
  rain_mm_5h?: number | null;
}

export interface Reading {
  id?: number;
  hill_id?: number;
  device_id?: string;
  ts: string;
  wind_speed: number;
  humidity: number;
  temperature: number;
  soil_moisture: number;
  acceleration: number;
  rainfall_mm?: number;
}

export interface Hill {
  hill_id: number;
  name: string;
  district: string;
  lat: number;
  lon: number;
  slope_deg: number;
  device_id: string;
  status: HillStatus;
  latest_reading: Reading | null;
  nisar?: Nisar | null;
}

export interface Nisar {
  hill_id: number;
  nisar_date: string;
  nisar_soil_moisture: number;
  los_velocity_mm_month: number;
  coherence: number;
}

export interface HillDetail extends Hill {
  nisar: Nisar | null;
}

/** GET /api/risk-timeline — model replayed hourly over the 7-day archive. */
export interface RiskTimeline {
  step_hours: number;
  times: string[];
  hills: Record<string, { p: number[]; level: Level[]; soil: number[] }>;
}

/** Open-Meteo rain forecast for one hill. */
export interface RainForecast {
  times: string[];          // hourly, local time
  rain: number[];           // mm per hour
  prob: number[];           // % chance
  soil: number[];           // m3/m3 top-layer soil moisture (model)
  nowIndex: number;         // index of the current hour
  next24: number;           // mm
  next72: number;           // mm
  past48: number;           // mm
  peakHour: number;         // mm/h
  peakTime: string | null;
  fetchedAt: string;
}

export type MapType = 'standard' | 'satellite' | 'terrain';
export type DataLayer = 'risk' | 'creep' | 'soil';

export interface RouteStep {
  instruction: string;
  name: string;
  type: string;
  modifier?: string;
  distance: number;   // m
  duration: number;   // s
  location: [number, number]; // lon, lat
  cumDist: number;    // distance from start of route to this maneuver (m)
}

export interface RoadRoute {
  coords: { latitude: number; longitude: number }[];
  cum: number[];      // cumulative distance at each coordinate (m)
  distance: number;   // m
  duration: number;   // s
  steps: RouteStep[];
  real: boolean;      // false = straight-line fallback
}

export interface Alert {
  id: number;
  hill_id: number;
  hill_name: string;
  level: Level;
  probability: number;
  message_bn: string;
  message_en: string;
  created_at: string;
}

export interface Shelter {
  shelter_id: number;
  name: string;
  name_bn: string;
  district: string;
  lat: number;
  lon: number;
  capacity: number;
  type: string;
  facilities: string[];
  phone: string;
  source?: string;
  distance_km?: number;
}

export interface Contact {
  id: string;
  name: string;
  name_bn: string;
  number: string;
  description: string;
  description_bn: string;
  primary: boolean;
}

export interface Summary {
  total_hills: number;
  counts: Record<Level, number>;
  alerts_24h: number;
  updated_at: string | null;
}

export interface ModelInfo {
  roc_auc: number;
  feature_importance: Record<string, number>;
}

export type HazardType = 'crack' | 'seepage' | 'tilting' | 'rockfall' | 'small_slide' | 'other';
export type Severity = 'low' | 'medium' | 'high';

export interface ReportInput {
  hill_id: number | null;
  hazard_type: HazardType;
  severity: Severity;
  description: string;
  lat?: number | null;
  lon?: number | null;
  reporter_name?: string | null;
  reporter_phone?: string | null;
}

export interface CommunityReport {
  id: number;
  hill_id: number | null;
  hill_name: string | null;
  hazard_type: HazardType;
  severity: Severity;
  description: string;
  lat: number | null;
  lon: number | null;
  reporter_name: string | null;
  created_at: string;
}

export interface DemoSnapshot {
  generated_at: string;
  summary: Summary;
  hills: Hill[];
  alerts: Alert[];
  shelters: Shelter[];
  contacts: Contact[];
  modelInfo: ModelInfo;
  details: Record<string, HillDetail>;
  timeline?: RiskTimeline;
  history: Record<string, Reading[]>;
  hillShelters: Record<string, Shelter[]>;
}

/** Where the data on screen came from. */
export type Source = 'live' | 'cache' | 'demo';

/* ---------------- live system (GET /api/system-status, /api/live-feed) ---------------- */
export interface NodeStatus {
  hill_id: number;
  hill_name: string;
  district: string;
  device_id: string;
  online: boolean;
  last_ts: string | null;
  readings_total: number;
  latest: Reading | null;
  soil_trend: number[];
  accel_trend: number[];
  probability: number | null;
  level: Level;
  verified_by_nisar: boolean;
  scored_at: string | null;
  nisar_date: string | null;
}

export interface SystemStatus {
  server_time: string;
  uptime_s: number;
  simulated: boolean;
  intervals: { sensor_s: number; model_s: number };
  readings: { total: number; since_start: number; real_packets: number; per_min: number; archive_start: string | null };
  model: {
    type: string; trees: number | null; features: number; window_readings: number; window_hours?: number;
    danger_threshold: number; watch_threshold: number; runs: number; hill_scores: number;
    last_ms: number | null; avg_ms: number | null; last_run_at: string | null;
  };
  nisar: { hills_covered: number; latest_pass: string | null; products: string[] };
  alerts: { total: number; since_start: number };
  reports_total: number;
  db_mb: number | null;
  nodes: NodeStatus[];
}

export interface LiveEvent {
  id: number;
  ts: string;
  kind: 'reading' | 'model' | 'alert' | 'system' | 'error';
  text: string;
  hill_id?: number;
  device_id?: string;
  real?: boolean;
}

export interface SavedPlace {
  key: string;            // 'hill:3' | 'shelter:6' | 'place:<osm id>'
  kind: 'hill' | 'shelter' | 'place';
  id: number | string;
  name: string;
  lat: number;
  lon: number;
}

export interface GeoResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  type: string;
}
