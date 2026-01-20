/**
 * Twilio Service - Envio de mensagens WhatsApp via API oficial
 *
 * Integrado diretamente no frontend (Next.js)
 * 100% oficial via Twilio - Zero risco de ban
 */

import Twilio from 'twilio'

// Configurações do ambiente
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'

// Rate limits
const RATE_LIMITS = {
  maxPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '30'),
  maxPerHour: parseInt(process.env.MAX_MESSAGES_PER_HOUR || '500'),
  maxPerDay: parseInt(process.env.MAX_MESSAGES_PER_DAY || '2000')
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
 * Verificar se Twilio está configurado
 */
export function isConfigured(): boolean {
  return !!(ACCOUNT_SID && AUTH_TOKEN && ACCOUNT_SID.startsWith('AC'))
}

/**
 * Obter cliente Twilio
 */
function getClient() {
  if (!isConfigured()) {
    throw new Error('Twilio não configurado. Defina TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN')
  }
  return Twilio(ACCOUNT_SID, AUTH_TOKEN)
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
 * Verificar rate limits
 */
export function checkRateLimits(): { allowed: boolean; reason?: string; retryAfter?: string } {
  const now = new Date()

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

  if (stats.sentThisMinute >= RATE_LIMITS.maxPerMinute) {
    return { allowed: false, reason: 'Limite por minuto atingido', retryAfter: '1min' }
  }

  if (stats.sentThisHour >= RATE_LIMITS.maxPerHour) {
    return { allowed: false, reason: 'Limite por hora atingido', retryAfter: '1h' }
  }

  if (stats.sentToday >= RATE_LIMITS.maxPerDay) {
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

  const client = getClient()

  const result = await client.messages.create({
    from: WHATSAPP_NUMBER,
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

  const client = getClient()

  const messageData: any = {
    from: WHATSAPP_NUMBER,
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

  const client = getClient()

  const result = await client.messages.create({
    from: WHATSAPP_NUMBER,
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
  const client = getClient()
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
  return {
    configured: isConfigured(),
    sentToday: stats.sentToday,
    sentThisHour: stats.sentThisHour,
    sentThisMinute: stats.sentThisMinute,
    limits: RATE_LIMITS,
    remaining: {
      thisMinute: RATE_LIMITS.maxPerMinute - stats.sentThisMinute,
      thisHour: RATE_LIMITS.maxPerHour - stats.sentThisHour,
      today: RATE_LIMITS.maxPerDay - stats.sentToday
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
    const client = getClient()
    const balance = await client.api.accounts(ACCOUNT_SID).balance.fetch()

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
