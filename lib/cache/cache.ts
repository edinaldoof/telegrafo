/**
 * Unified Cache Layer
 *
 * Provides a unified caching interface that uses Redis when available
 * and falls back to in-memory cache when Redis is unavailable.
 *
 * Features:
 * - Automatic Redis fallback to memory
 * - TTL support
 * - JSON serialization
 * - Namespace support for cache isolation
 * - Cache statistics
 */

import { getRedisClient, isRedisAvailable } from './redis'
import { logger } from '@/lib/observability/log'

type CacheValue<T> = { value: T; expiresAt: number }

// In-memory fallback cache
const memoryStore = new Map<string, CacheValue<unknown>>()

// Cache statistics
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
}

/**
 * Default TTL in milliseconds (5 minutes)
 */
const DEFAULT_TTL_MS = 5 * 60 * 1000

/**
 * Cache interface
 */
export interface CacheInterface {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  clear(pattern?: string): Promise<void>
  getStats(): typeof stats
}

/**
 * Create a namespaced key
 */
function createKey(namespace: string, key: string): string {
  return namespace ? `${namespace}:${key}` : key
}

/**
 * Get value from memory cache
 */
function memoryGet<T>(key: string): T | null {
  const item = memoryStore.get(key)
  if (!item) return null

  if (Date.now() > item.expiresAt) {
    memoryStore.delete(key)
    return null
  }

  return item.value as T
}

/**
 * Set value in memory cache
 */
function memorySet<T>(key: string, value: T, ttlMs: number): void {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/**
 * Delete from memory cache
 */
function memoryDel(key: string): void {
  memoryStore.delete(key)
}

/**
 * Clear memory cache
 */
function memoryClear(pattern?: string): void {
  if (!pattern) {
    memoryStore.clear()
    return
  }

  const regex = new RegExp(pattern.replace(/\*/g, '.*'))
  for (const key of memoryStore.keys()) {
    if (regex.test(key)) {
      memoryStore.delete(key)
    }
  }
}

/**
 * Unified cache implementation
 */
class UnifiedCache implements CacheInterface {
  private _namespace: string

  constructor(namespace = '') {
    this._namespace = namespace
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = createKey(this._namespace, key)

    try {
      const redis = getRedisClient()

      if (redis && isRedisAvailable()) {
        const data = await redis.get(fullKey)
        if (data) {
          stats.hits++
          return JSON.parse(data) as T
        }
        stats.misses++
        return null
      }

      // Fallback to memory
      const value = memoryGet<T>(fullKey)
      if (value !== null) {
        stats.hits++
      } else {
        stats.misses++
      }
      return value
    } catch (error) {
      stats.errors++
      logger.error('Cache get error', error, { key: fullKey })
      // Fallback to memory on error
      return memoryGet<T>(fullKey)
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
    const fullKey = createKey(this._namespace, key)
    stats.sets++

    try {
      const redis = getRedisClient()
      const serialized = JSON.stringify(value)

      if (redis && isRedisAvailable()) {
        // Redis uses seconds for TTL
        const ttlSeconds = Math.ceil(ttlMs / 1000)
        await redis.setex(fullKey, ttlSeconds, serialized)
      }

      // Also set in memory (for faster subsequent reads and fallback)
      memorySet(fullKey, value, ttlMs)
    } catch (error) {
      stats.errors++
      logger.error('Cache set error', error, { key: fullKey })
      // Still set in memory on error
      memorySet(fullKey, value, ttlMs)
    }
  }

  /**
   * Delete from cache
   */
  async del(key: string): Promise<void> {
    const fullKey = createKey(this._namespace, key)
    stats.deletes++

    try {
      const redis = getRedisClient()

      if (redis && isRedisAvailable()) {
        await redis.del(fullKey)
      }

      memoryDel(fullKey)
    } catch (error) {
      stats.errors++
      logger.error('Cache delete error', error, { key: fullKey })
      memoryDel(fullKey)
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = createKey(this._namespace, key)

    try {
      const redis = getRedisClient()

      if (redis && isRedisAvailable()) {
        const exists = await redis.exists(fullKey)
        return exists === 1
      }

      return memoryGet(fullKey) !== null
    } catch (error) {
      stats.errors++
      return memoryGet(fullKey) !== null
    }
  }

  /**
   * Clear cache (optionally by pattern)
   */
  async clear(pattern?: string): Promise<void> {
    const fullPattern = pattern ? createKey(this._namespace, pattern) : (this._namespace ? `${this._namespace}:*` : undefined)

    try {
      const redis = getRedisClient()

      if (redis && isRedisAvailable() && fullPattern) {
        const keys = await redis.keys(fullPattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      memoryClear(fullPattern)
    } catch (error) {
      stats.errors++
      logger.error('Cache clear error', error, { pattern: fullPattern })
      memoryClear(fullPattern)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): typeof stats {
    return { ...stats }
  }

  /**
   * Create a namespaced cache instance
   */
  withNamespace(ns: string): UnifiedCache {
    const newNs = this._namespace ? `${this._namespace}:${ns}` : ns
    return new UnifiedCache(newNs)
  }
}

// Export singleton instance
export const cache = new UnifiedCache()

// Export namespaced caches for different parts of the application
export const caches = {
  auth: cache.withNamespace('auth'),
  contacts: cache.withNamespace('contacts'),
  groups: cache.withNamespace('groups'),
  messages: cache.withNamespace('messages'),
  instances: cache.withNamespace('instances'),
  rateLimit: cache.withNamespace('ratelimit'),
}

/**
 * Cache decorator for async functions
 */
export function cached<T>(
  keyFn: (...args: unknown[]) => string,
  ttlMs = DEFAULT_TTL_MS,
  cacheInstance = cache
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]): Promise<T> {
      const key = keyFn(...args)
      const cachedValue = await cacheInstance.get<T>(key)

      if (cachedValue !== null) {
        return cachedValue
      }

      const result = await originalMethod.apply(this, args)
      await cacheInstance.set(key, result, ttlMs)
      return result
    }

    return descriptor
  }
}

/**
 * Simple cache wrapper function for inline use
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
  cacheInstance = cache
): Promise<T> {
  const cached = await cacheInstance.get<T>(key)
  if (cached !== null) {
    return cached
  }

  const result = await fn()
  await cacheInstance.set(key, result, ttlMs)
  return result
}
