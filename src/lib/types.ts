export type ActivityLevel = 1 | 2 | 3 | 4;

export type ImpactCategory = "airport" | "health" | "ash" | "other";

export type ImpactStatus = "active" | "resolved" | "monitoring";

export interface Volcano {
  id: string;
  name: string;
  slug: string;
  code: string;
  region: string;
  lat: number;
  lng: number;
  elevation_m?: number;
  activity_level: ActivityLevel;
  activity_label: string;
  magma_url: string;
  cctv_url: string;
  has_cctv: boolean;
  last_synced_at?: string;
  summary?: string;
}

export interface VolcanoReport {
  id: string;
  volcano_id: string;
  issued_at: string;
  summary: string;
  recommendation?: string;
  source_url: string;
}

export interface CctvCamera {
  id: string;
  volcano_id: string;
  volcano_code: string;
  label: string;
  image_url: string;
  magma_path: string;
  updated_at?: string;
}

export interface VonaNotice {
  id: string;
  volcano_id: string;
  volcano_name: string;
  issued_at: string;
  ash_height?: string;
  color_code?: string;
  summary: string;
  source_url: string;
  notice_number?: string;
  remarks?: string;
}

export interface Impact {
  id: string;
  volcano_id: string;
  category: ImpactCategory;
  title: string;
  body: string;
  status: ImpactStatus;
  source: string;
  source_url?: string;
  starts_at: string;
  ends_at?: string | null;
  meta?: Record<string, string>;
}

export interface Profile {
  id: string;
  email: string;
  favorite_volcano_ids: string[];
  min_alert_level: ActivityLevel;
  regions: string[];
  email_digest: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: "level_change" | "vona" | "impact" | "system";
  title: string;
  body: string;
  volcano_id?: string;
  read_at?: string | null;
  created_at: string;
}

export interface AdminAudit {
  id: string;
  actor: string;
  action: string;
  meta?: Record<string, unknown>;
  created_at: string;
}

export interface AirportStation {
  icao: string;
  name: string;
  lat: number;
  lng: number;
  elevation_m?: number;
  metar?: string;
  taf?: string;
  wmo?: string;
  closed: boolean;
  closed_reason?: string;
  closed_detail?: string;
  has_va: boolean;
  source: string;
  source_url: string;
  synced_at: string;
}

export interface AppStore {
  volcanoes: Volcano[];
  reports: VolcanoReport[];
  cctv: CctvCamera[];
  vona: VonaNotice[];
  impacts: Impact[];
  airports: AirportStation[];
  airports_report_time?: string;
  profiles: Profile[];
  notifications: AppNotification[];
  audit: AdminAudit[];
  last_sync_at?: string;
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  1: "Normal",
  2: "Waspada",
  3: "Siaga",
  4: "Awas",
};

/** Status colors — sulfur / ember / basalt. */
export const ACTIVITY_COLORS: Record<ActivityLevel, string> = {
  1: "#3d8f6e",
  2: "#e0b84a",
  3: "#ff4d2e",
  4: "#ff1f4b",
};
