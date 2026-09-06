import Link from "next/link";
import { notFound } from "next/navigation";
import { CctvGallery } from "@/components/cctv/CctvGallery";
import { ImpactPanel } from "@/components/panels/ImpactPanel";
import { VonaPanel } from "@/components/vona/VonaPanel";
import { getImpacts, getVolcanoBySlug } from "@/lib/store";
import { ACTIVITY_COLORS } from "@/lib/types";

export default async function GunungPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const volcano = await getVolcanoBySlug(slug);
  if (!volcano) notFound();

  const impacts = await getImpacts(volcano.id);
  const color = ACTIVITY_COLORS[volcano.activity_level];

  return (
    <main className="mx-auto min-h-[100dvh] max-w-3xl bg-[var(--bg)] px-5 py-10 text-[var(--ink)]">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        ← Kembali ke peta
      </Link>
      <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        {volcano.region}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight">
        {volcano.name}
      </h1>
      <span
        className="mt-4 inline-flex rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white"
        style={{ background: color }}
      >
        Level {volcano.activity_level} · {volcano.activity_label}
      </span>

      <section className="mt-10 space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Dampak
        </h2>
        <ImpactPanel impacts={impacts} />
      </section>

      <section className="mt-10 space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          CCTV
        </h2>
        <CctvGallery
          code={volcano.code}
          volcanoName={volcano.name}
          fallbackMagmaUrl={volcano.cctv_url}
        />
      </section>

      <section className="mt-10 space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          VONA
        </h2>
        <VonaPanel
          code={volcano.code}
          volcanoId={volcano.id}
          volcanoName={volcano.name}
        />
      </section>

      <p className="mt-12 text-xs text-[var(--muted)]">
        Sumber status: PVMBG / MAGMA Indonesia. PantauErupsi bukan situs resmi
        pemerintah.
      </p>
    </main>
  );
}
