import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOrCreateProfile } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

/** Demo login tanpa Supabase — untuk pengembangan lokal. */
export async function POST(req: Request) {
  if (isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Gunakan Supabase Auth di halaman login" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const asAdmin = Boolean(body.admin) || String(body.email ?? "").toLowerCase().includes("admin");
  const rawEmail = String(body.email ?? "").trim().toLowerCase();
  const finalEmail =
    rawEmail ||
    (asAdmin ? "admin@pantauerupsi.local" : "demo@pantauerupsi.local");
  const id = randomUUID();

  await getOrCreateProfile(id, finalEmail, asAdmin);

  const payload = Buffer.from(JSON.stringify({ id, email: finalEmail })).toString(
    "base64url",
  );
  const res = NextResponse.json({
    ok: true,
    user: { id, email: finalEmail, is_admin: asAdmin },
    mode: "demo",
  });
  res.cookies.set("pe_demo_user", payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pe_demo_user", "", { path: "/", maxAge: 0 });
  return res;
}
