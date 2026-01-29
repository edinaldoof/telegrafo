import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { config, maskSensitiveValue } from '@/lib/config'
import { dynamicConfigService, CONFIG_DEFINITIONS } from '@/lib/services/dynamic-config.service'
import { refreshConfigCache } from '@/lib/services/twilio.service'

// Get password from environment variable - no more hardcoded values
function getConfigPassword(): string {
  const password = config.security.configPassword
  if (!password) {
    // In development, warn but allow a temporary password
    if (config.isDevelopment) {
      console.warn('⚠️ CONFIG_PASSWORD not set. Using temporary password. Set CONFIG_PASSWORD in .env.local')
      return 'dev-temp-password-change-me'
    }
    // In production, require the password to be set
    throw new Error('CONFIG_PASSWORD must be set in production')
  }
  return password
}

// Função para salvar no .env.local (mantida para backup/compatibilidade)
function saveEnvFile(envVars: Record<string, string>): void {
  const envLocalPath = join(process.cwd(), '.env.local')

  // Ler arquivo existente para preservar outras variáveis
  let existingVars: Record<string, string> = {}
  if (existsSync(envLocalPath)) {
    const content = readFileSync(envLocalPath, 'utf-8')
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key) {
          let value = valueParts.join('=')
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          existingVars[key.trim()] = value
        }
      }
    })
  }

  // Mesclar com as novas variáveis
  const merged = { ...existingVars, ...envVars }

  // Gerar conteúdo
  const content = Object.entries(merged)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n')

  writeFileSync(envLocalPath, content + '\n', 'utf-8')
}

/**
 * GET /api/config
 * Retorna configurações atuais (prioridade: banco > process.env)
 * Nota: Protegido pelo sistema de autenticação da aplicação
 */
export async function GET(request: NextRequest) {
  try {
    // Buscar todas as chaves conhecidas
    const keys = Object.keys(CONFIG_DEFINITIONS)
    const dbConfigs = await dynamicConfigService.getMultiple(keys)

    // Montar resposta com valores do banco ou fallback para env
    const configData: Record<string, string> = {}

    for (const key of keys) {
      const definition = CONFIG_DEFINITIONS[key]
      const value = dbConfigs[key] || process.env[key] || ''

      // Mascarar valores sensíveis
      if (definition?.isSecret && value) {
        configData[key] = maskSensitiveValue(value)
      } else {
        configData[key] = value
      }
    }

    // Adicionar DATABASE_URL (apenas do env, não editável dinamicamente)
    configData.DATABASE_URL = maskSensitiveValue(process.env.DATABASE_URL)

    // Adicionar flag indicando fonte dos dados
    return NextResponse.json({
      ...configData,
      _meta: {
        source: 'database',
        dynamicReload: true,
        message: 'Configurações carregadas do banco de dados. Alterações são aplicadas em tempo real.'
      }
    })
  } catch (error) {
    console.error('Erro ao ler configurações:', error)

    // Fallback para env em caso de erro no banco
    const configData = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
      TWILIO_AUTH_TOKEN: maskSensitiveValue(process.env.TWILIO_AUTH_TOKEN),
      TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER || '',
      WHATSAPP_BUSINESS_PHONE_ID: process.env.WHATSAPP_BUSINESS_PHONE_ID || '',
      WHATSAPP_BUSINESS_TOKEN: maskSensitiveValue(process.env.WHATSAPP_BUSINESS_TOKEN),
      WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || '',
      WHATSAPP_API_KEY: maskSensitiveValue(process.env.WHATSAPP_API_KEY),
      DATABASE_URL: maskSensitiveValue(process.env.DATABASE_URL),
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
      CLOUDINARY_API_SECRET: maskSensitiveValue(process.env.CLOUDINARY_API_SECRET),
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || '',
      EVOLUTION_API_KEY: maskSensitiveValue(process.env.EVOLUTION_API_KEY),
      EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME || '',
      ADMIN_USERNAME: process.env.ADMIN_USERNAME || '',
      ADMIN_PASSWORD: maskSensitiveValue(process.env.ADMIN_PASSWORD),
      _meta: {
        source: 'environment',
        dynamicReload: false,
        message: 'Erro ao acessar banco. Usando configurações do ambiente.'
      }
    }

    return NextResponse.json(configData)
  }
}

/**
 * POST /api/config
 * Atualiza configurações no banco de dados (tempo real) e .env.local (backup)
 * Nota: Protegido pelo sistema de autenticação da aplicação
 */
export async function POST(request: NextRequest) {
  try {
    const newConfig = await request.json()

    // Filtrar apenas valores não vazios e não mascarados
    const validConfig: Record<string, string> = {}

    Object.entries(newConfig).forEach(([key, value]) => {
      if (typeof value === 'string' && value && !value.includes('****')) {
        // Ignorar _meta e DATABASE_URL
        if (key !== '_meta' && key !== 'DATABASE_URL') {
          validConfig[key] = value
        }
      }
    })

    if (Object.keys(validConfig).length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma configuração válida para salvar' },
        { status: 400 }
      )
    }

    // 1. Salvar no banco de dados (aplicação imediata)
    await dynamicConfigService.setMultiple(validConfig)

    // 2. Invalidar caches dos serviços
    dynamicConfigService.invalidateCache()
    refreshConfigCache()

    // 3. Salvar também no .env.local como backup
    try {
      saveEnvFile(validConfig)
    } catch (envError) {
      console.warn('Não foi possível salvar no .env.local (backup):', envError)
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas e aplicadas em tempo real!',
      saved: Object.keys(validConfig),
      requiresRestart: false, // Não precisa mais reiniciar!
      appliedImmediately: true
    })
  } catch (error) {
    console.error('Erro ao salvar configurações:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/config/migrate
 * Migra configurações do .env para o banco de dados
 */
export async function PUT(request: NextRequest) {
  try {
    const result = await dynamicConfigService.migrateFromEnv()

    return NextResponse.json({
      success: true,
      message: 'Migração concluída',
      migrated: result.migrated,
      skipped: result.skipped
    })
  } catch (error) {
    console.error('Erro na migração:', error)
    return NextResponse.json(
      { error: 'Erro na migração de configurações' },
      { status: 500 }
    )
  }
}
