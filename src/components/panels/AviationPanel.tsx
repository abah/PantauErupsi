"use client";

import type { AirportStation } from "@/lib/types";

export function AviationPanel({
  airports,
  reportTime,
  onClose,
  onFocusAirport,
}: {
  airports: AirportStation[];
  reportTime?: string | null;
  onClose: () => void;
  onFocusAirport?: (a: AirportStation) => void;
}) {
  const closed = airports.filter((a) => a.closed);
  const va = airports.filter((a) => a.has_va);
  const open = airports.filter((a) => !a.closed);

  return (
    <aside className="pointer-events-auto absolute bottom-0 left-0 top-0 z-20 flex w-full max-w-md flex-col border-r border-[var(--line)] bg-[var(--panel)]/96 backdrop-blur-xl animate-[pe-slide_0.32s_ease-out] md:w-[400px]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            BMKG Aviation
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            VA Map · Bandara
          </h2>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Live dari{" "}
            <a
              href="https://web-aviation.bmkg.go.id/va-map.php"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)]"
            >
              web-aviation.bmkg.go.id/va-map.php
            </a>
            {reportTime ? ` · ${reportTime}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[var(--line)] px-2 py-1 text-sm text-[var(--muted)]"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] px-5 py-3">
        <div className="rounded border border-[var(--ember)]/40 bg-[var(--panel-2)] px-2 py-2">
          <p className="text-[10px] uppercase text-[var(--muted)]">Closed</p>
          <p className="text-xl font-bold text-[var(--ember)]">{closed.length}</p>
        </div>
        <div className="rounded border border-[#2dd4bf]/35 bg-[var(--panel-2)] px-2 py-2">
          <p className="text-[10px] uppercase text-[var(--muted)]">Open</p>
          <p className="text-xl font-bold text-[#2dd4bf]">{open.length}</p>
        </div>
        <div className="rounded border border-[var(--sulfur)]/40 bg-[var(--panel-2)] px-2 py-2">
          <p className="text-[10px] uppercase text-[var(--muted)]">METAR VA</p>
          <p className="text-xl font-bold text-[var(--sulfur)]">{va.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Bandara CLOSED
        </h3>
        {closed.length === 0 ? (
          <p className="mb-4 text-sm text-[var(--muted)]">
            Tidak ada bandara closed saat ini.
          </p>
        ) : (
          <ul className="mb-4 space-y-2">
            {closed.map((a) => (
              <li key={a.icao}>
                <button
                  type="button"
                  onClick={() => onFocusAirport?.(a)}
                  className="w-full rounded border border-[var(--ember)]/30 bg-[var(--panel-2)] p-3 text-left hover:border-[var(--ember)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-[var(--ember)]">
                      {a.icao}
                    </span>
                    <span className="rounded bg-[var(--ember)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      CLOSED
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink)]">{a.name}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {a.closed_reason || "AERODROME CLOSED"}
                  </p>
                  {a.closed_detail && (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                      {a.closed_detail}
                    </p>
                  )}
                  {a.metar && (
                    <code className="mt-2 block overflow-x-auto rounded bg-[var(--bg)] px-2 py-1 text-[10px] text-[var(--accent)]">
                      {a.metar}
                    </code>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {va.filter((a) => !a.closed).length > 0 && (
          <>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              METAR VA (masih OPEN)
            </h3>
            <ul className="space-y-2">
              {va
                .filter((a) => !a.closed)
                .map((a) => (
                  <li key={a.icao}>
                    <button
                      type="button"
                      onClick={() => onFocusAirport?.(a)}
                      className="w-full rounded border border-[var(--sulfur)]/30 bg-[var(--panel-2)] p-3 text-left hover:border-[var(--sulfur)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-sm font-bold text-[var(--sulfur)]">
                          {a.icao}
                        </p>
                        <span className="rounded bg-[var(--sulfur)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--sulfur)]">
                          OPEN · VA
                        </span>
                      </div>
                      <p className="text-sm">{a.name}</p>
                      {a.metar && (
                        <code className="mt-2 block overflow-x-auto text-[10px] text-[var(--muted)]">
                          {a.metar}
                        </code>
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          </>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-[var(--muted)]">
          Marker peta: merah = CLOSED, kuning = OPEN dengan VA di METAR, hijau =
          OPEN. Total {airports.length} stasiun BMKG.
        </p>
      </div>
    </aside>
  );
}
