import { deleteImageBlob, getImageBlob, saveImageBlob } from "./imageStore";
import {
  createItem,
  createOutfit,
  createWearLog,
  loadItems,
  loadCustomCategories,
  loadOutfits,
  loadWearLogs,
  saveCustomCategories,
  saveItems,
  saveOutfits,
  saveWearLogs,
} from "./storage";
import type { ClothingItem, Outfit, WearLog } from "./types";

export type WardrobeStoreMode = "local" | "cloud-disabled";

export type WardrobeStore = {
  deleteImageBlob: (imageId: string) => Promise<undefined>;
  getImageBlob: (imageId: string) => Promise<Blob | undefined>;
  isCloudEnabled: boolean;
  loadCustomCategories: () => string[];
  loadItems: () => ClothingItem[];
  loadOutfits: () => Outfit[];
  loadWearLogs: () => WearLog[];
  mode: WardrobeStoreMode;
  saveCustomCategories: (categories: string[]) => void;
  saveImageBlob: (file: Blob) => Promise<string>;
  saveItems: (items: ClothingItem[]) => void;
  saveOutfits: (outfits: Outfit[]) => void;
  saveWearLogs: (wearLogs: WearLog[]) => void;
};

const localWardrobeStore: WardrobeStore = {
  deleteImageBlob,
  getImageBlob,
  isCloudEnabled: false,
  loadCustomCategories,
  loadItems,
  loadOutfits,
  loadWearLogs,
  mode: "local",
  saveCustomCategories,
  saveImageBlob,
  saveItems,
  saveOutfits,
  saveWearLogs,
};

const getWardrobeStore = (): WardrobeStore => {
  if (import.meta.env.VITE_WARDROBE_STORAGE === "cloud") {
    console.warn("Cloud wardrobe storage is not configured yet. Falling back to local storage.");
    return {
      ...localWardrobeStore,
      mode: "cloud-disabled",
    };
  }

  return localWardrobeStore;
};

export const wardrobeStore = getWardrobeStore();
export { createItem, createOutfit, createWearLog };
