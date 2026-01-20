import axios, { AxiosInstance } from 'axios'

// Agora usa rotas internas do Next.js (mesma porta 3000)
const API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3000'
const API_KEY = process.env.WHATSAPP_API_KEY || ''

interface EnviarTextoResponse {
  sucesso: boolean
  sid?: string
  para?: string
  erro?: string
}

interface EnviarMidiaResponse {
  sucesso: boolean
  sid?: string
  para?: string
  erro?: string
}

interface EnviarTemplateResponse {
  sucesso: boolean
  sid?: string
  para?: string
  erro?: string
}

interface StatusResponse {
  sucesso: boolean
  mensagem?: {
    sid: string
    status: string
    para: string
    de: string
    dataCriacao: string
    dataAtualizacao: string
    errorCode?: string
    errorMessage?: string
  }
  erro?: string
}

interface HealthResponse {
  status: string
  timestamp: string
  uptime: number
  twilio?: {
    connected: boolean
    accountSid?: string
    whatsappNumber?: string
  }
}

/**
 * Serviço de integração com a WhatsApp Híbrido API (Twilio)
 *
 * Usado para enviar mensagens para contatos individuais via Twilio (oficial, seguro).
 * Para grupos WhatsApp, continuar usando Baileys/Evolution API.
 */
class WhatsAppHibridoApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      timeout: 30000
    })

  }

  /**
   * Enviar mensagem de texto via Twilio
   */
  async enviarTexto(numero: string, mensagem: string): Promise<EnviarTextoResponse> {
    try {
      const response = await this.client.post('/api/twilio/enviar', {
        numero,
        mensagem
      })

      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.erro || error.message)
    }
  }

  /**
   * Enviar mídia (imagem/vídeo) via Twilio
   *
   * IMPORTANTE: Twilio requer URLs públicas acessíveis pela internet.
   * URLs localhost (ex: http://localhost:3000/...) NÃO funcionam.
   * Use serviços como S3, Cloudinary ou Firebase Storage.
   */
  async enviarMidia(numero: string, mediaUrl: string, legenda?: string): Promise<EnviarMidiaResponse> {
    try {
      // Verificar se é URL localhost (não funciona com Twilio)
      if (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')) {
        throw new Error('Twilio requer URLs públicas. URLs localhost não funcionam. Use S3, Cloudinary ou similar para hospedar mídia.')
      }

      const response = await this.client.post('/api/twilio/media', {
        numero,
        mediaUrl,
        legenda
      })

      return response.data
    } catch (error: any) {
      const errorData = error.response?.data
      let errorMsg = error.message

      // Melhorar mensagens de erro conhecidas
      if (errorData?.error === 'Invalid media URL(s)') {
        errorMsg = 'URL de mídia inválida ou inacessível. Twilio precisa de URLs públicas (não localhost).'
      }

      throw new Error(errorMsg)
    }
  }

  /**
   * Enviar template aprovado via Twilio
   */
  async enviarTemplate(
    numero: string,
    contentSid: string,
    variaveis?: Record<string, string>
  ): Promise<EnviarTemplateResponse> {
    try {
      const response = await this.client.post('/api/twilio/template', {
        numero,
        contentSid,
        variaveis
      })

      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.erro || error.message)
    }
  }

  /**
   * Verificar status de uma mensagem pelo SID
   */
  async verificarStatus(sid: string): Promise<StatusResponse> {
    try {
      const response = await this.client.get(`/api/twilio/status/${sid}`)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.erro || error.message)
    }
  }

  /**
   * Verificar saúde da API
   */
  async health(): Promise<HealthResponse> {
    try {
      const response = await this.client.get('/api/health')
      return response.data
    } catch (error: any) {
      throw new Error(`WhatsApp Híbrido API não disponível: ${error.message}`)
    }
  }

  /**
   * Verificar se a API está disponível
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.health()
      return true
    } catch {
      return false
    }
  }
}

export const whatsappHibridoApi = new WhatsAppHibridoApiService()
