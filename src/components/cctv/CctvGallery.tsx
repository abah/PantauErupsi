"use client";

import { useEffect, useState } from "react";

type Camera = {
  id: string;
  label: string;
  image_url: string | null;
  snap_url?: string | null;
  has_image?: boolean;
};

export function CctvGallery({
  code,
  volcanoName,
  fallbackMagmaUrl,
}: {
  code: string;
  volcanoName?: string;
  fallbackMagmaUrl: string;
}) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapLoading, setSnapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [magmaUrl, setMagmaUrl] = useState(fallbackMagmaUrl);
  const [selected, setSelected] = useState(0);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNote(null);
    setActiveImage(null);
    setSelected(0);
    fetch(`/api/cctv/${encodeURIComponent(code)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!cancelled) {
          setCameras(data.cameras ?? []);
          setNote(data.note ?? null);
          setAvailable(data.available !== false);
          if (data.magma_url) setMagmaUrl(data.magma_url);
          const first = (data.cameras ?? [])[0];
          if (first?.image_url) setActiveImage(first.image_url);
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
  }, [code]);

  const selectedId = cameras[selected]?.id;
  const selectedSnap = cameras[selected]?.snap_url;
  const selectedCached = cameras[selected]?.image_url;

  useEffect(() => {
    if (selectedCached) {
      setActiveImage(selectedCached);
      return;
    }
    if (!selectedSnap || !selectedId) {
      setActiveImage(null);
      return;
    }

    let cancelled = false;
    setSnapLoading(true);
    fetch(selectedSnap)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Snapshot gagal");
        if (!cancelled) {
          setActiveImage(data.image_url ?? null);
          setCameras((prev) =>
            prev.map((c) =>
              c.id === selectedId
                ? { ...c, image_url: data.image_url ?? null, has_image: true }
                : c,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setActiveImage(null);
      })
      .finally(() => {
        if (!cancelled) setSnapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, selectedSnap, selectedCached]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-44 animate-pulse rounded border border-[var(--line)] bg-[var(--panel-2)]" />
        <p className="text-sm text-[var(--muted)]">
          Mengambil kamera dari MAGMA…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-4">
        <p className="text-sm text-[var(--ink-soft)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeImage ? (
        <div className="overflow-hidden rounded border border-[var(--line)] bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={cameras[selected]?.label || volcanoName || "CCTV"}
            className="max-h-64 w-full object-contain"
          />
          <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--panel-2)] px-3 py-2">
            <p className="truncate text-xs text-[var(--ink-soft)]">
              {cameras[selected]?.label}
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ember)]">
              Snapshot MAGMA
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] px-4 py-5 text-center">
          {snapLoading ? (
            <p className="text-sm text-[var(--muted)]">Memuat snapshot…</p>
          ) : (
            <>
              <p className="text-sm text-[var(--ink-soft)]">
                {note ||
                  (available
                    ? `Snapshot ${volcanoName || "gunung ini"} sedang tidak bisa diambil dari MAGMA.`
                    : `MAGMA belum mempublikasikan CCTV live untuk ${volcanoName || "gunung ini"}.`)}
              </p>
              {!available && (
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  CCTV MAGMA saat ini: Anak Krakatau, Bromo, Dempo, Dieng,
                  Guntur, Ibu, Ijen, Kerinci, Papandayan, Semeru, Sinabung.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {cameras.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {cameras.map((cam, idx) => (
            <button
              key={cam.id}
              type="button"
              onClick={() => setSelected(idx)}
              className={`rounded px-2.5 py-1 text-xs ${
                idx === selected
                  ? "bg-[var(--ink)] text-[var(--bg)]"
                  : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {cam.label.replace(/^.*?\s*-\s*/i, "").slice(0, 28) ||
                `Kamera ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        Gambar dari MAGMA Indonesia (PVMBG) — CC BY-NC-ND 4.0. Sumber:{" "}
        <a
          href={magmaUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent)] underline-offset-2 hover:underline"
        >
          MAGMA CCTV
        </a>
        .
      </p>
    </div>
  );
}
