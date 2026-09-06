import { NextResponse } from "next/server";
import {
  fetchMagmaVonaDetail,
  fetchMagmaVonaList,
  magmaCode,
  mergeVonaNotice,
} from "@/lib/magma/vona";
import {
  getCctv,
  getImpacts,
  getVolcanoBySlug,
  getVona,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const volcano = await getVolcanoBySlug(id);
  if (!volcano) {
    return NextResponse.json({ error: "Gunung tidak ditemukan" }, { status: 404 });
  }

  const [impacts, localVona, cctv] = await Promise.all([
    getImpacts(volcano.id),
    getVona(volcano.id),
    getCctv(volcano.id),
  ]);

  let vona = localVona;
  try {
    const list = await fetchMagmaVonaList(volcano.code, 4);
    if (list.length > 0) {
      const details = await Promise.all(
        list.map((n) => fetchMagmaVonaDetail(n.source_url)),
      );
      vona = list.map((n, idx) => ({
        ...mergeVonaNotice(n, details[idx] ?? {}),
        volcano_id: volcano.id,
        volcano_name: volcano.name,
      }));
    }
  } catch {
    /* keep local */
  }

  return NextResponse.json({
    volcano: {
      ...volcano,
      cctv_url: `https://magma.esdm.go.id/v1/gunung-api/cctv/${magmaCode(volcano.code)}`,
    },
    impacts,
    vona,
    cctv,
    source: "PVMBG / MAGMA Indonesia",
  });
}
