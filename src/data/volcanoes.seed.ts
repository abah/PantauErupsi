import type { ActivityLevel, Volcano } from "@/lib/types";
import { ACTIVITY_LABELS } from "@/lib/types";
import { hasMagmaCctv, magmaCode } from "@/lib/magma/vona";

type Seed = {
  name: string;
  code: string;
  region: string;
  lat: number;
  lng: number;
  elevation_m?: number;
  has_cctv?: boolean; // diabaikan; diganti daftar resmi MAGMA
};

const SEED: Seed[] = [
  { name: "Agung", code: "AGU", region: "Bali", lat: -8.343, lng: 115.508, elevation_m: 3142, has_cctv: true },
  { name: "Ambang", code: "AMB", region: "Sulawesi Utara", lat: 0.75, lng: 124.42, elevation_m: 1795 },
  { name: "Anak Krakatau", code: "ANK", region: "Lampung", lat: -6.102, lng: 105.423, elevation_m: 157, has_cctv: true },
  { name: "Anak Ranakah", code: "RAN", region: "Nusa Tenggara Timur", lat: -8.622, lng: 120.523, elevation_m: 2148 },
  { name: "Arjuno Welirang", code: "ARJ", region: "Jawa Timur", lat: -7.725, lng: 112.58, elevation_m: 3339 },
  { name: "Awu", code: "AWU", region: "Sulawesi Utara", lat: 3.689, lng: 125.447, elevation_m: 1320, has_cctv: true },
  { name: "Banda Api", code: "BAN", region: "Maluku", lat: -4.523, lng: 129.872, elevation_m: 640 },
  { name: "Batur", code: "BAT", region: "Bali", lat: -8.242, lng: 115.375, elevation_m: 1717, has_cctv: true },
  { name: "Batutara", code: "TAR", region: "Nusa Tenggara Timur", lat: -7.792, lng: 123.579, elevation_m: 748 },
  { name: "Bromo", code: "BRO", region: "Jawa Timur", lat: -7.942, lng: 112.95, elevation_m: 2329, has_cctv: true },
  { name: "Bur Ni Telong", code: "TEL", region: "Aceh", lat: 4.769, lng: 96.821, elevation_m: 2624 },
  { name: "Ciremai", code: "CER", region: "Jawa Barat", lat: -6.892, lng: 108.406, elevation_m: 3078 },
  { name: "Colo", code: "COL", region: "Sulawesi Tengah", lat: -0.17, lng: 121.61, elevation_m: 507 },
  { name: "Dempo", code: "DEM", region: "Sumatera Selatan", lat: -4.03, lng: 103.13, elevation_m: 3173, has_cctv: true },
  { name: "Dieng", code: "DIE", region: "Jawa Tengah", lat: -7.2, lng: 109.92, elevation_m: 2565, has_cctv: true },
  { name: "Dukono", code: "DUK", region: "Maluku Utara", lat: 1.68, lng: 127.88, elevation_m: 1335, has_cctv: true },
  { name: "Ebulobo", code: "EBU", region: "Nusa Tenggara Timur", lat: -8.82, lng: 121.18, elevation_m: 2124 },
  { name: "Egon", code: "EGO", region: "Nusa Tenggara Timur", lat: -8.67, lng: 122.45, elevation_m: 1703 },
  { name: "Galunggung", code: "GAL", region: "Jawa Barat", lat: -7.25, lng: 108.058, elevation_m: 2168 },
  { name: "Gamalama", code: "GML", region: "Maluku Utara", lat: 0.8, lng: 127.33, elevation_m: 1715, has_cctv: true },
  { name: "Gamkonora", code: "GKO", region: "Maluku Utara", lat: 1.38, lng: 127.53, elevation_m: 1635 },
  { name: "Gede", code: "GED", region: "Jawa Barat", lat: -6.78, lng: 106.98, elevation_m: 2958, has_cctv: true },
  { name: "Guntur", code: "GUN", region: "Jawa Barat", lat: -7.143, lng: 107.84, elevation_m: 2249, has_cctv: true },
  { name: "Hobal", code: "HOB", region: "Nusa Tenggara Timur", lat: -6.66, lng: 123.83, elevation_m: 0 },
  { name: "Ibu", code: "IBU", region: "Maluku Utara", lat: 1.488, lng: 127.63, elevation_m: 1325, has_cctv: true },
  { name: "Ijen", code: "IJE", region: "Jawa Timur", lat: -8.058, lng: 114.242, elevation_m: 2799, has_cctv: true },
  { name: "Ile Werung", code: "WER", region: "Nusa Tenggara Timur", lat: -8.53, lng: 123.57, elevation_m: 1018 },
  { name: "Ili Boleng", code: "BOL", region: "Nusa Tenggara Timur", lat: -8.342, lng: 123.258, elevation_m: 1659 },
  { name: "Ili Lewotolok", code: "LEW", region: "Nusa Tenggara Timur", lat: -8.272, lng: 123.505, elevation_m: 1423, has_cctv: true },
  { name: "Inielika", code: "LIK", region: "Nusa Tenggara Timur", lat: -8.73, lng: 120.98, elevation_m: 1559 },
  { name: "Inierie", code: "RIE", region: "Nusa Tenggara Timur", lat: -8.875, lng: 120.95, elevation_m: 2245 },
  { name: "Iya", code: "IYA", region: "Nusa Tenggara Timur", lat: -8.897, lng: 121.645, elevation_m: 637 },
  { name: "Kaba", code: "KAB", region: "Bengkulu", lat: -3.52, lng: 102.62, elevation_m: 1952 },
  { name: "Karangetang", code: "KAR", region: "Sulawesi Utara", lat: 2.78, lng: 125.4, elevation_m: 1784, has_cctv: true },
  { name: "Kelimutu", code: "KEL", region: "Nusa Tenggara Timur", lat: -8.762, lng: 121.82, elevation_m: 1639 },
  { name: "Kelud", code: "KLU", region: "Jawa Timur", lat: -7.93, lng: 112.308, elevation_m: 1731, has_cctv: true },
  { name: "Kerinci", code: "KER", region: "Jambi, Sumatera Barat", lat: -1.697, lng: 101.264, elevation_m: 3805, has_cctv: true },
  { name: "Kie Besi", code: "KIE", region: "Maluku Utara", lat: 0.32, lng: 127.4, elevation_m: 1357 },
  { name: "Lamongan", code: "LAM", region: "Jawa Timur", lat: -7.979, lng: 113.342, elevation_m: 1651 },
  { name: "Lereboleng", code: "LER", region: "Nusa Tenggara Timur", lat: -8.365, lng: 122.833, elevation_m: 1117 },
  { name: "Lewotobi Laki-laki", code: "LEL", region: "Nusa Tenggara Timur", lat: -8.542, lng: 122.775, elevation_m: 1584, has_cctv: true },
  { name: "Lewotobi Perempuan", code: "LEP", region: "Nusa Tenggara Timur", lat: -8.553, lng: 122.785, elevation_m: 1703 },
  { name: "Lokon", code: "LOK", region: "Sulawesi Utara", lat: 1.358, lng: 124.792, elevation_m: 1580, has_cctv: true },
  { name: "Mahawu", code: "MAH", region: "Sulawesi Utara", lat: 1.358, lng: 124.858, elevation_m: 1324 },
  { name: "Marapi", code: "MAR", region: "Sumatera Barat", lat: -0.38, lng: 100.474, elevation_m: 2891, has_cctv: true },
  { name: "Merapi", code: "MER", region: "Daerah Istimewa Yogyakarta dan Jawa Tengah", lat: -7.542, lng: 110.442, elevation_m: 2930, has_cctv: true },
  { name: "Papandayan", code: "PAP", region: "Jawa Barat", lat: -7.32, lng: 107.73, elevation_m: 2665, has_cctv: true },
  { name: "Peut Sague", code: "PEU", region: "Daerah Istimewa Aceh", lat: 4.914, lng: 96.329, elevation_m: 2801 },
  { name: "Raung", code: "RAU", region: "Jawa Timur", lat: -8.125, lng: 114.042, elevation_m: 3332, has_cctv: true },
  { name: "Rinjani", code: "RIN", region: "Nusa Tenggara Barat", lat: -8.42, lng: 116.47, elevation_m: 3726, has_cctv: true },
  { name: "Rokatenda", code: "ROK", region: "Nusa Tenggara Timur", lat: -8.35, lng: 121.708, elevation_m: 875 },
  { name: "Ruang", code: "RUA", region: "Sulawesi Utara", lat: 2.3, lng: 125.37, elevation_m: 725, has_cctv: true },
  { name: "Salak", code: "SAL", region: "Jawa Barat", lat: -6.72, lng: 106.73, elevation_m: 2211 },
  { name: "Sangeangapi", code: "SAN", region: "Nusa Tenggara Barat", lat: -8.2, lng: 119.07, elevation_m: 1949, has_cctv: true },
  { name: "Semeru", code: "SEM", region: "Jawa Timur", lat: -8.108, lng: 112.92, elevation_m: 3676, has_cctv: true },
  { name: "Seulawah Agam", code: "SEU", region: "Daerah Istimewa Aceh", lat: 5.448, lng: 95.658, elevation_m: 1810 },
  { name: "Sinabung", code: "SIN", region: "Sumatera Utara", lat: 3.17, lng: 98.392, elevation_m: 2460, has_cctv: true },
  { name: "Sirung", code: "SIR", region: "Nusa Tenggara Timur", lat: -8.508, lng: 124.13, elevation_m: 862 },
  { name: "Slamet", code: "SLA", region: "Jawa Tengah", lat: -7.242, lng: 109.208, elevation_m: 3428, has_cctv: true },
  { name: "Soputan", code: "SOP", region: "Sulawesi Utara", lat: 1.108, lng: 124.737, elevation_m: 1785, has_cctv: true },
  { name: "Sorikmarapi", code: "SOR", region: "Sumatera Utara", lat: 0.686, lng: 99.539, elevation_m: 2145 },
  { name: "Sumbing", code: "SUM", region: "Jawa Tengah", lat: -7.384, lng: 110.07, elevation_m: 3371 },
  { name: "Sundoro", code: "SUN", region: "Jawa Tengah", lat: -7.3, lng: 109.992, elevation_m: 3136 },
  { name: "Talang", code: "TAL", region: "Sumatera Barat", lat: -0.978, lng: 100.679, elevation_m: 2597 },
  { name: "Tambora", code: "TAM", region: "Nusa Tenggara Barat", lat: -8.25, lng: 117.991, elevation_m: 2850, has_cctv: true },
  { name: "Tandikat", code: "TAN", region: "Sumatera Barat", lat: -0.433, lng: 100.317, elevation_m: 2438 },
  { name: "Tangkoko", code: "TKO", region: "Sulawesi Utara", lat: 1.52, lng: 125.2, elevation_m: 1149 },
  { name: "Tangkuban Parahu", code: "TPR", region: "Jawa Barat", lat: -6.77, lng: 107.6, elevation_m: 2084, has_cctv: true },
  { name: "Wurlali", code: "WUR", region: "Maluku", lat: -7.125, lng: 128.675, elevation_m: 868 },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildSeedVolcanoes(
  levels: Record<string, ActivityLevel> = {},
): Volcano[] {
  return SEED.map((v) => {
    const level = levels[v.name] ?? 1;
    return {
      id: slugify(v.name),
      name: v.name,
      slug: slugify(v.name),
      code: v.code,
      region: v.region,
      lat: v.lat,
      lng: v.lng,
      elevation_m: v.elevation_m,
      activity_level: level,
      activity_label: ACTIVITY_LABELS[level],
      magma_url: `https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas`,
      cctv_url: `https://magma.esdm.go.id/v1/gunung-api/cctv/${magmaCode(v.code)}`,
      has_cctv: hasMagmaCctv(v.code),
    };
  });
}

/** Known elevated levels from MAGMA as of plan research (fallback if sync fails). */
export const FALLBACK_LEVELS: Record<string, ActivityLevel> = {
  "Anak Krakatau": 3,
  "Lewotobi Laki-laki": 3,
  Merapi: 3,
  Semeru: 3,
  Sinabung: 3,
  "Anak Ranakah": 2,
  Awu: 2,
  "Banda Api": 2,
  Bromo: 2,
  "Bur Ni Telong": 2,
  Dempo: 2,
  Dukono: 2,
  Gamalama: 2,
  Ibu: 2,
  "Ili Lewotolok": 2,
  Iya: 2,
  Karangetang: 2,
  Kerinci: 2,
  Lokon: 2,
  Marapi: 2,
  Raung: 2,
  Rinjani: 2,
  Sangeangapi: 2,
  Slamet: 2,
  Soputan: 2,
  Sorikmarapi: 2,
  Tambora: 2,
};
