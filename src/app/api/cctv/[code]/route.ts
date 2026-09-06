import { NextResponse } from "next/server";
import { fetchMagmaCctvWithImages } from "@/lib/magma/cctv";
import { magmaCode } from "@/lib/magma/vona";
import { getVolcanoBySlug, getCctv } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const code = magmaCode(raw);

  try {
    const cameras = await fetchMagmaCctvWithImages(code, 4);
    if (cameras.length > 0) {
      return NextResponse.json(
        {
          cameras: cameras.map((c) => ({
            id: c.uuid,
            volcano_code: code,
            label: c.label,
            image_url: c.image_data_url || null,
            magma_path: `/v1/gunung-api/cctv/${code}`,
            has_image: Boolean(c.image_data_url),
          })),
          magma_url: `https://magma.esdm.go.id/v1/gunung-api/cctv/${code}`,
          license:
            "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
          embedded: true,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          },
        },
      );
    }
  } catch {
    /* fallback local */
  }

  // Fallback: local store + deep link (tanpa redirect otomatis di UI)
  const volcano =
    (await getVolcanoBySlug(raw.toLowerCase())) ||
    (await getVolcanoBySlug(code.toLowerCase()));
  const local = volcano ? await getCctv(volcano.id) : await getCctv();

  return NextResponse.json({
    cameras: local.map((c) => ({
      ...c,
      image_url: null,
      has_image: false,
    })),
    magma_url: `https://magma.esdm.go.id/v1/gunung-api/cctv/${code}`,
    license: "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
    embedded: false,
    note: "Snapshot live tidak tersedia saat ini; tampilkan daftar kamera lokal.",
  });
}
