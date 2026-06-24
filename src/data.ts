import type { Category, ClothingItem, Outfit, Season } from "./types";

export const categories: Category[] = [
  "上衣",
  "下装",
  "外套",
  "连衣裙",
  "鞋子",
  "包包",
  "配饰",
  "运动服",
  "家居服",
];

export const seasons: Season[] = ["春季", "夏季", "秋季", "冬季", "四季"];

export const colors = ["白色", "黑色", "灰色", "蓝色", "绿色", "红色", "粉色", "棕色", "米色", "多色"];

const now = new Date().toISOString();

export const demoItems: ClothingItem[] = [
  {
    id: "demo-shirt",
    name: "白色通勤衬衫",
    imageUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 420'%3E%3Crect width='320' height='420' fill='%23f1ece4'/%3E%3Cpath d='M103 92l36-24h42l36 24 42 32-28 51-28-17v174c0 18-14 32-32 32h-22c-18 0-32-14-32-32V158l-28 17-28-51 42-32z' fill='%23fff' stroke='%23c9bdaa' stroke-width='6'/%3E%3Cpath d='M139 68l21 48 21-48M160 116v246' fill='none' stroke='%23ddd1be' stroke-width='6'/%3E%3Ccircle cx='172' cy='160' r='4' fill='%23b7aa96'/%3E%3Ccircle cx='172' cy='198' r='4' fill='%23b7aa96'/%3E%3Ccircle cx='172' cy='236' r='4' fill='%23b7aa96'/%3E%3C/svg%3E",
    category: "上衣",
    season: "四季",
    primaryColor: "白色",
    purchasePrice: 299,
    brand: "COS",
    size: "M",
    purchaseDate: "2025-03-18",
    purchaseChannel: "线下门店",
    tags: ["通勤", "基础款"],
    notes: "适合搭西装裤或牛仔裤。",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-jeans",
    name: "直筒牛仔裤",
    imageUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 420'%3E%3Crect width='320' height='420' fill='%23edf3f5'/%3E%3Cpath d='M112 65h96l10 286c1 22-12 36-31 36h-15l-15-202-20 202h-15c-19 0-32-14-31-36l10-286z' fill='%234f7693' stroke='%23395570' stroke-width='6'/%3E%3Cpath d='M112 98h96M160 66v68M126 121c11 13 23 19 34 19 13 0 25-6 34-19' fill='none' stroke='%238db0c4' stroke-width='5'/%3E%3C/svg%3E",
    category: "下装",
    season: "四季",
    primaryColor: "蓝色",
    purchasePrice: 399,
    brand: "Levi's",
    size: "29",
    purchaseDate: "2025-04-02",
    purchaseChannel: "官网",
    tags: ["休闲", "百搭"],
    notes: "裤型偏直，适合日常。",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-coat",
    name: "短款黑色外套",
    imageUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 420'%3E%3Crect width='320' height='420' fill='%23f2f0ed'/%3E%3Cpath d='M102 89l42-25h32l42 25 42 38-31 56-25-19v181c0 20-14 34-34 34h-20c-20 0-34-14-34-34V164l-25 19-31-56 42-38z' fill='%23262626' stroke='%23171717' stroke-width='6'/%3E%3Cpath d='M144 64l16 54 16-54M160 118v255' fill='none' stroke='%235a5a5a' stroke-width='6'/%3E%3Cpath d='M121 188h32M167 188h32' stroke='%235a5a5a' stroke-width='5'/%3E%3C/svg%3E",
    category: "外套",
    season: "秋季",
    primaryColor: "黑色",
    purchasePrice: 599,
    brand: "优衣库",
    size: "L",
    purchaseDate: "2025-10-08",
    purchaseChannel: "商场",
    tags: ["通勤", "短款"],
    notes: "适合早晚温差大的时候。",
    createdAt: now,
    updatedAt: now,
  },
];

export const demoOutfits: Outfit[] = [
  {
    id: "demo-outfit-work",
    name: "轻通勤",
    itemIds: ["demo-shirt", "demo-jeans", "demo-coat"],
    scenarioTags: ["通勤", "春秋"],
    notes: "不费力的日常搭配。",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-outfit-weekend",
    name: "周末咖啡",
    itemIds: ["demo-shirt", "demo-jeans"],
    scenarioTags: ["休闲"],
    notes: "简单干净。",
    createdAt: now,
    updatedAt: now,
  },
];
