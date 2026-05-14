import { Request, Response, NextFunction } from 'express';

/**
 * DEFENSE MODE: Cache Middleware
 * 
 * Automatically adds cache headers to responses
 * Enables browser and CDN caching
 */

export interface CacheOptions {
  ttl?: number;           // Cache time in seconds
  isPublic?: boolean;     // Whether cache is public or private
  revalidate?: boolean;   // Whether to allow stale-while-revalidate
}

/**
 * Standard cache durations (in seconds)
 */
const CACHE_DURATIONS = {
  LONG: 86400,            // 24 hours
  MEDIUM: 3600,           // 1 hour
  SHORT: 300,             // 5 minutes
  NONE: 0,                // No cache
};

/**
 * Cache middleware - sets Cache-Control headers
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ttl = options.ttl ?? CACHE_DURATIONS.MEDIUM;
    const isPublic = options.isPublic ?? true;
    const allowStale = options.revalidate ?? true;

    if (ttl === 0) {
      // No caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      // Set cache headers
      const cacheControl = [
        isPublic ? 'public' : 'private',
        `max-age=${ttl}`,
        allowStale ? `stale-while-revalidate=${ttl * 2}` : null,
      ].filter(Boolean).join(', ');

      res.set('Cache-Control', cacheControl);
    }

    next();
  };
}

/**
 * Wrap response in cache headers for specific endpoints
 */
export function withCache(ttl: number, isPublic = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `${isPublic ? 'public' : 'private'}, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`);
    next();
  };
}

/**
 * Disable cache for specific endpoints
 */
export function noCache() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  };
}

/**
 * Set ETag for response (for conditional requests)
 */
export function setETag(data: any): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

/**
 * Check If-None-Match header for 304 responses
 */
export function checkETag(req: Request, etag: string): boolean {
  const ifNoneMatch = req.get('If-None-Match');
  return ifNoneMatch === etag;
}