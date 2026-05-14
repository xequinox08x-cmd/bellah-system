/**
 * DEFENSE MODE: Backend App Initialization Template
 * 
 * Add this to your apps/api/src/app.ts or src/index.ts
 * Shows exactly how to integrate cache warming and defense features
 */

// ============================================================
// 1. IMPORTS - Add these to your existing imports
// ============================================================

import { withCache, cacheMiddleware } from './middleware/cacheMiddleware';
import { defenseCache, logCacheHealth } from './lib/defenseCache';
import { runCacheWarmup } from './services/cacheWarmer';

// ============================================================
// 2. INITIALIZE DEFENSE MODE - Add to your createApp function
// ============================================================

export async function initializeDefenseMode(app: any) {
  console.info('[DefenseMode] 🛡️ Initializing defense mode...');

  try {
    // Add cache middleware to all GET requests
    app.use('*/GET', cacheMiddleware({ ttl: 600, isPublic: true }));

    // Warm cache on startup
    const warmupResult = await runCacheWarmup();
    console.info('[DefenseMode] ✅ Cache warmed up:', warmupResult);

    // Log cache health every 5 minutes
    setInterval(() => {
      logCacheHealth();
    }, 5 * 60 * 1000);

    // Optional: Setup cache refresh
    setInterval(() => {
      refreshHotCache();
    }, 30 * 60 * 1000); // Every 30 minutes

    console.info('[DefenseMode] ✅ Defense mode initialized successfully');
  } catch (error) {
    console.error('[DefenseMode] ❌ Initialization failed:', error);
    // Don't crash - continue with reduced functionality
  }
}

// ============================================================
// 3. UPDATED ROUTE EXAMPLES - Cache your endpoints
// ============================================================

// Example: Dashboard endpoint with cache
app.get('/api/dashboard', withCache(3600), async (req: Request, res: Response) => {
  // Existing dashboard logic
  const data = { /* ... */ };
  res.json({ ok: true, data });
});

// Example: Analytics with cache
app.get('/api/analytics/summary', withCache(3600), async (req: Request, res: Response) => {
  // Existing analytics logic
  const data = { /* ... */ };
  res.json({ ok: true, data });
});

// Example: Products with moderate cache
app.get('/api/products', withCache(1800), async (req: Request, res: Response) => {
  // Existing products logic
  const data = { /* ... */ };
  res.json({ ok: true, data });
});

// Example: Cache warmup endpoint (call from frontend before demo)
app.post('/api/cache/warm', async (req: Request, res: Response) => {
  try {
    const result = await runCacheWarmup();
    res.json({
      ok: true,
      message: '✅ Cache warmed',
      details: result,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Cache warmup failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Example: Cache health check endpoint
app.get('/api/cache/health', (req: Request, res: Response) => {
  const stats = defenseCache.getStats();
  res.json({
    ok: true,
    cache: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
    },
  });
});

// Example: Clear cache endpoint (for testing)
app.post('/api/cache/clear', (req: Request, res: Response) => {
  defenseCache.flushAll();
  res.json({ ok: true, message: 'Cache cleared' });
});

// ============================================================
// 4. CALL ON APP START - Add to your server initialization
// ============================================================

// In your main server startup function:
async function startServer() {
  // ... existing initialization code ...

  // Initialize defense mode
  await initializeDefenseMode(app);

  // ... start listening ...
  app.listen(PORT, () => {
    console.info(`✅ Server running on port ${PORT}`);
    console.info('[DefenseMode] 🛡️ Defense mode active - system is hardened for demo');
  });
}

// ============================================================
// 5. ENVIRONMENT VARIABLES - Add to .env
// ============================================================

// See DEFENSE_MODE_DEPLOYMENT_GUIDE.md for full .env configuration

// ============================================================
// 6. SCHEDULER OPTIMIZATION - Update scheduler settings
// ============================================================

// In your scheduledPublisher.ts:
const DEFAULT_PUBLISH_INTERVAL_MS = parseInt(
  process.env.SCHEDULED_PUBLISHER_INTERVAL_MS || '300000' // 5 minutes default
);

// Reduce batch size for lighter load
const DEFAULT_BATCH_SIZE = parseInt(
  process.env.SCHEDULED_PUBLISHER_BATCH_SIZE || '3' // 3 instead of 10
);