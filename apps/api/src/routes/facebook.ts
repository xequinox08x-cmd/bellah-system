import { Router, type Request, type Response } from "express";
import {
  getFacebookStatus,
  getPagePosts,
  getPostMetrics,
  publishSystemContent,
  syncAllContentMetrics,
} from "../services/facebook";

export const facebookRouter = Router();

function getErrorStatus(error: unknown) {
  const statusCode = (error as { statusCode?: unknown })?.statusCode;
  return typeof statusCode === "number" && statusCode >= 400 ? statusCode : 500;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

facebookRouter.get("/status", async (_req: Request, res: Response) => {
  try {
    const status = await getFacebookStatus();
    return res.json({ ok: true, data: status, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to load Facebook status"),
    });
  }
});

facebookRouter.get("/posts", async (_req: Request, res: Response) => {
  try {
    const posts = await getPagePosts();
    return res.json({ ok: true, data: posts, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to load Facebook posts"),
    });
  }
});

facebookRouter.get("/metrics/:postId", async (req: Request, res: Response) => {
  try {
    const postId = String(req.params.postId ?? "").trim();
    if (!postId) {
      return res.status(400).json({ ok: false, data: null, message: "postId is required" });
    }

    const metrics = await getPostMetrics(postId);
    return res.json({ ok: true, data: metrics, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to load Facebook metrics"),
    });
  }
});

facebookRouter.post("/publish/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, data: null, message: "Invalid content id" });
    }

    const published = await publishSystemContent(id);
    return res.json({ ok: true, data: published, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to publish Facebook content"),
    });
  }
});

facebookRouter.post("/sync-all", async (_req: Request, res: Response) => {
  try {
    const result = await syncAllContentMetrics();
    return res.json({ ok: true, data: result, message: null });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({
      ok: false,
      data: null,
      message: getErrorMessage(error, "Failed to refresh Facebook analytics"),
    });
  }
});
