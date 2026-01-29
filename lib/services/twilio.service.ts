/**
 * Twilio Service - Envio de mensagens WhatsApp via API oficial
 *
 * Integrado diretamente no frontend (Next.js)
 * 100% oficial via Twilio - Zero risco de ban
 *
 * ATUALIZADO: Agora usa configurações dinâmicas do banco de dados
 * Alterações são aplicadas em tempo real sem reiniciar a aplicação
 */

import Twilio from 'twilio'
import { prisma } from '@/lib/prisma'

/**
 * Obter configurações do Twilio diretamente do banco
 */
async function getTwilioConfig() {
  const configs = await prisma.dynamicConfig.findMany({
    where: {
      key: {
        in: [
          'TWILIO_ACCOUNT_SID',
          'TWILIO_AUTH_TOKEN',
          'TWILIO_WHATSAPP_NUMBER',
          'MAX_MESSAGES_PER_MINUTE',
          'MAX_MESSAGES_PER_HOUR',
          'MAX_MESSAGES_PER_DAY'
        ]
      }
    }
  })

  const configMap: Record<string, string> = {}
  configs.forEach(c => { configMap[c.key] = c.value })

  return {
    accountSid: configMap.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || '',
    authToken: configMap.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || '',
    whatsappNumber: configMap.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
    maxPerMinute: parseInt(configMap.MAX_MESSAGES_PER_MINUTE || process.env.MAX_MESSAGES_PER_MINUTE || '30'),
    maxPerHour: parseInt(configMap.MAX_MESSAGES_PER_HOUR || process.env.MAX_MESSAGES_PER_HOUR || '500'),
    maxPerDay: parseInt(configMap.MAX_MESSAGES_PER_DAY || process.env.MAX_MESSAGES_PER_DAY || '2000'),
  }
}

/**
 * Forçar atualização do cache de configuração (não mais necessário, mas mantido para compatibilidade)
 */
export function refreshConfigCache() {
  // Não faz mais nada - configs são lidas diretamente do banco
}

// Rate limits
async function getRateLimitsAsync() {
  const config = await getTwilioConfig()
  return {
    maxPerMinute: config.maxPerMinute,
    maxPerHour: config.maxPerHour,
    maxPerDay: config.maxPerDay
  }
}

function getRateLimits() {
  return {
    maxPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '30'),
    maxPerHour: parseInt(process.env.MAX_MESSAGES_PER_HOUR || '500'),
    maxPerDay: parseInt(process.env.MAX_MESSAGES_PER_DAY || '2000')
  }
}

// Estatísticas em memória
let stats = {
  sentToday: 0,
  sentThisHour: 0,
  sentThisMinute: 0,
  lastMinuteReset: new Date(),
  lastHourReset: new Date(),
  lastDayReset: new Date(),
  history: [] as any[]
}

/**
 * Verificar se Twilio está configurado (versão síncrona - fallback para env)
 */
export function isConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID || ''
  const token = process.env.TWILIO_AUTH_TOKEN || ''
  return !!(sid && token && sid.startsWith('AC'))
}

/**
 * Verificar se Twilio está configurado (versão async - consulta banco)
 */
export async function isConfiguredAsync(): Promise<boolean> {
  const config = await getTwilioConfig()
  return !!(config.accountSid && config.authToken && config.accountSid.startsWith('AC'))
}

/**
 * Obter cliente Twilio (versão async - usa banco de dados)
 */
async function getClientAsync() {
  const config = await getTwilioConfig()
  if (!config.accountSid || !config.authToken || !config.accountSid.startsWith('AC')) {
    throw new Error('Twilio não configurado. Configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN nas configurações.')
  }
  return Twilio(config.accountSid, config.authToken)
}

/**
 * Formatar número para WhatsApp
 */
export function formatWhatsAppNumber(phone: string): string {
  let num = phone.toString().replace(/\D/g, '')

  // Adicionar código do Brasil se não tiver
  if (num.length <= 11) {
    num = '55' + num
  }

  return `whatsapp:+${num}`
}

/**
 * Validar número brasileiro
 */
export function validateBrazilianPhone(phone: string): { valid: boolean; reason?: string; formatted?: string } {
  const num = phone.toString().replace(/\D/g, '')
  const localNum = num.startsWith('55') ? num.slice(2) : num

  if (localNum.length < 10 || localNum.length > 11) {
    return { valid: false, reason: 'Número deve ter 10 ou 11 dígitos (com DDD)' }
  }

  const ddd = parseInt(localNum.slice(0, 2))
  if (ddd < 11 || ddd > 99) {
    return { valid: false, reason: 'DDD inválido' }
  }

  if (localNum.length === 11 && localNum[2] !== '9') {
    return { valid: false, reason: 'Celular deve começar com 9' }
  }

  return { valid: true, formatted: formatWhatsAppNumber(num) }
}

/**
 * Verificar rate limits (usa configurações dinâmicas)
 */
export function checkRateLimits(): { allowed: boolean; reason?: string; retryAfter?: string } {
  const now = new Date()
  const limits = getRateLimits()

  // Reset por minuto
  if (now.getTime() - stats.lastMinuteReset.getTime() > 60000) {
    stats.sentThisMinute = 0
    stats.lastMinuteReset = now
  }

  // Reset por hora
  if (now.getHours() !== stats.lastHourReset.getHours()) {
    stats.sentThisHour = 0
    stats.lastHourReset = now
  }

  // Reset diário
  if (now.getDate() !== stats.lastDayReset.getDate()) {
    stats.sentToday = 0
    stats.lastDayReset = now
  }

  if (stats.sentThisMinute >= limits.maxPerMinute) {
    return { allowed: false, reason: 'Limite por minuto atingido', retryAfter: '1min' }
  }

  if (stats.sentThisHour >= limits.maxPerHour) {
    return { allowed: false, reason: 'Limite por hora atingido', retryAfter: '1h' }
  }

  if (stats.sentToday >= limits.maxPerDay) {
    return { allowed: false, reason: 'Limite diário atingido', retryAfter: 'amanhã' }
  }

  return { allowed: true }
}

/**
 * Registrar envio
 */
function recordSend(data: any) {
  stats.sentToday++
  stats.sentThisHour++
  stats.sentThisMinute++

  stats.history.unshift({
    timestamp: new Date().toISOString(),
    ...data
  })

  if (stats.history.length > 100) {
    stats.history = stats.history.slice(0, 100)
  }
}

/**
 * Enviar mensagem de texto
 */
export async function sendText(to: string, message: string) {
  const validation = validateBrazilianPhone(to)
  if (!validation.valid) {
    throw new Error(`Número inválido: ${validation.reason}`)
  }

  const limits = checkRateLimits()
  if (!limits.allowed) {
    throw new Error(`Rate limit: ${limits.reason}. Tente novamente em ${limits.retryAfter}`)
  }

  if (!message || message.trim().length === 0) {
    throw new Error('Mensagem não pode estar vazia')
  }

  // Usar configurações dinâmicas
  const config = await getTwilioConfig()
  const client = await getClientAsync()

  const result = await client.messages.create({
    from: config.whatsappNumber,
    to: validation.formatted!,
    body: message
  })

  recordSend({
    type: 'text',
    to,
    sid: result.sid,
    status: result.status
  })

  return {
    success: true,
    sid: result.sid,
    status: result.status,
    to,
    dateSent: result.dateCreated
  }
}

/**
 * Enviar mídia
 */
export async function sendMedia(to: string, mediaUrl: string, caption?: string) {
  const validation = validateBrazilianPhone(to)
  if (!validation.valid) {
    throw new Error(`Número inválido: ${validation.reason}`)
  }

  const limits = checkRateLimits()
  if (!limits.allowed) {
    throw new Error(`Rate limit: ${limits.reason}. Tente novamente em ${limits.retryAfter}`)
  }

  if (!mediaUrl || !mediaUrl.startsWith('http')) {
    throw new Error('URL de mídia inválida')
  }

  // Usar configurações dinâmicas
  const config = await getTwilioConfig()
  const client = await getClientAsync()

  const messageData: any = {
    from: config.whatsappNumber,
    to: validation.formatted!,
    mediaUrl: [mediaUrl]
  }

  if (caption) {
    messageData.body = caption
  }

  const result = await client.messages.create(messageData)

  recordSend({
    type: 'media',
    to,
    mediaUrl,
    sid: result.sid,
    status: result.status
  })

  return {
    success: true,
    sid: result.sid,
    status: result.status,
    to,
    dateSent: result.dateCreated
  }
}

/**
 * Enviar template
 */
export async function sendTemplate(to: string, contentSid: string, variables: Record<string, string> = {}) {
  const validation = validateBrazilianPhone(to)
  if (!validation.valid) {
    throw new Error(`Número inválido: ${validation.reason}`)
  }

  const limits = checkRateLimits()
  if (!limits.allowed) {
    throw new Error(`Rate limit: ${limits.reason}`)
  }

  // Usar configurações dinâmicas
  const config = await getTwilioConfig()
  const client = await getClientAsync()

  const result = await client.messages.create({
    from: config.whatsappNumber,
    to: validation.formatted!,
    contentSid,
    contentVariables: JSON.stringify(variables)
  })

  recordSend({
    type: 'template',
    to,
    contentSid,
    sid: result.sid,
    status: result.status
  })

  return {
    success: true,
    sid: result.sid,
    status: result.status,
    to
  }
}

/**
 * Obter status de mensagem
 */
export async function getMessageStatus(sid: string) {
  const client = await getClientAsync()
  const message = await client.messages(sid).fetch()

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
    from: message.from,
    dateSent: message.dateSent,
    dateUpdated: message.dateUpdated,
    errorCode: message.errorCode,
    errorMessage: message.errorMessage
  }
}

/**
 * Obter estatísticas
 */
export function getStats() {
  const limits = getRateLimits()
  return {
    configured: isConfigured(),
    sentToday: stats.sentToday,
    sentThisHour: stats.sentThisHour,
    sentThisMinute: stats.sentThisMinute,
    limits,
    remaining: {
      thisMinute: limits.maxPerMinute - stats.sentThisMinute,
      thisHour: limits.maxPerHour - stats.sentThisHour,
      today: limits.maxPerDay - stats.sentToday
    }
  }
}

/**
 * Obter histórico local
 */
export function getHistory(limit = 50) {
  return stats.history.slice(0, limit)
}

/**
 * Obter saldo da conta
 */
export async function getBalance() {
  try {
    const config = await getTwilioConfig()
    const client = await getClientAsync()
    const balance = await client.api.accounts(config.accountSid).balance.fetch()

    return {
      currency: balance.currency,
      balance: balance.balance,
      accountSid: balance.accountSid
    }
  } catch (error) {
    return {
      available: false,
      message: 'Informação de saldo não disponível'
    }
  }
}

/**
 * Listar templates de conteúdo do Twilio
 */
export async function listTemplates() {
  try {
    const client = await getClientAsync()
    const contents = await client.content.v1.contents.list({ limit: 100 })

    return contents.map(content => ({
      sid: content.sid,
      name: content.friendlyName,
      language: content.language,
      types: content.types,
      variables: content.variables,
      dateCreated: content.dateCreated,
      dateUpdated: content.dateUpdated,
      // Status de aprovação vem do approvalRequests
      approvalStatus: null as string | null
    }))
  } catch (error: any) {
    console.error('[Twilio] Erro ao listar templates:', error.message)
    throw new Error(`Erro ao listar templates: ${error.message}`)
  }
}

/**
 * Obter detalhes de um template específico
 */
export async function getTemplateDetails(contentSid: string) {
  try {
    const client = await getClientAsync()
    const content = await client.content.v1.contents(contentSid).fetch()

    // Buscar status de aprovação via API REST
    let approvalStatus = null
    try {
      const config = await getTwilioConfig()
      const authHeader = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')
      const response = await fetch(
        `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`,
        {
          headers: {
            'Authorization': `Basic ${authHeader}`
          }
        }
      )
      if (response.ok) {
        const data = await response.json()
        if (data.whatsapp) {
          approvalStatus = data.whatsapp.status
        }
      }
    } catch {
      // Pode não ter approval request ainda
    }

    return {
      sid: content.sid,
      name: content.friendlyName,
      language: content.language,
      types: content.types,
      variables: content.variables,
      dateCreated: content.dateCreated,
      dateUpdated: content.dateUpdated,
      approvalStatus
    }
  } catch (error: any) {
    console.error('[Twilio] Erro ao buscar template:', error.message)
    throw new Error(`Erro ao buscar template: ${error.message}`)
  }
}

/**
 * Listar templates com status de aprovação para WhatsApp
 */
export async function listWhatsAppTemplates() {
  try {
    const client = await getClientAsync()
    const config = await getTwilioConfig()
    const contents = await client.content.v1.contents.list({ limit: 100 })
    const authHeader = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')

    const templatesWithStatus = await Promise.all(
      contents.map(async (content) => {
        let approvalStatus = 'unknown'
        let whatsappStatus = null

        try {
          // Buscar status de aprovação do WhatsApp via API REST
          const response = await fetch(
            `https://content.twilio.com/v1/Content/${content.sid}/ApprovalRequests`,
            {
              headers: {
                'Authorization': `Basic ${authHeader}`
              }
            }
          )
          if (response.ok) {
            const data = await response.json()
            if (data.whatsapp) {
              approvalStatus = data.whatsapp.status || 'pending'
              whatsappStatus = data.whatsapp
            }
          }
        } catch {
          // Template pode não ter sido submetido para aprovação ainda
          approvalStatus = 'not_submitted'
        }

        // Extrair tipo do template (text, media, etc)
        const templateTypes = Object.keys(content.types || {})

        // Extrair eligibility do whatsappStatus
        const eligibility: string[] = []
        if (approvalStatus === 'approved') {
          eligibility.push('business_initiated', 'user_initiated')
        } else if (whatsappStatus?.category) {
          eligibility.push('business_initiated')
        }

        return {
          sid: content.sid,
          name: content.friendlyName,
          language: content.language,
          types: templateTypes,
          body: extractTemplateBody(content.types),
          variables: content.variables,
          dateCreated: content.dateCreated,
          dateUpdated: content.dateUpdated,
          approvalStatus,
          whatsappStatus,
          eligibility,
          canUse: approvalStatus === 'approved'
        }
      })
    )

    return templatesWithStatus
  } catch (error: any) {
    console.error('[Twilio] Erro ao listar templates WhatsApp:', error.message)
    throw new Error(`Erro ao listar templates: ${error.message}`)
  }
}

/**
 * Listar numeros WhatsApp Senders disponiveis
 */
export async function listWhatsAppSenders() {
  try {
    const config = await getTwilioConfig()
    const authHeader = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')

    // Buscar WhatsApp Senders via API
    const response = await fetch(
      `https://messaging.twilio.com/v1/Services?PageSize=50`,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      }
    )

    // Buscar numeros de telefone com capacidade WhatsApp
    const phonesResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/IncomingPhoneNumbers.json?PageSize=50`,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      }
    )

    const phonesData = await phonesResponse.json()
    const phoneNumbers = phonesData.incoming_phone_numbers || []

    // Buscar WhatsApp Senders especificamente
    const whatsappResponse = await fetch(
      `https://messaging.twilio.com/v1/Senders?PageSize=50`,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      }
    )

    let whatsappSenders: any[] = []
    if (whatsappResponse.ok) {
      const whatsappData = await whatsappResponse.json()
      whatsappSenders = whatsappData.senders || []
    }

    // Combinar informacoes
    const senders = whatsappSenders.map((sender: any) => ({
      sid: sender.sid,
      phoneNumber: sender.phone_number,
      displayName: sender.display_name || sender.phone_number,
      status: sender.status,
      capabilities: sender.capabilities,
      country: sender.country,
      dateCreated: sender.date_created,
      dateUpdated: sender.date_updated
    }))

    // Se nao encontrou senders especificos, tentar via API de numeros
    if (senders.length === 0) {
      // Buscar numeros que tem WhatsApp habilitado
      const numbersWithWhatsApp = phoneNumbers.filter((p: any) =>
        p.capabilities?.mms || p.capabilities?.sms
      ).map((p: any) => ({
        sid: p.sid,
        phoneNumber: p.phone_number,
        friendlyName: p.friendly_name,
        displayName: p.friendly_name || p.phone_number,
        status: p.status,
        capabilities: p.capabilities,
        dateCreated: p.date_created
      }))

      return {
        senders: numbersWithWhatsApp,
        currentNumber: config.whatsappNumber,
        source: 'phone_numbers'
      }
    }

    return {
      senders,
      currentNumber: config.whatsappNumber,
      source: 'whatsapp_senders'
    }
  } catch (error: any) {
    console.error('[Twilio] Erro ao listar senders:', error.message)
    throw new Error(`Erro ao listar WhatsApp Senders: ${error.message}`)
  }
}

/**
 * Extrair corpo do template dos tipos
 */
function extractTemplateBody(types: any): string | null {
  if (!types) return null

  // Tentar extrair de diferentes formatos
  if (types.twilio_text?.body) return types.twilio_text.body
  if (types['twilio/text']?.body) return types['twilio/text'].body
  if (types.twilio_media?.body) return types.twilio_media.body
  if (types['twilio/media']?.body) return types['twilio/media'].body
  if (types.twilio_card?.body) return types.twilio_card.body
  if (types['twilio/card']?.body) return types['twilio/card'].body
  if (types.whatsapp_card?.body) return types.whatsapp_card.body
  if (types['whatsapp/card']?.body) return types['whatsapp/card'].body

  return null
}
