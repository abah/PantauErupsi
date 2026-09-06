import { NextResponse } from "next/server";
import { syncIfStale } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Endpoint publik: refresh data resmi saat app dibuka.
 * Skip jika sync terakhir < 2 menit (hindari hammer MAGMA/BMKG).
 */
export async function GET() {
  try {
    const result = await syncIfStale(120_000, "auto-open");
    return NextResponse.json({
      ok: true,
      ...result,
      sources: {
        magma: "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas",
        bmkg: "https://web-aviation.bmkg.go.id/va-map.php",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Gagal refresh",
      },
      { status: 502 },
    );
  }
}

export async function POST() {
  return GET();
}
