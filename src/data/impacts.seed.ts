import { randomUUID } from "crypto";
import type { Impact, VonaNotice } from "@/lib/types";

/** Seed dampak terkini (contoh kurasi admin) — Anak Krakatau Sep 2026. */
export function buildSeedImpacts(volcanoIdByName: Record<string, string>): Impact[] {
  const anak = volcanoIdByName["Anak Krakatau"] ?? "anak-krakatau";
  const merapi = volcanoIdByName["Merapi"] ?? "merapi";
  const now = new Date().toISOString();

  return [
    {
      id: randomUUID(),
      volcano_id: anak,
      category: "airport",
      title: "Beberapa bandara Jawa–Lampung terdampak abu vulkanik",
      body: "Operasional bandara dapat dihentikan sementara berdasarkan NOTAM AirNav terkait sebaran abu Gunung Anak Krakatau. Periksa status penerbangan resmi sebelum berangkat.",
      status: "active",
      source: "AirNav / Ditjen Hubud (kurasi)",
      source_url: "https://www.bmkg.go.id/",
      starts_at: now,
      ends_at: null,
      meta: {
        bandara:
          "Soekarno-Hatta, Halim, Husein Sastranegara, Budiarto, Pondok Cabe, Radin Inten II, M. Taufik Kiemas",
      },
    },
    {
      id: randomUUID(),
      volcano_id: anak,
      category: "ash",
      title: "Sebaran abu ke Banten, Jakarta, Jabar, Lampung, Bengkulu",
      body: "Berdasarkan VONA PVMBG, VAAC Darwin, dan analisis satelit Himawari oleh BMKG, abu vulkanik terpantau menyebar di atmosfer. Arah dapat berubah mengikuti angin.",
      status: "active",
      source: "PVMBG / BMKG",
      source_url: "https://magma.esdm.go.id/vona",
      starts_at: now,
      ends_at: null,
    },
    {
      id: randomUUID(),
      volcano_id: anak,
      category: "health",
      title: "Imbauan kesehatan akibat abu vulkanik",
      body: "Batasi aktivitas luar ruangan saat abu turun. Gunakan masker N95/KN95, tutup ventilasi, dan lindungi kelompok rentan (anak, lansia, penderita asma).",
      status: "monitoring",
      source: "Rekomendasi mitigasi umum PVMBG",
      source_url: "https://magma.esdm.go.id/",
      starts_at: now,
      ends_at: null,
    },
    {
      id: randomUUID(),
      volcano_id: merapi,
      category: "other",
      title: "Zona larangan aktivitas di sekitar puncak Merapi",
      body: "Masyarakat diminta tidak beraktivitas di dalam radius rekomendasi PVMBG pada sektor-sektor rawan. Ikuti arahan BPBD setempat.",
      status: "active",
      source: "PVMBG / MAGMA",
      source_url: "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas",
      starts_at: now,
      ends_at: null,
    },
  ];
}

export function buildSeedVona(volcanoIdByName: Record<string, string>): VonaNotice[] {
  const anak = volcanoIdByName["Anak Krakatau"] ?? "anak-krakatau";
  return [
    {
      id: randomUUID(),
      volcano_id: anak,
      volcano_name: "Anak Krakatau",
      issued_at: new Date().toISOString(),
      ash_height: "Kolom abu terpantau (lihat VONA resmi)",
      color_code: "Orange",
      summary:
        "VONA diterbitkan untuk keselamatan penerbangan terkait aktivitas Anak Krakatau. Rincian tinggi kolom dan arah sebaran tersedia di portal MAGMA VONA.",
      source_url: "https://magma.esdm.go.id/vona",
    },
  ];
}
