import salesRouter from "./routes/sales";
import { productsRouter } from './routes/products';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  // routes
  app.use(healthRouter);
  app.use(productsRouter);
  app.use("/api/sales", salesRouter);

  // optional root route
  app.get('/', (_req, res) => {
    res.send('API is running ✅');
  });

  // 404
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  // error handler
  app.use(errorHandler);

  return app;
}
