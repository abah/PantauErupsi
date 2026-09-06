"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActivityLevel, AppNotification, Volcano } from "@/lib/types";
import { ACTIVITY_LABELS } from "@/lib/types";

type MeResponse = {
  user: {
    email: string;
    profile: {
      favorite_volcano_ids: string[];
      min_alert_level: ActivityLevel;
      email_digest: boolean;
      is_admin: boolean;
    };
  } | null;
  favorites: Volcano[];
};

export default function SayaPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const [meRes, nRes] = await Promise.all([
      fetch("/api/me").then((r) => r.json()),
      fetch("/api/notify").then((r) => (r.ok ? r.json() : { notifications: [] })),
    ]);
    setMe(meRes);
    setNotifications(nRes.notifications ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (me && !me.user) {
    return (
      <main className="mx-auto min-h-[100dvh] max-w-lg bg-[var(--bg)] px-5 py-16 text-[var(--ink)]">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Gunung saya
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Anda belum masuk.</p>
        <Link href="/login" className="mt-4 inline-block text-[var(--accent)]">
          Ke halaman masuk →
        </Link>
      </main>
    );
  }

  const profile = me?.user?.profile;

  async function savePrefs(patch: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await refresh();
    setSaving(false);
  }

  async function logout() {
    await fetch("/api/auth/demo", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-3xl bg-[var(--bg)] px-5 py-10 text-[var(--ink)]">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
          ← Peta
        </Link>
        <button type="button" onClick={logout} className="text-sm text-[var(--muted)]">
          Keluar
        </button>
      </div>

      <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight">
        Gunung saya
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{me?.user?.email}</p>

      <section className="mt-8 space-y-4 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Preferensi peringatan
        </h2>
        <label className="flex items-center gap-3 text-sm">
          Level minimum
          <select
            className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1"
            value={profile?.min_alert_level ?? 2}
            disabled={saving}
            onChange={(e) =>
              savePrefs({ min_alert_level: Number(e.target.value) as ActivityLevel })
            }
          >
            {([1, 2, 3, 4] as ActivityLevel[]).map((l) => (
              <option key={l} value={l}>
                {ACTIVITY_LABELS[l]}+
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={profile?.email_digest ?? true}
            disabled={saving}
            onChange={(e) => savePrefs({ email_digest: e.target.checked })}
          />
          Digest email untuk perubahan Siaga+
        </label>
      </section>

      <section className="mt-8 space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Favorit
        </h2>
        {(me?.favorites ?? []).length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Belum ada favorit. Buka detail gunung di peta lalu favoritkan.
          </p>
        ) : (
          <ul className="space-y-2">
            {me!.favorites.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              >
                <Link href={`/gunung/${v.slug}`} className="hover:text-[var(--accent)]">
                  {v.name} · {v.activity_label}
                </Link>
                <span className="text-[var(--muted)]">{v.region}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Notifikasi
        </h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada notifikasi.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className="rounded border border-[var(--line)] bg-[var(--panel)] p-3">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{n.body}</p>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  {new Date(n.created_at).toLocaleString("id-ID")}
                  {!n.read_at && (
                    <button
                      type="button"
                      className="ml-2 text-[var(--accent)]"
                      onClick={async () => {
                        await fetch("/api/notify", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: n.id }),
                        });
                        refresh();
                      }}
                    >
                      Tandai dibaca
                    </button>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
