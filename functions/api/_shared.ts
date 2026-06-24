import type { ClothingItem, Outfit, WearLog } from "../../src/types";

export type CloudflareEnv = {
  WARDROBE_DB?: D1Database;
  WARDROBE_IMAGES?: R2Bucket;
  WARDROBE_DEMO_USER_ID?: string;
};

export type PagesContext = {
  env: CloudflareEnv;
  params: Record<string, string>;
  request: Request;
};

export type SyncPayload = {
  items: ClothingItem[];
  outfits: Outfit[];
  wearLogs: WearLog[];
};

export const jsonResponse = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...init?.headers,
    },
  });

export const errorResponse = (message: string, status = 400) => jsonResponse({ error: message }, { status });

export const getDemoUserId = (env: CloudflareEnv) => env.WARDROBE_DEMO_USER_ID || "demo-user";

export const requireDatabase = (env: CloudflareEnv) => {
  if (!env.WARDROBE_DB) {
    throw new Error("WARDROBE_DB binding is not configured.");
  }

  return env.WARDROBE_DB;
};

export const requireImageBucket = (env: CloudflareEnv) => {
  if (!env.WARDROBE_IMAGES) {
    throw new Error("WARDROBE_IMAGES binding is not configured.");
  }

  return env.WARDROBE_IMAGES;
};

export const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const ensureDemoUser = async (db: D1Database, userId: string) => {
  const timestamp = new Date().toISOString();
  await db
    .prepare(
      `insert into users (id, email, display_name, created_at, updated_at)
       values (?, ?, ?, ?, ?)
       on conflict(id) do update set updated_at = excluded.updated_at`,
    )
    .bind(userId, `${userId}@local.example`, "Demo User", timestamp, timestamp)
    .run();
};

export const itemToRow = (item: ClothingItem, userId: string) => ({
  bind: [
    item.id,
    userId,
    item.name,
    item.imageId ?? null,
    item.category,
    item.season,
    item.primaryColor,
    item.purchasePrice ?? null,
    item.brand ?? null,
    item.size ?? null,
    item.purchaseDate ?? null,
    item.purchaseChannel ?? null,
    JSON.stringify(item.tags),
    item.notes,
    item.createdAt,
    item.updatedAt,
  ],
});

export const outfitToRow = (outfit: Outfit, userId: string) => ({
  bind: [
    outfit.id,
    userId,
    outfit.name,
    JSON.stringify(outfit.itemIds),
    JSON.stringify(outfit.scenarioTags),
    outfit.notes,
    outfit.createdAt,
    outfit.updatedAt,
  ],
});

export const wearLogToRow = (wearLog: WearLog, userId: string) => ({
  bind: [
    wearLog.id,
    userId,
    wearLog.date,
    JSON.stringify(wearLog.itemIds),
    wearLog.outfitId ?? null,
    wearLog.notes,
    wearLog.createdAt,
  ],
});
