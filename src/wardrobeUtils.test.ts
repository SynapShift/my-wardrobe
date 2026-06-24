import { describe, expect, it } from "vitest";
import type { ClothingItem, Outfit } from "./types";
import { buildCsv, getOutfitSuggestions, getUniqueSortedValues } from "./wardrobeUtils";

const makeItem = (overrides: Partial<ClothingItem>): ClothingItem => ({
  id: "item",
  name: "Item",
  imageUrl: "",
  category: "上衣",
  season: "四季",
  primaryColor: "白色",
  tags: [],
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("buildCsv", () => {
  it("escapes commas, quotes, and line breaks", () => {
    const csv = buildCsv(["name", "notes"], [["白衬衫", '适合通勤, 也适合"约会"\n春秋']]);

    expect(csv).toBe('name,notes\n白衬衫,"适合通勤, 也适合""约会""\n春秋"');
  });
});

describe("getUniqueSortedValues", () => {
  it("trims, deduplicates, and removes empty values", () => {
    expect(getUniqueSortedValues(["  礼服", "", "上衣", "礼服", "  "])).toEqual(["上衣", "礼服"]);
  });
});

describe("getOutfitSuggestions", () => {
  it("suggests companion categories and skips saved outfits", () => {
    const anchor = makeItem({ id: "shirt", category: "上衣", name: "白衬衫", primaryColor: "白色" });
    const pants = makeItem({ id: "pants", category: "下装", name: "牛仔裤", primaryColor: "蓝色" });
    const shoes = makeItem({ id: "shoes", category: "鞋子", name: "乐福鞋", primaryColor: "黑色" });
    const bag = makeItem({ id: "bag", category: "包包", name: "通勤包", primaryColor: "棕色" });
    const savedOutfit: Outfit = {
      id: "saved",
      name: "已有组合",
      itemIds: ["shirt", "pants"],
      scenarioTags: [],
      notes: "",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };

    const suggestions = getOutfitSuggestions(anchor, [anchor, pants, shoes, bag], [savedOutfit]);

    expect(suggestions[0].itemIds).toEqual(["shirt", "pants", "shoes"]);
    expect(suggestions.some((suggestion) => suggestion.itemIds.join("|") === "shirt|pants")).toBe(false);
  });

  it("falls back for custom categories", () => {
    const anchor = makeItem({ id: "dressy", category: "礼服", name: "礼服" });
    const shoes = makeItem({ id: "shoes", category: "鞋子", name: "高跟鞋" });

    expect(getOutfitSuggestions(anchor, [anchor, shoes], [])).toHaveLength(1);
  });
});
