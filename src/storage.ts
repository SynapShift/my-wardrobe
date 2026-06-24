import { demoItems, demoOutfits } from "./data";
import type { ClothingItem, DraftClothingItem, Outfit, WearLog } from "./types";

const itemsKey = "my-wardrobe.items";
const outfitsKey = "my-wardrobe.outfits";
const wearLogsKey = "my-wardrobe.wearLogs";

const readJson = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadItems = (): ClothingItem[] => readJson(itemsKey, demoItems);

export const saveItems = (items: ClothingItem[]) => writeJson(itemsKey, items);

export const loadOutfits = (): Outfit[] => readJson(outfitsKey, demoOutfits);

export const saveOutfits = (outfits: Outfit[]) => writeJson(outfitsKey, outfits);

export const loadWearLogs = (): WearLog[] => readJson(wearLogsKey, []);

export const saveWearLogs = (wearLogs: WearLog[]) => writeJson(wearLogsKey, wearLogs);

export const createItem = (draft: DraftClothingItem): ClothingItem => {
  const timestamp = new Date().toISOString();

  return {
    ...draft,
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const createOutfit = (draft: Pick<Outfit, "name" | "itemIds" | "scenarioTags" | "notes">): Outfit => {
  const timestamp = new Date().toISOString();

  return {
    ...draft,
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const createWearLog = (draft: Pick<WearLog, "date" | "itemIds" | "outfitId" | "notes">): WearLog => ({
  ...draft,
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
});
