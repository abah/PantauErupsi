import { NextResponse } from "next/server";
import { getSessionUser, isCronAuthorized } from "@/lib/auth";
import { syncFromMagma } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cronOk = isCronAuthorized(req);
  const user = await getSessionUser(req);
  if (!cronOk && !user?.profile.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncFromMagma(user?.email ?? "cron");
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return POST(req);
}
