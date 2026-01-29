/**
 * Script para migrar configurações do .env para o banco de dados
 *
 * Uso: npx ts-node scripts/migrate-config-to-db.ts
 * Ou via API: PUT /api/config (quando aplicação estiver rodando)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CONFIG_DEFINITIONS: Record<string, { category: string; isSecret: boolean; description: string }> = {
  // Twilio
  TWILIO_ACCOUNT_SID: { category: 'twilio', isSecret: false, description: 'Account SID do Twilio' },
  TWILIO_AUTH_TOKEN: { category: 'twilio', isSecret: true, description: 'Token de autenticação do Twilio' },
  TWILIO_WHATSAPP_NUMBER: { category: 'twilio', isSecret: false, description: 'Número WhatsApp do Twilio' },

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
}

async function migrate() {
  console.log('🔄 Iniciando migração de configurações para o banco de dados...\n')

  const migrated: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  for (const [key, definition] of Object.entries(CONFIG_DEFINITIONS)) {
    const envValue = process.env[key]

    if (envValue) {
      try {
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
          console.log(`✅ ${key} - migrado`)
        } else {
          skipped.push(key)
          console.log(`⏭️  ${key} - já existe no banco`)
        }
      } catch (error: any) {
        errors.push(`${key}: ${error.message}`)
        console.log(`❌ ${key} - erro: ${error.message}`)
      }
    }
  }

  console.log('\n📊 Resumo:')
  console.log(`   Migrados: ${migrated.length}`)
  console.log(`   Ignorados: ${skipped.length}`)
  console.log(`   Erros: ${errors.length}`)

  if (migrated.length > 0) {
    console.log('\n✨ Configurações migradas com sucesso!')
    console.log('   As alterações agora serão aplicadas em tempo real, sem reiniciar.')
  }

  await prisma.$disconnect()
}

migrate().catch(console.error)
