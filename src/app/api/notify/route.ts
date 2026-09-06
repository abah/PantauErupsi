import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSessionUser } from "@/lib/auth";
import {
  getNotifications,
  getStore,
  markNotificationRead,
  pushNotification,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const notifications = await getNotifications(user.id);
  return NextResponse.json({ notifications });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const n = await markNotificationRead(id, user.id);
  return NextResponse.json({ notification: n });
}

/** Kirim digest email opsional ke pengguna dengan email_digest=true (admin/cron). */
export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user?.profile.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await getStore();
  const elevated = store.volcanoes.filter((v) => v.activity_level >= 3);
  const summary = elevated
    .map((v) => `• ${v.name}: ${v.activity_label}`)
    .join("\n");

  let emailed = 0;
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_FROM_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const profile of store.profiles.filter((p) => p.email_digest)) {
      await resend.emails.send({
        from: process.env.NOTIFY_FROM_EMAIL,
        to: profile.email,
        subject: "PantauErupsi — ringkasan Siaga/Awas",
        text: `Gunung dengan tingkat Siaga atau lebih tinggi:\n\n${summary || "Tidak ada"}\n\nSumber: PVMBG/MAGMA Indonesia.`,
      });
      emailed += 1;
      await pushNotification({
        user_id: profile.id,
        type: "system",
        title: "Digest email terkirim",
        body: "Ringkasan tingkat aktivitas Siaga+ telah dikirim ke email Anda.",
        read_at: null,
      });
    }
  } else {
    for (const profile of store.profiles.filter((p) => p.email_digest)) {
      await pushNotification({
        user_id: profile.id,
        type: "system",
        title: "Digest (simulasi)",
        body: summary || "Tidak ada gunung Siaga/Awas saat ini.",
        read_at: null,
      });
    }
  }

  return NextResponse.json({ ok: true, emailed, elevated: elevated.length });
}
