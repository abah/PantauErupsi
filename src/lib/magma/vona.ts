import * as cheerio from "cheerio";
import type { VonaNotice } from "@/lib/types";

const MAGMA = "https://magma.esdm.go.id";

/** Mapping kode lokal → kode MAGMA VONA/CCTV jika berbeda. */
export const MAGMA_CODE_ALIAS: Record<string, string> = {
  ANK: "KRA", // Anak Krakatau
  SEM: "SMR", // Semeru
  GKO: "GMK", // Gamkonora
  LEL: "LOB", // Lewotobi Laki-laki (VONA; CCTV MAGMA belum tersedia)
};

/**
 * Kode gunung yang memang punya halaman CCTV di MAGMA
 * (https://magma.esdm.go.id/v1/gunung-api/cctv — diperbarui manual).
 */
export const MAGMA_CCTV_CODES = new Set([
  "BRO", // Bromo
  "DEM", // Dempo
  "DIE", // Dieng
  "GUN", // Guntur
  "IBU", // Ibu
  "IJE", // Ijen
  "KER", // Kerinci
  "KRA", // Anak Krakatau
  "PAP", // Papandayan
  "SIN", // Sinabung
  "SMR", // Semeru
]);

export function magmaCode(code: string) {
  const upper = code.toUpperCase();
  return MAGMA_CODE_ALIAS[upper] ?? upper;
}

export function hasMagmaCctv(code: string) {
  return MAGMA_CCTV_CODES.has(magmaCode(code));
}

function field(text: string, label: string): string | undefined {
  const re = new RegExp(
    `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*(.+?)(?=\\s*\\(\\d+\\)\\s+[A-Za-z]|$)`,
    "i",
  );
  const m = text.match(re);
  return m?.[1]?.replace(/\s+/g, " ").trim().replace(/\.$/, "") || undefined;
}

function cleanSummary(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^:\s*/, "")
    .replace(/\b\d+\s*(?:weeks?|days?|hours?)\s+ago\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseListCard(text: string): {
  issued_at?: string;
  color_code?: string;
  summary: string;
  ash_height?: string;
} {
  const issued =
    text.match(/(\d{8}\/\d{4}Z)/)?.[1] ??
    text.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  const color = text.match(/\b(Orange|Red|Yellow|Green)\b/i)?.[1];
  const eruption =
    text.match(
      /Eruption(?:\s+with volcanic ash cloud)?\s+at\s+\d{4}\s+UTC\s+\(\d{4}\s+local\)\.?/i,
    )?.[0] ??
    text.match(/Eruption[^.]+/i)?.[0];
  const ash =
    text.match(
      /Best estimate of ash-cloud top is around [^.]+/i,
    )?.[0] ??
    text.match(/Ash-cloud is not observed\.?/i)?.[0];

  let summary = eruption || text;
  // Drop observatory byline noise from list cards
  summary = summary
    .replace(/^.*?Volcano Observatory\s*-\s*/i, "")
    .replace(/^.*?-\s*\d{8}\/\d{4}Z\s*/i, "");
  summary = cleanSummary(summary).slice(0, 220);

  return {
    issued_at: issued,
    color_code: color ? color[0].toUpperCase() + color.slice(1).toLowerCase() : undefined,
    summary: summary || "VONA tersedia",
    ash_height: ash ? cleanSummary(ash) : undefined,
  };
}

export async function fetchMagmaVonaList(
  code: string,
  limit = 8,
): Promise<VonaNotice[]> {
  const magma = magmaCode(code);
  const res = await fetch(`${MAGMA}/v1/vona?code=${magma}`, {
    headers: {
      "User-Agent": "PantauErupsi/1.0 (edukasi)",
      Accept: "text/html",
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`VONA list gagal: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const notices: VonaNotice[] = [];

  $("a[href*='/v1/vona/']").each((_, a) => {
    const href = $(a).attr("href") || "";
    if (!/\/v1\/vona\/\d+/.test(href) || !href.includes("signature")) return;
    const parent = $(a).closest("div,li,tr,article,section");
    const text = parent.text().replace(/\s+/g, " ").trim();
    if (text.length < 20) return;

    const idMatch = href.match(/\/v1\/vona\/(\d+)/);
    const id = idMatch?.[1] ?? href;
    if (notices.some((n) => n.id === id || n.source_url === href)) return;

    const parsed = parseListCard(text);
    notices.push({
      id,
      volcano_id: "",
      volcano_name: text.split(" - ")[0]?.trim() || magma,
      issued_at: parsed.issued_at ?? "",
      color_code: parsed.color_code,
      ash_height: parsed.ash_height,
      summary: parsed.summary,
      source_url: href.startsWith("http") ? href : `${MAGMA}${href}`,
    });
  });

  return notices.slice(0, limit);
}

export type VonaDetail = {
  ash_height?: string;
  color_code?: string;
  summary?: string;
  issued_at?: string;
  notice_number?: string;
  remarks?: string;
  cloud_info?: string;
};

/** Ambil detail VONA berlabel dari halaman signed MAGMA. */
export async function fetchMagmaVonaDetail(url: string): Promise<VonaDetail> {
  const res = await fetch(url, {
    headers: { "User-Agent": "PantauErupsi/1.0", Accept: "text/html" },
    next: { revalidate: 600 },
  });
  if (!res.ok) return {};
  const html = await res.text();
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ");

  const colorRaw = field(text, "Current Aviation Colour Code");
  const color = colorRaw
    ? colorRaw.charAt(0).toUpperCase() + colorRaw.slice(1).toLowerCase()
    : undefined;

  return {
    notice_number: field(text, "Notice Number"),
    color_code: color,
    issued_at:
      field(text, "Issued") ??
      text.match(/\b(\d{8}\/\d{4}Z)\b/)?.[1],
    summary: field(text, "Volcanic Activity Summary"),
    ash_height: field(text, "Volcanic Cloud Height"),
    cloud_info: field(text, "Other Volcanic Cloud Information"),
    remarks: field(text, "Remarks"),
  };
}

export function mergeVonaNotice(
  base: VonaNotice,
  detail: VonaDetail,
): VonaNotice & { notice_number?: string; remarks?: string } {
  return {
    ...base,
    issued_at: detail.issued_at || base.issued_at,
    color_code: detail.color_code || base.color_code,
    summary: detail.summary || base.summary,
    ash_height: detail.ash_height || base.ash_height,
    notice_number: detail.notice_number,
    remarks: detail.remarks || detail.cloud_info,
  };
}
