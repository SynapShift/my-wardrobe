import { getDemoUserId, jsonResponse, type PagesContext } from "./_shared";

export const onRequestGet = async ({ env }: PagesContext) =>
  jsonResponse({
    mode: env.WARDROBE_DB && env.WARDROBE_IMAGES ? "cloud" : "local",
    user: env.WARDROBE_DB
      ? {
          id: getDemoUserId(env),
          label: "Demo cloud user",
        }
      : null,
  });
