"use client";

import { useMemo, useState } from "react";
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
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"closed" | "open" | "va">("open");

  const closed = useMemo(() => airports.filter((a) => a.closed), [airports]);
  const va = useMemo(() => airports.filter((a) => a.has_va), [airports]);
  const open = useMemo(() => airports.filter((a) => !a.closed), [airports]);

  const filteredOpen = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = open.filter((a) => !a.has_va);
    if (!needle) return list.slice().sort((a, b) => a.icao.localeCompare(b.icao));
    return list
      .filter(
        (a) =>
          a.icao.toLowerCase().includes(needle) ||
          a.name.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.icao.localeCompare(b.icao));
  }, [open, q]);

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
        <button
          type="button"
          onClick={() => setTab("closed")}
          className={`rounded border px-2 py-2 text-left ${
            tab === "closed"
              ? "border-[var(--ember)] bg-[var(--panel-2)]"
              : "border-[var(--line)]"
          }`}
        >
          <p className="text-[10px] uppercase text-[var(--muted)]">Closed</p>
          <p className="text-xl font-bold text-[var(--ember)]">{closed.length}</p>
        </button>
        <button
          type="button"
          onClick={() => setTab("open")}
          className={`rounded border px-2 py-2 text-left ${
            tab === "open"
              ? "border-[#2dd4bf] bg-[var(--panel-2)]"
              : "border-[var(--line)]"
          }`}
        >
          <p className="text-[10px] uppercase text-[var(--muted)]">Open</p>
          <p className="text-xl font-bold text-[#2dd4bf]">{open.length}</p>
        </button>
        <button
          type="button"
          onClick={() => setTab("va")}
          className={`rounded border px-2 py-2 text-left ${
            tab === "va"
              ? "border-[var(--sulfur)] bg-[var(--panel-2)]"
              : "border-[var(--line)]"
          }`}
        >
          <p className="text-[10px] uppercase text-[var(--muted)]">METAR VA</p>
          <p className="text-xl font-bold text-[var(--sulfur)]">{va.length}</p>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "closed" && (
          <>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Bandara CLOSED
            </h3>
            {closed.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Tidak ada bandara closed saat ini.
              </p>
            ) : (
              <ul className="space-y-2">
                {closed.map((a) => (
                  <AirportRow
                    key={a.icao}
                    a={a}
                    badge="CLOSED"
                    badgeClass="bg-[var(--ember)] text-white"
                    borderClass="border-[var(--ember)]/30 hover:border-[var(--ember)]"
                    codeClass="text-[var(--ember)]"
                    onFocus={onFocusAirport}
                  />
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "open" && (
          <>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Bandara OPEN (aktif)
            </h3>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari ICAO / nama bandara…"
              className="mb-3 w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <p className="mb-2 text-[11px] text-[var(--muted)]">
              {filteredOpen.length} bandara · titik hijau di peta
            </p>
            <ul className="space-y-2">
              {filteredOpen.map((a) => (
                <AirportRow
                  key={a.icao}
                  a={a}
                  badge="OPEN"
                  badgeClass="bg-[#2dd4bf]/20 text-[#2dd4bf]"
                  borderClass="border-[#2dd4bf]/25 hover:border-[#2dd4bf]"
                  codeClass="text-[#2dd4bf]"
                  onFocus={onFocusAirport}
                />
              ))}
            </ul>
          </>
        )}

        {tab === "va" && (
          <>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              METAR VA
            </h3>
            {va.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Tidak ada stasiun dengan kode VA saat ini.
              </p>
            ) : (
              <ul className="space-y-2">
                {va.map((a) => (
                  <AirportRow
                    key={a.icao}
                    a={a}
                    badge={a.closed ? "CLOSED · VA" : "OPEN · VA"}
                    badgeClass="bg-[var(--sulfur)]/20 text-[var(--sulfur)]"
                    borderClass="border-[var(--sulfur)]/30 hover:border-[var(--sulfur)]"
                    codeClass="text-[var(--sulfur)]"
                    onFocus={onFocusAirport}
                  />
                ))}
              </ul>
            )}
          </>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-[var(--muted)]">
          Marker peta: hijau = OPEN, kuning = OPEN+VA, merah = CLOSED. Sumber:
          BMKG Aviation VA Map.
        </p>
      </div>
    </aside>
  );
}

function AirportRow({
  a,
  badge,
  badgeClass,
  borderClass,
  codeClass,
  onFocus,
}: {
  a: AirportStation;
  badge: string;
  badgeClass: string;
  borderClass: string;
  codeClass: string;
  onFocus?: (a: AirportStation) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onFocus?.(a)}
        className={`w-full rounded border bg-[var(--panel-2)] p-3 text-left ${borderClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`font-mono text-sm font-bold ${codeClass}`}>
            {a.icao}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}
          >
            {badge}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--ink)]">{a.name}</p>
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
  );
}
