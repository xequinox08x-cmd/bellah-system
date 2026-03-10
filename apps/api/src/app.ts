import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { productsRouter } from './routes/products';
import salesRouter from './routes/sales';
import aiContentRouter from './routes/ai-content';
import campaignsRouter from './routes/campaigns';
import scheduledPostsRouter from './routes/scheduled-posts';
import { salesRouter } from './routes/sales';
import { errorHandler } from './middleware/errorHandler';
import forecastsRouter from './routes/forecasts';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  // routes
  app.use(healthRouter);
  app.use(productsRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/ai-content', aiContentRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/scheduled-posts', scheduledPostsRouter);
  app.use('/api/forecasts', forecastsRouter);

  app.use('/api/products', productsRouter);
  app.use('/api/sales', salesRouter);

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