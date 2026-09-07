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
    "User-Agent":
      "Mozilla/5.0 (compatible; PantauErupsi/1.0; edukasi; +https://pantau-erupsi.abah-844.workers.dev)",
    Accept: "text/html,application/xhtml+xml,application/json",
    ...extra,
  };
}

function collectCookies(res: Response): string {
  const multi = res.headers.getSetCookie?.() ?? [];
  if (multi.length > 0) {
    return multi.map((c) => c.split(";")[0]).join("; ");
  }
  const single = res.headers.get("set-cookie");
  if (!single) return "";
  // Beberapa runtime hanya mengembalikan satu header gabungan
  return single
    .split(/,(?=\s*[^;]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

/** Ambil daftar kamera dari halaman CCTV MAGMA (kode gunung, mis. KRA, SMR, SIN). */
export async function fetchMagmaCctvList(code: string): Promise<{
  cameras: MagmaCamera[];
  csrf?: string;
  cookies: string;
}> {
  const res = await fetch(`${MAGMA}/v1/gunung-api/cctv/${code.toUpperCase()}`, {
    headers: magmaHeaders({
      Referer: `${MAGMA}/v1/gunung-api/cctv`,
    }),
    cache: "no-store",
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`CCTV list gagal: ${res.status}`);

  const cookies = collectCookies(res);
  const html = await res.text();
  const $ = cheerio.load(html);
  const csrf = $('meta[name="csrf-token"]').attr("content");

  const cameras: MagmaCamera[] = [];
  $(".view").each((_, el) => {
    const uuid = $(el).attr("data-uuid");
    const show_url = $(el).attr("data-url");
    if (!uuid || !show_url) return;
    const parentText = $(el)
      .closest("div,li,figure,article,td,tr")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const label =
      parentText
        .replace(/^View\s*/i, "")
        .replace(/\s*View\s*$/i, "")
        .trim() || `Kamera ${uuid.slice(0, 8)}`;
    cameras.push({
      uuid,
      label,
      show_url: show_url.startsWith("http") ? show_url : `${MAGMA}${show_url}`,
    });
  });

  // Alternatif struktur markup MAGMA
  if (cameras.length === 0) {
    $("[data-uuid][data-url]").each((_, el) => {
      const uuid = $(el).attr("data-uuid");
      const show_url = $(el).attr("data-url");
      if (!uuid || !show_url) return;
      cameras.push({
        uuid,
        label: $(el).attr("title") || `Kamera ${uuid.slice(0, 8)}`,
        show_url: show_url.startsWith("http")
          ? show_url
          : `${MAGMA}${show_url}`,
      });
    });
  }

  const seen = new Set<string>();
  const unique = cameras.filter((c) => {
    if (seen.has(c.uuid)) return false;
    seen.add(c.uuid);
    return true;
  });

  return { cameras: unique, csrf, cookies };
}

function extractImagePayload(html: string): {
  dataUrl?: string;
  bytes?: Uint8Array;
  contentType?: string;
} {
  const $ = cheerio.load(html);
  let dataUrl: string | undefined;
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src.startsWith("data:image")) dataUrl = src;
  });
  if (dataUrl) return { dataUrl };

  // Kadang respons JSON { image: "data:..." } atau base64 mentah
  const trimmed = html.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      for (const key of ["image", "img", "src", "data", "base64"]) {
        const val = json[key];
        if (typeof val === "string" && val.startsWith("data:image")) {
          return { dataUrl: val };
        }
        if (typeof val === "string" && /^[A-Za-z0-9+/=\s]+$/.test(val.slice(0, 80))) {
          return { dataUrl: `data:image/jpeg;base64,${val.replace(/\s+/g, "")}` };
        }
      }
    } catch {
      /* ignore */
    }
  }

  const m = html.match(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/);
  if (m) return { dataUrl: m[0] };

  return {};
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
        Referer: `${MAGMA}/v1/gunung-api/cctv`,
        Origin: MAGMA,
      }),
    },
    body,
    cache: "no-store",
    redirect: "follow",
  });

  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("image/")) {
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType.split(";")[0]};base64,${buf.toString("base64")}`;
  }

  const html = await res.text();
  return extractImagePayload(html).dataUrl ?? null;
}

/** Ambil 1 snapshot untuk uuid tertentu (aman untuk Cloudflare Workers). */
export async function fetchMagmaCctvSnapshot(
  code: string,
  uuid: string,
): Promise<string | null> {
  const { cameras, csrf, cookies } = await fetchMagmaCctvList(code);
  if (!csrf) return null;
  const cam = cameras.find((c) => c.uuid === uuid) ?? cameras[0];
  if (!cam) return null;
  return fetchMagmaCctvImage(cam, csrf, cookies);
}

/** List + paling banyak 1 snapshot awal (hindari timeout Workers). */
export async function fetchMagmaCctvWithImages(
  code: string,
  limit = 1,
): Promise<MagmaCamera[]> {
  const { cameras, csrf, cookies } = await fetchMagmaCctvList(code);
  if (!csrf || cameras.length === 0) return cameras;

  const subset = cameras.slice(0, Math.max(1, limit));
  const withImages: MagmaCamera[] = [];
  for (const cam of subset) {
    const image_data_url = await fetchMagmaCctvImage(cam, csrf, cookies);
    withImages.push({ ...cam, image_data_url: image_data_url ?? undefined });
  }
  // Sisanya tanpa gambar (diambil on-demand lewat /snap)
  for (const cam of cameras.slice(subset.length)) {
    withImages.push(cam);
  }
  return withImages;
}
