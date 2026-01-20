import { describe, it, expect } from 'vitest'
import {
  cleanPhoneNumber,
  addBrazilCountryCode,
  validateBrazilianPhone,
  formatPhoneDisplay,
  formatWhatsAppJid,
  formatTwilioWhatsApp,
  extractFromWhatsAppJid,
  isGroupJid,
  isContactJid,
  parsePhoneFromAnyFormat,
} from '@/lib/utils/phone-formatter'

describe('phone-formatter', () => {
  describe('cleanPhoneNumber', () => {
    it('should remove all non-digit characters', () => {
      expect(cleanPhoneNumber('+55 (11) 99999-8888')).toBe('5511999998888')
      expect(cleanPhoneNumber('55.11.99999.8888')).toBe('5511999998888')
      expect(cleanPhoneNumber('whatsapp:+5511999998888')).toBe('5511999998888')
    })

    it('should handle already clean numbers', () => {
      expect(cleanPhoneNumber('5511999998888')).toBe('5511999998888')
    })
  })

  describe('addBrazilCountryCode', () => {
    it('should add 55 to 11-digit numbers', () => {
      expect(addBrazilCountryCode('11999998888')).toBe('5511999998888')
    })

    it('should add 55 to 10-digit numbers', () => {
      expect(addBrazilCountryCode('1133334444')).toBe('551133334444')
    })

    it('should not modify numbers already with 55', () => {
      expect(addBrazilCountryCode('5511999998888')).toBe('5511999998888')
    })

    it('should handle numbers with formatting', () => {
      expect(addBrazilCountryCode('(11) 99999-8888')).toBe('5511999998888')
    })
  })

  describe('validateBrazilianPhone', () => {
    it('should validate correct mobile numbers', () => {
      const result = validateBrazilianPhone('11999998888')
      expect(result.valid).toBe(true)
      expect(result.e164).toBe('+5511999998888')
      expect(result.whatsappJid).toBe('5511999998888@s.whatsapp.net')
      expect(result.twilioFormat).toBe('whatsapp:+5511999998888')
    })

    it('should validate correct landline numbers', () => {
      const result = validateBrazilianPhone('1133334444')
      expect(result.valid).toBe(true)
    })

    it('should validate numbers with country code', () => {
      const result = validateBrazilianPhone('5511999998888')
      expect(result.valid).toBe(true)
    })

    it('should reject numbers with invalid length', () => {
      const result = validateBrazilianPhone('11999')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('10 ou 11 dígitos')
    })

    it('should reject invalid DDD', () => {
      const result = validateBrazilianPhone('00999998888')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('DDD')
    })

    it('should reject 11-digit numbers not starting with 9', () => {
      const result = validateBrazilianPhone('11899998888')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('começar com 9')
    })
  })

  describe('formatPhoneDisplay', () => {
    it('should format 13-digit numbers correctly', () => {
      expect(formatPhoneDisplay('5511999998888')).toBe('+55 (11) 99999-8888')
    })

    it('should format 12-digit numbers correctly', () => {
      expect(formatPhoneDisplay('551133334444')).toBe('+55 (11) 3333-4444')
    })
  })

  describe('formatWhatsAppJid', () => {
    it('should format phone to WhatsApp JID', () => {
      expect(formatWhatsAppJid('11999998888')).toBe('5511999998888@s.whatsapp.net')
      expect(formatWhatsAppJid('5511999998888')).toBe('5511999998888@s.whatsapp.net')
    })
  })

  describe('formatTwilioWhatsApp', () => {
    it('should format phone to Twilio format', () => {
      expect(formatTwilioWhatsApp('11999998888')).toBe('whatsapp:+5511999998888')
    })
  })

  describe('extractFromWhatsAppJid', () => {
    it('should extract phone from contact JID', () => {
      expect(extractFromWhatsAppJid('5511999998888@s.whatsapp.net')).toBe('5511999998888')
    })

    it('should extract ID from group JID', () => {
      expect(extractFromWhatsAppJid('123456789@g.us')).toBe('123456789')
    })
  })

  describe('isGroupJid / isContactJid', () => {
    it('should identify group JIDs', () => {
      expect(isGroupJid('123456789@g.us')).toBe(true)
      expect(isGroupJid('5511999998888@s.whatsapp.net')).toBe(false)
    })

    it('should identify contact JIDs', () => {
      expect(isContactJid('5511999998888@s.whatsapp.net')).toBe(true)
      expect(isContactJid('123456789@g.us')).toBe(false)
    })
  })

  describe('parsePhoneFromAnyFormat', () => {
    it('should parse various formats', () => {
      expect(parsePhoneFromAnyFormat('whatsapp:+5511999998888')).toBe('5511999998888')
      expect(parsePhoneFromAnyFormat('5511999998888@s.whatsapp.net')).toBe('5511999998888')
      expect(parsePhoneFromAnyFormat('+55 11 99999-8888')).toBe('5511999998888')
    })
  })
})
