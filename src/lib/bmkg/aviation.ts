import type { AirportStation, Impact } from "@/lib/types";

const BMKG_VA_MAP_DATA = "https://web-aviation.bmkg.go.id/va-map.php?data=1";
export const BMKG_VA_MAP_URL = "https://web-aviation.bmkg.go.id/va-map.php";
export const BMKG_VOLCANIC_ASH_URL =
  "https://web-aviation.bmkg.go.id/web/volcanic-ash";

type BmkgClosed = Record<string, { reason?: string; detail?: string }>;

type BmkgPayload = {
  reportTime?: string;
  live?: boolean;
  stations?: Array<{
    icao?: string;
    name?: string;
    lat?: number | null;
    lon?: number | null;
    elev?: number | string | null;
    metar?: string | null;
    taf?: string | null;
    wmo?: string | null;
    cls?: string | null;
    tz?: string | null;
  }>;
  closed_airports?: BmkgClosed;
};

function hasVaInMetar(metar?: string | null) {
  if (!metar) return false;
  return /(?:^|\s)VA(?:\s|=|$)/i.test(metar);
}

function isIndonesianIcao(icao: string) {
  return icao.toUpperCase().startsWith("W");
}

export async function fetchBmkgAviationStations(): Promise<{
  stations: AirportStation[];
  report_time?: string;
  live: boolean;
  closed_count: number;
  va_count: number;
}> {
  const res = await fetch(BMKG_VA_MAP_DATA, {
    headers: {
      "User-Agent": "PantauErupsi/1.0 (edukasi; sumber BMKG Aviation)",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`BMKG VA map gagal: ${res.status}`);
  }

  const data = (await res.json()) as BmkgPayload;
  const closed = data.closed_airports ?? {};
  const syncedAt = new Date().toISOString();

  const stations: AirportStation[] = (data.stations ?? [])
    .filter((s) => s.icao && isIndonesianIcao(s.icao))
    .filter((s) => s.lat != null && s.lon != null)
    .map((s) => {
      const icao = s.icao!.toUpperCase();
      const closure = closed[icao];
      const metar = s.metar ?? undefined;
      return {
        icao,
        name: s.name || icao,
        lat: Number(s.lat),
        lng: Number(s.lon),
        elevation_m:
          s.elev != null && s.elev !== "" ? Number(s.elev) : undefined,
        metar,
        taf: s.taf ?? undefined,
        wmo: s.wmo ?? undefined,
        closed: Boolean(closure),
        closed_reason: closure?.reason,
        closed_detail: closure?.detail,
        has_va: hasVaInMetar(metar),
        source: "BMKG Aviation VA Map",
        source_url: BMKG_VA_MAP_URL,
        synced_at: syncedAt,
      };
    });

  return {
    stations,
    report_time: data.reportTime,
    live: Boolean(data.live),
    closed_count: stations.filter((s) => s.closed).length,
    va_count: stations.filter((s) => s.has_va).length,
  };
}

/** Bangun dampak bandara live dari BMKG, dikaitkan ke gunung aktif terdekat / Anak Krakatau. */
export function buildAirportImpactsFromBmkg(
  stations: AirportStation[],
  volcanoIdHint = "anak-krakatau",
): Impact[] {
  const closed = stations.filter((s) => s.closed);
  const va = stations.filter((s) => s.has_va);
  if (closed.length === 0 && va.length === 0) return [];

  const now = new Date().toISOString();
  const impacts: Impact[] = [];

  if (closed.length > 0) {
    const names = closed.map((s) => `${s.icao} ${s.name}`).join("; ");
    const periods = closed
      .map((s) => `${s.icao}: ${s.closed_detail || s.closed_reason || "CLOSED"}`)
      .join(" | ");
    impacts.push({
      id: `bmkg-closed-${volcanoIdHint}`,
      volcano_id: volcanoIdHint,
      category: "airport",
      title: `${closed.length} bandara CLOSED (BMKG Aviation VA Map)`,
      body: `Status operasional bandara dari peta resmi BMKG Aviation. Periode penutupan mengikuti NOTAM yang dikurasi BMKG pada VA Map.`,
      status: "active",
      source: "BMKG Aviation VA Map",
      source_url: BMKG_VA_MAP_URL,
      starts_at: now,
      ends_at: null,
      meta: {
        bandara: names,
        periode: periods,
        jumlah: String(closed.length),
      },
    });
  }

  if (va.length > 0) {
    impacts.push({
      id: `bmkg-va-metar-${volcanoIdHint}`,
      volcano_id: volcanoIdHint,
      category: "ash",
      title: `METAR melaporkan VA di ${va.length} stasiun`,
      body: `Observasi METAR BMKG mencantumkan kode cuaca VA (volcanic ash) pada: ${va
        .map((s) => s.icao)
        .join(", ")}. Ini mengonfirmasi keberadaan abu vulkanik di sekitar bandara terkait.`,
      status: "active",
      source: "BMKG METAR (via VA Map)",
      source_url: BMKG_VA_MAP_URL,
      starts_at: now,
      ends_at: null,
      meta: {
        icao: va.map((s) => s.icao).join(", "),
        metar_sample: va[0]?.metar?.slice(0, 160) || "",
      },
    });
  }

  return impacts;
}
