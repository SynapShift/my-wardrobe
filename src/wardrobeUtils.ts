import type { Category, ClothingItem, Outfit, Season } from "./types";

export type OutfitSuggestion = {
  id: string;
  itemIds: string[];
  name: string;
  reason: string;
};

const outfitRecipeByCategory: Record<string, Category[]> = {
  上衣: ["下装", "鞋子", "外套", "包包"],
  下装: ["上衣", "鞋子", "外套", "包包"],
  外套: ["上衣", "下装", "鞋子"],
  连衣裙: ["鞋子", "外套", "包包", "配饰"],
  鞋子: ["上衣", "下装", "包包"],
  包包: ["上衣", "下装", "鞋子"],
  配饰: ["上衣", "下装", "鞋子"],
  运动服: ["鞋子", "包包", "配饰"],
  家居服: ["鞋子", "配饰"],
};

const fallbackCompanionCategories = ["上衣", "下装", "鞋子", "外套", "包包"];

const neutralColors = new Set(["黑色", "白色", "灰色", "米色", "棕色", "牛仔蓝"]);

const areSeasonsCompatible = (first: Season, second: Season) =>
  first === second || first === "四季" || second === "四季";

const scoreCompanionItem = (anchor: ClothingItem, candidate: ClothingItem) => {
  let score = 0;

  if (areSeasonsCompatible(anchor.season, candidate.season)) {
    score += 4;
  }

  if (anchor.primaryColor === candidate.primaryColor) {
    score += 1;
  }

  if (neutralColors.has(anchor.primaryColor) || neutralColors.has(candidate.primaryColor)) {
    score += 2;
  }

  return score;
};

const getOutfitKey = (itemIds: string[]) => [...new Set(itemIds)].sort().join("|");

const escapeCsvCell = (value: string | number | undefined) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const buildCsv = (headers: string[], rows: Array<Array<string | number | undefined>>) =>
  [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");

export const getUniqueSortedValues = (values: string[]) =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((first, second) =>
    first.localeCompare(second),
  );

export const getOutfitSuggestions = (
  anchor: ClothingItem,
  items: ClothingItem[],
  outfits: Outfit[],
): OutfitSuggestion[] => {
  const savedOutfitKeys = new Set(outfits.map((outfit) => getOutfitKey(outfit.itemIds)));
  const companionCategories = outfitRecipeByCategory[anchor.category] ?? fallbackCompanionCategories;
  const companionItems = companionCategories
    .map((category) =>
      items
        .filter((item) => item.id !== anchor.id && item.category === category)
        .sort(
          (first, second) =>
            scoreCompanionItem(anchor, second) - scoreCompanionItem(anchor, first) ||
            second.createdAt.localeCompare(first.createdAt),
        )[0],
    )
    .filter((item): item is ClothingItem => Boolean(item));

  const recipeGroups = [
    companionItems.slice(0, 2),
    companionItems.slice(0, 3),
    companionItems.filter((item) => areSeasonsCompatible(anchor.season, item.season)).slice(0, 3),
  ];
  const suggestions: OutfitSuggestion[] = [];
  const seenKeys = new Set<string>();

  recipeGroups.forEach((group, index) => {
    const itemIds = [anchor.id, ...group.map((item) => item.id)];
    const key = getOutfitKey(itemIds);

    if (itemIds.length < 2 || savedOutfitKeys.has(key) || seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    suggestions.push({
      id: `suggestion-${key}`,
      itemIds,
      name: index === 0 ? "轻量日常组合" : index === 1 ? "完整出门组合" : "同季节组合",
      reason:
        index === 2
          ? "优先选择同季节或四季单品"
          : `补齐 ${group.map((item) => item.category).join("、")}`,
    });
  });

  return suggestions.slice(0, 3);
};
