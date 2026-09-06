"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VolcanoMap } from "@/components/map/VolcanoMap";
import { DetailPanel } from "@/components/panels/DetailPanel";
import { AviationPanel } from "@/components/panels/AviationPanel";
import type { ActivityLevel, AirportStation, Volcano } from "@/lib/types";
import { ACTIVITY_COLORS, ACTIVITY_LABELS } from "@/lib/types";
import { SourcesAttribution } from "@/components/SourcesAttribution";

type Filters = {
  minLevel: ActivityLevel;
  cctv: boolean;
  impact: boolean;
  vona: boolean;
  airports: boolean;
};

export function MapShell() {
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([]);
  const [allForAlerts, setAllForAlerts] = useState<Volcano[]>([]);
  const [airports, setAirports] = useState<AirportStation[]>([]);
  const [airportsReport, setAirportsReport] = useState<string | null>(null);
  const [selected, setSelected] = useState<Volcano | null>(null);
  const [showAviation, setShowAviation] = useState(false);
  const [focusAirportIcao, setFocusAirportIcao] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [filters, setFilters] = useState<Filters>({
    minLevel: 1,
    cctv: false,
    impact: false,
    vona: false,
    airports: true,
  });
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("minLevel", String(filters.minLevel));
    if (filters.cctv) p.set("cctv", "1");
    if (filters.impact) p.set("impact", "1");
    if (filters.vona) p.set("vona", "1");
    return p.toString();
  }, [filters.minLevel, filters.cctv, filters.impact, filters.vona]);

  const loadVolcanoes = useCallback(async () => {
    setLoading(true);
    try {
      const [filtered, all] = await Promise.all([
        fetch(`/api/volcanoes?${query}`).then((r) => r.json()),
        fetch("/api/volcanoes?minLevel=1").then((r) => r.json()),
      ]);
      setVolcanoes(filtered.volcanoes ?? []);
      setAllForAlerts(all.volcanoes ?? []);
      setLastSync(filtered.last_sync_at ?? all.last_sync_at ?? null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadAirports = useCallback(async () => {
    try {
      const ap = await fetch("/api/airports").then((r) => r.json());
      setAirports(Array.isArray(ap.airports) ? ap.airports : []);
      setAirportsReport(ap.report_time ?? null);
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        const res = await fetch("/api/refresh");
        const data = await res.json();
        if (!cancelled && data.synced_at) setLastSync(data.synced_at);
      } catch {
        /* tetap tampilkan cache */
      } finally {
        if (!cancelled) setRefreshing(false);
      }
      if (!cancelled) await Promise.all([loadVolcanoes(), loadAirports()]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat app dibuka
  }, []);

  useEffect(() => {
    loadVolcanoes();
  }, [loadVolcanoes]);

  useEffect(() => {
    loadAirports();
    const t = setInterval(loadAirports, 120_000);
    return () => clearInterval(t);
  }, [loadAirports]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUserEmail(data.user.email);
          setFavoriteIds(data.user.profile.favorite_volcano_ids ?? []);
        }
      })
      .catch(() => undefined);
  }, []);

  const visible = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return volcanoes;
    return volcanoes.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q),
    );
  }, [volcanoes, queryText]);

  const elevated = useMemo(
    () =>
      allForAlerts
        .filter((v) => v.activity_level >= 3)
        .sort((a, b) => b.activity_level - a.activity_level),
    [allForAlerts],
  );

  const closedAirports = useMemo(
    () => airports.filter((a) => a.closed),
    [airports],
  );
  const vaAirports = useMemo(() => airports.filter((a) => a.has_va), [airports]);

  const counts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<ActivityLevel, number>;
    for (const v of allForAlerts) c[v.activity_level] += 1;
    return c;
  }, [allForAlerts]);

  async function toggleFavorite(id: string) {
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter((x) => x !== id)
      : [...favoriteIds, id];
    setFavoriteIds(next);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite_volcano_ids: next }),
    });
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[var(--bg)]">
      <VolcanoMap
        volcanoes={visible}
        airports={airports}
        showAirports={filters.airports}
        selectedId={selected?.id}
        focusAirportIcao={focusAirportIcao}
        onSelect={(v) => {
          setShowAviation(false);
          setFocusAirportIcao(null);
          setSelected(v);
        }}
        onSelectAirport={(a) => {
          setSelected(null);
          setFocusAirportIcao(a.icao);
          setShowAviation(true);
        }}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#07090d]/95 via-[#07090d]/55 to-transparent pb-16 pt-5">
        <div className="pointer-events-auto flex items-start justify-between gap-4 px-4 md:px-6">
          <div className="animate-[pe-fade-up_0.5s_ease-out]">
            <p className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,6vw,4.2rem)] font-extrabold leading-[0.9] tracking-[-0.04em] text-[var(--ink)]">
              Pantau
              <span className="text-[var(--ember)]">Erupsi</span>
            </p>
            <p className="mt-2 max-w-md text-sm text-[var(--ink-soft)] md:text-[15px]">
              PVMBG/MAGMA + BMKG Aviation VA Map — status gunung, CCTV, VONA, dan
              bandara terdampak abu.
            </p>
          </div>

          <nav className="flex shrink-0 items-center gap-2">
            <Link
              href={userEmail ? "/saya" : "/login"}
              className="rounded border border-[var(--line)] bg-[var(--panel)]/80 px-3 py-2 text-xs font-medium text-[var(--ink)] backdrop-blur hover:border-[var(--accent)]"
            >
              {userEmail ? "Akun" : "Masuk"}
            </Link>
            <Link
              href="/admin"
              className="rounded border border-[var(--line)] bg-[var(--panel)]/80 px-3 py-2 text-xs text-[var(--muted)] backdrop-blur hover:text-[var(--ink)]"
            >
              Admin
            </Link>
          </nav>
        </div>

        <div className="pointer-events-auto mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:px-6">
          {closedAirports.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setShowAviation(true);
              }}
              className="flex shrink-0 items-center gap-2 rounded border border-[var(--ember)]/50 bg-[var(--panel)]/90 px-3 py-2 text-left backdrop-blur"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--ember)]" />
              <span className="text-sm font-semibold">
                {closedAirports.length} bandara CLOSED
              </span>
              <span className="text-xs text-[var(--ember)]">BMKG</span>
            </button>
          )}
          {vaAirports.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setShowAviation(true);
              }}
              className="flex shrink-0 items-center gap-2 rounded border border-[var(--sulfur)]/45 bg-[var(--panel)]/90 px-3 py-2 backdrop-blur"
            >
              <span className="text-sm font-semibold text-[var(--sulfur)]">
                {vaAirports.length} METAR VA
              </span>
            </button>
          )}
          {elevated.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setShowAviation(false);
                setSelected(v);
              }}
              className="flex shrink-0 items-center gap-2 rounded border border-[var(--ember)]/35 bg-[var(--panel)]/90 px-3 py-2 text-left backdrop-blur transition hover:border-[var(--ember)]"
            >
              <span
                className="h-2 w-2 animate-[pe-pulse_1.8s_ease-out_infinite] rounded-full"
                style={{ background: ACTIVITY_COLORS[v.activity_level] }}
              />
              <span className="text-sm font-semibold text-[var(--ink)]">
                {v.name}
              </span>
              <span className="text-xs text-[var(--ember)]">
                {v.activity_label}
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="pointer-events-auto absolute bottom-5 left-4 z-10 flex w-[min(100%-2rem,340px)] flex-col gap-2 md:left-6">
        <div className="rounded border border-[var(--line)] bg-[var(--panel)]/92 p-2 backdrop-blur-md">
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Cari gunung / wilayah / kode…"
            className="w-full rounded bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:ring-1 focus:ring-[var(--accent)]"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <select
              className="rounded border border-[var(--line)] bg-transparent px-2 py-1.5 text-xs text-[var(--ink-soft)]"
              value={filters.minLevel}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  minLevel: Number(e.target.value) as ActivityLevel,
                }))
              }
            >
              <option value={1}>Semua level</option>
              <option value={2}>Waspada+</option>
              <option value={3}>Siaga+</option>
              <option value={4}>Awas</option>
            </select>
            {(
              [
                ["airports", "Bandara"],
                ["cctv", "CCTV"],
                ["impact", "Dampak"],
                ["vona", "VONA"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                className={`rounded px-2.5 py-1.5 text-xs font-medium ${
                  filters[key]
                    ? "bg-[var(--accent)] text-[#041016]"
                    : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
          {([4, 3, 2, 1] as ActivityLevel[]).map((lvl) => (
            <span key={lvl} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: ACTIVITY_COLORS[lvl] }}
              />
              {ACTIVITY_LABELS[lvl]}
              {!loading ? ` ${counts[lvl]}` : ""}
            </span>
          ))}
          {filters.airports && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#ff1f4b]" />
                Closed {closedAirports.length}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2dd4bf]" />
                Open {Math.max(0, airports.length - closedAirports.length)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#e0b84a]" />
                VA {vaAirports.length}
              </span>
            </>
          )}
          <span className="w-full text-[10px] opacity-70">
            {refreshing
              ? "Memperbarui data resmi MAGMA + BMKG…"
              : lastSync
                ? `Sync ${new Date(lastSync).toLocaleString("id-ID")} · `
                : ""}
          </span>
          <SourcesAttribution compact />
        </div>
      </div>

      {showAviation && (
        <AviationPanel
          airports={airports}
          reportTime={airportsReport}
          onClose={() => setShowAviation(false)}
          onFocusAirport={(a) => setFocusAirportIcao(a.icao)}
        />
      )}

      <DetailPanel
        volcano={selected}
        onClose={() => setSelected(null)}
        favoriteIds={favoriteIds}
        onToggleFavorite={userEmail ? toggleFavorite : undefined}
      />
    </div>
  );
}
