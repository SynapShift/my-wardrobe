import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { categories as defaultCategories, colors, seasons } from "./data";
import type { Category, ClothingItem, DraftClothingItem, Outfit, Season, WearLog } from "./types";
import { createItem, createOutfit, createWearLog, wardrobeStore } from "./wardrobeStore";
import { buildCsv, getOutfitSuggestions, getUniqueSortedValues, type OutfitSuggestion } from "./wardrobeUtils";
import { createZipBlob } from "./zip";

type View =
  | "wardrobe"
  | "add"
  | "editItem"
  | "detail"
  | "outfits"
  | "newOutfit"
  | "editOutfit"
  | "outfitDetail"
  | "history"
  | "settings";

type WardrobeSort = "最近添加" | "最常穿" | "最近穿" | "价格高";

const emptyDraft: DraftClothingItem = {
  name: "",
  imageUrl: "",
  category: "上衣",
  season: "四季",
  primaryColor: "白色",
  purchasePrice: undefined,
  brand: "",
  size: "",
  purchaseDate: "",
  purchaseChannel: "",
  tags: [],
  notes: "",
};

const emptyOutfitDraft = {
  name: "",
  itemIds: [] as string[],
  scenarioTags: [] as string[],
  notes: "",
};

const placeholderImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 420'%3E%3Crect width='320' height='420' fill='%23f1ece4'/%3E%3Cpath d='M104 118l44-30h24l44 30 42 36-28 50-26-18v104c0 24-19 43-43 43h-2c-24 0-43-19-43-43V186l-26 18-28-50 42-36z' fill='%23fffaf4' stroke='%23d7c9ba' stroke-width='7'/%3E%3Cpath d='M148 88l12 48 12-48M160 136v195' stroke='%23d7c9ba' stroke-width='7' fill='none'/%3E%3C/svg%3E";

type WardrobeBackup = {
  app: "my-wardrobe";
  version: 1;
  customCategories?: string[];
  exportedAt: string;
  items: ClothingItem[];
  outfits: Outfit[];
  wearLogs: WearLog[];
};

const formatPrice = (price?: number) => {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "未记录";
  }

  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(price);
};

const formatCostPerWear = (price: number | undefined, wearCount: number) => {
  if (typeof price !== "number" || Number.isNaN(price) || wearCount === 0) {
    return "暂无";
  }

  return formatPrice(price / wearCount);
};

const todayString = () => new Date().toLocaleDateString("sv-SE");

const formatWearDate = (date?: string) => date ?? "未记录";

const getLastWearDate = (wearLogs: WearLog[]) =>
  wearLogs.reduce<string | undefined>((latest, log) => (!latest || log.date > latest ? log.date : latest), undefined);

const getItemWearLogs = (itemId: string, wearLogs: WearLog[]) => wearLogs.filter((log) => log.itemIds.includes(itemId));

const getItemWearCount = (itemId: string, wearLogs: WearLog[]) => getItemWearLogs(itemId, wearLogs).length;

const getOutfitWearCount = (outfitId: string, wearLogs: WearLog[]) =>
  wearLogs.filter((log) => log.outfitId === outfitId).length;

const getDistribution = (values: string[]) => {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ count, label }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
};

const readBlobAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "item";

const getImageExtension = (type: string) => {
  if (type.includes("png")) {
    return "png";
  }

  if (type.includes("webp")) {
    return "webp";
  }

  if (type.includes("svg")) {
    return "svg";
  }

  return "jpg";
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) => {
  const characters = [...text];
  const lines: string[] = [];
  let currentLine = "";

  characters.forEach((character) => {
    const nextLine = `${currentLine}${character}`;
    if (context.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = character;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const displayLine = index === maxLines - 1 && lines.length > maxLines ? `${line.slice(0, -1)}…` : line;
    context.fillText(displayLine, x, y + index * lineHeight);
  });
};

const drawRoundedImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, 28);
  context.clip();
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
};

const isWardrobeBackup = (value: unknown): value is WardrobeBackup => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const backup = value as Partial<WardrobeBackup>;
  return (
    backup.app === "my-wardrobe" &&
    backup.version === 1 &&
    Array.isArray(backup.items) &&
    Array.isArray(backup.outfits) &&
    Array.isArray(backup.wearLogs)
  );
};

function App() {
  const [items, setItems] = useState<ClothingItem[]>(() => wardrobeStore.loadItems());
  const [outfits, setOutfits] = useState<Outfit[]>(() => wardrobeStore.loadOutfits());
  const [wearLogs, setWearLogs] = useState<WearLog[]>(() => wardrobeStore.loadWearLogs());
  const [customCategories, setCustomCategories] = useState<string[]>(() => wardrobeStore.loadCustomCategories());
  const [view, setView] = useState<View>("wardrobe");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"全部" | Category>("全部");
  const [seasonFilter, setSeasonFilter] = useState<"全部" | Season>("全部");
  const [colorFilter, setColorFilter] = useState("全部");
  const [tagFilter, setTagFilter] = useState("全部");
  const [wardrobeSort, setWardrobeSort] = useState<WardrobeSort>("最近添加");
  const [draft, setDraft] = useState<DraftClothingItem>(emptyDraft);
  const [outfitDraft, setOutfitDraft] = useState(emptyOutfitDraft);
  const [imageObjectUrls, setImageObjectUrls] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const loadedImageIds = useRef(new Set<string>());
  const imageObjectUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const imageIds = items.map((item) => item.imageId).filter((imageId): imageId is string => Boolean(imageId));
    let isCancelled = false;

    imageIds.forEach((imageId) => {
      if (loadedImageIds.current.has(imageId)) {
        return;
      }

      loadedImageIds.current.add(imageId);
      wardrobeStore
        .getImageBlob(imageId)
        .then((blob) => {
          if (!blob || isCancelled) {
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          setImageObjectUrls((current) => ({ ...current, [imageId]: objectUrl }));
        })
        .catch(() => {
          loadedImageIds.current.delete(imageId);
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [items]);

  useEffect(() => {
    imageObjectUrlsRef.current = imageObjectUrls;
  }, [imageObjectUrls]);

  useEffect(
    () => () => {
      Object.values(imageObjectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const displayItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        imageUrl: (item.imageId ? (imageObjectUrls[item.imageId] ?? item.imageUrl) : item.imageUrl) || placeholderImage,
      })),
    [imageObjectUrls, items],
  );

  const selectedItem = displayItems.find((item) => item.id === selectedId) ?? null;
  const selectedOutfit = outfits.find((outfit) => outfit.id === selectedOutfitId) ?? null;
  const relatedOutfits = selectedItem
    ? outfits.filter((outfit) => outfit.itemIds.includes(selectedItem.id))
    : [];
  const suggestedOutfits = selectedItem ? getOutfitSuggestions(selectedItem, displayItems, outfits) : [];
  const selectedItemWearLogs = selectedItem
    ? wearLogs.filter((log) => log.itemIds.includes(selectedItem.id))
    : [];
  const selectedOutfitWearLogs = selectedOutfit
    ? wearLogs.filter((log) => log.outfitId === selectedOutfit.id)
    : [];
  const wardrobeTags = useMemo(
    () => [...new Set(items.flatMap((item) => item.tags))].sort((first, second) => first.localeCompare(second)),
    [items],
  );
  const availableCategories = useMemo(
    () => getUniqueSortedValues([...defaultCategories, ...customCategories, ...items.map((item) => item.category)]),
    [customCategories, items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = displayItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          item.name,
          item.category,
          item.season,
          item.primaryColor,
          item.brand,
          item.size,
          item.purchaseChannel,
          item.notes,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory = categoryFilter === "全部" || item.category === categoryFilter;
      const matchesSeason = seasonFilter === "全部" || item.season === seasonFilter;
      const matchesColor = colorFilter === "全部" || item.primaryColor === colorFilter;
      const matchesTag = tagFilter === "全部" || item.tags.includes(tagFilter);

      return matchesQuery && matchesCategory && matchesSeason && matchesColor && matchesTag;
    });

    return [...filtered].sort((first, second) => {
      if (wardrobeSort === "最常穿") {
        return getItemWearCount(second.id, wearLogs) - getItemWearCount(first.id, wearLogs);
      }

      if (wardrobeSort === "最近穿") {
        const secondLastWorn = getLastWearDate(getItemWearLogs(second.id, wearLogs)) ?? "";
        const firstLastWorn = getLastWearDate(getItemWearLogs(first.id, wearLogs)) ?? "";
        return secondLastWorn.localeCompare(firstLastWorn);
      }

      if (wardrobeSort === "价格高") {
        return (second.purchasePrice ?? 0) - (first.purchasePrice ?? 0);
      }

      return second.createdAt.localeCompare(first.createdAt);
    });
  }, [categoryFilter, colorFilter, displayItems, query, seasonFilter, tagFilter, wardrobeSort, wearLogs]);

  const updateItems = (nextItems: ClothingItem[]) => {
    setItems(nextItems);
    wardrobeStore.saveItems(nextItems);
  };

  const updateOutfits = (nextOutfits: Outfit[]) => {
    setOutfits(nextOutfits);
    wardrobeStore.saveOutfits(nextOutfits);
  };

  const updateWearLogs = (nextWearLogs: WearLog[]) => {
    setWearLogs(nextWearLogs);
    wardrobeStore.saveWearLogs(nextWearLogs);
  };

  const updateCustomCategories = (nextCategories: string[]) => {
    const normalizedCategories = getUniqueSortedValues(nextCategories);
    setCustomCategories(normalizedCategories);
    wardrobeStore.saveCustomCategories(normalizedCategories);
  };

  const cleanupStoredImage = (imageId?: string) => {
    if (!imageId) {
      return;
    }

    void wardrobeStore.deleteImageBlob(imageId);
    const objectUrl = imageObjectUrls[imageId];
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setImageObjectUrls((current) => {
        const next = { ...current };
        delete next[imageId];
        return next;
      });
    }
    loadedImageIds.current.delete(imageId);
  };

  useEffect(() => {
    const legacyImageItems = items.filter((item) => !item.imageId && item.imageUrl.startsWith("data:image/"));
    if (legacyImageItems.length === 0) {
      return;
    }

    let isCancelled = false;
    Promise.all(
      legacyImageItems.map(async (item) => {
        const response = await fetch(item.imageUrl);
        const blob = await response.blob();
        const imageId = await wardrobeStore.saveImageBlob(blob);
        const objectUrl = URL.createObjectURL(blob);
        return { imageId, item, objectUrl };
      }),
    )
      .then((migrations) => {
        if (isCancelled) {
          migrations.forEach((migration) => URL.revokeObjectURL(migration.objectUrl));
          return;
        }

        setImageObjectUrls((current) => ({
          ...current,
          ...Object.fromEntries(migrations.map((migration) => [migration.imageId, migration.objectUrl])),
        }));
        migrations.forEach((migration) => loadedImageIds.current.add(migration.imageId));

        const imageIdByItemId = new Map(migrations.map((migration) => [migration.item.id, migration.imageId]));
        const nextItems = items.map((item) => {
          const imageId = imageIdByItemId.get(item.id);
          return imageId ? { ...item, imageId, imageUrl: "" } : item;
        });
        updateItems(nextItems);
      })
      .catch(() => {
        // Keep legacy data URLs if migration fails; they remain readable.
      });

    return () => {
      isCancelled = true;
    };
  }, [items]);

  const showToast = (message: string) => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }

    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const openDetail = (itemId: string) => {
    setSelectedId(itemId);
    setView("detail");
  };

  const openEditItem = (item: ClothingItem) => {
    setSelectedId(item.id);
    setDraft({
      name: item.name,
      imageUrl: item.imageUrl,
      category: item.category,
      season: item.season,
      primaryColor: item.primaryColor,
      purchasePrice: item.purchasePrice,
      brand: item.brand ?? "",
      size: item.size ?? "",
      purchaseDate: item.purchaseDate ?? "",
      purchaseChannel: item.purchaseChannel ?? "",
      tags: item.tags,
      notes: item.notes,
    });
    setView("editItem");
  };

  const openOutfitDetail = (outfitId: string) => {
    setSelectedOutfitId(outfitId);
    setView("outfitDetail");
  };

  const resetDraft = () => setDraft(emptyDraft);

  const resetOutfitDraft = () => setOutfitDraft(emptyOutfitDraft);

  const resetWardrobeFilters = () => {
    setQuery("");
    setCategoryFilter("全部");
    setSeasonFilter("全部");
    setColorFilter("全部");
    setTagFilter("全部");
    setWardrobeSort("最近添加");
  };

  const openNewOutfit = (preselectedItemIds?: string | string[]) => {
    const itemIds = Array.isArray(preselectedItemIds)
      ? preselectedItemIds
      : preselectedItemIds
        ? [preselectedItemIds]
        : [];
    setSelectedOutfitId(null);
    setOutfitDraft({
      ...emptyOutfitDraft,
      itemIds,
    });
    setView("newOutfit");
  };

  const openEditOutfit = (outfit: Outfit) => {
    setSelectedOutfitId(outfit.id);
    setOutfitDraft({
      name: outfit.name,
      itemIds: outfit.itemIds,
      scenarioTags: outfit.scenarioTags,
      notes: outfit.notes,
    });
    setView("editOutfit");
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const imageId = await wardrobeStore.saveImageBlob(file);
    const imageUrl = URL.createObjectURL(file);
    loadedImageIds.current.add(imageId);
    setImageObjectUrls((current) => ({ ...current, [imageId]: imageUrl }));
    setDraft((current) => ({
      ...current,
      imageId,
      imageUrl,
      name: current.name || file.name.replace(/\.[^.]+$/, ""),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || (!draft.imageUrl && !draft.imageId)) {
      return;
    }

    const nextItem = createItem({
      ...draft,
      imageUrl: draft.imageId ? "" : draft.imageUrl,
      name: draft.name.trim(),
      brand: draft.brand?.trim(),
      size: draft.size?.trim(),
      purchaseChannel: draft.purchaseChannel?.trim(),
      notes: draft.notes.trim(),
    });

    updateItems([nextItem, ...items]);
    resetDraft();
    setSelectedId(nextItem.id);
    setView("detail");
    showToast("已保存到衣柜");
  };

  const handleUpdateItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem || !draft.name.trim() || (!draft.imageUrl && !draft.imageId)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const nextItems = items.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            ...draft,
            imageUrl: draft.imageId ? "" : draft.imageUrl,
            name: draft.name.trim(),
            brand: draft.brand?.trim(),
            size: draft.size?.trim(),
            purchaseChannel: draft.purchaseChannel?.trim(),
            notes: draft.notes.trim(),
            updatedAt: timestamp,
          }
        : item,
    );

    updateItems(nextItems);
    if (selectedItem.imageId && draft.imageId && selectedItem.imageId !== draft.imageId) {
      cleanupStoredImage(selectedItem.imageId);
    }
    resetDraft();
    setView("detail");
    showToast("衣服已更新");
  };

  const handleDelete = (itemId: string) => {
    const item = items.find((candidate) => candidate.id === itemId);
    const confirmed = window.confirm(
      `确定要删除“${item?.name ?? "这件衣服"}”吗？相关穿搭和穿着记录也会同步更新。`,
    );
    if (!confirmed) {
      return;
    }

    const nextItems = items.filter((item) => item.id !== itemId);
    const nextOutfits = outfits
      .map((outfit) => ({
        ...outfit,
        itemIds: outfit.itemIds.filter((outfitItemId) => outfitItemId !== itemId),
      }))
      .filter((outfit) => outfit.itemIds.length > 0);
    const nextWearLogs = wearLogs
      .map((log) => ({
        ...log,
        itemIds: log.itemIds.filter((logItemId) => logItemId !== itemId),
      }))
      .filter((log) => log.itemIds.length > 0);
    cleanupStoredImage(item?.imageId);
    updateItems(nextItems);
    updateOutfits(nextOutfits);
    updateWearLogs(nextWearLogs);
    setSelectedId(null);
    setView("wardrobe");
    showToast("衣服已删除");
  };

  const handleDeleteOutfit = (outfitId: string) => {
    const outfit = outfits.find((candidate) => candidate.id === outfitId);
    const confirmed = window.confirm(
      `确定要删除“${outfit?.name ?? "这套穿搭"}”吗？对应的穿着记录会保留，但会解除穿搭关联。`,
    );
    if (!confirmed) {
      return;
    }

    updateOutfits(outfits.filter((outfit) => outfit.id !== outfitId));
    updateWearLogs(
      wearLogs.map((log) => (log.outfitId === outfitId ? { ...log, outfitId: undefined } : log)),
    );
    setSelectedOutfitId(null);
    setView("outfits");
    showToast("穿搭已删除");
  };

  const handleDeleteWearLog = (wearLogId: string) => {
    updateWearLogs(wearLogs.filter((log) => log.id !== wearLogId));
  };

  const handleRenameItemTag = (tag: string, nextTag: string) => {
    const normalizedTag = nextTag.trim();
    if (!normalizedTag || normalizedTag === tag) {
      return;
    }

    const timestamp = new Date().toISOString();
    updateItems(
      items.map((item) => {
        if (!item.tags.includes(tag)) {
          return item;
        }

        return {
          ...item,
          tags: [...new Set(item.tags.map((itemTag) => (itemTag === tag ? normalizedTag : itemTag)))],
          updatedAt: timestamp,
        };
      }),
    );
    if (tagFilter === tag) {
      setTagFilter(normalizedTag);
    }
    showToast("标签已重命名");
  };

  const handleDeleteItemTag = (tag: string) => {
    const confirmed = window.confirm(`确定要删除“${tag}”标签吗？这个标签会从所有衣服上移除。`);
    if (!confirmed) {
      return;
    }

    const timestamp = new Date().toISOString();
    updateItems(
      items.map((item) => {
        if (!item.tags.includes(tag)) {
          return item;
        }

        return {
          ...item,
          tags: item.tags.filter((itemTag) => itemTag !== tag),
          updatedAt: timestamp,
        };
      }),
    );
    if (tagFilter === tag) {
      setTagFilter("全部");
    }
    showToast("标签已删除");
  };

  const handleCreateCustomCategory = (category: string) => {
    const normalizedCategory = category.trim();
    if (!normalizedCategory) {
      return;
    }

    if (availableCategories.includes(normalizedCategory)) {
      showToast("这个分类已经存在");
      return;
    }

    updateCustomCategories([...customCategories, normalizedCategory]);
    showToast("分类已新增");
  };

  const handleDeleteCustomCategory = (category: string) => {
    const confirmed = window.confirm(
      items.some((item) => item.category === category)
        ? `“${category}”下还有衣服。确定只从自定义分类列表移除它吗？衣服数据不会被删除。`
        : `确定要删除“${category}”分类吗？`,
    );
    if (!confirmed) {
      return;
    }

    updateCustomCategories(customCategories.filter((itemCategory) => itemCategory !== category));
    if (categoryFilter === category && !items.some((item) => item.category === category)) {
      setCategoryFilter("全部");
    }
    showToast("分类已删除");
  };

  const handleMoveItemCategory = (category: Category, nextCategory: Category) => {
    if (category === nextCategory) {
      return;
    }

    const confirmed = window.confirm(`确定要把所有“${category}”分类的衣服移动到“${nextCategory}”吗？`);
    if (!confirmed) {
      return;
    }

    const timestamp = new Date().toISOString();
    updateItems(
      items.map((item) =>
        item.category === category
          ? {
              ...item,
              category: nextCategory,
              updatedAt: timestamp,
            }
          : item,
      ),
    );
    if (categoryFilter === category) {
      setCategoryFilter(nextCategory);
    }
    showToast("分类已更新");
  };

  const handleLogItemWear = (itemId: string, date: string, notes: string) => {
    const nextLog = createWearLog({
      date,
      itemIds: [itemId],
      notes: notes.trim(),
    });

    updateWearLogs([nextLog, ...wearLogs]);
    showToast("穿着记录已保存");
  };

  const handleLogOutfitWear = (outfit: Outfit, date: string, notes: string) => {
    const nextLog = createWearLog({
      date,
      itemIds: outfit.itemIds,
      outfitId: outfit.id,
      notes: notes.trim(),
    });

    updateWearLogs([nextLog, ...wearLogs]);
    showToast("穿着记录已保存");
  };

  const handleExportBackup = async () => {
    const exportItems = await Promise.all(
      items.map(async (item) => {
        if (!item.imageId || item.imageUrl) {
          return item;
        }

        const blob = await wardrobeStore.getImageBlob(item.imageId);
        if (!blob) {
          return item;
        }

        return {
          ...item,
          imageUrl: await readBlobAsDataUrl(blob),
        };
      }),
    );
    const backup: WardrobeBackup = {
      app: "my-wardrobe",
      version: 1,
      customCategories,
      exportedAt: new Date().toISOString(),
      items: exportItems,
      outfits,
      wearLogs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    downloadBlob(blob, `my-wardrobe-backup-${todayString()}.json`);
  };

  const handleExportCsv = () => {
    const headers = [
      "record_type",
      "id",
      "name",
      "date",
      "category",
      "season",
      "primary_color",
      "purchase_price",
      "brand",
      "size",
      "purchase_date",
      "purchase_channel",
      "tags",
      "item_ids",
      "outfit_id",
      "notes",
      "created_at",
      "updated_at",
    ];
    const itemRows = items.map((item) => [
      "item",
      item.id,
      item.name,
      "",
      item.category,
      item.season,
      item.primaryColor,
      item.purchasePrice,
      item.brand,
      item.size,
      item.purchaseDate,
      item.purchaseChannel,
      item.tags.join("|"),
      "",
      "",
      item.notes,
      item.createdAt,
      item.updatedAt,
    ]);
    const outfitRows = outfits.map((outfit) => [
      "outfit",
      outfit.id,
      outfit.name,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      outfit.scenarioTags.join("|"),
      outfit.itemIds.join("|"),
      "",
      outfit.notes,
      outfit.createdAt,
      outfit.updatedAt,
    ]);
    const wearLogRows = wearLogs.map((log) => [
      "wear_log",
      log.id,
      getWearLogTitle(log, items, outfits),
      log.date,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      log.itemIds.join("|"),
      log.outfitId,
      log.notes,
      log.createdAt,
      "",
    ]);
    const csv = buildCsv(headers, [...itemRows, ...outfitRows, ...wearLogRows]);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `my-wardrobe-export-${todayString()}.csv`);
  };

  const handleExportImagesZip = async () => {
    const imageEntries = await Promise.all(
      items.map(async (item, index) => {
        const blob = item.imageId
          ? await wardrobeStore.getImageBlob(item.imageId)
          : item.imageUrl
            ? await fetch(item.imageUrl).then((response) => response.blob())
            : undefined;
        if (!blob) {
          return null;
        }

        const extension = getImageExtension(blob.type);
        const filename = `images/${String(index + 1).padStart(3, "0")}-${sanitizeFilename(item.name)}-${item.id}.${extension}`;
        return {
          data: blob,
          item,
          name: filename,
        };
      }),
    );
    const availableImages = imageEntries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    if (availableImages.length === 0) {
      window.alert("还没有可导出的衣服图片。");
      return;
    }

    const manifest = {
      app: "my-wardrobe",
      exportedAt: new Date().toISOString(),
      images: availableImages.map((entry) => ({
        category: entry.item.category,
        color: entry.item.primaryColor,
        file: entry.name,
        id: entry.item.id,
        name: entry.item.name,
        season: entry.item.season,
        tags: entry.item.tags,
      })),
    };
    const zip = await createZipBlob([
      ...availableImages.map((entry) => ({ data: entry.data, name: entry.name })),
      {
        data: new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }),
        name: "manifest.json",
      },
    ]);

    downloadBlob(zip, `my-wardrobe-images-${todayString()}.zip`);
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text) as unknown;
      if (!isWardrobeBackup(parsed)) {
        window.alert("这个文件不像是“我的衣柜”的备份文件。");
        return;
      }

      updateItems(parsed.items);
      updateOutfits(parsed.outfits);
      updateWearLogs(parsed.wearLogs);
      updateCustomCategories([
        ...customCategories,
        ...(parsed.customCategories ?? []),
        ...parsed.items
          .map((item) => item.category)
          .filter((category) => !defaultCategories.includes(category)),
      ]);
      setSelectedId(null);
      setSelectedOutfitId(null);
      setView("settings");
      showToast("导入完成");
    } catch {
      window.alert("导入失败，请确认 JSON 文件没有损坏。");
    }
  };

  const handleCreateOutfit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!outfitDraft.name.trim() || outfitDraft.itemIds.length === 0) {
      return;
    }

    const nextOutfit = createOutfit({
      name: outfitDraft.name.trim(),
      itemIds: outfitDraft.itemIds,
      scenarioTags: outfitDraft.scenarioTags,
      notes: outfitDraft.notes.trim(),
    });

    updateOutfits([nextOutfit, ...outfits]);
    resetOutfitDraft();
    setView("outfits");
    showToast("穿搭已保存");
  };

  const handleUpdateOutfit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOutfit || !outfitDraft.name.trim() || outfitDraft.itemIds.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    const nextOutfits = outfits.map((outfit) =>
      outfit.id === selectedOutfit.id
        ? {
            ...outfit,
            name: outfitDraft.name.trim(),
            itemIds: outfitDraft.itemIds,
            scenarioTags: outfitDraft.scenarioTags,
            notes: outfitDraft.notes.trim(),
            updatedAt: timestamp,
          }
        : outfit,
    );

    updateOutfits(nextOutfits);
    resetOutfitDraft();
    setView("outfitDetail");
    showToast("穿搭已更新");
  };

  return (
    <div className="app-shell">
      <main className="screen">
        {view === "wardrobe" && (
          <WardrobeView
            items={filteredItems}
            categories={availableCategories}
            wearLogs={wearLogs}
            query={query}
            setQuery={setQuery}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            seasonFilter={seasonFilter}
            setSeasonFilter={setSeasonFilter}
            colorFilter={colorFilter}
            setColorFilter={setColorFilter}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
            tags={wardrobeTags}
            wardrobeSort={wardrobeSort}
            setWardrobeSort={setWardrobeSort}
            onResetFilters={resetWardrobeFilters}
            onAddItem={() => setView("add")}
            onOpen={openDetail}
          />
        )}

        {view === "add" && (
          <AddItemView
            categories={availableCategories}
            draft={draft}
            setDraft={setDraft}
            onUpload={handleUpload}
            onSubmit={handleSubmit}
            onCancel={() => {
              resetDraft();
              setView("wardrobe");
            }}
            submitLabel="保存到衣柜"
            title="添加衣服"
          />
        )}

        {view === "editItem" && selectedItem && (
          <AddItemView
            categories={availableCategories}
            draft={draft}
            setDraft={setDraft}
            onUpload={handleUpload}
            onSubmit={handleUpdateItem}
            onCancel={() => {
              resetDraft();
              setView("detail");
            }}
            submitLabel="保存修改"
            title="编辑衣服"
          />
        )}

        {view === "detail" && selectedItem && (
          <DetailView
            item={selectedItem}
            outfits={relatedOutfits}
            suggestions={suggestedOutfits}
            allItems={displayItems}
            wearLogs={wearLogs}
            onBack={() => setView("wardrobe")}
            onDelete={handleDelete}
            onEdit={openEditItem}
            onLogWear={handleLogItemWear}
            onCreateOutfit={(itemIds) => openNewOutfit(itemIds ?? selectedItem.id)}
            onOpenOutfit={openOutfitDetail}
            wearCount={selectedItemWearLogs.length}
            lastWorn={getLastWearDate(selectedItemWearLogs)}
          />
        )}

        {view === "outfits" && (
          <OutfitsView
            outfits={outfits}
            items={displayItems}
            wearLogs={wearLogs}
            onCreateOutfit={() => openNewOutfit()}
            onOpenOutfit={openOutfitDetail}
          />
        )}

        {view === "outfitDetail" && selectedOutfit && (
          <OutfitDetailView
            outfit={selectedOutfit}
            items={displayItems}
            onBack={() => setView("outfits")}
            onDelete={handleDeleteOutfit}
            onEdit={openEditOutfit}
            onLogWear={handleLogOutfitWear}
            onOpenItem={openDetail}
            wearCount={selectedOutfitWearLogs.length}
            lastWorn={getLastWearDate(selectedOutfitWearLogs)}
          />
        )}

        {view === "newOutfit" && (
          <NewOutfitView
            categories={availableCategories}
            draft={outfitDraft}
            items={displayItems}
            setDraft={setOutfitDraft}
            onSubmit={handleCreateOutfit}
            onCancel={() => {
              resetOutfitDraft();
              setView("outfits");
            }}
            submitLabel="保存穿搭"
            title="新建穿搭"
          />
        )}

        {view === "editOutfit" && selectedOutfit && (
          <NewOutfitView
            categories={availableCategories}
            draft={outfitDraft}
            items={displayItems}
            setDraft={setOutfitDraft}
            onSubmit={handleUpdateOutfit}
            onCancel={() => {
              resetOutfitDraft();
              setView("outfitDetail");
            }}
            submitLabel="保存修改"
            title="编辑穿搭"
          />
        )}

        {view === "history" && (
          <HistoryView wearLogs={wearLogs} items={displayItems} outfits={outfits} onDelete={handleDeleteWearLog} />
        )}

        {view === "settings" && (
          <SettingsView
            categories={availableCategories}
            customCategories={customCategories}
            items={displayItems}
            outfits={outfits}
            wearLogs={wearLogs}
            onExportBackup={handleExportBackup}
            onExportCsv={handleExportCsv}
            onExportImagesZip={handleExportImagesZip}
            onImportBackup={handleImportBackup}
            onDeleteItemTag={handleDeleteItemTag}
            onCreateCustomCategory={handleCreateCustomCategory}
            onDeleteCustomCategory={handleDeleteCustomCategory}
            onMoveItemCategory={handleMoveItemCategory}
            onRenameItemTag={handleRenameItemTag}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="主导航">
        <button className={view === "wardrobe" ? "active" : ""} onClick={() => setView("wardrobe")}>
          <span>衣柜</span>
        </button>
        <button className={view === "outfits" ? "active" : ""} onClick={() => setView("outfits")}>
          <span>穿搭</span>
        </button>
        <button className="add-tab" onClick={() => setView("add")}>
          <span>+</span>
        </button>
        <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>
          <span>记录</span>
        </button>
        <button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>
          <span>设置</span>
        </button>
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

type WardrobeViewProps = {
  categories: string[];
  items: ClothingItem[];
  wearLogs: WearLog[];
  query: string;
  setQuery: (query: string) => void;
  categoryFilter: "全部" | Category;
  setCategoryFilter: (category: "全部" | Category) => void;
  seasonFilter: "全部" | Season;
  setSeasonFilter: (season: "全部" | Season) => void;
  colorFilter: string;
  setColorFilter: (color: string) => void;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  tags: string[];
  wardrobeSort: WardrobeSort;
  setWardrobeSort: (sort: WardrobeSort) => void;
  onResetFilters: () => void;
  onAddItem: () => void;
  onOpen: (itemId: string) => void;
};

function WardrobeView({
  categories,
  items,
  wearLogs,
  query,
  setQuery,
  categoryFilter,
  setCategoryFilter,
  seasonFilter,
  setSeasonFilter,
  colorFilter,
  setColorFilter,
  tagFilter,
  setTagFilter,
  tags,
  wardrobeSort,
  setWardrobeSort,
  onResetFilters,
  onAddItem,
  onOpen,
}: WardrobeViewProps) {
  const hasActiveFilters =
    query.trim() !== "" ||
    categoryFilter !== "全部" ||
    seasonFilter !== "全部" ||
    colorFilter !== "全部" ||
    tagFilter !== "全部" ||
    wardrobeSort !== "最近添加";

  return (
    <>
      <header className="hero">
        <p>我的衣柜</p>
        <h1>今天想穿哪一件？</h1>
        <button onClick={onAddItem}>添加衣服</button>
      </header>

      <section className="search-panel">
        <input
          aria-label="搜索衣服"
          placeholder="搜索：白色、通勤、外套..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="filter-summary">
          <span>{items.length} 件衣服</span>
          {hasActiveFilters && (
            <button type="button" onClick={onResetFilters}>
              重置
            </button>
          )}
        </div>
        <FilterRow
          label="分类"
          value={categoryFilter}
          values={["全部", ...categories]}
          onChange={(value) => setCategoryFilter(value as "全部" | Category)}
        />
        <FilterRow
          label="季节"
          value={seasonFilter}
          values={["全部", ...seasons]}
          onChange={(value) => setSeasonFilter(value as "全部" | Season)}
        />
        <FilterRow label="颜色" value={colorFilter} values={["全部", ...colors]} onChange={setColorFilter} />
        {tags.length > 0 && (
          <FilterRow label="标签" value={tagFilter} values={["全部", ...tags]} onChange={setTagFilter} />
        )}
        <FilterRow
          label="排序"
          value={wardrobeSort}
          values={["最近添加", "最常穿", "最近穿", "价格高"]}
          onChange={(value) => setWardrobeSort(value as WardrobeSort)}
        />
      </section>

      {items.length === 0 ? (
        <section className="empty-state">
          <h2>还没有找到衣服</h2>
          <p>换个筛选条件，或者添加第一件衣服。</p>
          <button onClick={onAddItem}>添加衣服</button>
        </section>
      ) : (
        <section className="wardrobe-grid" aria-label="衣柜列表">
          {items.map((item) => (
            <button className="item-card" key={item.id} onClick={() => onOpen(item.id)}>
              <img src={item.imageUrl} alt={item.name} />
              <span>{item.name}</span>
              <small>
                {[item.category, item.brand, item.primaryColor, item.season].filter(Boolean).join(" · ")}
              </small>
              <div className="item-card-badges">
                <em>{getItemWearCount(item.id, wearLogs)} 次</em>
                {typeof item.purchasePrice === "number" && <em>{formatPrice(item.purchasePrice)}</em>}
              </div>
            </button>
          ))}
        </section>
      )}
    </>
  );
}

function FilterRow({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="filter-row" aria-label={label}>
      <span className="sr-only">{label}</span>
      {values.map((option) => (
        <button className={option === value ? "selected" : ""} key={option} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  );
}

function AddItemView({
  categories,
  draft,
  setDraft,
  onUpload,
  onSubmit,
  onCancel,
  submitLabel,
  title,
}: {
  categories: string[];
  draft: DraftClothingItem;
  setDraft: (draft: DraftClothingItem) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel: string;
  title: string;
}) {
  return (
    <form className="form-screen" onSubmit={onSubmit}>
      <header className="top-bar">
        <button className="ghost-action" type="button" onClick={onCancel}>
          取消
        </button>
        <h1>{title}</h1>
      </header>

      <label className="upload-box">
        {draft.imageUrl ? <img src={draft.imageUrl} alt="衣服预览" /> : <span>上传衣服照片</span>}
        <input accept="image/*" type="file" onChange={onUpload} />
      </label>

      <label>
        名称
        <input
          required
          placeholder="例如：白色短袖"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>

      <div className="form-grid">
        <label>
          分类
          <select
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          季节
          <select value={draft.season} onChange={(event) => setDraft({ ...draft, season: event.target.value as Season })}>
            {seasons.map((season) => (
              <option key={season}>{season}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        主色
        <select value={draft.primaryColor} onChange={(event) => setDraft({ ...draft, primaryColor: event.target.value })}>
          {colors.map((color) => (
            <option key={color}>{color}</option>
          ))}
        </select>
      </label>

      <label>
        价格
        <input
          inputMode="decimal"
          min="0"
          placeholder="例如：299"
          step="0.01"
          type="number"
          value={draft.purchasePrice ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              purchasePrice: event.target.value === "" ? undefined : Number(event.target.value),
            })
          }
        />
      </label>

      <div className="form-grid">
        <label>
          品牌
          <input
            placeholder="例如：Uniqlo"
            value={draft.brand ?? ""}
            onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
          />
        </label>
        <label>
          尺码
          <input
            placeholder="例如：M / 38"
            value={draft.size ?? ""}
            onChange={(event) => setDraft({ ...draft, size: event.target.value })}
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          购买日期
          <input
            type="date"
            value={draft.purchaseDate ?? ""}
            onChange={(event) => setDraft({ ...draft, purchaseDate: event.target.value })}
          />
        </label>
        <label>
          购买渠道
          <input
            placeholder="例如：线下门店 / 淘宝"
            value={draft.purchaseChannel ?? ""}
            onChange={(event) => setDraft({ ...draft, purchaseChannel: event.target.value })}
          />
        </label>
      </div>

      <label>
        标签
        <input
          placeholder="通勤, 百搭, 旅行"
          value={draft.tags.join(", ")}
          onChange={(event) =>
            setDraft({
              ...draft,
              tags: event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
      </label>

      <label>
        备注
        <textarea
          placeholder="尺码、购买地、适合搭配..."
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
        />
      </label>

      <button className="save-button" disabled={!draft.name.trim() || (!draft.imageUrl && !draft.imageId)}>
        {submitLabel}
      </button>
    </form>
  );
}

function DetailView({
  item,
  outfits,
  suggestions,
  allItems,
  wearLogs,
  onBack,
  onDelete,
  onEdit,
  onLogWear,
  onCreateOutfit,
  onOpenOutfit,
  wearCount,
  lastWorn,
}: {
  item: ClothingItem;
  outfits: Outfit[];
  suggestions: OutfitSuggestion[];
  allItems: ClothingItem[];
  wearLogs: WearLog[];
  onBack: () => void;
  onDelete: (itemId: string) => void;
  onEdit: (item: ClothingItem) => void;
  onLogWear: (itemId: string, date: string, notes: string) => void;
  onCreateOutfit: (itemIds?: string[]) => void;
  onOpenOutfit: (outfitId: string) => void;
  wearCount: number;
  lastWorn?: string;
}) {
  const [wearDate, setWearDate] = useState(todayString());
  const [wearNotes, setWearNotes] = useState("");

  const saveWearLog = () => {
    onLogWear(item.id, wearDate, wearNotes);
    setWearNotes("");
  };

  return (
    <article className="detail-screen">
      <header className="top-bar">
        <button className="back-icon" aria-label="返回" onClick={onBack}>
          ‹
        </button>
        <h1>{item.name}</h1>
      </header>

      <img className="detail-image" src={item.imageUrl} alt={item.name} />

      <section className="metadata">
        <Info label="分类" value={item.category} />
        <Info label="季节" value={item.season} />
        <Info label="主色" value={item.primaryColor} />
        <Info label="价格" value={formatPrice(item.purchasePrice)} />
        <Info label="品牌" value={item.brand || "暂无"} />
        <Info label="尺码" value={item.size || "暂无"} />
        <Info label="购买日期" value={item.purchaseDate || "暂无"} />
        <Info label="购买渠道" value={item.purchaseChannel || "暂无"} />
        <Info label="穿着次数" value={`${wearCount} 次`} />
        <Info label="单次成本" value={formatCostPerWear(item.purchasePrice, wearCount)} />
        <Info label="最近穿着" value={formatWearDate(lastWorn)} />
        <Info label="标签" value={item.tags.length > 0 ? item.tags.join(" / ") : "暂无"} />
        <Info label="备注" value={item.notes || "暂无"} />
      </section>

      <section className="action-panel">
        <div className="section-title">
          <h2>常用操作</h2>
          <span>记录 / 管理</span>
        </div>
        <WearRecorder
          date={wearDate}
          notes={wearNotes}
          onDateChange={setWearDate}
          onNotesChange={setWearNotes}
          onSave={saveWearLog}
          saveLabel="记录这件衣服"
        />
        <div className="action-row">
          <button className="secondary-button" onClick={() => onEdit(item)}>
            编辑
          </button>
          <button className="danger-button" onClick={() => onDelete(item.id)}>
            删除
          </button>
        </div>
      </section>

      <section className="related-section">
        <div className="section-title">
          <h2>关联穿搭</h2>
          <span>{outfits.length} 套</span>
        </div>

        {outfits.length === 0 ? (
          <div className="empty-state compact">
            <h3>还没有关联穿搭</h3>
            <p>可以用这件衣服开始创建一套穿搭。</p>
            <button onClick={() => onCreateOutfit()}>用它创建穿搭</button>
          </div>
        ) : (
          <>
            <div className="outfit-list">
              {outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  items={allItems}
                  wearLogs={wearLogs}
                  onOpen={onOpenOutfit}
                />
              ))}
            </div>
            <button onClick={() => onCreateOutfit()}>再创建一套</button>
          </>
        )}
      </section>

      <section className="related-section">
        <div className="section-title">
          <h2>推荐组合</h2>
          <span>{suggestions.length} 组</span>
        </div>

        {suggestions.length === 0 ? (
          <div className="empty-state compact">
            <h3>暂时推荐不出来</h3>
            <p>多添加几件不同分类、同季节的衣服后，这里会自动出现建议。</p>
          </div>
        ) : (
          <div className="suggestion-list">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                items={allItems}
                onCreateOutfit={onCreateOutfit}
              />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WearRecorder({
  date,
  notes,
  onDateChange,
  onNotesChange,
  onSave,
  saveLabel,
}: {
  date: string;
  notes: string;
  onDateChange: (date: string) => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <section className="wear-recorder">
      <label>
        穿着日期
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
      </label>
      <label>
        记录备注
        <input placeholder="天气、场合、心情..." value={notes} onChange={(event) => onNotesChange(event.target.value)} />
      </label>
      <button className="primary-full-button" disabled={!date} onClick={onSave}>
        {saveLabel}
      </button>
    </section>
  );
}

function OutfitsView({
  outfits,
  items,
  wearLogs,
  onCreateOutfit,
  onOpenOutfit,
}: {
  outfits: Outfit[];
  items: ClothingItem[];
  wearLogs: WearLog[];
  onCreateOutfit: () => void;
  onOpenOutfit: (outfitId: string) => void;
}) {
  const [outfitQuery, setOutfitQuery] = useState("");
  const normalizedOutfitQuery = outfitQuery.trim().toLowerCase();
  const visibleOutfits = outfits.filter((outfit) => {
    if (!normalizedOutfitQuery) {
      return true;
    }

    const outfitItemKeywords = outfit.itemIds
      .map((itemId) => {
        const item = items.find((candidate) => candidate.id === itemId);
        return item
          ? [item.name, item.category, item.season, item.primaryColor, item.brand, item.size, item.purchaseChannel]
          : [];
      })
      .flat()
      .filter(Boolean);

    return [outfit.name, outfit.notes, ...outfit.scenarioTags, ...outfitItemKeywords]
      .join(" ")
      .toLowerCase()
      .includes(normalizedOutfitQuery);
  });

  return (
    <section className="plain-screen">
      <div className="page-heading">
        <div>
          <h1>穿搭</h1>
          <p>把衣柜里的单品组合成日常会穿的方案。</p>
        </div>
        <button onClick={onCreateOutfit}>新建</button>
      </div>

      {outfits.length === 0 ? (
        <section className="empty-state">
          <h2>还没有穿搭</h2>
          <p>先选几件衣服，保存第一套搭配。</p>
          <button onClick={onCreateOutfit}>创建穿搭</button>
        </section>
      ) : (
        <>
          <section className="list-tools">
            <input
              aria-label="搜索穿搭"
              placeholder="搜索穿搭、场景、衣服..."
              value={outfitQuery}
              onChange={(event) => setOutfitQuery(event.target.value)}
            />
            <div className="filter-summary">
              <span>{visibleOutfits.length} 套穿搭</span>
              {outfitQuery.trim() && (
                <button type="button" onClick={() => setOutfitQuery("")}>
                  清空
                </button>
              )}
            </div>
          </section>

          {visibleOutfits.length === 0 ? (
            <section className="empty-state">
              <h2>没有匹配的穿搭</h2>
              <p>换个关键词试试，或者创建一套新的。</p>
              <button onClick={onCreateOutfit}>创建穿搭</button>
            </section>
          ) : (
            <div className="outfit-list">
              {visibleOutfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  items={items}
                  wearLogs={wearLogs}
                  onOpen={onOpenOutfit}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function NewOutfitView({
  categories,
  draft,
  items,
  setDraft,
  onSubmit,
  onCancel,
  submitLabel,
  title,
}: {
  categories: string[];
  draft: typeof emptyOutfitDraft;
  items: ClothingItem[];
  setDraft: (draft: typeof emptyOutfitDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel: string;
  title: string;
}) {
  const [categoryPicker, setCategoryPicker] = useState<"全部" | Category>("全部");
  const [pickerQuery, setPickerQuery] = useState("");
  const normalizedPickerQuery = pickerQuery.trim().toLowerCase();
  const categoryItems =
    categoryPicker === "全部" ? items : items.filter((item) => item.category === categoryPicker);
  const visibleItems = categoryItems.filter((item) => {
    if (!normalizedPickerQuery) {
      return true;
    }

    return [item.name, item.category, item.season, item.primaryColor, item.notes, ...item.tags]
      .join(" ")
      .toLowerCase()
      .includes(normalizedPickerQuery);
  });
  const selectedItems = draft.itemIds
    .map((itemId) => items.find((item) => item.id === itemId))
    .filter((item): item is ClothingItem => Boolean(item));

  const toggleItem = (itemId: string) => {
    const isSelected = draft.itemIds.includes(itemId);
    setDraft({
      ...draft,
      itemIds: isSelected ? draft.itemIds.filter((id) => id !== itemId) : [...draft.itemIds, itemId],
    });
  };

  return (
    <form className="form-screen" onSubmit={onSubmit}>
      <header className="top-bar">
        <button className="ghost-action" type="button" onClick={onCancel}>
          取消
        </button>
        <h1>{title}</h1>
      </header>

      <label>
        穿搭名称
        <input
          required
          placeholder="例如：周一通勤"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>

      <label>
        场景标签
        <input
          placeholder="通勤, 旅行, 约会"
          value={draft.scenarioTags.join(", ")}
          onChange={(event) =>
            setDraft({
              ...draft,
              scenarioTags: event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
      </label>

      <label>
        备注
        <textarea
          placeholder="适合什么天气、心情或场合..."
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
        />
      </label>

      <section className="picker-section">
        <div className="section-title">
          <h2>选择衣服</h2>
          <span>{draft.itemIds.length} 件</span>
        </div>

        {items.length === 0 ? (
          <div className="empty-state compact">
            <h3>衣柜还是空的</h3>
            <p>先添加衣服，再来创建穿搭。</p>
          </div>
        ) : (
          <>
            {selectedItems.length > 0 && (
              <div className="selected-strip" aria-label="已选衣服">
                {selectedItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => toggleItem(item.id)}>
                    <img src={item.imageUrl} alt={item.name} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="picker-filters" aria-label="按分类筛选衣服">
              {(["全部", ...categories] as Array<"全部" | Category>).map((category) => (
                <button
                  className={categoryPicker === category ? "selected" : ""}
                  key={category}
                  type="button"
                  onClick={() => setCategoryPicker(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <input
              className="picker-search"
              placeholder="搜索衣服名称、颜色、标签..."
              value={pickerQuery}
              onChange={(event) => setPickerQuery(event.target.value)}
            />

            {visibleItems.length === 0 ? (
              <div className="empty-state compact">
                <h3>{normalizedPickerQuery ? "没有匹配的衣服" : "这个分类还没有衣服"}</h3>
                <p>{normalizedPickerQuery ? "换个关键词试试。" : "换个分类看看，或者先去衣柜添加。"}</p>
              </div>
            ) : (
              <div className="item-picker-grid">
                {visibleItems.map((item) => {
                  const isSelected = draft.itemIds.includes(item.id);

                  return (
                    <button
                      className={isSelected ? "picker-card selected" : "picker-card"}
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                    >
                      <img src={item.imageUrl} alt={item.name} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <button className="save-button" disabled={!draft.name.trim() || draft.itemIds.length === 0}>
        {submitLabel}
      </button>
    </form>
  );
}

function OutfitDetailView({
  outfit,
  items,
  onBack,
  onDelete,
  onEdit,
  onLogWear,
  onOpenItem,
  wearCount,
  lastWorn,
}: {
  outfit: Outfit;
  items: ClothingItem[];
  onBack: () => void;
  onDelete: (outfitId: string) => void;
  onEdit: (outfit: Outfit) => void;
  onLogWear: (outfit: Outfit, date: string, notes: string) => void;
  onOpenItem: (itemId: string) => void;
  wearCount: number;
  lastWorn?: string;
}) {
  const outfitItems = outfit.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => Boolean(item));
  const [wearDate, setWearDate] = useState(todayString());
  const [wearNotes, setWearNotes] = useState("");
  const [isExportingShareImage, setIsExportingShareImage] = useState(false);

  const saveWearLog = () => {
    onLogWear(outfit, wearDate, wearNotes);
    setWearNotes("");
  };

  const downloadShareImage = async () => {
    setIsExportingShareImage(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.fillStyle = "#fffaf4";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#efe5dc";
      context.beginPath();
      context.arc(930, 120, 220, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f7efe7";
      context.beginPath();
      context.arc(80, 1220, 260, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#2c261f";
      context.font = "700 34px system-ui, sans-serif";
      context.fillText("我的衣柜", 72, 88);
      context.font = "900 68px system-ui, sans-serif";
      drawWrappedText(context, outfit.name, 72, 174, 936, 76, 2);
      context.fillStyle = "#7b6c5f";
      context.font = "700 30px system-ui, sans-serif";
      context.fillText(outfit.scenarioTags.join(" / ") || "未分类场景", 72, 330);

      const images = await Promise.all(outfitItems.slice(0, 4).map((item) => loadImage(item.imageUrl)));
      const slots = [
        { height: 430, width: 456, x: 72, y: 390 },
        { height: 430, width: 456, x: 552, y: 390 },
        { height: 300, width: 456, x: 72, y: 844 },
        { height: 300, width: 456, x: 552, y: 844 },
      ];
      images.forEach((image, index) => {
        const slot = slots[index];
        drawRoundedImage(context, image, slot.x, slot.y, slot.width, slot.height);
      });

      context.fillStyle = "#2c261f";
      context.font = "800 28px system-ui, sans-serif";
      drawWrappedText(context, outfitItems.map((item) => item.name).join(" · "), 72, 1210, 936, 38, 2);
      context.fillStyle = "#8a7a6d";
      context.font = "700 24px system-ui, sans-serif";
      context.fillText(`${outfitItems.length} 件衣服 · ${wearCount} 次穿着`, 72, 1300);

      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `my-wardrobe-outfit-${outfit.name}-${todayString()}.png`);
        }
      }, "image/png");
    } finally {
      setIsExportingShareImage(false);
    }
  };

  return (
    <article className="detail-screen">
      <header className="top-bar">
        <button className="back-icon" aria-label="返回" onClick={onBack}>
          ‹
        </button>
        <h1>{outfit.name}</h1>
      </header>

      <section className="outfit-hero">
        <div className="outfit-hero-grid">
          {outfitItems.slice(0, 6).map((item) => (
            <img key={item.id} src={item.imageUrl} alt={item.name} />
          ))}
        </div>
        <div>
          <h2>{outfit.name}</h2>
          <p>{outfit.scenarioTags.join(" / ") || "未分类场景"}</p>
        </div>
      </section>

      <section className="metadata">
        <Info label="单品" value={`${outfitItems.length} 件`} />
        <Info label="场景" value={outfit.scenarioTags.length > 0 ? outfit.scenarioTags.join(" / ") : "暂无"} />
        <Info label="穿着次数" value={`${wearCount} 次`} />
        <Info label="最近穿着" value={formatWearDate(lastWorn)} />
        <Info label="备注" value={outfit.notes || "暂无"} />
      </section>

      <section className="action-panel">
        <div className="section-title">
          <h2>常用操作</h2>
          <span>记录 / 管理</span>
        </div>
        <WearRecorder
          date={wearDate}
          notes={wearNotes}
          onDateChange={setWearDate}
          onNotesChange={setWearNotes}
          onSave={saveWearLog}
          saveLabel="记录这套穿搭"
        />
        <div className="action-row">
          <button className="secondary-button" onClick={() => onEdit(outfit)}>
            编辑
          </button>
          <button className="secondary-button" disabled={isExportingShareImage} onClick={downloadShareImage}>
            {isExportingShareImage ? "生成中" : "分享图"}
          </button>
          <button className="danger-button" onClick={() => onDelete(outfit.id)}>
            删除
          </button>
        </div>
      </section>

      <section className="related-section">
        <div className="section-title">
          <h2>包含衣服</h2>
          <span>{outfitItems.length} 件</span>
        </div>
        <div className="outfit-item-list">
          {outfitItems.map((item) => (
            <button key={item.id} onClick={() => onOpenItem(item.id)}>
              <img src={item.imageUrl} alt={item.name} />
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.category} · {item.primaryColor} · {item.season}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </article>
  );
}

function OutfitCard({
  outfit,
  items,
  wearLogs,
  onOpen,
}: {
  outfit: Outfit;
  items: ClothingItem[];
  wearLogs: WearLog[];
  onOpen: (outfitId: string) => void;
}) {
  const outfitItems = outfit.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => Boolean(item));
  const wearCount = getOutfitWearCount(outfit.id, wearLogs);

  return (
    <button className="outfit-card" onClick={() => onOpen(outfit.id)}>
      <div className="outfit-collage">
        {outfitItems.slice(0, 4).map((item) => (
          <img key={item.id} src={item.imageUrl} alt={item.name} />
        ))}
      </div>
      <div>
        <h3>{outfit.name}</h3>
        <p>{outfit.scenarioTags.join(" / ") || "未分类场景"}</p>
        <small>{outfitItems.map((item) => item.name).join("、")}</small>
        <div className="outfit-card-badges">
          <em>{outfitItems.length} 件</em>
          <em>{wearCount} 次</em>
        </div>
      </div>
    </button>
  );
}

function SuggestionCard({
  suggestion,
  items,
  onCreateOutfit,
}: {
  suggestion: OutfitSuggestion;
  items: ClothingItem[];
  onCreateOutfit: (itemIds: string[]) => void;
}) {
  const suggestionItems = suggestion.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => Boolean(item));

  return (
    <article className="suggestion-card">
      <div className="outfit-collage">
        {suggestionItems.slice(0, 4).map((item) => (
          <img key={item.id} src={item.imageUrl} alt={item.name} />
        ))}
      </div>
      <div>
        <h3>{suggestion.name}</h3>
        <p>{suggestion.reason}</p>
        <small>{suggestionItems.map((item) => item.name).join("、")}</small>
        <button type="button" onClick={() => onCreateOutfit(suggestion.itemIds)}>
          用这组创建
        </button>
      </div>
    </article>
  );
}

function getWearLogTitle(log: WearLog, items: ClothingItem[], outfits: Outfit[]) {
  const outfit = log.outfitId ? outfits.find((candidate) => candidate.id === log.outfitId) : null;
  if (outfit) {
    return outfit.name;
  }

  return (
    log.itemIds
      .map((itemId) => items.find((item) => item.id === itemId)?.name)
      .filter(Boolean)
      .join("、") || "已删除的衣服"
  );
}

function getWearLogSubtitle(log: WearLog, items: ClothingItem[], outfits: Outfit[]) {
  const outfit = log.outfitId ? outfits.find((candidate) => candidate.id === log.outfitId) : null;
  if (outfit) {
    return `穿搭 · ${log.itemIds.length} 件衣服`;
  }

  return log.itemIds
    .map((itemId) => {
      const item = items.find((candidate) => candidate.id === itemId);
      return item ? `${item.category} · ${item.primaryColor}` : null;
    })
    .filter(Boolean)
    .join(" / ");
}

function HistoryView({
  wearLogs,
  items,
  outfits,
  onDelete,
}: {
  wearLogs: WearLog[];
  items: ClothingItem[];
  outfits: Outfit[];
  onDelete: (wearLogId: string) => void;
}) {
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyDate, setHistoryDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return { month: today.getMonth(), year: today.getFullYear() };
  });
  const normalizedHistoryQuery = historyQuery.trim().toLowerCase();
  const monthLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", year: "numeric" }).format(
    new Date(calendarMonth.year, calendarMonth.month, 1),
  );
  const monthStart = new Date(calendarMonth.year, calendarMonth.month, 1);
  const monthDays = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const leadingEmptyDays = monthStart.getDay();
  const calendarDates = [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from({ length: monthDays }, (_, index) => {
      const date = new Date(calendarMonth.year, calendarMonth.month, index + 1);
      return date.toLocaleDateString("sv-SE");
    }),
  ];
  const wearLogsByDate = wearLogs.reduce<Record<string, number>>((result, log) => {
    result[log.date] = (result[log.date] ?? 0) + 1;
    return result;
  }, {});
  const shiftCalendarMonth = (offset: number) => {
    const nextDate = new Date(calendarMonth.year, calendarMonth.month + offset, 1);
    setCalendarMonth({ month: nextDate.getMonth(), year: nextDate.getFullYear() });
  };
  const visibleWearLogs = wearLogs.filter((log) => {
    const matchesDate = !historyDate || log.date === historyDate;
    if (!matchesDate) {
      return false;
    }

    if (!normalizedHistoryQuery) {
      return true;
    }

    return [
      getWearLogTitle(log, items, outfits),
      getWearLogSubtitle(log, items, outfits),
      log.notes,
      log.date,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedHistoryQuery);
  });
  const hasActiveHistoryFilters = historyQuery.trim() !== "" || historyDate !== "";
  const groupedLogs = visibleWearLogs.reduce<Record<string, WearLog[]>>((groups, log) => {
    groups[log.date] = [...(groups[log.date] ?? []), log];
    return groups;
  }, {});
  const dates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  return (
    <section className="plain-screen">
      <div className="page-heading">
        <div>
          <h1>穿着记录</h1>
          <p>回看你真正穿过的衣服和搭配。</p>
        </div>
        <span className="count-pill">{visibleWearLogs.length} 条</span>
      </div>

      {wearLogs.length === 0 ? (
        <section className="empty-state">
          <h2>还没有记录</h2>
          <p>在衣服或穿搭详情里点“今天穿了”，这里就会自动记录。</p>
        </section>
      ) : (
        <>
          <section className="calendar-section">
            <div className="calendar-heading">
              <button aria-label="上个月" type="button" onClick={() => shiftCalendarMonth(-1)}>
                ‹
              </button>
              <strong>{monthLabel}</strong>
              <button aria-label="下个月" type="button" onClick={() => shiftCalendarMonth(1)}>
                ›
              </button>
            </div>
            <div className="calendar-weekdays" aria-hidden="true">
              {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDates.map((date, index) =>
                date ? (
                  <button
                    className={historyDate === date ? "selected" : ""}
                    key={date}
                    type="button"
                    onClick={() => setHistoryDate(historyDate === date ? "" : date)}
                  >
                    <span>{Number(date.slice(-2))}</span>
                    {wearLogsByDate[date] ? <em>{wearLogsByDate[date]}</em> : null}
                  </button>
                ) : (
                  <span className="calendar-empty" key={`empty-${index}`} />
                ),
              )}
            </div>
          </section>

          <section className="list-tools">
            <input
              aria-label="搜索穿着记录"
              placeholder="搜索衣服、穿搭、备注..."
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
            />
            <input
              aria-label="按日期筛选穿着记录"
              type="date"
              value={historyDate}
              onChange={(event) => setHistoryDate(event.target.value)}
            />
            <div className="filter-summary">
              <span>{visibleWearLogs.length} 条记录</span>
              {hasActiveHistoryFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setHistoryQuery("");
                    setHistoryDate("");
                  }}
                >
                  重置
                </button>
              )}
            </div>
          </section>

          {visibleWearLogs.length === 0 ? (
            <section className="empty-state">
              <h2>没有匹配的记录</h2>
              <p>换个日期或关键词试试。</p>
            </section>
          ) : (
            <div className="history-list">
              {dates.map((date) => (
                <section className="history-day" key={date}>
                  <h2>{date}</h2>
                  <div className="wear-log-list">
                    {groupedLogs[date].map((log) => (
                      <article key={log.id}>
                        <div>
                          <strong>{getWearLogTitle(log, items, outfits)}</strong>
                          <span>{getWearLogSubtitle(log, items, outfits) || "单品记录"}</span>
                          {log.notes && <small>{log.notes}</small>}
                        </div>
                        <button onClick={() => onDelete(log.id)}>删除</button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function DistributionList({ items, total }: { items: Array<{ count: number; label: string }>; total: number }) {
  if (items.length === 0) {
    return (
      <div className="empty-state compact">
        <h3>暂无数据</h3>
        <p>添加衣服后会自动生成分布统计。</p>
      </div>
    );
  }

  return (
    <div className="distribution-list">
      {items.map((item) => {
        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;

        return (
          <article key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <span>
                {item.count} 件 · {percentage}%
              </span>
            </div>
            <div className="distribution-bar" aria-hidden="true">
              <span style={{ width: `${percentage}%` }} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PriceDistributionList({ items, total }: { items: Array<{ label: string; value: number }>; total: number }) {
  if (items.length === 0 || total <= 0) {
    return (
      <div className="empty-state compact">
        <h3>暂无价格数据</h3>
        <p>给衣服补上价格后，会自动生成分类金额分布。</p>
      </div>
    );
  }

  return (
    <div className="distribution-list">
      {items.map((item) => {
        const percentage = Math.round((item.value / total) * 100);

        return (
          <article key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <span>
                {formatPrice(item.value)} · {percentage}%
              </span>
            </div>
            <div className="distribution-bar price" aria-hidden="true">
              <span style={{ width: `${percentage}%` }} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SettingsView({
  categories,
  customCategories,
  items,
  outfits,
  wearLogs,
  onExportBackup,
  onExportCsv,
  onExportImagesZip,
  onImportBackup,
  onCreateCustomCategory,
  onDeleteCustomCategory,
  onDeleteItemTag,
  onMoveItemCategory,
  onRenameItemTag,
}: {
  categories: string[];
  customCategories: string[];
  items: ClothingItem[];
  outfits: Outfit[];
  wearLogs: WearLog[];
  onExportBackup: () => void;
  onExportCsv: () => void;
  onExportImagesZip: () => void;
  onImportBackup: (event: ChangeEvent<HTMLInputElement>) => void;
  onCreateCustomCategory: (category: string) => void;
  onDeleteCustomCategory: (category: string) => void;
  onDeleteItemTag: (tag: string) => void;
  onMoveItemCategory: (category: Category, nextCategory: Category) => void;
  onRenameItemTag: (tag: string, nextTag: string) => void;
}) {
  const [categoryDraft, setCategoryDraft] = useState("");
  const recentWearLogs = wearLogs.slice(0, 5);
  const itemStats = items.map((item) => {
    const itemWearLogs = getItemWearLogs(item.id, wearLogs);
    return {
      item,
      costPerWear:
        typeof item.purchasePrice === "number" && itemWearLogs.length > 0
          ? item.purchasePrice / itemWearLogs.length
          : undefined,
      lastWorn: getLastWearDate(itemWearLogs),
      wearCount: itemWearLogs.length,
    };
  });
  const mostWorn = [...itemStats].sort((a, b) => b.wearCount - a.wearCount)[0];
  const recentlyWorn = [...itemStats]
    .filter((stat) => stat.lastWorn)
    .sort((a, b) => String(b.lastWorn).localeCompare(String(a.lastWorn)))[0];
  const unwornCount = itemStats.filter((stat) => stat.wearCount === 0).length;
  const costPerWearValues = itemStats
    .map((stat) => stat.costPerWear)
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  const averageCostPerWear =
    costPerWearValues.length > 0
      ? costPerWearValues.reduce((sum, value) => sum + value, 0) / costPerWearValues.length
      : undefined;
  const categoryDistribution = getDistribution(items.map((item) => item.category));
  const colorDistribution = getDistribution(items.map((item) => item.primaryColor));
  const tagStats = getDistribution(items.flatMap((item) => item.tags));
  const pricedItems = items.filter(
    (item) => typeof item.purchasePrice === "number" && !Number.isNaN(item.purchasePrice),
  );
  const totalInvestment = pricedItems.reduce((sum, item) => sum + Number(item.purchasePrice), 0);
  const highestPriceItem = [...pricedItems].sort(
    (first, second) => Number(second.purchasePrice) - Number(first.purchasePrice),
  )[0];
  const priceByCategory = Object.entries(
    pricedItems.reduce<Record<string, number>>((result, item) => {
      result[item.category] = (result[item.category] ?? 0) + Number(item.purchasePrice);
      return result;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label));
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 30);
  const staleThresholdDate = staleThreshold.toLocaleDateString("sv-SE");
  const staleItems = itemStats
    .filter((stat) => !stat.lastWorn || stat.lastWorn < staleThresholdDate)
    .sort((first, second) => {
      if (!first.lastWorn && second.lastWorn) {
        return -1;
      }

      if (first.lastWorn && !second.lastWorn) {
        return 1;
      }

      return String(first.lastWorn ?? "").localeCompare(String(second.lastWorn ?? ""));
    })
    .slice(0, 5);
  const submitCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreateCustomCategory(categoryDraft);
    setCategoryDraft("");
  };

  return (
    <section className="plain-screen">
      <h1>设置</h1>
      <div className="stats-grid">
        <div>
          <strong>{items.length}</strong>
          <span>件衣服</span>
        </div>
        <div>
          <strong>{outfits.length}</strong>
          <span>套穿搭</span>
        </div>
        <div>
          <strong>{wearLogs.length}</strong>
          <span>次穿着</span>
        </div>
      </div>

      <section className="recent-section">
        <div className="section-title">
          <h2>最近穿着</h2>
          <span>{recentWearLogs.length} 条</span>
        </div>

        {recentWearLogs.length === 0 ? (
          <div className="empty-state compact">
            <h3>还没有记录</h3>
            <p>在衣服或穿搭详情里点“今天穿了”就会出现在这里。</p>
          </div>
        ) : (
          <div className="wear-log-list">
            {recentWearLogs.map((log) => (
              <article key={log.id}>
                <strong>{getWearLogTitle(log, items, outfits)}</strong>
                <span>{log.date}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="insights-section">
        <div className="section-title">
          <h2>衣柜洞察</h2>
          <span>P2</span>
        </div>
        <div className="insight-grid">
          <article>
            <span>最常穿</span>
            <strong>{mostWorn && mostWorn.wearCount > 0 ? mostWorn.item.name : "暂无"}</strong>
            <small>{mostWorn && mostWorn.wearCount > 0 ? `${mostWorn.wearCount} 次` : "先记录几次穿着"}</small>
          </article>
          <article>
            <span>还没穿过</span>
            <strong>{unwornCount}</strong>
            <small>件衣服</small>
          </article>
          <article>
            <span>最近穿过</span>
            <strong>{recentlyWorn ? recentlyWorn.item.name : "暂无"}</strong>
            <small>{recentlyWorn?.lastWorn ?? "还没有穿着记录"}</small>
          </article>
          <article>
            <span>平均单次成本</span>
            <strong>{formatPrice(averageCostPerWear)}</strong>
            <small>基于已填价格和已穿记录</small>
          </article>
        </div>
      </section>

      <section className="distribution-section">
        <div className="section-title">
          <h2>分类分布</h2>
          <span>{categoryDistribution.length} 类</span>
        </div>
        <DistributionList items={categoryDistribution} total={items.length} />
      </section>

      <section className="category-management-section">
        <div className="section-title">
          <h2>分类管理</h2>
          <span>{categoryDistribution.length} 类</span>
        </div>
        <form className="inline-management-form" onSubmit={submitCategory}>
          <input
            aria-label="新分类名称"
            placeholder="新增分类，例如：礼服"
            value={categoryDraft}
            onChange={(event) => setCategoryDraft(event.target.value)}
          />
          <button type="submit">新增</button>
        </form>
        {customCategories.length > 0 && (
          <div className="management-chip-list" aria-label="自定义分类">
            {customCategories.map((category) => (
              <span key={category}>
                {category}
                <button type="button" onClick={() => onDeleteCustomCategory(category)}>
                  删除
                </button>
              </span>
            ))}
          </div>
        )}
        {categoryDistribution.length === 0 ? (
          <div className="empty-state compact">
            <h3>还没有分类数据</h3>
            <p>添加衣服后，这里会显示分类使用情况。</p>
          </div>
        ) : (
          <div className="management-list">
            {categoryDistribution.map((category) => (
              <article key={category.label}>
                <div>
                  <strong>{category.label}</strong>
                  <span>{category.count} 件衣服</span>
                </div>
                <select
                  aria-label={`将${category.label}移动到其他分类`}
                  value={category.label}
                  onChange={(event) => onMoveItemCategory(category.label as Category, event.target.value as Category)}
                >
                  {categories.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="distribution-section">
        <div className="section-title">
          <h2>颜色分布</h2>
          <span>{colorDistribution.length} 色</span>
        </div>
        <DistributionList items={colorDistribution} total={items.length} />
      </section>

      <section className="price-section">
        <div className="section-title">
          <h2>价格概览</h2>
          <span>{pricedItems.length} 件已填</span>
        </div>
        <div className="insight-grid">
          <article>
            <span>总投入</span>
            <strong>{formatPrice(totalInvestment)}</strong>
            <small>按已填写价格统计</small>
          </article>
          <article>
            <span>未填价格</span>
            <strong>{items.length - pricedItems.length}</strong>
            <small>件衣服</small>
          </article>
          <article>
            <span>最高价格</span>
            <strong>{highestPriceItem ? formatPrice(highestPriceItem.purchasePrice) : "暂无"}</strong>
            <small>{highestPriceItem?.name ?? "先录入价格"}</small>
          </article>
          <article>
            <span>平均价格</span>
            <strong>{pricedItems.length > 0 ? formatPrice(totalInvestment / pricedItems.length) : "暂无"}</strong>
            <small>每件衣服</small>
          </article>
        </div>
        <PriceDistributionList items={priceByCategory} total={totalInvestment} />
      </section>

      <section className="stale-section">
        <div className="section-title">
          <h2>很久没穿</h2>
          <span>{staleItems.length} 件</span>
        </div>
        {staleItems.length === 0 ? (
          <div className="empty-state compact">
            <h3>最近都有照顾到</h3>
            <p>没有超过 30 天未穿的衣服。</p>
          </div>
        ) : (
          <div className="stale-list">
            {staleItems.map((stat) => (
              <article key={stat.item.id}>
                <img src={stat.item.imageUrl} alt={stat.item.name} />
                <div>
                  <strong>{stat.item.name}</strong>
                  <span>{stat.lastWorn ? `上次穿：${stat.lastWorn}` : "还没穿过"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="tag-management-section">
        <div className="section-title">
          <h2>标签管理</h2>
          <span>{tagStats.length} 个</span>
        </div>
        {tagStats.length === 0 ? (
          <div className="empty-state compact">
            <h3>还没有标签</h3>
            <p>在添加或编辑衣服时输入标签，这里会自动汇总。</p>
          </div>
        ) : (
          <div className="management-list">
            {tagStats.map((tag) => (
              <article key={tag.label}>
                <div>
                  <strong>{tag.label}</strong>
                  <span>{tag.count} 件衣服使用</span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextTag = window.prompt("重命名标签", tag.label);
                      if (nextTag !== null) {
                        onRenameItemTag(tag.label, nextTag);
                      }
                    }}
                  >
                    重命名
                  </button>
                  <button className="danger-text-button" type="button" onClick={() => onDeleteItemTag(tag.label)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="backup-section">
        <div className="section-title">
          <h2>数据备份</h2>
          <span>本地</span>
        </div>
        <div className="backup-actions">
          <button onClick={onExportBackup}>导出 JSON</button>
          <button onClick={onExportCsv}>导出 CSV</button>
          <button onClick={onExportImagesZip}>导出图片 ZIP</button>
          <label>
            导入 JSON
            <input accept="application/json,.json" type="file" onChange={onImportBackup} />
          </label>
        </div>
        <p>JSON 适合完整备份和恢复，CSV 适合用表格软件查看记录，图片 ZIP 适合单独归档衣服照片。</p>
      </section>

      <section className="app-install-section">
        <div className="section-title">
          <h2>手机桌面</h2>
          <span>PWA</span>
        </div>
        <p>支持通过浏览器“添加到主屏幕”安装成桌面应用。生产构建会缓存应用外壳，断网时也能打开已加载过的页面。</p>
      </section>

      <p>后续这里会加入分类管理、标签管理和更多开源项目信息。</p>
    </section>
  );
}

export default App;
