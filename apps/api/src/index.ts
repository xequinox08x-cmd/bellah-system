import 'dotenv/config';
import { createApp } from './app';
import { startScheduledPublisher, stopScheduledPublisher } from './services/scheduledPublisher';

const app = createApp();
const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, () => {
  console.log('API running on http://localhost:' + PORT);
  startScheduledPublisher();
});

function shutdown(signal: string) {
  console.info(`[api] received ${signal}, shutting down`);
  stopScheduledPublisher();

  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
