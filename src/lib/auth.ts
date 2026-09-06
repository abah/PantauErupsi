import { createServerSupabase } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/store";

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isCronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/** Local demo session via cookie when Supabase belum di-set. */
export function getDemoUserFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)pe_demo_user=([^;]+)/);
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match[1]);
    const json = Buffer.from(raw, "base64url").toString("utf8");
    return JSON.parse(json) as { id: string; email: string };
  } catch {
    try {
      return JSON.parse(decodeURIComponent(match[1])) as {
        id: string;
        email: string;
      };
    } catch {
      return null;
    }
  }
}

export async function getSessionUser(req?: Request) {
  const supabase = await createServerSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) {
      const isAdmin = adminEmails().includes(data.user.email.toLowerCase());
      const profile = await getOrCreateProfile(
        data.user.id,
        data.user.email,
        isAdmin,
      );
      return { id: data.user.id, email: data.user.email, profile, mode: "supabase" as const };
    }
  }

  let cookieHeader = req?.headers.get("cookie") ?? null;
  if (!cookieHeader) {
    try {
      const { cookies } = await import("next/headers");
      const jar = await cookies();
      cookieHeader = jar
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");
    } catch {
      cookieHeader = null;
    }
  }

  const demo = getDemoUserFromCookie(cookieHeader);
  if (demo) {
    const isAdmin =
      adminEmails().includes(demo.email.toLowerCase()) ||
      demo.email.includes("admin") ||
      demo.email.endsWith("@pantauerupsi.local");
    const profile = await getOrCreateProfile(demo.id, demo.email, isAdmin);
    return { id: demo.id, email: demo.email, profile, mode: "demo" as const };
  }

  return null;
}
