import express from 'express';
import cors from 'cors';
import { aiRouter } from './routes/ai';
import { analyticsRouter } from './routes/analytics';
import campaignsRouter from './routes/campaigns';
import { dashboardRouter } from './routes/dashboard';
import { facebookRouter } from './routes/facebook';
import forecastsRouter from './routes/forecasts';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { productsRouter } from './routes/products';
import salesRouter from './routes/sales';
import scheduledPostsRouter from './routes/scheduled-posts';
import usersRouter from './routes/users';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info', 'x-user-role'],
  }));
  app.use(express.json({ limit: "10mb" }));

  app.use(healthRouter);
  // `productsRouter` already declares `/api/products` paths internally.
  app.use(productsRouter);
  app.use("/api/sales", salesRouter);
  // `dashboardRouter` already declares absolute dashboard paths internally.
  app.use(dashboardRouter);
  app.use("/api/forecasts", forecastsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/campaigns", campaignsRouter);
  app.use("/api/scheduled-posts", scheduledPostsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/facebook", facebookRouter);
  app.use("/api/analytics", analyticsRouter);

  app.get("/", (_req, res) => {
    res.send("API is running");
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use(errorHandler);

  return app;
}
