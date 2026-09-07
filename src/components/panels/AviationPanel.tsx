"use client";

import { useEffect, useMemo, useState } from "react";
import type { AirportStation } from "@/lib/types";

export function AviationPanel({
  airports,
  reportTime,
  selectedIcao,
  onClose,
  onFocusAirport,
  onClearSelection,
}: {
  airports: AirportStation[];
  reportTime?: string | null;
  selectedIcao?: string | null;
  onClose: () => void;
  onFocusAirport?: (a: AirportStation) => void;
  onClearSelection?: () => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"closed" | "open" | "va">("open");

  const closed = useMemo(() => airports.filter((a) => a.closed), [airports]);
  const va = useMemo(() => airports.filter((a) => a.has_va), [airports]);
  const open = useMemo(() => airports.filter((a) => !a.closed), [airports]);

  const selected = useMemo(
    () =>
      selectedIcao
        ? airports.find((a) => a.icao === selectedIcao) ?? null
        : null,
    [airports, selectedIcao],
  );

  useEffect(() => {
    if (!selected) return;
    if (selected.closed) setTab("closed");
    else if (selected.has_va) setTab("va");
    else setTab("open");
  }, [selected]);

  const filteredOpen = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = open.filter((a) => !a.has_va);
    if (!needle)
      return list.slice().sort((a, b) => a.icao.localeCompare(b.icao));
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
            {selected ? selected.icao : "VA Map · Bandara"}
          </h2>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {selected ? (
              selected.name
            ) : (
              <>
                Live dari{" "}
                <a
                  href="https://web-aviation.bmkg.go.id/va-map.php"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)]"
                >
                  BMKG VA Map
                </a>
                {reportTime ? ` · ${reportTime}` : ""}
              </>
            )}
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

      {selected ? (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AirportDetail a={selected} />
          <button
            type="button"
            onClick={onClearSelection}
            className="mt-4 text-sm font-medium text-[var(--accent)]"
          >
            ← Kembali ke daftar bandara
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] px-5 py-3">
            <TabStat
              active={tab === "closed"}
              onClick={() => setTab("closed")}
              label="Closed"
              value={closed.length}
              color="text-[var(--ember)]"
              activeBorder="border-[var(--ember)]"
            />
            <TabStat
              active={tab === "open"}
              onClick={() => setTab("open")}
              label="Open"
              value={open.length}
              color="text-[#2dd4bf]"
              activeBorder="border-[#2dd4bf]"
            />
            <TabStat
              active={tab === "va"}
              onClick={() => setTab("va")}
              label="METAR VA"
              value={va.length}
              color="text-[var(--sulfur)]"
              activeBorder="border-[var(--sulfur)]"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {tab === "closed" && (
              <AirportList
                title="Bandara CLOSED"
                empty="Tidak ada bandara closed saat ini."
                items={closed}
                badge="CLOSED"
                badgeClass="bg-[var(--ember)] text-white"
                borderClass="border-[var(--ember)]/30 hover:border-[var(--ember)]"
                codeClass="text-[var(--ember)]"
                onFocus={onFocusAirport}
              />
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
                <AirportList
                  title=""
                  empty="Tidak ada hasil."
                  items={filteredOpen}
                  badge="OPEN"
                  badgeClass="bg-[#2dd4bf]/20 text-[#2dd4bf]"
                  borderClass="border-[#2dd4bf]/25 hover:border-[#2dd4bf]"
                  codeClass="text-[#2dd4bf]"
                  onFocus={onFocusAirport}
                />
              </>
            )}

            {tab === "va" && (
              <AirportList
                title="METAR VA"
                empty="Tidak ada stasiun dengan kode VA saat ini."
                items={va}
                badgeFn={(a) => (a.closed ? "CLOSED · VA" : "OPEN · VA")}
                badgeClass="bg-[var(--sulfur)]/20 text-[var(--sulfur)]"
                borderClass="border-[var(--sulfur)]/30 hover:border-[var(--sulfur)]"
                codeClass="text-[var(--sulfur)]"
                onFocus={onFocusAirport}
              />
            )}

            <p className="mt-5 text-[11px] leading-relaxed text-[var(--muted)]">
              Klik bandara di peta untuk melihat detail stasiun tersebut.
              Sumber: BMKG Aviation VA Map.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

function AirportDetail({ a }: { a: AirportStation }) {
  const status = a.closed ? "CLOSED" : a.has_va ? "OPEN · VA" : "OPEN";
  const statusColor = a.closed
    ? "bg-[var(--ember)] text-white"
    : a.has_va
      ? "bg-[var(--sulfur)] text-[#041016]"
      : "bg-[#2dd4bf] text-[#041016]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusColor}`}
        >
          {status}
        </span>
        {a.closed_reason && (
          <span className="text-xs text-[var(--muted)]">{a.closed_reason}</span>
        )}
      </div>

      <dl className="space-y-3 text-sm">
        <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Nama
          </dt>
          <dd className="mt-1 font-medium text-[var(--ink)]">{a.name}</dd>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              ICAO
            </dt>
            <dd className="mt-1 font-mono font-bold text-[var(--accent)]">
              {a.icao}
            </dd>
          </div>
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Koordinat
            </dt>
            <dd className="mt-1 font-mono text-xs text-[var(--ink-soft)]">
              {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
            </dd>
          </div>
        </div>
        {a.elevation_m != null && !Number.isNaN(a.elevation_m) && (
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Elevasi
            </dt>
            <dd className="mt-1">{a.elevation_m} m</dd>
          </div>
        )}
        {a.closed_detail && (
          <div className="rounded border border-[var(--ember)]/30 bg-[var(--panel-2)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Periode penutupan (BMKG)
            </dt>
            <dd className="mt-1 leading-relaxed text-[var(--ink-soft)]">
              {a.closed_detail}
            </dd>
          </div>
        )}
        {a.metar && (
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              METAR
            </dt>
            <dd className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-[var(--accent)]">
              {a.metar}
            </dd>
          </div>
        )}
        {a.taf && (
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              TAF
            </dt>
            <dd className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-[var(--ink-soft)]">
              {a.taf}
            </dd>
          </div>
        )}
        {a.wmo && (
          <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              WMO
            </dt>
            <dd className="mt-1 font-mono">{a.wmo}</dd>
          </div>
        )}
      </dl>

      <a
        href="https://web-aviation.bmkg.go.id/va-map.php"
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-sm font-medium text-[var(--accent)]"
      >
        Buka BMKG VA Map →
      </a>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        Data resmi BMKG Aviation. PantauErupsi bukan situs resmi pemerintah.
      </p>
    </div>
  );
}

function TabStat({
  active,
  onClick,
  label,
  value,
  color,
  activeBorder,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: number;
  color: string;
  activeBorder: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-2 text-left ${
        active ? `${activeBorder} bg-[var(--panel-2)]` : "border-[var(--line)]"
      }`}
    >
      <p className="text-[10px] uppercase text-[var(--muted)]">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </button>
  );
}

function AirportList({
  title,
  empty,
  items,
  badge,
  badgeFn,
  badgeClass,
  borderClass,
  codeClass,
  onFocus,
}: {
  title: string;
  empty: string;
  items: AirportStation[];
  badge?: string;
  badgeFn?: (a: AirportStation) => string;
  badgeClass: string;
  borderClass: string;
  codeClass: string;
  onFocus?: (a: AirportStation) => void;
}) {
  return (
    <>
      {title ? (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {title}
        </h3>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.icao}>
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
                    {badgeFn ? badgeFn(a) : badge}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--ink)]">{a.name}</p>
                {a.closed_detail && (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                    {a.closed_detail}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
