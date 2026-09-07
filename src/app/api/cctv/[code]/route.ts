import { NextResponse } from "next/server";
import { fetchMagmaCctvWithImages } from "@/lib/magma/cctv";
import { hasMagmaCctv, magmaCode } from "@/lib/magma/vona";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const code = magmaCode(raw);
  const magmaUrl = `https://magma.esdm.go.id/v1/gunung-api/cctv/${code}`;

  if (!hasMagmaCctv(raw) && !hasMagmaCctv(code)) {
    return NextResponse.json({
      cameras: [],
      magma_url: "https://magma.esdm.go.id/v1/gunung-api/cctv",
      license:
        "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
      embedded: false,
      available: false,
      note: `MAGMA belum mempublikasikan CCTV live untuk kode ${code}.`,
    });
  }

  try {
    // 1 snapshot awal saja — sisanya via /api/cctv/[code]/snap
    const cameras = await fetchMagmaCctvWithImages(code, 1);
    if (cameras.length > 0) {
      const withImages = cameras.filter((c) => c.image_data_url);
      return NextResponse.json(
        {
          cameras: cameras.map((c) => ({
            id: c.uuid,
            volcano_code: code,
            label: c.label,
            image_url: c.image_data_url || null,
            snap_url: `/api/cctv/${encodeURIComponent(raw)}/snap?uuid=${encodeURIComponent(c.uuid)}`,
            magma_path: `/v1/gunung-api/cctv/${code}`,
            has_image: Boolean(c.image_data_url),
          })),
          magma_url: magmaUrl,
          license:
            "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
          embedded: withImages.length > 0,
          available: true,
          note:
            withImages.length === 0
              ? "Daftar kamera MAGMA berhasil dimuat; snapshot sedang diambil per kamera."
              : undefined,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        cameras: [],
        magma_url: magmaUrl,
        license:
          "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
        embedded: false,
        available: true,
        note: `Gagal mengambil CCTV MAGMA saat ini (${err instanceof Error ? err.message : "error"}). Coba buka lagi sebentar.`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    cameras: [],
    magma_url: magmaUrl,
    license: "MAGMA Indonesia Web Camera/CCTV Images — CC BY-NC-ND 4.0 (PVMBG)",
    embedded: false,
    available: true,
    note: "Halaman CCTV MAGMA ada, tetapi kamera tidak terdeteksi saat ini.",
  });
}
