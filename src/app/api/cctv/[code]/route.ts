import { NextResponse } from "next/server";
import { fetchMagmaCctvWithImages } from "@/lib/magma/cctv";
import { hasMagmaCctv, magmaCode } from "@/lib/magma/vona";
import { getVolcanoes } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const code = magmaCode(raw);
  const magmaUrl = `https://magma.esdm.go.id/v1/gunung-api/cctv/${code}`;

  if (!hasMagmaCctv(code)) {
    return NextResponse.json({
      cameras: [],
      magma_url: "https://magma.esdm.go.id/v1/gunung-api/cctv",
      license:
        "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
      embedded: false,
      available: false,
      note: `MAGMA belum mempublikasikan CCTV untuk kode ${code}. Snapshot live hanya tersedia untuk gunung di daftar CCTV resmi MAGMA.`,
    });
  }

  try {
    const cameras = await fetchMagmaCctvWithImages(code, 4);
    const withImages = cameras.filter((c) => c.image_data_url);
    if (withImages.length > 0 || cameras.length > 0) {
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
          magma_url: magmaUrl,
          license:
            "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
          embedded: withImages.length > 0,
          available: true,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          },
        },
      );
    }
  } catch {
    /* fall through */
  }

  const volcanoes = await getVolcanoes();
  const volcano = volcanoes.find(
    (v) =>
      v.code.toUpperCase() === raw.toUpperCase() ||
      magmaCode(v.code) === code ||
      v.slug === raw.toLowerCase(),
  );

  return NextResponse.json({
    cameras: [],
    volcano_id: volcano?.id,
    magma_url: magmaUrl,
    license: "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
    embedded: false,
    available: true,
    note: "Halaman CCTV MAGMA ada, tetapi snapshot tidak berhasil diambil saat ini. Coba lagi sebentar.",
  });
}
