"use client";

import { useEffect, useState } from "react";
import type { VonaNotice } from "@/lib/types";

const COLOR_STYLE: Record<string, string> = {
  Red: "bg-[#b42318] text-white",
  Orange: "bg-[#c2410c] text-white",
  Yellow: "bg-[#ca8a04] text-[#0b0f14]",
  Green: "bg-[#15803d] text-white",
};

export function VonaPanel({
  code,
  volcanoId,
  volcanoName,
}: {
  code: string;
  volcanoId?: string;
  volcanoName?: string;
}) {
  const [items, setItems] = useState<VonaNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officialUrl, setOfficialUrl] = useState(
    "https://magma.esdm.go.id/vona",
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (code) q.set("code", code);
    if (volcanoId) q.set("volcanoId", volcanoId);
    fetch(`/api/vona?${q.toString()}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Gagal memuat VONA");
        if (!cancelled) {
          setItems(data.vona ?? []);
          if (data.official_url) setOfficialUrl(data.official_url);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, volcanoId]);

  if (loading) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Mengambil ringkasan VONA dari MAGMA…
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-4">
        <p className="text-sm text-[var(--ink-soft)]">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-4">
        <p className="text-sm text-[var(--ink-soft)]">
          Belum ada VONA terbaru untuk {volcanoName || "gunung ini"}.
        </p>
        <a
          href={officialUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-sm font-medium text-[var(--accent)]"
        >
          Cek portal MAGMA →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((v) => {
        const colorKey = v.color_code
          ? v.color_code.charAt(0).toUpperCase() +
            v.color_code.slice(1).toLowerCase()
          : "";
        return (
          <article
            key={v.id}
            className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              {colorKey ? (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    COLOR_STYLE[colorKey] ??
                    "border border-[var(--line)] text-[var(--sulfur)]"
                  }`}
                >
                  {colorKey}
                </span>
              ) : null}
              {v.notice_number ? (
                <span className="text-[10px] font-medium tracking-wide text-[var(--muted)]">
                  {v.notice_number}
                </span>
              ) : null}
              <span className="text-xs text-[var(--muted)]">
                {formatIssued(v.issued_at)}
              </span>
            </div>

            <dl className="mt-3 space-y-2.5">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Aktivitas
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-[var(--ink)]">
                  {v.summary}
                </dd>
              </div>
              {v.ash_height ? (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Tinggi abu
                  </dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-[var(--sulfur)]">
                    {v.ash_height}
                  </dd>
                </div>
              ) : null}
              {v.remarks ? (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Catatan
                  </dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {v.remarks}
                  </dd>
                </div>
              ) : null}
            </dl>
          </article>
        );
      })}
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        Ringkasan resmi VONA (bahasa Inggris) dari MAGMA / PVMBG. Sumber:{" "}
        <a
          href={officialUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent)] underline-offset-2 hover:underline"
        >
          MAGMA VONA
        </a>
        .
      </p>
    </div>
  );
}

function formatIssued(raw: string) {
  if (!raw) return "";
  // MAGMA format: 20260905/0200Z
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})\/(\d{2})(\d{2})Z$/);
  if (m) {
    const [, y, mo, d, h, mi] = m;
    return `${d}/${mo}/${y} ${h}:${mi} UTC`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toLocaleString("id-ID");
  return raw;
}
