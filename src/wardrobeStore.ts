import { deleteImageBlob, getImageBlob, saveImageBlob } from "./imageStore";
import {
  createItem,
  createOutfit,
  createWearLog,
  loadItems,
  loadOutfits,
  loadWearLogs,
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
  loadItems: () => ClothingItem[];
  loadOutfits: () => Outfit[];
  loadWearLogs: () => WearLog[];
  mode: WardrobeStoreMode;
  saveImageBlob: (file: Blob) => Promise<string>;
  saveItems: (items: ClothingItem[]) => void;
  saveOutfits: (outfits: Outfit[]) => void;
  saveWearLogs: (wearLogs: WearLog[]) => void;
};

const localWardrobeStore: WardrobeStore = {
  deleteImageBlob,
  getImageBlob,
  isCloudEnabled: false,
  loadItems,
  loadOutfits,
  loadWearLogs,
  mode: "local",
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
