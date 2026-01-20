/**
 * WhatsApp Provider Types
 *
 * Common types and interfaces for all WhatsApp providers.
 */

/**
 * Message types supported by all providers
 */
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document'

/**
 * Destination types
 */
export type DestinationType = 'contact' | 'group'

/**
 * Provider names
 */
export type ProviderName = 'baileys' | 'twilio' | 'evolution' | 'whatsapp-business'

/**
 * Send message options
 */
export interface SendMessageOptions {
  /** Destination phone number or group JID */
  to: string
  /** Message type */
  type: MessageType
  /** Text content for text messages */
  text?: string
  /** Media URL for media messages */
  mediaUrl?: string
  /** Media buffer for media messages */
  mediaBuffer?: Buffer
  /** Caption for media messages */
  caption?: string
  /** File name for document messages */
  fileName?: string
  /** MIME type for media */
  mimeType?: string
}

/**
 * Send message result
 */
export interface SendMessageResult {
  success: boolean
  messageId?: string
  provider: ProviderName
  timestamp: Date
  error?: string
}

/**
 * Provider status
 */
export interface ProviderStatus {
  provider: ProviderName
  available: boolean
  connected: boolean
  message?: string
  lastCheck: Date
}

/**
 * WhatsApp Provider Interface
 *
 * All WhatsApp providers must implement this interface.
 */
export interface WhatsAppProvider {
  /** Provider name */
  readonly name: ProviderName

  /**
   * Check if provider is available and configured
   */
  isAvailable(): boolean

  /**
   * Check if provider is connected
   */
  isConnected(): Promise<boolean>

  /**
   * Get provider status
   */
  getStatus(): Promise<ProviderStatus>

  /**
   * Send a message
   */
  sendMessage(options: SendMessageOptions): Promise<SendMessageResult>

  /**
   * Check if this provider supports the given destination type
   */
  supportsDestination(destinationType: DestinationType): boolean
}

/**
 * Provider priority configuration
 */
export interface ProviderPriority {
  /** Provider for contact messages (individual chats) */
  contact: ProviderName[]
  /** Provider for group messages */
  group: ProviderName[]
}

/**
 * Default provider priorities
 * - Contacts: Prefer Twilio (official) > WhatsApp Business > Evolution
 * - Groups: Prefer Baileys (local) > Evolution (groups not supported by Twilio)
 */
export const DEFAULT_PROVIDER_PRIORITY: ProviderPriority = {
  contact: ['twilio', 'whatsapp-business', 'evolution', 'baileys'],
  group: ['baileys', 'evolution'],
}
