# DEFENSE MODE: Complete Deployment & Configuration Guide

## 🚀 QUICK START (Day 1: Setup - 60 minutes)

### Step 1: Install Dependencies (5 minutes)

```bash
# Frontend
cd apps/web
pnpm add @tanstack/react-query @tanstack/react-query-persist-client

# Backend
cd ../api
pnpm add node-cache
```

### Step 2: Copy Defense Mode Files (2 minutes)

All files have been created:
- ✅ `apps/web/src/lib/queryClient.ts` - Query client config
- ✅ `apps/web/src/lib/cachePersistence.ts` - localStorage persistence
- ✅ `apps/web/src/services/dataPreloader.ts` - Preload service
- ✅ `apps/web/src/hooks/useDataPreload.ts` - Preload hook
- ✅ `apps/web/src/hooks/useOfflineQuery.ts` - Offline query hook
- ✅ `apps/web/src/hooks/queries.ts` - Domain query hooks
- ✅ `apps/web/src/data/fallbackData.ts` - Fallback mock data
- ✅ `apps/web/src/components/DefenseAppProvider.tsx` - Provider setup
- ✅ `apps/api/src/lib/defenseCache.ts` - Backend cache
- ✅ `apps/api/src/middleware/cacheMiddleware.ts` - HTTP caching

### Step 3: Update Main App Entry Point (5 minutes)

**File: `apps/web/src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { DefenseAppProvider } from './components/DefenseAppProvider'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DefenseAppProvider>
      <App />
    </DefenseAppProvider>
  </React.StrictMode>,
)
```

### Step 4: Replace API Axios Calls (10 minutes)

**Update routes to use new query hooks:**

```typescript
// OLD:
const [dashboard, setDashboard] = useState(null)
useEffect(() => {
  api.getDashboard().then(setDashboard)
}, [])

// NEW:
const { data: dashboard } = useDashboardSummaryOffline()
```

### Step 5: Configure Backend Cache (10 minutes)

**File: `apps/api/src/index.ts` or `src/app.ts`**

```typescript
import { warmCache, logCacheHealth } from './lib/defenseCache'
import { withCache } from './middleware/cacheMiddleware'

// On server startup
async function initializeDefenseMode() {
  try {
    // Warm cache with common queries
    await warmCache(pool)
    logCacheHealth()
    
    // Setup periodic health logging
    setInterval(() => logCacheHealth(), 5 * 60 * 1000) // Every 5 minutes
  } catch (error) {
    console.error('Failed to initialize defense mode:', error)
  }
}

// Call on server start
initializeDefenseMode()
```

### Step 6: Add Cache Middleware to Routes (10 minutes)

**File: `apps/api/src/routes/analytics.ts`**

```typescript
import { withCache } from '../middleware/cacheMiddleware'

// Add cache headers to expensive queries
analyticsRouter.get('/summary', withCache(3600), async (req, res) => {
  // existing handler
})

analyticsRouter.get('/trend', withCache(3600), async (req, res) => {
  // existing handler
})
```

**File: `apps/api/src/routes/products.ts`**

```typescript
productsRouter.get('/', withCache(1800), async (req, res) => {
  // existing handler
})
```

### Step 7: Update .env Configuration (5 minutes)

**File: `apps/api/.env` (disable expensive features)**

```env
# Disable frequent polling
SCHEDULED_PUBLISHER_INTERVAL_MS=300000  # 5 minutes instead of 5 seconds
ENABLE_SCHEDULER_HEARTBEAT=false        # Disable scheduler polling
REALTIME_POLLING_DISABLED=true          # Disable realtime updates

# Cache warming
CACHE_WARMUP_ON_START=true
CACHE_LOG_HEALTH=true

# Connection pool
DB_POOL_MAX=3
DB_POOL_IDLE_TIMEOUT=30000
```

---

## 📊 PHASE 2: OPTIMIZATION (Day 1: Optimization - 40 minutes)

### Step 8: Disable Expensive React Features (10 minutes)

**File: `apps/web/src/components/Dashboard.tsx`**

```typescript
// Wrap dashboard with memo to prevent re-renders
import { memo } from 'react'

export const Dashboard = memo(() => {
  // Use offline-enabled hooks
  const { data: dashboard } = useDashboardSummaryOffline()
  const { data: analytics } = useAnalyticsSummaryOffline()
  
  // Disable any useEffect that polls data
  // useEffect(() => {
  //   const interval = setInterval(() => refetch(), 5000)  // DON'T DO THIS
  //   return () => clearInterval(interval)
  // }, [])
  
  return (
    // component JSX
  )
}, (prevProps, nextProps) => {
  // Only re-render if props actually change
  return prevProps === nextProps
})
```

### Step 9: Optimize Charts (Lazy Load) (10 minutes)

**File: `apps/web/src/components/Charts.tsx`**

```typescript
import { lazy, Suspense } from 'react'

const AnalyticsChart = lazy(() => import('./AnalyticsChart'))
const TrendChart = lazy(() => import('./TrendChart'))

export function Charts() {
  return (
    <Suspense fallback={<div>Loading charts...</div>}>
      <AnalyticsChart />
      <TrendChart />
    </Suspense>
  )
}
```

### Step 10: Implement Virtual Lists (if needed) (10 minutes)

```typescript
import { FixedSizeList as List } from 'react-window'

// Use for large product/sales lists
function ProductsList({ products }: { products: Product[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <ProductRow product={products[index]} />
    </div>
  )

  return (
    <List
      height={600}
      itemCount={products.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

### Step 11: Setup Cache Warmup Backend Endpoint (10 minutes)

**File: `apps/api/src/routes/cache.ts`** (New file)

```typescript
import { Router } from 'express'
import { setCached, CACHE_KEYS, CACHE_DURATIONS } from '../lib/defenseCache'
import { pool } from '../db/pool'

const cacheRouter = Router()

cacheRouter.post('/cache/warm', async (req, res) => {
  try {
    console.info('🔥 Manual cache warmup initiated')

    // Warm dashboard
    const dashboardQuery = await pool.query('SELECT COUNT(*) FROM products')
    setCached(CACHE_KEYS.DASHBOARD_SUMMARY, dashboardQuery.rows[0], CACHE_DURATIONS.DASHBOARD_SUMMARY)

    // Warm products
    const products = await pool.query('SELECT * FROM products LIMIT 100')
    setCached(CACHE_KEYS.PRODUCTS_LIST, products.rows, CACHE_DURATIONS.PRODUCTS_LIST)

    // Warm sales
    const sales = await pool.query('SELECT COUNT(*) FROM sales')
    setCached(CACHE_KEYS.SALES_SUMMARY, sales.rows[0], CACHE_DURATIONS.SALES)

    res.json({
      ok: true,
      message: '✅ Cache warmup completed',
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Cache warmup failed',
    })
  }
})

export { cacheRouter }
```

---

## 🛡️ PHASE 3: DEFENSE FEATURES (Day 2: Testing - 30 minutes)

### Step 12: Test Offline Mode

**Browser DevTools:**

```
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Refresh page → should show cached data
5. Navigate around → all data loads from cache/fallback
```

**Test Fallback:**

```typescript
// In browser console:
// Simulate API failure
window.__networkDebug?.goOffline()

// Navigate to dashboard → should show fallback data
// Check console for warnings about using fallback

// Go back online
window.__networkDebug?.goOnline()
```

### Step 13: Verify Cache Persistence

**Browser localStorage:**

```
1. Open DevTools (F12)
2. Go to Application > Local Storage
3. Look for key: "demo_query_cache"
4. Should contain serialized query data
5. Close tab, reopen → data still there
```

**Check cache metadata:**

```typescript
// In browser console:
import { getCacheMetadata, getCacheSize } from '@/lib/cachePersistence'

console.log(getCacheMetadata())    // See cache info
console.log(getCacheSize())        // See cache size (MB)
```

### Step 14: Monitor Backend Cache Health

**Hit endpoint in test:**

```bash
# Warm cache
curl -X POST http://localhost:4000/api/cache/warm

# Check health in logs
# Should see: "[DefenseCache] Health Report: { hits: X, misses: Y, hitRate: Z% }"
```

### Step 15: Test Under Weak WiFi Conditions

**Simulate slow network:**

```
1. DevTools > Network tab
2. Click throttling dropdown
3. Select "Slow 3G" or custom
4. Refresh page
5. Should still load instantly (from cache)
6. Monitor console for warnings
```

---

## ✅ DEPLOYMENT CHECKLIST (Before Defense)

### Configuration
- [ ] Dependencies installed (`pnpm install`)
- [ ] All defense files created
- [ ] Main.tsx updated with DefenseAppProvider
- [ ] Routes updated to use query hooks
- [ ] .env configured with CACHE_WARMUP_ON_START=true
- [ ] Backend cache middleware added
- [ ] Cache warmup endpoint working

### Testing
- [ ] Dashboard loads <500ms
- [ ] Analytics loads instantly
- [ ] Products list loads <1s
- [ ] Charts render quickly
- [ ] Offline mode tested (go offline, navigate, data still shows)
- [ ] Fallback data displays correctly
- [ ] Cache persists across page reloads
- [ ] localStorage cache size <10MB
- [ ] No console errors in defense mode

### Performance
- [ ] Cache hit rate >90% ✅
- [ ] API response time <100ms ✅
- [ ] Dashboard render time <200ms ✅
- [ ] No N+1 queries
- [ ] No unnecessary re-renders
- [ ] Network requests <5 per page

### Reliability
- [ ] App works without internet
- [ ] Fallback data shows gracefully
- [ ] No crashes on API failure
- [ ] Error messages are user-friendly
- [ ] Connection pool never exhausted
- [ ] Backend cache never corrupts
- [ ] localStorage gracefully handles quota

---

## 🚨 EMERGENCY PROCEDURES

### If Cache Gets Corrupted

**Clear cache and restart:**

```typescript
// In browser console:
import { clearPersistedCache } from '@/lib/cachePersistence'
clearPersistedCache()

// Refresh page → will reload from API with fresh cache
```

### If Backend Cache Issues

**On server:**

```bash
# Restart backend to warm cache
npm run dev

# Or manually warm:
curl -X POST http://localhost:4000/api/cache/warm
```

### Emergency Fallback (If Everything Fails)

```typescript
// Frontend console:
const { getFallbackData } = await import('@/data/fallbackData')
window.__fallbackData = getFallbackData('/api/dashboard')
```

---

## 📈 MONITORING DURING DEMO

**Before demo starts:**

```bash
# Terminal 1: Run backend
cd apps/api
pnpm run dev

# Terminal 2: Run frontend
cd apps/web
pnpm run dev

# Terminal 3: Monitor cache health
watch -n 5 'curl -s http://localhost:4000/api/cache/health | jq'
```

**Watch for during demo:**

- ✅ Cache hit rate stays >80%
- ✅ No console errors
- ✅ API response times <100ms
- ✅ Dashboard updates smooth
- ✅ No connection pool errors

---

## 🎯 DEFENSE DAY WORKFLOW

**30 minutes before demo:**

1. [ ] Clear browser cache: `localStorage.clear()`
2. [ ] Refresh page → preload starts
3. [ ] Wait for preload to complete (100%)
4. [ ] Check all pages load correctly
5. [ ] Verify cache filled (DevTools > Application > Local Storage)
6. [ ] Test offline mode
7. [ ] Check console for warnings

**During demo:**

1. Keep browser DevTools closed (F12)
2. Click slowly between pages to let cache load
3. If network fails, app will gracefully use cached data
4. Offline mode shows fallback data automatically
5. No action needed - defense mode handles everything

**After demo:**

1. Screenshot cache size for metrics
2. Note any errors encountered
3. Document any features that failed
4. Plan improvements for production