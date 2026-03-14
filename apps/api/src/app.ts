import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { productsRouter } from "./routes/products";
import { salesRouter } from "./routes/sales";
import { dashboardRouter } from "./routes/dashboard";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/products", productsRouter);
  app.use(salesRouter);
  app.use(dashboardRouter);

  app.get("/", (_req, res) => {
    res.send("API is running");
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use(errorHandler);

  return app;
}
