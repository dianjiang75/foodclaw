export interface FootTrafficData {
  current_busyness_pct: number;
  is_busier_than_usual: boolean;
  estimated_wait_minutes: number | null;
  peak_hours_today: { start: string; end: string }[];
  quiet_hours_today: { start: string; end: string }[];
  raw_hourly_forecast: { hour: number; busyness_pct: number }[];
}

export interface DeliveryInfo {
  platform: "ubereats" | "doordash" | "grubhub" | "seamless";
  is_available: boolean;
  delivery_fee_min: number;
  delivery_fee_max: number;
  estimated_minutes_min: number;
  estimated_minutes_max: number;
  platform_url: string;
}

export interface BestTimeAnalysis {
  venue_info: {
    venue_name: string;
    venue_address: string;
  };
  analysis: BestTimeDayAnalysis[];
}

export interface BestTimeDayAnalysis {
  day_info: { day_int: number; day_text: string };
  busy_hours: number[];
  quiet_hours: number[];
  hour_analysis: { hour: number; intensity_nr: number }[];
}

export interface BestTimeLiveResponse {
  venue_info: {
    venue_name: string;
    venue_live_busyness: number;
    venue_live_busyness_available: boolean;
  };
}
