import { NextResponse } from "next/server";
import { fetchMagmaCctvSnapshot } from "@/lib/magma/cctv";
import { hasMagmaCctv, magmaCode } from "@/lib/magma/vona";

export const dynamic = "force-dynamic";

/** Ambil 1 snapshot JPEG (data URL) on-demand — menghindari timeout Workers. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const code = magmaCode(raw);
  const uuid = new URL(req.url).searchParams.get("uuid") || "";

  if (!hasMagmaCctv(raw) && !hasMagmaCctv(code)) {
    return NextResponse.json(
      { error: "CCTV tidak tersedia di MAGMA untuk kode ini" },
      { status: 404 },
    );
  }

  try {
    const image = await fetchMagmaCctvSnapshot(code, uuid);
    if (!image) {
      return NextResponse.json(
        { error: "Snapshot kosong / kamera offline" },
        { status: 502 },
      );
    }

    // Jika diminta sebagai img src langsung: ?format=bin
    const format = new URL(req.url).searchParams.get("format");
    if (format === "bin" && image.startsWith("data:")) {
      const m = image.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        const bytes = Buffer.from(m[2], "base64");
        return new NextResponse(bytes, {
          headers: {
            "Content-Type": m[1],
            "Cache-Control": "public, s-maxage=90, stale-while-revalidate=180",
          },
        });
      }
    }

    return NextResponse.json(
      { image_url: image, uuid: uuid || null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=90, stale-while-revalidate=180",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Gagal mengambil snapshot",
      },
      { status: 502 },
    );
  }
}
