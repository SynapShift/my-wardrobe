import {
  errorResponse,
  getDemoUserId,
  jsonResponse,
  requireImageBucket,
  type PagesContext,
} from "../_shared";

const getImageKey = (userId: string, itemId: string) => `users/${userId}/items/${itemId}/original`;

export const onRequestGet = async ({ env, params }: PagesContext) => {
  try {
    const bucket = requireImageBucket(env);
    const itemId = params.itemId;
    const object = await bucket.get(getImageKey(getDemoUserId(env), itemId));

    if (!object) {
      return errorResponse("Image not found.", 404);
    }

    return new Response(object.body, {
      headers: {
        "cache-control": "private, max-age=3600",
        "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to load image.", 500);
  }
};

export const onRequestPost = async ({ env, params, request }: PagesContext) => {
  try {
    const bucket = requireImageBucket(env);
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const itemId = params.itemId;
    const key = getImageKey(getDemoUserId(env), itemId);

    await bucket.put(key, request.body, {
      httpMetadata: {
        contentType,
      },
    });

    return jsonResponse({ imageKey: key });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to save image.", 500);
  }
};

export const onRequestDelete = async ({ env, params }: PagesContext) => {
  try {
    const bucket = requireImageBucket(env);
    const key = getImageKey(getDemoUserId(env), params.itemId);
    await bucket.delete(key);

    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to delete image.", 500);
  }
};
