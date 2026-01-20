/**
 * WhatsApp Provider Factory
 *
 * Unified interface for sending WhatsApp messages through multiple providers.
 * Automatically selects the best available provider based on:
 * - Destination type (contact vs group)
 * - Provider availability
 * - Provider priority configuration
 */

import {
  WhatsAppProvider,
  SendMessageOptions,
  SendMessageResult,
  ProviderStatus,
  ProviderName,
  ProviderPriority,
  DestinationType,
  DEFAULT_PROVIDER_PRIORITY,
} from './types'
import { twilioProvider } from './providers/twilio.provider'
import { baileysProvider } from './providers/baileys.provider'
import { logger } from '@/lib/observability/log'
import { isGroupJid, isContactJid, formatWhatsAppJid } from '@/lib/utils/phone-formatter'

/**
 * Registry of all available providers
 */
const providers = new Map<ProviderName, WhatsAppProvider>()
providers.set('twilio', twilioProvider)
providers.set('baileys', baileysProvider)
// Add more providers here as needed:
// providers.set('evolution', evolutionProvider)
// providers.set('whatsapp-business', whatsappBusinessProvider)

/**
 * WhatsApp Provider Factory
 */
class WhatsAppFactory {
  private priority: ProviderPriority = DEFAULT_PROVIDER_PRIORITY

  /**
   * Set custom provider priority
   */
  setPriority(priority: Partial<ProviderPriority>): void {
    this.priority = { ...this.priority, ...priority }
  }

  /**
   * Get provider by name
   */
  getProvider(name: ProviderName): WhatsAppProvider | undefined {
    return providers.get(name)
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): WhatsAppProvider[] {
    return Array.from(providers.values())
  }

  /**
   * Get status of all providers
   */
  async getAllStatus(): Promise<ProviderStatus[]> {
    const statuses = await Promise.all(
      this.getAllProviders().map((p) => p.getStatus())
    )
    return statuses
  }

  /**
   * Determine destination type from JID or phone number
   */
  getDestinationType(destination: string): DestinationType {
    if (isGroupJid(destination)) {
      return 'group'
    }
    return 'contact'
  }

  /**
   * Format destination to proper WhatsApp JID
   */
  formatDestination(destination: string): string {
    // If already a JID, return as-is
    if (destination.includes('@')) {
      return destination
    }
    // Otherwise, format as contact JID
    return formatWhatsAppJid(destination)
  }

  /**
   * Select best available provider for the given destination
   */
  async selectProvider(destination: string): Promise<WhatsAppProvider | null> {
    const destType = this.getDestinationType(destination)
    const priorityList = this.priority[destType]

    for (const providerName of priorityList) {
      const provider = providers.get(providerName)

      if (!provider) continue
      if (!provider.isAvailable()) continue
      if (!provider.supportsDestination(destType)) continue

      const connected = await provider.isConnected()
      if (connected) {
        logger.debug('Selected provider', { provider: providerName, destType, destination })
        return provider
      }
    }

    logger.warn('No available provider found', { destType, destination })
    return null
  }

  /**
   * Send a message using the best available provider
   */
  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const formattedTo = this.formatDestination(options.to)
    const enrichedOptions = { ...options, to: formattedTo }

    // Try to select best provider
    const provider = await this.selectProvider(formattedTo)

    if (provider) {
      return provider.sendMessage(enrichedOptions)
    }

    // If no provider available, try all providers in order
    const destType = this.getDestinationType(formattedTo)
    const priorityList = this.priority[destType]

    for (const providerName of priorityList) {
      const fallbackProvider = providers.get(providerName)

      if (!fallbackProvider) continue
      if (!fallbackProvider.isAvailable()) continue
      if (!fallbackProvider.supportsDestination(destType)) continue

      logger.info('Attempting fallback provider', { provider: providerName })
      const result = await fallbackProvider.sendMessage(enrichedOptions)

      if (result.success) {
        return result
      }

      logger.warn('Fallback provider failed', { provider: providerName, error: result.error })
    }

    // All providers failed
    return {
      success: false,
      provider: 'baileys', // Default
      timestamp: new Date(),
      error: 'All providers failed or unavailable',
    }
  }

  /**
   * Send message to multiple destinations
   */
  async sendBulk(
    destinations: string[],
    messageOptions: Omit<SendMessageOptions, 'to'>,
    delayMs = 2000
  ): Promise<{
    sent: SendMessageResult[]
    failed: SendMessageResult[]
    total: number
  }> {
    const sent: SendMessageResult[] = []
    const failed: SendMessageResult[] = []

    for (const destination of destinations) {
      const result = await this.sendMessage({ ...messageOptions, to: destination })

      if (result.success) {
        sent.push(result)
      } else {
        failed.push(result)
      }

      // Delay between messages to avoid rate limiting
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return {
      sent,
      failed,
      total: destinations.length,
    }
  }

  /**
   * Send text message (convenience method)
   */
  async sendText(to: string, text: string): Promise<SendMessageResult> {
    return this.sendMessage({ to, type: 'text', text })
  }

  /**
   * Send image message (convenience method)
   */
  async sendImage(to: string, mediaUrl: string, caption?: string): Promise<SendMessageResult> {
    return this.sendMessage({ to, type: 'image', mediaUrl, caption })
  }

  /**
   * Send video message (convenience method)
   */
  async sendVideo(to: string, mediaUrl: string, caption?: string): Promise<SendMessageResult> {
    return this.sendMessage({ to, type: 'video', mediaUrl, caption })
  }

  /**
   * Send document message (convenience method)
   */
  async sendDocument(to: string, mediaUrl: string, fileName?: string): Promise<SendMessageResult> {
    return this.sendMessage({ to, type: 'document', mediaUrl, fileName })
  }

  /**
   * Send audio message (convenience method)
   */
  async sendAudio(to: string, mediaUrl: string): Promise<SendMessageResult> {
    return this.sendMessage({ to, type: 'audio', mediaUrl })
  }
}

// Export singleton instance
export const whatsapp = new WhatsAppFactory()

// Export types
export * from './types'
