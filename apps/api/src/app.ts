import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { productsRouter } from './routes/products';
import salesRouter from './routes/sales';
import aiContentRouter from './routes/ai-content';
import campaignsRouter from './routes/campaigns';
import scheduledPostsRouter from './routes/scheduled-posts';
import forecastsRouter from './routes/forecasts';
import usersRouter from './routes/users';
import dashboardRouter from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';


export function createApp() {
  const app = express();

  app.use(cors({ 
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info']
  }));

  app.use(express.json());

  app.use(healthRouter);
  app.use(productsRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/ai-content', aiContentRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/scheduled-posts', scheduledPostsRouter);
  app.use('/api/forecasts', forecastsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/dashboard', dashboardRouter);


  app.get('/', (_req, res) => {
    res.send('API is running ✅');
  });

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}