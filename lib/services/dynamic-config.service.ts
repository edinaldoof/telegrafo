/**
 * Dynamic Config Service
 *
 * Permite alterar configurações em tempo real sem reiniciar a aplicação.
 * Usa banco de dados PostgreSQL com cache em memória.
 */

import { prisma } from '@/lib/prisma'

// Cache em memória
interface CacheEntry {
  value: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30 * 1000 // 30 segundos de cache

// Categorias de configuração
export type ConfigCategory = 'twilio' | 'evolution' | 'cloudinary' | 'app' | 'security' | 'whatsapp' | 'general' | 'sge'

// Definição das configurações conhecidas
export const CONFIG_DEFINITIONS: Record<string, { category: ConfigCategory; isSecret: boolean; description: string }> = {
  // Twilio
  TWILIO_ACCOUNT_SID: { category: 'twilio', isSecret: false, description: 'Account SID do Twilio' },
  TWILIO_AUTH_TOKEN: { category: 'twilio', isSecret: true, description: 'Token de autenticação do Twilio' },
  TWILIO_WHATSAPP_NUMBER: { category: 'twilio', isSecret: false, description: 'Número WhatsApp do Twilio (formato: whatsapp:+1234567890)' },

  // Evolution API
  EVOLUTION_API_URL: { category: 'evolution', isSecret: false, description: 'URL da Evolution API' },
  EVOLUTION_API_KEY: { category: 'evolution', isSecret: true, description: 'Chave da Evolution API' },
  EVOLUTION_INSTANCE_NAME: { category: 'evolution', isSecret: false, description: 'Nome da instância Evolution' },

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: { category: 'cloudinary', isSecret: false, description: 'Nome do cloud Cloudinary' },
  CLOUDINARY_API_KEY: { category: 'cloudinary', isSecret: false, description: 'API Key do Cloudinary' },
  CLOUDINARY_API_SECRET: { category: 'cloudinary', isSecret: true, description: 'API Secret do Cloudinary' },

  // WhatsApp Business
  WHATSAPP_BUSINESS_PHONE_ID: { category: 'whatsapp', isSecret: false, description: 'Phone ID do WhatsApp Business' },
  WHATSAPP_BUSINESS_TOKEN: { category: 'whatsapp', isSecret: true, description: 'Token do WhatsApp Business' },
  WHATSAPP_API_URL: { category: 'whatsapp', isSecret: false, description: 'URL da API WhatsApp Híbrida' },
  WHATSAPP_API_KEY: { category: 'whatsapp', isSecret: true, description: 'Chave da API WhatsApp Híbrida' },

  // Rate Limits
  MAX_MESSAGES_PER_MINUTE: { category: 'app', isSecret: false, description: 'Máximo de mensagens por minuto' },
  MAX_MESSAGES_PER_HOUR: { category: 'app', isSecret: false, description: 'Máximo de mensagens por hora' },
  MAX_MESSAGES_PER_DAY: { category: 'app', isSecret: false, description: 'Máximo de mensagens por dia' },
  MESSAGE_DELAY_MS: { category: 'app', isSecret: false, description: 'Delay entre mensagens (ms)' },

  // App
  NEXT_PUBLIC_APP_URL: { category: 'app', isSecret: false, description: 'URL pública da aplicação' },

  // Admin
  ADMIN_USERNAME: { category: 'security', isSecret: false, description: 'Usuário admin' },
  ADMIN_PASSWORD: { category: 'security', isSecret: true, description: 'Senha admin' },

  // SGE COTEC API
  SGE_API_URL: { category: 'sge', isSecret: false, description: 'URL da API SGE COTEC' },
  SGE_API_TOKEN: { category: 'sge', isSecret: true, description: 'Token de autenticação da API SGE' },
}

/**
 * Obter configuração do banco de dados com cache
 */
export async function getConfig(key: string): Promise<string | null> {
  // Verificar cache primeiro
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  try {
    const config = await prisma.dynamicConfig.findUnique({
      where: { key }
    })

    if (config) {
      // Atualizar cache
      cache.set(key, {
        value: config.value,
        expiresAt: Date.now() + CACHE_TTL_MS
      })
      return config.value
    }

    // Se não existe no banco, tentar do process.env como fallback
    const envValue = process.env[key]
    if (envValue) {
      return envValue
    }

    return null
  } catch (error) {
    // Em caso de erro no banco, usar fallback do environment
    console.warn(`[DynamicConfig] Erro ao ler ${key} do banco, usando fallback:`, error)
    return process.env[key] || null
  }
}

/**
 * Obter configuração com valor padrão
 */
export async function getConfigWithDefault(key: string, defaultValue: string): Promise<string> {
  const value = await getConfig(key)
  return value ?? defaultValue
}

/**
 * Obter múltiplas configurações de uma vez
 */
export async function getConfigs(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}

  // Buscar do cache primeiro
  const keysToFetch: string[] = []

  for (const key of keys) {
    const cached = cache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      result[key] = cached.value
    } else {
      keysToFetch.push(key)
    }
  }

  if (keysToFetch.length > 0) {
    try {
      const configs = await prisma.dynamicConfig.findMany({
        where: { key: { in: keysToFetch } }
      })

      // Mapear resultados
      const configMap = new Map(configs.map(c => [c.key, c.value]))

      for (const key of keysToFetch) {
        const value = configMap.get(key) ?? process.env[key] ?? null
        result[key] = value

        if (value) {
          cache.set(key, {
            value,
            expiresAt: Date.now() + CACHE_TTL_MS
          })
        }
      }
    } catch (error) {
      console.warn('[DynamicConfig] Erro ao buscar configs do banco:', error)
      // Fallback para environment
      for (const key of keysToFetch) {
        result[key] = process.env[key] || null
      }
    }
  }

  return result
}

/**
 * Salvar configuração no banco de dados
 */
export async function setConfig(key: string, value: string): Promise<void> {
  const definition = CONFIG_DEFINITIONS[key] || { category: 'general', isSecret: false, description: '' }

  await prisma.dynamicConfig.upsert({
    where: { key },
    update: {
      value,
      atualizadoEm: new Date()
    },
    create: {
      key,
      value,
      category: definition.category,
      isSecret: definition.isSecret,
      description: definition.description
    }
  })

  // Invalidar cache imediatamente
  cache.delete(key)
}

/**
 * Salvar múltiplas configurações
 */
export async function setConfigs(configs: Record<string, string>): Promise<void> {
  const operations = Object.entries(configs).map(([key, value]) => {
    const definition = CONFIG_DEFINITIONS[key] || { category: 'general', isSecret: false, description: '' }

    return prisma.dynamicConfig.upsert({
      where: { key },
      update: {
        value,
        atualizadoEm: new Date()
      },
      create: {
        key,
        value,
        category: definition.category,
        isSecret: definition.isSecret,
        description: definition.description
      }
    })
  })

  await prisma.$transaction(operations)

  // Invalidar cache para todas as chaves
  for (const key of Object.keys(configs)) {
    cache.delete(key)
  }
}

/**
 * Invalidar cache de uma ou todas as configurações
 */
export function invalidateCache(key?: string): void {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

/**
 * Obter todas as configurações (para UI)
 */
export async function getAllConfigs(): Promise<Array<{
  key: string
  value: string
  category: string
  isSecret: boolean
  description: string | null
}>> {
  const configs = await prisma.dynamicConfig.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }]
  })

  return configs.map(c => ({
    key: c.key,
    value: c.isSecret ? maskValue(c.value) : c.value,
    category: c.category,
    isSecret: c.isSecret,
    description: c.description
  }))
}

/**
 * Obter configurações por categoria
 */
export async function getConfigsByCategory(category: ConfigCategory): Promise<Record<string, string>> {
  const configs = await prisma.dynamicConfig.findMany({
    where: { category }
  })

  const result: Record<string, string> = {}
  for (const config of configs) {
    result[config.key] = config.value
    // Atualizar cache
    cache.set(config.key, {
      value: config.value,
      expiresAt: Date.now() + CACHE_TTL_MS
    })
  }

  return result
}

/**
 * Deletar configuração
 */
export async function deleteConfig(key: string): Promise<void> {
  await prisma.dynamicConfig.delete({
    where: { key }
  })
  cache.delete(key)
}

/**
 * Mascarar valor sensível
 */
function maskValue(value: string): string {
  if (!value || value.length < 8) return '****'
  return value.slice(0, 4) + '****' + value.slice(-4)
}

/**
 * Migrar configurações do .env para o banco
 * Útil para primeira execução
 */
export async function migrateFromEnv(): Promise<{ migrated: string[]; skipped: string[] }> {
  const migrated: string[] = []
  const skipped: string[] = []

  for (const [key, definition] of Object.entries(CONFIG_DEFINITIONS)) {
    const envValue = process.env[key]

    if (envValue) {
      // Verificar se já existe no banco
      const existing = await prisma.dynamicConfig.findUnique({
        where: { key }
      })

      if (!existing) {
        await prisma.dynamicConfig.create({
          data: {
            key,
            value: envValue,
            category: definition.category,
            isSecret: definition.isSecret,
            description: definition.description
          }
        })
        migrated.push(key)
      } else {
        skipped.push(key)
      }
    }
  }

  return { migrated, skipped }
}

// Exportar como serviço
export const dynamicConfigService = {
  get: getConfig,
  getWithDefault: getConfigWithDefault,
  getMultiple: getConfigs,
  set: setConfig,
  setMultiple: setConfigs,
  getAll: getAllConfigs,
  getByCategory: getConfigsByCategory,
  delete: deleteConfig,
  invalidateCache,
  migrateFromEnv,
  CONFIG_DEFINITIONS
}

export default dynamicConfigService
