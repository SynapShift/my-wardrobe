import type { ClothingItem, Outfit, WearLog } from "../../src/types";
import {
  ensureDemoUser,
  errorResponse,
  getDemoUserId,
  itemToRow,
  jsonResponse,
  outfitToRow,
  requireDatabase,
  safeJsonParse,
  type PagesContext,
  type SyncPayload,
  wearLogToRow,
} from "./_shared";

type ItemRow = {
  brand: string | null;
  category: ClothingItem["category"];
  created_at: string;
  id: string;
  image_key: string | null;
  name: string;
  notes: string;
  primary_color: string;
  purchase_channel: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  season: ClothingItem["season"];
  size: string | null;
  tags_json: string;
  updated_at: string;
};

type OutfitRow = {
  created_at: string;
  id: string;
  item_ids_json: string;
  name: string;
  notes: string;
  scenario_tags_json: string;
  updated_at: string;
};

type WearLogRow = {
  created_at: string;
  date: string;
  id: string;
  item_ids_json: string;
  notes: string;
  outfit_id: string | null;
};

const rowToItem = (row: ItemRow): ClothingItem => ({
  brand: row.brand ?? "",
  category: row.category,
  createdAt: row.created_at,
  id: row.id,
  imageId: row.image_key ?? undefined,
  imageUrl: "",
  name: row.name,
  notes: row.notes,
  primaryColor: row.primary_color,
  purchaseChannel: row.purchase_channel ?? "",
  purchaseDate: row.purchase_date ?? "",
  purchasePrice: row.purchase_price ?? undefined,
  season: row.season,
  size: row.size ?? "",
  tags: safeJsonParse<string[]>(row.tags_json, []),
  updatedAt: row.updated_at,
});

const rowToOutfit = (row: OutfitRow): Outfit => ({
  createdAt: row.created_at,
  id: row.id,
  itemIds: safeJsonParse<string[]>(row.item_ids_json, []),
  name: row.name,
  notes: row.notes,
  scenarioTags: safeJsonParse<string[]>(row.scenario_tags_json, []),
  updatedAt: row.updated_at,
});

const rowToWearLog = (row: WearLogRow): WearLog => ({
  createdAt: row.created_at,
  date: row.date,
  id: row.id,
  itemIds: safeJsonParse<string[]>(row.item_ids_json, []),
  notes: row.notes,
  outfitId: row.outfit_id ?? undefined,
});

export const onRequestGet = async ({ env }: PagesContext) => {
  try {
    const db = requireDatabase(env);
    const userId = getDemoUserId(env);
    await ensureDemoUser(db, userId);

    const [itemsResult, outfitsResult, wearLogsResult] = await Promise.all([
      db.prepare("select * from clothing_items where user_id = ? order by created_at desc").bind(userId).all<ItemRow>(),
      db.prepare("select * from outfits where user_id = ? order by created_at desc").bind(userId).all<OutfitRow>(),
      db.prepare("select * from wear_logs where user_id = ? order by date desc, created_at desc").bind(userId).all<WearLogRow>(),
    ]);

    return jsonResponse({
      items: itemsResult.results.map(rowToItem),
      outfits: outfitsResult.results.map(rowToOutfit),
      wearLogs: wearLogsResult.results.map(rowToWearLog),
    } satisfies SyncPayload);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to load cloud sync data.", 500);
  }
};

export const onRequestPut = async ({ env, request }: PagesContext) => {
  try {
    const db = requireDatabase(env);
    const userId = getDemoUserId(env);
    const payload = (await request.json()) as SyncPayload;
    const items = Array.isArray(payload.items) ? payload.items : [];
    const outfits = Array.isArray(payload.outfits) ? payload.outfits : [];
    const wearLogs = Array.isArray(payload.wearLogs) ? payload.wearLogs : [];

    await ensureDemoUser(db, userId);
    await db.batch([
      db.prepare("delete from wear_logs where user_id = ?").bind(userId),
      db.prepare("delete from outfits where user_id = ?").bind(userId),
      db.prepare("delete from clothing_items where user_id = ?").bind(userId),
      ...items.map((item) =>
        db
          .prepare(
            `insert into clothing_items (
              id, user_id, name, image_key, category, season, primary_color, purchase_price,
              brand, size, purchase_date, purchase_channel, tags_json, notes, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(...itemToRow(item, userId).bind),
      ),
      ...outfits.map((outfit) =>
        db
          .prepare(
            `insert into outfits (
              id, user_id, name, item_ids_json, scenario_tags_json, notes, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(...outfitToRow(outfit, userId).bind),
      ),
      ...wearLogs.map((wearLog) =>
        db
          .prepare(
            `insert into wear_logs (
              id, user_id, date, item_ids_json, outfit_id, notes, created_at
            ) values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(...wearLogToRow(wearLog, userId).bind),
      ),
    ]);

    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to save cloud sync data.", 500);
  }
};
