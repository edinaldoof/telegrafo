/**
 * Redis Cache Client
 *
 * Provides Redis connection with automatic reconnection and health monitoring.
 * Falls back to in-memory cache if Redis is unavailable.
 */

import Redis from 'ioredis'
import { config } from '@/lib/config'
import { logger } from '@/lib/observability/log'

let redisClient: Redis | null = null
let isRedisConnected = false

/**
 * Get Redis connection URL from environment
 */
function getRedisUrl(): string | null {
  return process.env.REDIS_URL || null
}

/**
 * Create and configure Redis client
 */
function createRedisClient(): Redis | null {
  const url = getRedisUrl()

  if (!url) {
    if (config.isProduction) {
      logger.warn('REDIS_URL not configured. Using in-memory cache (not recommended for production).')
    }
    return null
  }

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) {
          logger.error('Redis connection failed after 10 retries')
          return null // Stop retrying
        }
        const delay = Math.min(times * 200, 2000)
        return delay
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED']
        return targetErrors.some((e) => err.message.includes(e))
      },
    })

    client.on('connect', () => {
      isRedisConnected = true
      logger.info('Redis connected')
    })

    client.on('ready', () => {
      isRedisConnected = true
      logger.info('Redis ready')
    })

    client.on('error', (err) => {
      isRedisConnected = false
      logger.error('Redis error', err)
    })

    client.on('close', () => {
      isRedisConnected = false
      logger.warn('Redis connection closed')
    })

    client.on('reconnecting', () => {
      logger.info('Redis reconnecting...')
    })

    return client
  } catch (error) {
    logger.error('Failed to create Redis client', error)
    return null
  }
}

/**
 * Get Redis client (lazy initialization)
 */
export function getRedisClient(): Redis | null {
  if (!redisClient) {
    redisClient = createRedisClient()
  }
  return redisClient
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isRedisConnected && redisClient !== null
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    isRedisConnected = false
  }
}

/**
 * Ping Redis to check connectivity
 */
export async function pingRedis(): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    const result = await client.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}
