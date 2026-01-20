/**
 * Baileys WhatsApp Provider
 *
 * Direct WhatsApp connection via Baileys library.
 * Best for: Group messages and when official API is not available
 */

import {
  WhatsAppProvider,
  SendMessageOptions,
  SendMessageResult,
  ProviderStatus,
  DestinationType,
} from '../types'
import { baileysDirectService } from '@/lib/services/baileys-direct.service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability/log'

export class BaileysProvider implements WhatsAppProvider {
  readonly name = 'baileys' as const

  isAvailable(): boolean {
    // Baileys is always "available" as it doesn't require external configuration
    return true
  }

  async isConnected(): Promise<boolean> {
    try {
      // Check if any instance is connected
      const connectedInstance = await prisma.instance.findFirst({
        where: { status: 'connected' },
      })
      return !!connectedInstance
    } catch {
      return false
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    const connected = await this.isConnected()

    return {
      provider: this.name,
      available: true,
      connected,
      message: connected ? 'Connected' : 'No connected instances',
      lastCheck: new Date(),
    }
  }

  supportsDestination(destinationType: DestinationType): boolean {
    // Baileys supports both contacts and groups
    return true
  }

  private async getConnectedInstance(): Promise<string | null> {
    const instance = await prisma.instance.findFirst({
      where: { status: 'connected' },
      orderBy: { atualizadoEm: 'desc' },
    })
    return instance?.instanceName || null
  }

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const logContext = { provider: this.name, to: options.to, type: options.type }

    try {
      const instanceName = await this.getConnectedInstance()

      if (!instanceName) {
        throw new Error('No connected Baileys instance available')
      }

      let messageId: string | undefined

      switch (options.type) {
        case 'text':
          if (!options.text) {
            throw new Error('Text content is required for text messages')
          }
          const textResult = await baileysDirectService.sendTextMessage(
            instanceName,
            options.to,
            options.text
          )
          messageId = textResult?.key?.id
          break

        case 'image':
        case 'video':
        case 'document':
        case 'audio':
          const mediaResult = await baileysDirectService.sendMediaMessage(
            instanceName,
            options.to,
            {
              media: {
                type: options.type === 'image' ? 'image' :
                      options.type === 'video' ? 'video' :
                      options.type === 'document' ? 'document' : 'audio',
                url: options.mediaUrl,
                buffer: options.mediaBuffer,
                caption: options.caption,
                fileName: options.fileName,
              },
            }
          )
          messageId = mediaResult?.key?.id
          break

        default:
          throw new Error(`Unsupported message type: ${options.type}`)
      }

      logger.info('Message sent via Baileys', { ...logContext, messageId, instanceName })

      return {
        success: true,
        messageId,
        provider: this.name,
        timestamp: new Date(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to send message via Baileys', error, logContext)

      return {
        success: false,
        provider: this.name,
        timestamp: new Date(),
        error: errorMessage,
      }
    }
  }
}

export const baileysProvider = new BaileysProvider()
