"use client";

/**
 * Atribusi sumber data resmi pemerintah — wajib ditampilkan.
 * PantauErupsi hanya mengagregasi; bukan situs resmi.
 */
export function SourcesAttribution({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[10px] leading-relaxed text-[var(--muted)]">
        Sumber resmi:{" "}
        <a
          href="https://magma.esdm.go.id/"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent)]"
        >
          PVMBG/MAGMA
        </a>
        {" · "}
        <a
          href="https://web-aviation.bmkg.go.id/va-map.php"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent)]"
        >
          BMKG Aviation VA Map
        </a>
        . Bukan situs resmi pemerintah.
      </p>
    );
  }

  return (
    <section
      aria-label="Sumber data resmi"
      className="rounded border border-[var(--line)] bg-[var(--panel)]/90 p-3 text-[11px] leading-relaxed text-[var(--muted)] backdrop-blur"
    >
      <p className="font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
        Sumber data resmi pemerintah
      </p>
      <ul className="mt-2 space-y-1.5">
        <li>
          <a
            href="https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            PVMBG / MAGMA Indonesia
          </a>
          {" — "}tingkat aktivitas gunung api, CCTV, VONA (Kementerian ESDM)
        </li>
        <li>
          <a
            href="https://web-aviation.bmkg.go.id/va-map.php"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            BMKG Aviation VA Map
          </a>
          {" — "}status bandara OPEN/CLOSED, METAR/TAF, kode VA
        </li>
      </ul>
      <p className="mt-2 text-[10px] opacity-80">
        PantauErupsi mengagregasi data publik tersebut untuk edukasi. Keputusan
        operasional, perjalanan, atau evakuasi harus merujuk langsung ke situs
        resmi PVMBG/MAGMA dan BMKG.
      </p>
    </section>
  );
}
