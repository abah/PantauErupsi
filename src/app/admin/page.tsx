"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Impact, Volcano } from "@/lib/types";

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [audit, setAudit] = useState<
    { action: string; actor: string; created_at: string }[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    volcano_id: "",
    category: "airport" as Impact["category"],
    title: "",
    body: "",
    status: "active" as Impact["status"],
    source: "Kurasi admin",
    source_url: "",
  });

  async function load() {
    const me = await fetch("/api/me").then((r) => r.json());
    if (!me.user?.profile?.is_admin) {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
    setAudit(me.audit ?? []);
    const [v, i] = await Promise.all([
      fetch("/api/volcanoes").then((r) => r.json()),
      fetch("/api/impacts").then((r) => r.json()),
    ]);
    setVolcanoes(v.volcanoes ?? []);
    setImpacts(i.impacts ?? []);
    if (!form.volcano_id && v.volcanoes?.[0]) {
      setForm((f) => ({ ...f, volcano_id: v.volcanoes[0].id }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authorized === false) {
    return (
      <main className="mx-auto min-h-[100dvh] max-w-lg bg-[var(--bg)] px-5 py-16 text-[var(--ink)]">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Admin
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Akses ditolak. Masuk sebagai admin demo atau email di ADMIN_EMAILS.
        </p>
        <Link href="/login" className="mt-4 inline-block text-[var(--accent)]">
          Login →
        </Link>
      </main>
    );
  }

  if (authorized === null) {
    return (
      <main className="min-h-[100dvh] bg-[var(--bg)] p-10 text-sm text-[var(--muted)]">
        Memuat…
      </main>
    );
  }

  async function syncMagma() {
    setMessage("Menyinkronkan MAGMA…");
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Sync OK · ${data.volcano_count} gunung · ${data.levels_found} level`
        : data.error || "Gagal sync",
    );
    load();
  }

  async function sendDigest() {
    const res = await fetch("/api/notify", { method: "POST" });
    const data = await res.json();
    setMessage(res.ok ? `Digest diproses (emailed=${data.emailed})` : data.error);
  }

  async function createImpact(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/impacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        starts_at: new Date().toISOString(),
        ends_at: null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(JSON.stringify(data.error));
      return;
    }
    setMessage("Dampak disimpan");
    setForm((f) => ({ ...f, title: "", body: "", source_url: "" }));
    load();
  }

  async function removeImpact(id: string) {
    await fetch(`/api/impacts?id=${id}`, { method: "DELETE" });
    load();
  }

  const field =
    "w-full rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-4xl bg-[var(--bg)] px-5 py-10 text-[var(--ink)]">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        ← Peta
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight">
        Dashboard admin
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Kurasi dampak, sinkron MAGMA, audit.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={syncMagma}
          className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#041016]"
        >
          Sync MAGMA + BMKG sekarang
        </button>
        <button
          type="button"
          onClick={sendDigest}
          className="rounded border border-[var(--line)] px-3 py-2 text-sm"
        >
          Kirim digest notifikasi
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-[var(--accent)]">{message}</p>}

      <form
        onSubmit={createImpact}
        className="mt-10 space-y-3 border-t border-[var(--line)] pt-6"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Tambah dampak
        </h2>
        <select
          className={field}
          value={form.volcano_id}
          onChange={(e) => setForm((f) => ({ ...f, volcano_id: e.target.value }))}
        >
          {volcanoes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.activity_label})
            </option>
          ))}
        </select>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className={field}
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as Impact["category"],
              }))
            }
          >
            <option value="airport">Bandara</option>
            <option value="ash">Abu</option>
            <option value="health">Kesehatan</option>
            <option value="other">Lainnya</option>
          </select>
          <select
            className={field}
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as Impact["status"],
              }))
            }
          >
            <option value="active">active</option>
            <option value="monitoring">monitoring</option>
            <option value="resolved">resolved</option>
          </select>
        </div>
        <input
          required
          placeholder="Judul"
          className={field}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          required
          placeholder="Isi dampak"
          rows={4}
          className={field}
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        />
        <input
          placeholder="Sumber"
          className={field}
          value={form.source}
          onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
        />
        <input
          placeholder="URL sumber (opsional)"
          className={field}
          value={form.source_url}
          onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
        />
        <button
          type="submit"
          className="rounded bg-[var(--ember)] px-4 py-2 text-sm font-semibold text-white"
        >
          Simpan dampak
        </button>
      </form>

      <section className="mt-10 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Dampak aktif
        </h2>
        <ul className="mt-3 space-y-3">
          {impacts.map((i) => (
            <li
              key={i.id}
              className="flex items-start justify-between gap-3 rounded border border-[var(--line)] bg-[var(--panel)] p-3"
            >
              <div>
                <p className="text-sm font-medium">
                  [{i.category}] {i.title}
                </p>
                <p className="text-xs text-[var(--muted)]">{i.volcano_id}</p>
              </div>
              <button
                type="button"
                onClick={() => removeImpact(i.id)}
                className="text-xs text-[var(--ember)]"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Audit
        </h2>
        <ul className="mt-3 space-y-2 text-xs text-[var(--muted)]">
          {audit.map((a, idx) => (
            <li key={`${a.created_at}-${idx}`}>
              {new Date(a.created_at).toLocaleString("id-ID")} · {a.actor} ·{" "}
              {a.action}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
