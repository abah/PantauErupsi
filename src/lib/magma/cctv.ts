import * as cheerio from "cheerio";

const MAGMA = "https://magma.esdm.go.id";

export type MagmaCamera = {
  uuid: string;
  label: string;
  show_url: string;
  image_data_url?: string;
};

function magmaHeaders(extra: Record<string, string> = {}) {
  return {
    "User-Agent": "PantauErupsi/1.0 (edukasi; +localhost)",
    Accept: "text/html,application/xhtml+xml",
    ...extra,
  };
}

/** Ambil daftar kamera dari halaman CCTV MAGMA (kode gunung, mis. KRA, MER, SEM). */
export async function fetchMagmaCctvList(code: string): Promise<{
  cameras: MagmaCamera[];
  csrf?: string;
  cookies: string;
}> {
  const res = await fetch(`${MAGMA}/v1/gunung-api/cctv/${code.toUpperCase()}`, {
    headers: magmaHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CCTV list gagal: ${res.status}`);

  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookies = setCookie.map((c) => c.split(";")[0]).join("; ");
  const html = await res.text();
  const $ = cheerio.load(html);
  const csrf = $('meta[name="csrf-token"]').attr("content");

  const cameras: MagmaCamera[] = [];
  $(".view").each((_, el) => {
    const uuid = $(el).attr("data-uuid");
    const show_url = $(el).attr("data-url");
    if (!uuid || !show_url) return;
    const parentText = $(el)
      .closest("div,li,figure,article")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const label =
      parentText
        .replace(/^View\s*/i, "")
        .replace(/\s*View\s*$/i, "")
        .trim() || `Kamera ${uuid.slice(0, 8)}`;
    cameras.push({ uuid, label, show_url });
  });

  // dedupe by uuid
  const seen = new Set<string>();
  const unique = cameras.filter((c) => {
    if (seen.has(c.uuid)) return false;
    seen.add(c.uuid);
    return true;
  });

  return { cameras: unique, csrf, cookies };
}

/** Ambil snapshot JPEG (data URL) untuk satu kamera via POST signed URL MAGMA. */
export async function fetchMagmaCctvImage(
  camera: Pick<MagmaCamera, "uuid" | "show_url">,
  csrf: string,
  cookies: string,
): Promise<string | null> {
  const body = new URLSearchParams({
    uuid: camera.uuid,
    _token: csrf,
  });

  const res = await fetch(camera.show_url, {
    method: "POST",
    headers: {
      ...magmaHeaders({
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
        "X-CSRF-TOKEN": csrf,
        "X-Requested-With": "XMLHttpRequest",
        Referer: MAGMA,
      }),
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);
  let dataUrl: string | null = null;
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src.startsWith("data:image")) dataUrl = src;
  });
  return dataUrl;
}

export async function fetchMagmaCctvWithImages(
  code: string,
  limit = 4,
): Promise<MagmaCamera[]> {
  const { cameras, csrf, cookies } = await fetchMagmaCctvList(code);
  if (!csrf || cameras.length === 0) return cameras;

  const subset = cameras.slice(0, limit);
  const withImages: MagmaCamera[] = [];
  for (const cam of subset) {
    const image_data_url = await fetchMagmaCctvImage(cam, csrf, cookies);
    withImages.push({ ...cam, image_data_url: image_data_url ?? undefined });
  }
  return withImages;
}
