import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { config, maskSensitiveValue } from '@/lib/config'

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

// Função para salvar no .env.local
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
 * Retorna configurações atuais do process.env
 * Nota: Protegido pelo sistema de autenticação da aplicação
 */
export async function GET(request: NextRequest) {
  try {
    // Ler diretamente do process.env (já carregado pelo Next.js)
    const configData = {
      // Twilio
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
      TWILIO_AUTH_TOKEN: maskSensitiveValue(process.env.TWILIO_AUTH_TOKEN),
      TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER || '',

      // WhatsApp Business
      WHATSAPP_BUSINESS_PHONE_ID: process.env.WHATSAPP_BUSINESS_PHONE_ID || '',
      WHATSAPP_BUSINESS_TOKEN: maskSensitiveValue(process.env.WHATSAPP_BUSINESS_TOKEN),

      // WhatsApp Híbrido API
      WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || '',
      WHATSAPP_API_KEY: maskSensitiveValue(process.env.WHATSAPP_API_KEY),

      // Database
      DATABASE_URL: maskSensitiveValue(process.env.DATABASE_URL),

      // Cloudinary
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
      CLOUDINARY_API_SECRET: maskSensitiveValue(process.env.CLOUDINARY_API_SECRET),

      // App
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',

      // Evolution API
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || '',
      EVOLUTION_API_KEY: maskSensitiveValue(process.env.EVOLUTION_API_KEY),
      EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME || '',

      // Admin
      ADMIN_USERNAME: process.env.ADMIN_USERNAME || '',
      ADMIN_PASSWORD: maskSensitiveValue(process.env.ADMIN_PASSWORD),
    }

    return NextResponse.json(configData)
  } catch (error) {
    console.error('Erro ao ler configurações:', error)
    return NextResponse.json(
      { error: 'Erro ao ler configurações' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/config
 * Atualiza configurações no .env.local
 * Nota: Protegido pelo sistema de autenticação da aplicação
 */
export async function POST(request: NextRequest) {
  try {
    const newConfig = await request.json()

    // Filtrar apenas valores não vazios e não mascarados
    const validConfig: Record<string, string> = {}

    Object.entries(newConfig).forEach(([key, value]) => {
      if (typeof value === 'string' && value && !value.includes('****')) {
        validConfig[key] = value
      }
    })

    if (Object.keys(validConfig).length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma configuração válida para salvar' },
        { status: 400 }
      )
    }

    saveEnvFile(validConfig)

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas! Reinicie a aplicação para aplicar as mudanças.',
      saved: Object.keys(validConfig),
    })
  } catch (error) {
    console.error('Erro ao salvar configurações:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    )
  }
}
