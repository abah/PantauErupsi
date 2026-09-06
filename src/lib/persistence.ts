/**
 * Abstraksi penyimpanan AppStore:
 * - Lokal: data/store.json (fs)
 * - Cloudflare Workers: KV binding PANTAU_STORE
 */
import { promises as fs } from "fs";
import path from "path";
import type { AppStore } from "@/lib/types";
import {
  buildSeedVolcanoes,
  FALLBACK_LEVELS,
} from "@/data/volcanoes.seed";
import { buildSeedImpacts, buildSeedVona } from "@/data/impacts.seed";
import { buildCctvEntries } from "@/lib/magma/client";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const KV_KEY = "app-store";

let memoryCache: AppStore | null = null;

function seedStore(): AppStore {
  const volcanoes = buildSeedVolcanoes(FALLBACK_LEVELS);
  const byName = Object.fromEntries(volcanoes.map((v) => [v.name, v.id]));
  return {
    volcanoes,
    reports: [],
    cctv: buildCctvEntries(volcanoes),
    vona: buildSeedVona(byName),
    impacts: buildSeedImpacts(byName),
    airports: [],
    profiles: [],
    notifications: [],
    audit: [],
    last_sync_at: undefined,
  };
}

async function getKv(): Promise<{
  get: (k: string) => Promise<string | null>;
  put: (k: string, v: string) => Promise<void>;
} | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const kv = (
      ctx.env as {
        PANTAU_STORE?: {
          get: (key: string) => Promise<string | null>;
          put: (key: string, value: string) => Promise<void>;
        };
      }
    ).PANTAU_STORE;
    if (!kv) return null;
    return {
      get: (k) => kv.get(k),
      put: (k, v) => kv.put(k, v),
    };
  } catch {
    return null;
  }
}

export async function loadStore(): Promise<AppStore> {
  const kv = await getKv();
  if (kv) {
    const raw = await kv.get(KV_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppStore;
      if (!parsed.airports) parsed.airports = [];
      memoryCache = parsed;
      return parsed;
    }
    const seeded = seedStore();
    memoryCache = seeded;
    await kv.put(KV_KEY, JSON.stringify(seeded));
    return seeded;
  }

  if (memoryCache) return memoryCache;

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AppStore;
    if (!parsed.airports) parsed.airports = [];
    memoryCache = parsed;
    return parsed;
  } catch {
    const seeded = seedStore();
    memoryCache = seeded;
    try {
      await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
      await fs.writeFile(STORE_PATH, JSON.stringify(seeded, null, 2), "utf8");
    } catch {
      /* Workers / read-only: keep memory only */
    }
    return seeded;
  }
}

export async function persistStore(store: AppStore): Promise<void> {
  memoryCache = store;
  const kv = await getKv();
  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(store));
    return;
  }
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    /* memory-only fallback */
  }
}
