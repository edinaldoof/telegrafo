import axios, { AxiosInstance } from 'axios'

/**
 * WhatsApp Business Cloud API Service
 * Integração oficial com Meta WhatsApp Business API
 */

export interface WhatsAppBusinessConfig {
  phoneNumberId: string
  accessToken: string
  apiVersion?: string
}

export interface SendTextMessageParams {
  to: string
  message: string
  previewUrl?: boolean
}

export interface SendTemplateMessageParams {
  to: string
  template: {
    name: string
    language: {
      code: string
    }
    components?: Array<{
      type: 'header' | 'body' | 'button'
      parameters: Array<{
        type: 'text' | 'image' | 'video' | 'document'
        text?: string
        image?: { link: string }
        video?: { link: string }
        document?: { link: string; filename?: string }
      }>
    }>
  }
}

export interface SendMediaMessageParams {
  to: string
  type: 'image' | 'video' | 'document' | 'audio'
  media: {
    link?: string
    id?: string
    caption?: string
    filename?: string
  }
}

export interface Template {
  id: string
  name: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  components: any[]
}

export interface MessageStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: any[]
}

export class WhatsAppBusinessService {
  private client: AxiosInstance
  private phoneNumberId: string
  private apiVersion: string

  constructor(config: WhatsAppBusinessConfig) {
    this.phoneNumberId = config.phoneNumberId
    this.apiVersion = config.apiVersion || 'v18.0'

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Envia mensagem de texto simples
   */
  async sendTextMessage(params: SendTextMessageParams) {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'text',
        text: {
          preview_url: params.previewUrl || false,
          body: params.message,
        },
      })

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Envia mensagem usando template aprovado
   */
  async sendTemplateMessage(params: SendTemplateMessageParams) {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'template',
        template: params.template,
      })

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Envia mensagem com mídia (imagem, vídeo, documento, áudio)
   */
  async sendMediaMessage(params: SendMediaMessageParams) {
    try {
      const mediaObject: any = {}

      if (params.media.link) {
        mediaObject.link = params.media.link
      } else if (params.media.id) {
        mediaObject.id = params.media.id
      }

      if (params.media.caption) {
        mediaObject.caption = params.media.caption
      }

      if (params.media.filename && params.type === 'document') {
        mediaObject.filename = params.media.filename
      }

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: params.type,
        [params.type]: mediaObject,
      })

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Marca mensagem como lida
   */
  async markMessageAsRead(messageId: string) {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      })

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Obtém templates disponíveis
   */
  async getTemplates(businessAccountId: string): Promise<Template[]> {
    try {
      const response = await this.client.get(
        `/${businessAccountId}/message_templates`,
        {
          params: {
            limit: 100,
          },
        }
      )

      return response.data.data || []
    } catch (error: any) {
      console.error('Erro ao obter templates:', error)
      return []
    }
  }

  /**
   * Cria novo template de mensagem
   */
  async createTemplate(
    businessAccountId: string,
    template: {
      name: string
      language: string
      category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
      components: any[]
    }
  ) {
    try {
      const response = await this.client.post(
        `/${businessAccountId}/message_templates`,
        template
      )

      return {
        success: true,
        templateId: response.data.id,
        status: response.data.status,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Exclui template
   */
  async deleteTemplate(businessAccountId: string, templateName: string) {
    try {
      const response = await this.client.delete(
        `/${businessAccountId}/message_templates`,
        {
          params: {
            name: templateName,
          },
        }
      )

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Faz upload de mídia
   */
  async uploadMedia(file: Buffer, mimeType: string) {
    try {
      const formData = new FormData()
      formData.append('messaging_product', 'whatsapp')
      const uint8Array = new Uint8Array(file)
      formData.append('file', new Blob([uint8Array], { type: mimeType }))

      const response = await this.client.post(`/${this.phoneNumberId}/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return {
        success: true,
        mediaId: response.data.id,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Obtém informações sobre mídia
   */
  async getMediaInfo(mediaId: string) {
    try {
      const response = await this.client.get(`/${mediaId}`)

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Baixa mídia
   */
  async downloadMedia(mediaUrl: string) {
    try {
      const response = await this.client.get(mediaUrl, {
        responseType: 'arraybuffer',
      })

      return {
        success: true,
        data: response.data,
        mimeType: response.headers['content-type'],
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Verifica assinatura do webhook
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    appSecret: string
  ): boolean {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex')

    return `sha256=${expectedSignature}` === signature
  }

  /**
   * Processa evento de webhook
   */
  static parseWebhookEvent(body: any) {
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value) return null

    // Mensagem recebida
    if (value.messages) {
      const message = value.messages[0]
      return {
        type: 'message',
        messageId: message.id,
        from: message.from,
        timestamp: message.timestamp,
        messageType: message.type,
        text: message.text?.body,
        image: message.image,
        video: message.video,
        document: message.document,
        audio: message.audio,
        contacts: message.contacts,
        location: message.location,
      }
    }

    // Status de mensagem
    if (value.statuses) {
      const status = value.statuses[0]
      return {
        type: 'status',
        messageId: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipientId: status.recipient_id,
        errors: status.errors,
      }
    }

    return null
  }

  /**
   * Obtém informações sobre o número de telefone
   */
  async getPhoneNumberInfo() {
    try {
      const response = await this.client.get(`/${this.phoneNumberId}`, {
        params: {
          fields: 'verified_name,display_phone_number,quality_rating,id',
        },
      })

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  /**
   * Obtém métricas de conversação
   */
  async getAnalytics(startDate: string, endDate: string) {
    try {
      const response = await this.client.get(`/${this.phoneNumberId}/insights`, {
        params: {
          metric: 'conversation_analytics',
          start: startDate,
          end: endDate,
        },
      })

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }
}

/**
 * Factory para criar instância do serviço a partir de variáveis de ambiente
 */
export function createWhatsAppBusinessService(): WhatsAppBusinessService | null {
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_ID
  const accessToken = process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('WhatsApp Business credentials not configured')
    return null
  }

  return new WhatsAppBusinessService({
    phoneNumberId,
    accessToken,
  })
}
