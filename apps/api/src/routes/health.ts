import { Router } from "express";
import { pool } from "../db";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "API is healthy ✅" });
});

healthRouter.get("/health/db", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "Database connected ✅",
      time: result.rows[0].now,
    });
  } catch (error: any) {
    res.status(500).json({
      status: "Database connection failed ❌",
      error: error.message,
    });
  }
});