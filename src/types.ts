export type Category =
  | "上衣"
  | "下装"
  | "外套"
  | "连衣裙"
  | "鞋子"
  | "包包"
  | "配饰"
  | "运动服"
  | "家居服";

export type Season = "春季" | "夏季" | "秋季" | "冬季" | "四季";

export type ClothingItem = {
  id: string;
  name: string;
  imageId?: string;
  imageUrl: string;
  category: Category;
  season: Season;
  primaryColor: string;
  purchasePrice?: number;
  brand?: string;
  size?: string;
  purchaseDate?: string;
  purchaseChannel?: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Outfit = {
  id: string;
  name: string;
  itemIds: string[];
  scenarioTags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type WearLog = {
  id: string;
  date: string;
  itemIds: string[];
  outfitId?: string;
  notes: string;
  createdAt: string;
};

export type DraftClothingItem = Omit<ClothingItem, "id" | "createdAt" | "updatedAt">;
