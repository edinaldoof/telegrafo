import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'

// Configurar Cloudinary com variáveis de ambiente
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface UploadResult {
  success: boolean
  url?: string
  publicId?: string
  format?: string
  resourceType?: string
  error?: string
}

/**
 * Serviço de upload para Cloudinary
 * Gera URLs públicas acessíveis pelo Twilio
 */
class CloudinaryService {
  private isConfigured: boolean

  constructor() {
    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    )

  }

  /**
   * Verifica se Cloudinary está configurado
   */
  get configured(): boolean {
    return this.isConfigured
  }

  /**
   * Upload de arquivo para Cloudinary
   * @param buffer - Buffer do arquivo
   * @param options - Opções de upload
   */
  async upload(
    buffer: Buffer,
    options: {
      folder?: string
      publicId?: string
      resourceType?: 'image' | 'video' | 'raw' | 'auto'
    } = {}
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Cloudinary não configurado. Adicione CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET ao .env',
      }
    }

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || 'telegrafo',
            public_id: options.publicId,
            resource_type: options.resourceType || 'auto',
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result as UploadApiResponse)
          }
        )

        uploadStream.end(buffer)
      })

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Upload de imagem
   */
  async uploadImage(buffer: Buffer, publicId?: string): Promise<UploadResult> {
    return this.upload(buffer, {
      folder: 'telegrafo/images',
      publicId,
      resourceType: 'image',
    })
  }

  /**
   * Upload de vídeo
   */
  async uploadVideo(buffer: Buffer, publicId?: string): Promise<UploadResult> {
    return this.upload(buffer, {
      folder: 'telegrafo/videos',
      publicId,
      resourceType: 'video',
    })
  }

  /**
   * Upload de documento/áudio (raw)
   */
  async uploadRaw(buffer: Buffer, publicId?: string): Promise<UploadResult> {
    return this.upload(buffer, {
      folder: 'telegrafo/files',
      publicId,
      resourceType: 'raw',
    })
  }

  /**
   * Deletar arquivo do Cloudinary
   */
  async delete(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
    if (!this.isConfigured) return false

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
      return true
    } catch (error: any) {
      return false
    }
  }
}

export const cloudinaryService = new CloudinaryService()
