import { NextResponse } from "next/server";
import { getVolcanoes, getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minLevel = Number(searchParams.get("minLevel") ?? "1");
  const hasCctv = searchParams.get("cctv") === "1";
  const hasImpact = searchParams.get("impact") === "1";
  const hasVona = searchParams.get("vona") === "1";

  const store = await getStore();
  let volcanoes = await getVolcanoes();

  volcanoes = volcanoes.filter((v) => v.activity_level >= minLevel);
  if (hasCctv) volcanoes = volcanoes.filter((v) => v.has_cctv);
  if (hasImpact) {
    const ids = new Set(store.impacts.map((i) => i.volcano_id));
    volcanoes = volcanoes.filter((v) => ids.has(v.id));
  }
  if (hasVona) {
    const ids = new Set(store.vona.map((i) => i.volcano_id));
    volcanoes = volcanoes.filter((v) => ids.has(v.id));
  }

  return NextResponse.json({
    volcanoes,
    last_sync_at: store.last_sync_at ?? null,
    source: "PVMBG / MAGMA Indonesia",
    attribution:
      "Data tingkat aktivitas bersumber dari MAGMA Indonesia (PVMBG). PantauErupsi bukan situs resmi pemerintah.",
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
