"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabaseReady = isSupabaseConfigured();

  async function demoLogin(asAdmin: boolean) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:
            email ||
            (asAdmin ? "admin@pantauerupsi.local" : "demo@pantauerupsi.local"),
          admin: asAdmin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal masuk");
      setMessage(`Masuk sebagai ${data.user.email}`);
      router.push(asAdmin ? "/admin" : "/saya");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal");
    } finally {
      setLoading(false);
    }
  }

  async function magicLink() {
    if (!supabaseReady) {
      setMessage("Supabase belum dikonfigurasi. Gunakan mode demo.");
      return;
    }
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/saya` },
      });
      if (error) throw error;
      setMessage("Cek email Anda untuk tautan masuk.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal mengirim tautan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--bg)] px-5 py-14 text-[var(--ink)]">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-[var(--ember)]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[var(--accent)]/10 blur-3xl" />

      <div className="relative mx-auto max-w-md">
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
          ← Peta
        </Link>
        <h1 className="mt-8 font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight">
          Pantau<span className="text-[var(--ember)]">Erupsi</span>
        </h1>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">
          Simpan gunung favorit dan terima notifikasi saat status naik.
        </p>

        <label className="mt-10 block text-sm text-[var(--muted)]">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="mt-2 w-full rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div className="mt-4 flex flex-col gap-2">
          {supabaseReady ? (
            <button
              type="button"
              disabled={loading || !email}
              onClick={magicLink}
              className="rounded bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#041016] disabled:opacity-50"
            >
              Kirim magic link
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => demoLogin(false)}
                className="rounded bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#041016] disabled:opacity-50"
              >
                Masuk demo
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => demoLogin(true)}
                className="rounded border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink-soft)] disabled:opacity-50"
              >
                Masuk sebagai admin demo
              </button>
            </>
          )}
        </div>

        {message && <p className="mt-4 text-sm text-[var(--accent)]">{message}</p>}
      </div>
    </main>
  );
}
