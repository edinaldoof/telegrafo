/**
 * WhatsApp Services
 *
 * Unified WhatsApp messaging abstraction layer.
 *
 * Usage:
 * ```typescript
 * import { whatsapp } from '@/lib/services/whatsapp'
 *
 * // Send text message (auto-selects best provider)
 * await whatsapp.sendText('5511999998888', 'Hello!')
 *
 * // Send to group (uses Baileys)
 * await whatsapp.sendText('123456789@g.us', 'Group message')
 *
 * // Send image
 * await whatsapp.sendImage('5511999998888', 'https://example.com/image.jpg', 'Caption')
 *
 * // Bulk send
 * await whatsapp.sendBulk(['5511111111111', '5522222222222'], {
 *   type: 'text',
 *   text: 'Hello everyone!'
 * })
 *
 * // Get all provider statuses
 * const statuses = await whatsapp.getAllStatus()
 * ```
 */

export { whatsapp } from './factory'
export * from './types'

// Individual providers (for advanced usage)
export { twilioProvider } from './providers/twilio.provider'
export { baileysProvider } from './providers/baileys.provider'
