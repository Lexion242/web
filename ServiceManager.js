const CACHE_NAME = 'yescom-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'styles.css',
  'script.js',
  'ServiceManager.js',
  'yescom.svg',
  'config.json'
];
  
class ServiceManager {
  static cacheHitRate = { hits: 0, misses: 0 };
  static cacheStatistics = { lastUpdated: null, totalEntries: 0 };

  static async init() {
    Debug.time('[ServiceManager] Initialization');
    try {
      if (!('caches' in window)) {
        Debug.warn('[ServiceManager] Cache API not available');
        return;
      }

      Debug.log('[ServiceManager] Starting initialization...');
      const cache = await caches.open(CACHE_NAME);
      Debug.log(`[ServiceManager] Cache ${CACHE_NAME} opened`);

      await this._cacheAssets(cache);
      await this._cleanOldCaches();
      
      Debug.log('[ServiceManager] Cache initialized successfully');
    } catch (error) {
      Debug.error('[ServiceManager] Initialization failed:', error);
    } finally {
      Debug.timeEnd('[ServiceManager] Initialization');
    }
  }

  static async _cacheAssets(cache) {
    Debug.time('[ServiceManager] Asset caching');
    try {
      Debug.log('[ServiceManager] Checking existing cache...');
      const cachedRequests = await cache.keys();
      const cachedUrls = new Set(cachedRequests.map(req => req.url));
      Debug.log(`[ServiceManager] Found ${cachedUrls.size} cached items`);

      for (const asset of ASSETS_TO_CACHE) {
        const url = new URL(asset, location.href).href;
        if (!cachedUrls.has(url)) {
          Debug.log(`[ServiceManager] Attempting to cache: ${asset}`);
          try {
            await cache.add(url);
            Debug.log(`[ServiceManager] Successfully cached: ${asset}`);
          } catch (error) {
            Debug.warn(`[ServiceManager] Failed to cache ${asset}:`, error);
          }
        } else {
          Debug.log(`[ServiceManager] Already cached: ${asset}`);
        }
      }
    } finally {
      Debug.timeEnd('[ServiceManager] Asset caching');
    }
  }

  static async _cleanOldCaches() {
    Debug.time('[ServiceManager] Cache cleanup');
    try {
      Debug.log('[ServiceManager] Checking for old caches...');
      const keys = await caches.keys();
      Debug.log(`[ServiceManager] Found ${keys.length} cache(s)`);

      const deletions = keys.filter(key => key !== CACHE_NAME)
        .map(async key => {
          Debug.log(`[ServiceManager] Deleting old cache: ${key}`);
          await caches.delete(key);
          Debug.log(`[ServiceManager] Deleted cache: ${key}`);
        });

      await Promise.all(deletions);
      Debug.log('[ServiceManager] Cache cleanup completed');
    } finally {
      Debug.timeEnd('[ServiceManager] Cache cleanup');
    }
  }

  static async fetchWithCache(request) {
    const url = request.url;
    const debugId = Math.random().toString(36).substr(2, 5);
    const startTime = Date.now();
    
    Debug.time(`[ServiceManager:${debugId}] Total fetch time`);
    Debug.log(`[ServiceManager:${debugId}] Starting fetch process for: ${url}`);

    try {
        // Phase 1: Cache Initialization
        Debug.time(`[ServiceManager:${debugId}] Cache open`);
        const cache = await caches.open(CACHE_NAME);
        Debug.timeEnd(`[ServiceManager:${debugId}] Cache open`);
        
        // Phase 2: Cache Check
        Debug.time(`[ServiceManager:${debugId}] Cache match`);
        const cachedResponse = await cache.match(request);
        Debug.timeEnd(`[ServiceManager:${debugId}] Cache match`);

        if (cachedResponse) {
            this.cacheHitRate.hits++;
            const age = this._getCachedContentAge(cachedResponse);
            Debug.log(`[ServiceManager:${debugId}] Cache hit! Age: ${age}ms`);
            
            // Phase 2a: Cache Freshness Check
            if (this._isCacheStale(cachedResponse)) {
                Debug.log(`[ServiceManager:${debugId}] Cached content stale (${age}ms), revalidating...`);
                this._backgroundUpdate(cache, request, debugId);
            }
            
            await this._logCacheStatistics(cache, debugId);
            return cachedResponse;
        }

        // Phase 3: Network Fetch
        Debug.log(`[ServiceManager:${debugId}] Cache miss, initiating network request...`);
        this.cacheHitRate.misses++;
        
        Debug.time(`[ServiceManager:${debugId}] Network fetch`);
        const response = await fetch(request);
        Debug.timeEnd(`[ServiceManager:${debugId}] Network fetch`);

        // Phase 4: Cache Update
        if (response.ok) {
            Debug.log(`[ServiceManager:${debugId}] Caching fresh response (status: ${response.status})`);
            Debug.time(`[ServiceManager:${debugId}] Cache put`);
            await cache.put(request, response.clone());
            Debug.timeEnd(`[ServiceManager:${debugId}] Cache put`);
            
            await this._logCacheStatistics(cache, debugId);
        } else {
            Debug.warn(`[ServiceManager:${debugId}] Non-OK network response: ${response.status}`);
        }

        return response;
    } catch (error) {
        // Phase 5: Error Handling
        Debug.error(`[ServiceManager:${debugId}] Fetch failure:`, error);
        
        Debug.time(`[ServiceManager:${debugId}] Fallback check`);
        const fallback = await cache.match('/offline.html');
        Debug.timeEnd(`[ServiceManager:${debugId}] Fallback check`);

        if (fallback) {
            Debug.log(`[ServiceManager:${debugId}] Serving fallback content`);
            return fallback;
        }

        return new Response('Offline - Content unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    } finally {
        // Phase 6: Cleanup and Reporting
        Debug.timeEnd(`[ServiceManager:${debugId}] Total fetch time`);
        const duration = Date.now() - startTime;
        
        Debug.log([
            `[ServiceManager:${debugId}] Request completed in ${duration}ms`,
            `Cache hit rate: ${this._calculateHitRate()}%`,
            `Total requests: ${this.cacheHitRate.hits + this.cacheHitRate.misses}`,
            `Cache stats: ${JSON.stringify(this.cacheStatistics)}`
        ].join('\n  '));
    }
}

static async _logCacheStatistics(cache, debugId) {
    Debug.time(`[ServiceManager:${debugId}] Cache analysis`);
    try {
        const requests = await cache.keys();
        this.cacheStatistics = {
            lastUpdated: new Date().toISOString(),
            totalEntries: requests.length,
            cachedUrls: requests.map(r => r.url)
        };
        
        Debug.log(`[ServiceManager:${debugId}] Cache stats updated:`, {
            entries: requests.length,
            storageEstimate: await this._estimateStorage()
        });
    } catch (error) {
        Debug.warn(`[ServiceManager:${debugId}] Cache analysis failed:`, error);
    }
    Debug.timeEnd(`[ServiceManager:${debugId}] Cache analysis`);
}

static async _estimateStorage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            return await navigator.storage.estimate();
        } catch (error) {
            return { error: error.message };
        }
    }
    return { error: 'Storage API not available' };
}

static _getCachedContentAge(response) {
    const dateHeader = response.headers.get('date');
    return dateHeader ? Date.now() - new Date(dateHeader).getTime() : 0;
}

static _isCacheStale(response, maxAge = 300000) { // 5 minutes
    const age = this._getCachedContentAge(response);
    return age > maxAge;
}

static _calculateHitRate() {
    const total = this.cacheHitRate.hits + this.cacheHitRate.misses;
    return total > 0 ? ((this.cacheHitRate.hits / total) * 100).toFixed(1) : 0;
}

static async _backgroundUpdate(cache, request, debugId) {
    try {
        Debug.log(`[ServiceManager:${debugId}] Background revalidation started`);
        const freshResponse = await fetch(request);
        if (freshResponse.ok) {
            await cache.put(request, freshResponse.clone());
            Debug.log(`[ServiceManager:${debugId}] Cache updated in background`);
        }
    } catch (error) {
        Debug.warn(`[ServiceManager:${debugId}] Background update failed:`, error);
    }
}
}

// Initialize ServiceManager with debug logging
Debug.log('[ServiceManager] Registering ServiceManager');
if (typeof window !== 'undefined') {
  ServiceManager.init();
} else {
  Debug.warn('[ServiceManager] Not running in browser context');
}