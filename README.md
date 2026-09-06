# PantauErupsi

Aplikasi web pemantau erupsi gunung api Indonesia berbasis peta interaktif.
**Bukan situs resmi pemerintah** — hanya mengagregasi data publik dari sumber resmi.

## Sumber data resmi (wajib)

| Data | Lembaga | Endpoint / situs resmi |
|------|---------|------------------------|
| Tingkat aktivitas gunung api | **PVMBG / MAGMA** (Kementerian ESDM) | [magma.esdm.go.id — Tingkat Aktivitas](https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas) |
| CCTV gunung api | **PVMBG / MAGMA** | [MAGMA CCTV](https://magma.esdm.go.id/) — gambar CC BY-NC-ND 4.0 |
| VONA (penerbangan) | **PVMBG / MAGMA** | [MAGMA VONA](https://magma.esdm.go.id/vona) |
| Bandara OPEN / CLOSED, METAR, VA | **BMKG Aviation** | [VA Map](https://web-aviation.bmkg.go.id/va-map.php) (`?data=1` JSON) |

Semua status operasional di app diambil dari endpoint/situs di atas. Dampak lapangan tambahan di panel admin bersifat kurasi lokal dan harus dilengkapi tautan sumber resmi bila memungkinkan.

## Fitur
- Peta MapLibre: gunung + bandara BMKG (OPEN/CLOSED/VA)
- Sync tingkat aktivitas MAGMA
- Snapshot CCTV & ringkasan VONA di dalam app
- Panel dampak, auth demo/Supabase, notifikasi, admin

## Mulai cepat

```bash
cp .env.example .env.local
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Mode demo (tanpa Supabase)
1. Buka `/login` → **Masuk sebagai admin demo**
2. Di `/admin`, klik **Sync MAGMA sekarang**
3. Kurasi dampak bandara/abu/kesehatan dari dashboard

### Deploy Cloudflare Workers (OpenNext)

```bash
npm run deploy
```

Set secret: `npx wrangler secret put CRON_SECRET`

## Lisensi data
- CCTV MAGMA: CC BY-NC-ND 4.0 (PVMBG)
- Status & VONA: hak cipta lembaga penerbit; ditampilkan untuk kepentingan publik/edukasi dengan atribusi
