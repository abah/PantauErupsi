import { NextResponse } from "next/server";
import {
  BMKG_VA_MAP_URL,
  BMKG_VOLCANIC_ASH_URL,
  fetchBmkgAviationStations,
} from "@/lib/bmkg/aviation";
import { getAirports, upsertAirports } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const closedOnly = searchParams.get("closed") === "1";
  const vaOnly = searchParams.get("va") === "1";

  try {
    const live = await fetchBmkgAviationStations();
    await upsertAirports(live.stations, live.report_time);

    let airports = live.stations;
    if (closedOnly) airports = airports.filter((a) => a.closed);
    if (vaOnly) airports = airports.filter((a) => a.has_va);

    return NextResponse.json(
      {
        airports,
        report_time: live.report_time,
        live: live.live,
        closed_count: live.closed_count,
        open_count: airports.filter((a) => !a.closed).length,
        va_count: live.va_count,
        source_url: BMKG_VA_MAP_URL,
        official_map: BMKG_VA_MAP_URL,
        volcanic_ash_updates: BMKG_VOLCANIC_ASH_URL,
        attribution:
          "Data bandara & METAR dari BMKG Aviation VA Map (web-aviation.bmkg.go.id). PantauErupsi bukan situs resmi.",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
        },
      },
    );
  } catch {
    const data = await getAirports({ closedOnly, vaOnly });
    return NextResponse.json({
      ...data,
      live: false,
      official_map: BMKG_VA_MAP_URL,
      volcanic_ash_updates: BMKG_VOLCANIC_ASH_URL,
      attribution:
        "Data bandara & METAR dari BMKG Aviation VA Map (web-aviation.bmkg.go.id). PantauErupsi bukan situs resmi.",
    });
  }
}
