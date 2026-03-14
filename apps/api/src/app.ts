import salesRouter from "./routes/sales";
import { productsRouter } from './routes/products';
import { salesRouter } from './routes/sales';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/products", productsRouter);
  app.use(salesRouter);

  app.get("/", (_req, res) => {
    res.send("API is running");
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use(errorHandler);

  return app;
}