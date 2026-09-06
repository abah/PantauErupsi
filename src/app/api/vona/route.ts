import { NextResponse } from "next/server";
import {
  fetchMagmaVonaDetail,
  fetchMagmaVonaList,
  magmaCode,
  mergeVonaNotice,
} from "@/lib/magma/vona";
import { getVona, getVolcanoBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const volcanoId = searchParams.get("volcanoId") ?? undefined;
  const code = searchParams.get("code") ?? undefined;

  if (code || volcanoId) {
    let magma = code ? magmaCode(code) : undefined;
    let volcano = volcanoId ? await getVolcanoBySlug(volcanoId) : null;
    if (!volcano && code) volcano = await getVolcanoBySlug(code.toLowerCase());
    if (!magma && volcano) magma = magmaCode(volcano.code);

    if (magma) {
      try {
        const list = await fetchMagmaVonaList(magma, 5);
        const details = await Promise.all(
          list.map((n) => fetchMagmaVonaDetail(n.source_url)),
        );
        const enriched = list.map((n, i) => {
          const merged = mergeVonaNotice(n, details[i] ?? {});
          return {
            ...merged,
            volcano_id: volcano?.id ?? volcanoId ?? magma.toLowerCase(),
            volcano_name: volcano?.name ?? n.volcano_name,
          };
        });

        return NextResponse.json(
          {
            vona: enriched,
            official_url: `https://magma.esdm.go.id/v1/vona?code=${magma}`,
            embedded: true,
            note: "Ringkasan VONA diambil dari MAGMA dan ditampilkan di dalam PantauErupsi.",
          },
          {
            headers: {
              "Cache-Control":
                "public, s-maxage=300, stale-while-revalidate=600",
            },
          },
        );
      } catch {
        /* fall through */
      }
    }
  }

  const vona = await getVona(volcanoId);
  return NextResponse.json({
    vona,
    official_url: "https://magma.esdm.go.id/vona",
    embedded: false,
    note: "Menampilkan VONA tersimpan lokal.",
  });
}
