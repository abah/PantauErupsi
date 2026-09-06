"use client";

import type { Impact } from "@/lib/types";

const CATEGORY_LABEL: Record<Impact["category"], string> = {
  airport: "Bandara",
  ash: "Abu vulkanik",
  health: "Kesehatan",
  other: "Mitigasi",
};

const CATEGORY_TONE: Record<Impact["category"], string> = {
  airport: "text-[#7dd3fc] border-[#7dd3fc]/30",
  ash: "text-[var(--sulfur)] border-[var(--sulfur)]/30",
  health: "text-[#f9a8d4] border-[#f9a8d4]/30",
  other: "text-[var(--accent)] border-[var(--accent)]/30",
};

export function ImpactPanel({ impacts }: { impacts: Impact[] }) {
  if (impacts.length === 0) {
    return (
      <div className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-4">
        <p className="text-sm text-[var(--ink-soft)]">
          Belum ada catatan dampak kurasi untuk gunung ini.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Admin dapat menambahkan dampak bandara, abu, atau kesehatan dari
          dashboard.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {impacts.map((i) => (
        <li
          key={i.id}
          className="rounded border border-[var(--line)] bg-[var(--panel-2)] p-3"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CATEGORY_TONE[i.category]}`}
            >
              {CATEGORY_LABEL[i.category]}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              {i.status}
            </span>
          </div>
          <h4 className="font-[family-name:var(--font-display)] text-base font-semibold leading-snug text-[var(--ink)]">
            {i.title}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
            {i.body}
          </p>
          {i.meta?.bandara && (
            <p className="mt-3 rounded bg-[var(--bg)]/60 px-2 py-2 text-xs leading-relaxed text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--ink)]">Bandara: </span>
              {i.meta.bandara}
            </p>
          )}
          <p className="mt-3 text-[11px] text-[var(--muted)]">
            Sumber: {i.source}
            {i.source_url ? (
              <>
                {" · "}
                <a
                  href={i.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  tautan resmi
                </a>
              </>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
