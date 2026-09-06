"use client";

import { useEffect, useState } from "react";
import type {
  CctvCamera,
  Impact,
  Volcano,
  VonaNotice,
} from "@/lib/types";
import { ACTIVITY_COLORS } from "@/lib/types";
import { ImpactPanel } from "@/components/panels/ImpactPanel";
import { CctvGallery } from "@/components/cctv/CctvGallery";
import { VonaPanel } from "@/components/vona/VonaPanel";

type Detail = {
  volcano: Volcano;
  impacts: Impact[];
  vona: VonaNotice[];
  cctv: CctvCamera[];
};

type Props = {
  volcano: Volcano | null;
  onClose: () => void;
  favoriteIds: string[];
  onToggleFavorite?: (id: string) => void;
};

export function DetailPanel({
  volcano,
  onClose,
  favoriteIds,
  onToggleFavorite,
}: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState<"dampak" | "cctv" | "vona" | "info">("dampak");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!volcano) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/volcanoes/${volcano.slug}`)
      .then((r) => r.json())
      .then((data: Detail) => {
        setDetail(data);
        if (data.impacts?.length) setTab("dampak");
        else if (data.cctv?.length || volcano.has_cctv) setTab("cctv");
        else if (data.vona?.length) setTab("vona");
        else setTab("info");
      })
      .finally(() => setLoading(false));
  }, [volcano]);

  if (!volcano) return null;

  const color = ACTIVITY_COLORS[volcano.activity_level];
  const isFav = favoriteIds.includes(volcano.id);
  const impactCount = detail?.impacts.length ?? 0;
  const vonaCount = detail?.vona.length ?? 0;

  return (
    <aside
      className="pointer-events-auto absolute bottom-0 right-0 top-0 z-20 flex w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--panel)]/96 shadow-[-24px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-xl animate-[pe-slide_0.32s_ease-out] md:w-[440px]"
      aria-label={`Detail ${volcano.name}`}
    >
      <div className="relative overflow-hidden border-b border-[var(--line)] px-5 pb-4 pt-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
          style={{ background: color }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              {volcano.region}
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] font-bold leading-none tracking-tight text-[var(--ink)]">
              {volcano.name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white"
                style={{ background: color }}
              >
                Level {volcano.activity_level} · {volcano.activity_label}
              </span>
              {volcano.elevation_m ? (
                <span className="text-xs text-[var(--muted)]">
                  {volcano.elevation_m.toLocaleString("id-ID")} m
                </span>
              ) : null}
              {volcano.has_cctv && (
                <span className="rounded border border-[var(--accent)]/40 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                  CCTV
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--line)] px-2.5 py-1 text-sm text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Dampak</p>
            <p className="text-lg font-semibold text-[var(--ink)]">{loading ? "…" : impactCount}</p>
          </div>
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">VONA</p>
            <p className="text-lg font-semibold text-[var(--ink)]">{loading ? "…" : vonaCount}</p>
          </div>
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Kode</p>
            <p className="text-lg font-semibold text-[var(--ink)]">{volcano.code}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--line)] px-3 py-2">
        {(
          [
            ["dampak", "Dampak"],
            ["cctv", "CCTV"],
            ["vona", "VONA"],
            ["info", "Info"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded px-3 py-1.5 text-sm transition ${
              tab === id
                ? "bg-[var(--ink)] font-medium text-[var(--bg)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <p className="text-sm text-[var(--muted)]">Memuat data lapangan…</p>
        )}

        {!loading && tab === "dampak" && detail && (
          <ImpactPanel impacts={detail.impacts} />
        )}

        {!loading && tab === "cctv" && (
          <CctvGallery
            code={volcano.code}
            volcanoName={volcano.name}
            fallbackMagmaUrl={volcano.cctv_url}
          />
        )}

        {!loading && tab === "vona" && (
          <VonaPanel
            code={volcano.code}
            volcanoId={volcano.id}
            volcanoName={volcano.name}
          />
        )}

        {!loading && tab === "info" && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
                <dt className="text-[var(--muted)]">Koordinat</dt>
                <dd className="mt-1 font-medium">
                  {volcano.lat.toFixed(3)}, {volcano.lng.toFixed(3)}
                </dd>
              </div>
              <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
                <dt className="text-[var(--muted)]">Wilayah</dt>
                <dd className="mt-1 font-medium">{volcano.region}</dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              Status tingkat aktivitas bersumber dari PVMBG / MAGMA Indonesia.
              PantauErupsi bukan situs resmi pemerintah. Selalu verifikasi
              laporan asli sebelum keputusan perjalanan atau evakuasi.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={volcano.magma_url}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#041016]"
              >
                Buka MAGMA
              </a>
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(volcano.id)}
                  className="rounded border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {isFav ? "Hapus favorit" : "Favoritkan"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
