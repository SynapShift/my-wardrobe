import { beforeEach, describe, expect, it } from "vitest";
import { loadCustomCategories, loadWearLogs, saveCustomCategories, saveWearLogs } from "./storage";
import type { WearLog } from "./types";

const createLocalStorageMock = () => {
  let values: Record<string, string> = {};

  return {
    clear: () => {
      values = {};
    },
    getItem: (key: string) => values[key] ?? null,
    removeItem: (key: string) => {
      delete values[key];
    },
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
  } as Storage;
};

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createLocalStorageMock(),
  });
});

describe("storage", () => {
  it("persists custom categories", () => {
    saveCustomCategories(["礼服", "汉服"]);

    expect(loadCustomCategories()).toEqual(["礼服", "汉服"]);
  });

  it("falls back when stored JSON is broken", () => {
    localStorage.setItem("my-wardrobe.wearLogs", "{not-json");

    expect(loadWearLogs()).toEqual([]);
  });

  it("persists wear logs", () => {
    const log: WearLog = {
      id: "wear-1",
      date: "2026-06-24",
      itemIds: ["item-1"],
      notes: "下雨天",
      createdAt: "2026-06-24T00:00:00.000Z",
    };

    saveWearLogs([log]);

    expect(loadWearLogs()).toEqual([log]);
  });
});
