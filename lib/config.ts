/**
 * Centralized Configuration with Zod Validation
 *
 * This module validates all environment variables at startup
 * and provides type-safe access to configuration values.
 */

import { z } from 'zod'

// Schema for required credentials (must be set in production)
const credentialsSchema = z.object({
  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().default('whatsapp:+14155238886'),

  // WhatsApp Business
  WHATSAPP_BUSINESS_PHONE_ID: z.string().optional(),
  WHATSAPP_BUSINESS_TOKEN: z.string().optional(),

  // WhatsApp Híbrido API
  WHATSAPP_API_URL: z.string().url().optional(),
  WHATSAPP_API_KEY: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Evolution API
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().optional(),
})

// Schema for application config
const appConfigSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Security
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  CONFIG_PASSWORD: z.string().min(8, 'CONFIG_PASSWORD must be at least 8 characters').optional(),

  // API Keys (no defaults in production)
  ADMIN_API_KEY: z.string().min(16, 'ADMIN_API_KEY must be at least 16 characters').optional(),
  API_KEY: z.string().min(16, 'API_KEY must be at least 16 characters').optional(),

  // Webhook Security
  WEBHOOK_SECRET: z.string().min(16, 'WEBHOOK_SECRET must be at least 16 characters').optional(),

  // Rate Limits
  RATE_LIMIT_PER_MINUTE: z.coerce.number().positive().default(120),
  MAX_MESSAGES_PER_MINUTE: z.coerce.number().positive().default(30),
  MAX_MESSAGES_PER_HOUR: z.coerce.number().positive().default(500),
  MAX_MESSAGES_PER_DAY: z.coerce.number().positive().default(2000),

  // Delays
  MESSAGE_DELAY_MS: z.coerce.number().nonnegative().default(2000),
})

// Combined schema
const envSchema = appConfigSchema.merge(credentialsSchema)

export type EnvConfig = z.infer<typeof envSchema>

// Parse and validate environment variables
function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.format()
    console.error('❌ Environment validation failed:')
    console.error(JSON.stringify(errors, null, 2))

    // In production, fail fast on missing required vars
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration. Check logs for details.')
    }

    // In development, warn but continue with defaults
    console.warn('⚠️ Running with invalid configuration. Some features may not work.')

    // Return partial config with safe defaults
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/telegrafo',
      NODE_ENV: process.env.NODE_ENV || 'development',
    })
  }

  return result.data
}

// Singleton config instance
let _config: EnvConfig | null = null

export function getConfig(): EnvConfig {
  if (!_config) {
    _config = validateEnv()
  }
  return _config
}

// Convenience getters with validation warnings
export const config = {
  get database() {
    return getConfig().DATABASE_URL
  },

  get nodeEnv() {
    return getConfig().NODE_ENV
  },

  get isProduction() {
    return getConfig().NODE_ENV === 'production'
  },

  get isDevelopment() {
    return getConfig().NODE_ENV === 'development'
  },

  // Twilio
  get twilio() {
    const cfg = getConfig()
    return {
      accountSid: cfg.TWILIO_ACCOUNT_SID,
      authToken: cfg.TWILIO_AUTH_TOKEN,
      whatsappNumber: cfg.TWILIO_WHATSAPP_NUMBER,
      isConfigured: !!(cfg.TWILIO_ACCOUNT_SID && cfg.TWILIO_AUTH_TOKEN),
    }
  },

  // WhatsApp Business
  get whatsappBusiness() {
    const cfg = getConfig()
    return {
      phoneId: cfg.WHATSAPP_BUSINESS_PHONE_ID,
      token: cfg.WHATSAPP_BUSINESS_TOKEN,
      isConfigured: !!(cfg.WHATSAPP_BUSINESS_PHONE_ID && cfg.WHATSAPP_BUSINESS_TOKEN),
    }
  },

  // Evolution API
  get evolution() {
    const cfg = getConfig()
    return {
      url: cfg.EVOLUTION_API_URL,
      apiKey: cfg.EVOLUTION_API_KEY,
      instanceName: cfg.EVOLUTION_INSTANCE_NAME,
      isConfigured: !!(cfg.EVOLUTION_API_URL && cfg.EVOLUTION_API_KEY),
    }
  },

  // Cloudinary
  get cloudinary() {
    const cfg = getConfig()
    return {
      cloudName: cfg.CLOUDINARY_CLOUD_NAME,
      apiKey: cfg.CLOUDINARY_API_KEY,
      apiSecret: cfg.CLOUDINARY_API_SECRET,
      isConfigured: !!(cfg.CLOUDINARY_CLOUD_NAME && cfg.CLOUDINARY_API_KEY && cfg.CLOUDINARY_API_SECRET),
    }
  },

  // Security
  get security() {
    const cfg = getConfig()
    return {
      configPassword: cfg.CONFIG_PASSWORD,
      adminApiKey: cfg.ADMIN_API_KEY,
      apiKey: cfg.API_KEY,
      webhookSecret: cfg.WEBHOOK_SECRET,
      adminUsername: cfg.ADMIN_USERNAME,
      adminPassword: cfg.ADMIN_PASSWORD,
    }
  },

  // Rate Limits
  get rateLimits() {
    const cfg = getConfig()
    return {
      requestsPerMinute: cfg.RATE_LIMIT_PER_MINUTE,
      messagesPerMinute: cfg.MAX_MESSAGES_PER_MINUTE,
      messagesPerHour: cfg.MAX_MESSAGES_PER_HOUR,
      messagesPerDay: cfg.MAX_MESSAGES_PER_DAY,
      messageDelayMs: cfg.MESSAGE_DELAY_MS,
    }
  },

  // App URL
  get appUrl() {
    return getConfig().NEXT_PUBLIC_APP_URL
  },
}

// Validation helpers
export function requireConfig<K extends keyof EnvConfig>(key: K): NonNullable<EnvConfig[K]> {
  const value = getConfig()[key]
  if (value === undefined || value === null || value === '') {
    throw new Error(`Required configuration '${key}' is not set`)
  }
  return value as NonNullable<EnvConfig[K]>
}

export function requireConfigInProduction<K extends keyof EnvConfig>(key: K): EnvConfig[K] | undefined {
  const cfg = getConfig()
  const value = cfg[key]

  if (cfg.NODE_ENV === 'production' && (value === undefined || value === null || value === '')) {
    throw new Error(`Required configuration '${key}' must be set in production`)
  }

  return value
}

// Masking utility for logging
export function maskSensitiveValue(value: string | undefined): string {
  if (!value) return ''
  if (value.length < 8) return '****'
  return value.slice(0, 4) + '****' + value.slice(-4)
}

// Export default config for convenience
export default config
