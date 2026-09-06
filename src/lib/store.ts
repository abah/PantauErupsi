import { loadStore, persistStore } from "@/lib/persistence";
import { randomUUID } from "crypto";
import {
  buildSeedVolcanoes,
  FALLBACK_LEVELS,
} from "@/data/volcanoes.seed";
import { buildCctvEntries, fetchMagmaActivityLevels } from "@/lib/magma/client";
import {
  buildAirportImpactsFromBmkg,
  fetchBmkgAviationStations,
} from "@/lib/bmkg/aviation";
import type {
  ActivityLevel,
  AdminAudit,
  AirportStation,
  AppNotification,
  AppStore,
  Impact,
  Profile,
  Volcano,
} from "@/lib/types";
import { ACTIVITY_LABELS } from "@/lib/types";

async function ensureStore(): Promise<AppStore> {
  return loadStore();
}

async function saveStore(store: AppStore) {
  await persistStore(store);
}

export async function getStore(): Promise<AppStore> {
  return ensureStore();
}

export async function getVolcanoes(): Promise<Volcano[]> {
  const store = await ensureStore();
  return store.volcanoes;
}

export async function getVolcanoBySlug(slug: string) {
  const store = await ensureStore();
  return store.volcanoes.find((v) => v.slug === slug || v.id === slug) ?? null;
}

export async function getImpacts(volcanoId?: string) {
  const store = await ensureStore();
  if (!volcanoId) return store.impacts;
  return store.impacts.filter((i) => i.volcano_id === volcanoId);
}

export async function getVona(volcanoId?: string) {
  const store = await ensureStore();
  if (!volcanoId) return store.vona;
  return store.vona.filter((v) => v.volcano_id === volcanoId);
}

export async function getCctv(volcanoId?: string) {
  const store = await ensureStore();
  if (!volcanoId) return store.cctv;
  return store.cctv.filter((c) => c.volcano_id === volcanoId);
}

export async function upsertImpact(
  impact: Omit<Impact, "id"> & { id?: string },
  actor: string,
) {
  const store = await ensureStore();
  const id = impact.id ?? randomUUID();
  const existing = store.impacts.findIndex((i) => i.id === id);
  const next: Impact = { ...impact, id };
  if (existing >= 0) store.impacts[existing] = next;
  else store.impacts.unshift(next);
  store.audit.unshift({
    id: randomUUID(),
    actor,
    action: existing >= 0 ? "impact.update" : "impact.create",
    meta: { id, title: next.title },
    created_at: new Date().toISOString(),
  });
  await saveStore(store);
  return next;
}

export async function deleteImpact(id: string, actor: string) {
  const store = await ensureStore();
  store.impacts = store.impacts.filter((i) => i.id !== id);
  store.audit.unshift({
    id: randomUUID(),
    actor,
    action: "impact.delete",
    meta: { id },
    created_at: new Date().toISOString(),
  });
  await saveStore(store);
}

export async function getOrCreateProfile(
  userId: string,
  email: string,
  isAdmin: boolean,
): Promise<Profile> {
  const store = await ensureStore();
  let profile = store.profiles.find((p) => p.id === userId);
  if (!profile) {
    profile = {
      id: userId,
      email,
      favorite_volcano_ids: [],
      min_alert_level: 2,
      regions: [],
      email_digest: true,
      is_admin: isAdmin,
      created_at: new Date().toISOString(),
    };
    store.profiles.push(profile);
    await saveStore(store);
  } else if (profile.is_admin !== isAdmin) {
    profile.is_admin = isAdmin;
    await saveStore(store);
  }
  return profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | "favorite_volcano_ids"
      | "min_alert_level"
      | "regions"
      | "email_digest"
    >
  >,
) {
  const store = await ensureStore();
  const idx = store.profiles.findIndex((p) => p.id === userId);
  if (idx < 0) throw new Error("Profil tidak ditemukan");
  store.profiles[idx] = { ...store.profiles[idx], ...patch };
  await saveStore(store);
  return store.profiles[idx];
}

export async function getNotifications(userId: string) {
  const store = await ensureStore();
  return store.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function markNotificationRead(id: string, userId: string) {
  const store = await ensureStore();
  const n = store.notifications.find((x) => x.id === id && x.user_id === userId);
  if (n) {
    n.read_at = new Date().toISOString();
    await saveStore(store);
  }
  return n ?? null;
}

export async function pushNotification(
  note: Omit<AppNotification, "id" | "created_at">,
) {
  const store = await ensureStore();
  const full: AppNotification = {
    ...note,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  store.notifications.unshift(full);
  await saveStore(store);
  return full;
}

export async function getAudit(): Promise<AdminAudit[]> {
  const store = await ensureStore();
  return store.audit.slice(0, 50);
}

export async function getAirports(opts?: {
  closedOnly?: boolean;
  vaOnly?: boolean;
}) {
  const store = await ensureStore();
  let list = store.airports ?? [];
  if (opts?.closedOnly) list = list.filter((a) => a.closed);
  if (opts?.vaOnly) list = list.filter((a) => a.has_va);
  return {
    airports: list,
    report_time: store.airports_report_time,
    source_url: "https://web-aviation.bmkg.go.id/va-map.php",
  };
}

export async function upsertAirports(
  stations: AirportStation[],
  reportTime?: string,
) {
  const store = await ensureStore();
  store.airports = stations;
  if (reportTime) store.airports_report_time = reportTime;
  await saveStore(store);
}

export async function syncFromMagma(actor = "system") {
  const store = await ensureStore();
  let levels: Record<string, ActivityLevel>;
  try {
    levels = await fetchMagmaActivityLevels();
    if (Object.keys(levels).length < 5) {
      levels = { ...FALLBACK_LEVELS, ...levels };
    }
  } catch {
    levels = FALLBACK_LEVELS;
  }

  const previous = new Map(
    store.volcanoes.map((v) => [v.id, v.activity_level] as const),
  );

  const volcanoes = buildSeedVolcanoes(levels).map((v) => {
    const match =
      levels[v.name] ??
      Object.entries(levels).find(
        ([k]) => k.toLowerCase() === v.name.toLowerCase(),
      )?.[1];
    const level = (match ?? v.activity_level) as ActivityLevel;
    return {
      ...v,
      activity_level: level,
      activity_label: ACTIVITY_LABELS[level],
      last_synced_at: new Date().toISOString(),
    };
  });

  store.volcanoes = volcanoes;
  store.cctv = buildCctvEntries(volcanoes);

  // BMKG Aviation VA Map — bandara closed + METAR VA
  let bmkgMeta = { closed_count: 0, va_count: 0, stations: 0 };
  try {
    const bmkg = await fetchBmkgAviationStations();
    store.airports = bmkg.stations;
    store.airports_report_time = bmkg.report_time;
    bmkgMeta = {
      closed_count: bmkg.closed_count,
      va_count: bmkg.va_count,
      stations: bmkg.stations.length,
    };

    const hintVolcano =
      volcanoes.find((v) => v.activity_level >= 3 && v.slug.includes("krakatau"))
        ?.id ??
      volcanoes.find((v) => v.activity_level >= 3)?.id ??
      "anak-krakatau";

    const liveImpacts = buildAirportImpactsFromBmkg(bmkg.stations, hintVolcano);
    // Ganti dampak otomatis BMKG sebelumnya, pertahankan kurasi admin non-bmkg
    store.impacts = [
      ...liveImpacts,
      ...store.impacts.filter((i) => !i.id.startsWith("bmkg-")),
    ];
  } catch (err) {
    store.audit.unshift({
      id: randomUUID(),
      actor,
      action: "bmkg.sync_failed",
      meta: { error: err instanceof Error ? err.message : String(err) },
      created_at: new Date().toISOString(),
    });
  }

  store.last_sync_at = new Date().toISOString();
  store.audit.unshift({
    id: randomUUID(),
    actor,
    action: "magma.sync",
    meta: {
      count: volcanoes.length,
      elevated: Object.keys(levels).length,
      bmkg: bmkgMeta,
    },
    created_at: new Date().toISOString(),
  });

  // Notify users on level increases for favorites / min level
  for (const v of volcanoes) {
    const prev = previous.get(v.id);
    if (prev !== undefined && v.activity_level > prev) {
      for (const profile of store.profiles) {
        const watches =
          profile.favorite_volcano_ids.includes(v.id) ||
          v.activity_level >= profile.min_alert_level;
        if (!watches) continue;
        store.notifications.unshift({
          id: randomUUID(),
          user_id: profile.id,
          type: "level_change",
          title: `${v.name} naik ke ${v.activity_label}`,
          body: `Tingkat aktivitas berubah dari Level ${prev} ke Level ${v.activity_level} (${v.activity_label}). Sumber: PVMBG/MAGMA.`,
          volcano_id: v.id,
          read_at: null,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  if (bmkgMeta.closed_count > 0) {
    for (const profile of store.profiles) {
      store.notifications.unshift({
        id: randomUUID(),
        user_id: profile.id,
        type: "impact",
        title: `${bmkgMeta.closed_count} bandara CLOSED (BMKG)`,
        body: `Peta BMKG Aviation VA Map melaporkan penutupan bandara. ${bmkgMeta.va_count} stasiun mencatat VA di METAR.`,
        read_at: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  await saveStore(store);
  return {
    synced_at: store.last_sync_at,
    volcano_count: volcanoes.length,
    levels_found: Object.keys(levels).length,
    bmkg: bmkgMeta,
  };
}
