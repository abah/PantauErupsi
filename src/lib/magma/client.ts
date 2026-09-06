import * as cheerio from "cheerio";
import type { ActivityLevel } from "@/lib/types";
import { ACTIVITY_LABELS } from "@/lib/types";
import { magmaCode } from "@/lib/magma/vona";

const MAGMA_LEVEL_URL =
  "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas";
const MAGMA_VONA_URL = "https://magma.esdm.go.id/vona";
const MAGMA_CCTV_BASE = "https://magma.esdm.go.id/v1/gunung-api/cctv";

const LEVEL_FROM_HEADING: Record<string, ActivityLevel> = {
  "Level IV (Awas)": 4,
  "Level III (Siaga)": 3,
  "Level II (Waspada)": 2,
  "Level I (Normal)": 1,
};

export async function fetchMagmaActivityLevels(): Promise<
  Record<string, ActivityLevel>
> {
  const res = await fetch(MAGMA_LEVEL_URL, {
    headers: {
      "User-Agent": "PantauErupsi/1.0 (edukasi; +https://localhost)",
      Accept: "text/html",
    },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    throw new Error(`MAGMA tingkat-aktivitas gagal: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const levels: Record<string, ActivityLevel> = {};

  // Parse table rows: level section headers + volcano name links
  let currentLevel: ActivityLevel | null = null;

  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length === 0) return;

    const firstText = $(cells[0]).text().replace(/\s+/g, " ").trim();
    for (const [label, level] of Object.entries(LEVEL_FROM_HEADING)) {
      if (firstText.includes(label)) {
        currentLevel = level;
        break;
      }
    }

    if (!currentLevel) return;

    // Volcano names appear as links or plain text like "Merapi - Daerah..."
    const linkTexts: string[] = [];
    $(tr)
      .find("a")
      .each((__, a) => {
        const t = $(a).text().replace(/\s+/g, " ").trim();
        if (t && !t.toLowerCase().includes("lihat") && t !== "Laporan") {
          linkTexts.push(t);
        }
      });

    const cellBlob = $(cells.last()).text();
    const candidates =
      linkTexts.length > 0
        ? linkTexts
        : cellBlob
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

    for (const raw of candidates) {
      const name = raw.split(" - ")[0]?.trim();
      if (!name || name.toLowerCase().includes("tidak ada")) continue;
      if (name.startsWith("Level")) continue;
      levels[name] = currentLevel;
    }
  });

  // Fallback: parse page text blocks if table parse is sparse
  if (Object.keys(levels).length < 10) {
    const text = $("body").text();
    const blocks = [
      { re: /Level IV \(Awas\)([\s\S]*?)Level III/i, level: 4 as ActivityLevel },
      { re: /Level III \(Siaga\)([\s\S]*?)Level II/i, level: 3 as ActivityLevel },
      {
        re: /Level II \(Waspada\)([\s\S]*?)Level I/i,
        level: 2 as ActivityLevel,
      },
      {
        re: /Level I \(Normal\)([\s\S]*?)Copyright/i,
        level: 1 as ActivityLevel,
      },
    ];
    for (const block of blocks) {
      const m = text.match(block.re);
      if (!m?.[1]) continue;
      const names = m[1]
        .split(/\n|,/)
        .map((s) => s.replace(/Lihat laporan/gi, "").trim())
        .map((s) => s.split(" - ")[0]?.trim())
        .filter((s): s is string => Boolean(s) && s.length > 2 && !s.includes("Gunung"));
      for (const n of names) {
        if (!n.startsWith("Level") && !n.match(/^\d+$/)) {
          levels[n] = block.level;
        }
      }
    }
  }

  return levels;
}

export function levelLabel(level: ActivityLevel) {
  return ACTIVITY_LABELS[level];
}

export function magmaCctvUrl(code: string) {
  return `${MAGMA_CCTV_BASE}/${magmaCode(code)}`;
}

export function magmaVonaUrl() {
  return MAGMA_VONA_URL;
}

export function magmaHomeUrl() {
  return "https://magma.esdm.go.id/";
}

/** Metadata kamera lokal; snapshot live diambil via /api/cctv/[code]. */
export function buildCctvEntries(
  volcanoes: { id: string; code: string; name: string; has_cctv: boolean }[],
) {
  return volcanoes
    .filter((v) => v.has_cctv)
    .map((v) => {
      const code = magmaCode(v.code);
      return {
        id: `cctv-${code.toLowerCase()}`,
        volcano_id: v.id,
        volcano_code: code,
        label: `${v.name} — kamera PVMBG`,
        image_url: "",
        magma_path: `/v1/gunung-api/cctv/${code}`,
        updated_at: new Date().toISOString(),
      };
    });
}
