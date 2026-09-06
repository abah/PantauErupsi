import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isCronAuthorized } from "@/lib/auth";
import { deleteImpact, getImpacts, upsertImpact } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const volcanoId = new URL(req.url).searchParams.get("volcanoId") ?? undefined;
  const impacts = await getImpacts(volcanoId ?? undefined);
  return NextResponse.json({ impacts });
}

const impactSchema = z.object({
  id: z.string().optional(),
  volcano_id: z.string(),
  category: z.enum(["airport", "health", "ash", "other"]),
  title: z.string().min(3),
  body: z.string().min(3),
  status: z.enum(["active", "resolved", "monitoring"]),
  source: z.string().min(2),
  source_url: z.string().url().optional().or(z.literal("")),
  starts_at: z.string(),
  ends_at: z.string().nullable().optional(),
  meta: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  const cronOk = isCronAuthorized(req);
  if ((!user || !user.profile.is_admin) && !cronOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = impactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const impact = await upsertImpact(
    {
      ...data,
      source_url: data.source_url || undefined,
      ends_at: data.ends_at ?? null,
    },
    user?.email ?? "cron",
  );
  return NextResponse.json({ impact });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser(req);
  if (!user?.profile.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await deleteImpact(id, user.email);
  return NextResponse.json({ ok: true });
}
