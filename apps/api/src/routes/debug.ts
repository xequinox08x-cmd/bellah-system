import { Router, type Request, type Response } from "express";
import { getFacebookAnalyticsDebug } from "../services/facebook";

export const debugRouter = Router();

debugRouter.get("/facebook-analytics", async (_req: Request, res: Response) => {
  try {
    console.info("[debug.facebook-analytics] request received");
    const data = await getFacebookAnalyticsDebug();

    return res.json({
      ok: true,
      success: true,
      data,
      message: null,
    });
  } catch (error) {
    console.error("[debug.facebook-analytics] request failed", {
      message: error instanceof Error ? error.message : "Failed to debug Facebook analytics",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return res.status(500).json({
      ok: false,
      success: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to debug Facebook analytics",
    });
  }
});
