# DEFENSE MODE - Complete Optimization Guide

## ⚡ PHASE 0: DEPENDENCIES INSTALLATION (5 minutes)

### Frontend Dependencies
```bash
cd apps/web
pnpm add @tanstack/react-query @tanstack/react-query-persist-client
pnpm add @tanstack/match-sorter-utils valibot
pnpm add axios
```

### Backend Dependencies
```bash
cd apps/api
pnpm add node-cache ioredis express-compression
```

## 📋 PHASE 1: REACT QUERY SETUP (20 minutes)

### 1.1 Create Query Client Configuration

File: `apps/web/src/lib/queryClient.ts`
- Optimized cache times for defense mode
- Stale times minimized
- Automatic refetch disabled
- prefetch strategies enabled

### 1.2 Create localStorage Persister

File: `apps/web/src/lib/persistence.ts`
- Persists React Query cache to localStorage
- Automatic recovery on page reload
- Offline-safe persistence
- Size-optimized storage

### 1.3 Create Query Hooks

Files: `apps/web/src/hooks/queries/`
- Dashboard query hooks with caching
- Analytics query hooks
- Products query hooks
- Sales query hooks
- All with defensive caching

## 📦 PHASE 2: BACKEND MEMORY CACHE (15 minutes)

### 2.1 Cache Layer Implementation

File: `apps/api/src/lib/defenseCache.ts`
- Node-cache based caching
- Cache warming on startup
- TTL-based expiration
- Cache invalidation strategies

### 2.2 Cache Middleware

File: `apps/api/src/middleware/cacheMiddleware.ts`
- HTTP caching headers
- Cache-Control optimization
- ETag support

### 2.3 Cache API Endpoints

Update routes with caching:
- `apps/api/src/routes/dashboard.ts`
- `apps/api/src/routes/analytics.ts`
- `apps/api/src/routes/products.ts`
- `apps/api/src/routes/sales.ts`

## 🎯 PHASE 3: PRELOADING STRATEGY (20 minutes)

### 3.1 Data Preloader

File: `apps/web/src/services/dataPreloader.ts`
- Preload all dashboard data on startup
- Preload analytics data
- Preload inventory/products
- Progressive loading with feedback

### 3.2 Preload Hooks

File: `apps/web/src/hooks/useDataPreload.ts`
- Initialize query client with cached data
- Fetch missing data in background
- Show loading state during preload

### 3.3 Backend Cache Warmer

File: `apps/api/src/services/cacheWarmer.ts`
- Populate backend cache on startup
- Pre-warm hot queries
- Generate forecast reports in advance

## 🛡️ PHASE 4: FALLBACK SYSTEM (20 minutes)

### 4.1 Fallback Data

File: `apps/web/src/data/fallbackData.ts`
- Mock dashboard data
- Demo products
- Sample analytics
- Forecast charts data

### 4.2 Fallback Service

File: `apps/web/src/services/fallbackService.ts`
- Return fallback data if API fails
- Graceful degradation
- User feedback on fallback mode

### 4.3 Offline Query Hooks

File: `apps/web/src/hooks/useOfflineQuery.ts`
- Use cached data if offline
- Use fallback if cache empty
- Show offline indicator

## 🚀 PHASE 5: DISABLE EXPENSIVE FEATURES (10 minutes)

### 5.1 Disable Realtime Features

Update: `apps/api/.env`
- `SCHEDULED_PUBLISHER_INTERVAL_MS=300000` (5 minutes)
- Disable realtime polling

### 5.2 Optimize React Renders

Create: `apps/web/src/components/optimized/`
- Memoized dashboard components
- Lazy-loaded charts
- Virtualized lists

## 📊 PHASE 6: IMPLEMENTATION FILES (detailed below)

### Timeline
- Phase 0: 5 min (dependencies)
- Phase 1: 20 min (React Query)
- Phase 2: 15 min (Backend cache)
- Phase 3: 20 min (Preload)
- Phase 4: 20 min (Fallback)
- Phase 5: 10 min (Disable features)
- **Total: ~90 minutes**

### Deployment Checklist
- [ ] Dependencies installed
- [ ] Query client configured
- [ ] localStorage persistence working
- [ ] Backend cache warmed
- [ ] Data preloaded on startup
- [ ] Fallback system tested
- [ ] Expensive features disabled
- [ ] Demo environment verified
- [ ] Cache preload tested (page reload)
- [ ] Offline mode tested
- [ ] WiFi simulation tested
- [ ] Full system tested end-to-end

---

**Next: Detailed implementation of each phase below**