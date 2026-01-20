import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import { pingRedis, isRedisAvailable } from '@/lib/cache/redis'

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  latency?: number
  message?: string
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  environment: string
  uptime: number
  services: {
    database: ServiceStatus
    redis?: ServiceStatus
    twilio?: ServiceStatus
    evolution?: ServiceStatus
    whatsappBusiness?: ServiceStatus
  }
}

const startTime = Date.now()

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 */
export async function GET() {
  const checks: HealthResponse['services'] = {
    database: { status: 'unhealthy' },
  }

  // Check database
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
    }
  }

  // Check Redis
  try {
    const redisStart = Date.now()
    const isConnected = await pingRedis()
    if (isConnected) {
      checks.redis = {
        status: 'healthy',
        latency: Date.now() - redisStart,
      }
    } else if (isRedisAvailable()) {
      checks.redis = {
        status: 'degraded',
        message: 'Connected but not responding',
      }
    } else {
      checks.redis = {
        status: 'degraded',
        message: 'Not configured (using in-memory fallback)',
      }
    }
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Redis connection failed',
    }
  }

  // Check Twilio configuration
  if (config.twilio.isConfigured) {
    checks.twilio = {
      status: 'healthy',
      message: 'Configured',
    }
  } else {
    checks.twilio = {
      status: 'degraded',
      message: 'Not configured',
    }
  }

  // Check Evolution API configuration
  if (config.evolution.isConfigured) {
    checks.evolution = {
      status: 'healthy',
      message: 'Configured',
    }
  } else {
    checks.evolution = {
      status: 'degraded',
      message: 'Not configured',
    }
  }

  // Check WhatsApp Business configuration
  if (config.whatsappBusiness.isConfigured) {
    checks.whatsappBusiness = {
      status: 'healthy',
      message: 'Configured',
    }
  } else {
    checks.whatsappBusiness = {
      status: 'degraded',
      message: 'Not configured',
    }
  }

  // Determine overall status
  const allStatuses = Object.values(checks).map((s) => s.status)
  let overallStatus: HealthResponse['status'] = 'healthy'

  if (allStatuses.includes('unhealthy')) {
    // Database unhealthy is critical
    if (checks.database.status === 'unhealthy') {
      overallStatus = 'unhealthy'
    } else {
      overallStatus = 'degraded'
    }
  } else if (allStatuses.includes('degraded')) {
    overallStatus = 'degraded'
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services: checks,
  }

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return NextResponse.json(response, { status: httpStatus })
}

/**
 * HEAD /api/health
 * Simple health check for load balancers (just checks if server is up)
 */
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
