/**
 * Phone Formatter Utility
 *
 * Centralized phone number formatting and validation to eliminate duplication
 * across services (contato.service, twilio.service, whatsapp-hibrido-api.service).
 */

export interface PhoneValidationResult {
  valid: boolean
  reason?: string
  formatted?: string
  e164?: string
  whatsappJid?: string
  twilioFormat?: string
}

/**
 * Clean phone number by removing all non-digit characters
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Add Brazil country code if not present
 */
export function addBrazilCountryCode(phone: string): string {
  const clean = cleanPhoneNumber(phone)

  // Already has country code
  if (clean.startsWith('55') && clean.length >= 12) {
    return clean
  }

  // Add Brazil code if number looks like a local number (10-11 digits)
  if (clean.length === 10 || clean.length === 11) {
    return '55' + clean
  }

  return clean
}

/**
 * Validate Brazilian phone number
 * Returns detailed validation result with multiple format options
 */
export function validateBrazilianPhone(phone: string): PhoneValidationResult {
  const clean = cleanPhoneNumber(phone)

  // Remove country code for validation
  const localNum = clean.startsWith('55') ? clean.slice(2) : clean

  // Check length
  if (localNum.length < 10 || localNum.length > 11) {
    return {
      valid: false,
      reason: 'Número deve ter 10 ou 11 dígitos (com DDD)',
    }
  }

  // Validate DDD (area code)
  const ddd = parseInt(localNum.slice(0, 2), 10)
  if (ddd < 11 || ddd > 99) {
    return {
      valid: false,
      reason: 'DDD inválido (deve ser entre 11 e 99)',
    }
  }

  // Mobile numbers with 11 digits must start with 9
  if (localNum.length === 11 && localNum[2] !== '9') {
    return {
      valid: false,
      reason: 'Celular deve começar com 9',
    }
  }

  // Build the full number with country code
  const fullNumber = '55' + localNum

  return {
    valid: true,
    e164: `+${fullNumber}`,
    formatted: formatPhoneDisplay(fullNumber),
    whatsappJid: `${fullNumber}@s.whatsapp.net`,
    twilioFormat: `whatsapp:+${fullNumber}`,
  }
}

/**
 * Format phone for display (human readable)
 * Example: 5511999998888 -> +55 (11) 99999-8888
 */
export function formatPhoneDisplay(phone: string): string {
  const clean = cleanPhoneNumber(phone)

  if (clean.length === 13 && clean.startsWith('55')) {
    // 55 + 11 digits (mobile with 9)
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`
  }

  if (clean.length === 12 && clean.startsWith('55')) {
    // 55 + 10 digits (landline)
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`
  }

  // Fallback: just add + if it looks international
  if (clean.length >= 11) {
    return `+${clean}`
  }

  return clean
}

/**
 * Format phone for WhatsApp JID (WhatsApp internal ID)
 * Example: 11999998888 -> 5511999998888@s.whatsapp.net
 */
export function formatWhatsAppJid(phone: string): string {
  const clean = addBrazilCountryCode(phone)
  return `${clean}@s.whatsapp.net`
}

/**
 * Format phone for WhatsApp Group JID
 * Example: 123456789012345 -> 123456789012345@g.us
 */
export function formatWhatsAppGroupJid(groupId: string): string {
  const clean = cleanPhoneNumber(groupId)
  return `${clean}@g.us`
}

/**
 * Format phone for Twilio (WhatsApp API format)
 * Example: 11999998888 -> whatsapp:+5511999998888
 */
export function formatTwilioWhatsApp(phone: string): string {
  const clean = addBrazilCountryCode(phone)
  return `whatsapp:+${clean}`
}

/**
 * Extract phone number from WhatsApp JID
 * Example: 5511999998888@s.whatsapp.net -> 5511999998888
 */
export function extractFromWhatsAppJid(jid: string): string {
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '')
}

/**
 * Check if a JID is a group
 */
export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us')
}

/**
 * Check if a JID is a contact (not a group)
 */
export function isContactJid(jid: string): boolean {
  return jid.endsWith('@s.whatsapp.net')
}

/**
 * Parse phone from any format and return clean version
 * Handles: +55, whatsapp:, @s.whatsapp.net, etc.
 */
export function parsePhoneFromAnyFormat(input: string): string {
  let phone = input

  // Remove Twilio prefix
  if (phone.startsWith('whatsapp:')) {
    phone = phone.slice(9)
  }

  // Remove WhatsApp JID suffix
  phone = extractFromWhatsAppJid(phone)

  // Remove + prefix
  if (phone.startsWith('+')) {
    phone = phone.slice(1)
  }

  return cleanPhoneNumber(phone)
}

/**
 * Batch format multiple phone numbers
 */
export function formatPhoneNumbers(
  phones: string[],
  format: 'whatsappJid' | 'twilio' | 'e164' | 'display' = 'whatsappJid'
): { valid: string[]; invalid: { phone: string; reason: string }[] } {
  const valid: string[] = []
  const invalid: { phone: string; reason: string }[] = []

  for (const phone of phones) {
    const result = validateBrazilianPhone(phone)

    if (result.valid) {
      switch (format) {
        case 'whatsappJid':
          valid.push(result.whatsappJid!)
          break
        case 'twilio':
          valid.push(result.twilioFormat!)
          break
        case 'e164':
          valid.push(result.e164!)
          break
        case 'display':
          valid.push(result.formatted!)
          break
      }
    } else {
      invalid.push({ phone, reason: result.reason || 'Número inválido' })
    }
  }

  return { valid, invalid }
}
