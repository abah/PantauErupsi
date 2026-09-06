import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAudit, getStore, updateProfile } from "@/lib/store";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null });
  const store = await getStore();
  const favorites = store.volcanoes.filter((v) =>
    user.profile.favorite_volcano_ids.includes(v.id),
  );
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      mode: user.mode,
      profile: user.profile,
    },
    favorites,
    audit: user.profile.is_admin ? await getAudit() : [],
  });
}

const patchSchema = z.object({
  favorite_volcano_ids: z.array(z.string()).optional(),
  min_alert_level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  regions: z.array(z.string()).optional(),
  email_digest: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const profile = await updateProfile(user.id, parsed.data);
  return NextResponse.json({ profile });
}
