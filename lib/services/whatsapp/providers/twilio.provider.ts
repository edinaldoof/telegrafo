/**
 * Twilio WhatsApp Provider
 *
 * Official WhatsApp Business API via Twilio.
 * Best for: Individual contact messages (not groups)
 */

import {
  WhatsAppProvider,
  SendMessageOptions,
  SendMessageResult,
  ProviderStatus,
  DestinationType,
} from '../types'
import { config } from '@/lib/config'
import * as twilioService from '@/lib/services/twilio.service'
import { logger } from '@/lib/observability/log'

export class TwilioProvider implements WhatsAppProvider {
  readonly name = 'twilio' as const

  isAvailable(): boolean {
    return twilioService.isConfigured()
  }

  async isConnected(): Promise<boolean> {
    if (!this.isAvailable()) return false

    try {
      // Try to get balance as a connection check
      const balance = await twilioService.getBalance()
      return balance && !('available' in balance && balance.available === false)
    } catch {
      return false
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const available = this.isAvailable()
    let connected = false
    let message = 'Not configured'

    if (available) {
      connected = await this.isConnected()
      message = connected ? 'Connected' : 'Configured but connection check failed'
    }

    return {
      provider: this.name,
      available,
      connected,
      message,
      lastCheck: new Date(),
    }
  }

  supportsDestination(destinationType: DestinationType): boolean {
    // Twilio only supports individual contacts, not groups
    return destinationType === 'contact'
  }

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const logContext = { provider: this.name, to: options.to, type: options.type }

    try {
      if (!this.isAvailable()) {
        throw new Error('Twilio not configured')
      }

      let result: { sid: string; status: string }

      switch (options.type) {
        case 'text':
          if (!options.text) {
            throw new Error('Text content is required for text messages')
          }
          result = await twilioService.sendText(options.to, options.text)
          break

        case 'image':
        case 'video':
          if (!options.mediaUrl) {
            throw new Error('Media URL is required for media messages')
          }
          result = await twilioService.sendMedia(options.to, options.mediaUrl, options.caption)
          break

        case 'document':
        case 'audio':
          // Twilio doesn't support direct document/audio sending as easily
          // Fall back to media if URL provided
          if (options.mediaUrl) {
            result = await twilioService.sendMedia(options.to, options.mediaUrl, options.caption)
          } else {
            throw new Error(`${options.type} messages require a media URL for Twilio`)
          }
          break

        default:
          throw new Error(`Unsupported message type: ${options.type}`)
      }

      logger.info('Message sent via Twilio', { ...logContext, messageId: result.sid })

      return {
        success: true,
        messageId: result.sid,
        provider: this.name,
        timestamp: new Date(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to send message via Twilio', error, logContext)

      return {
        success: false,
        provider: this.name,
        timestamp: new Date(),
        error: errorMessage,
      }
    }
  }
}

export const twilioProvider = new TwilioProvider()
