import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { cloudinaryService } from '@/lib/services/cloudinary.service'

// MIME types permitidos
const ALLOWED_MIME_TYPES = {
  // Imagens
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  // Vídeos
  'video/mp4': 'mp4',
  'video/mpeg': 'mpeg',
  'video/quicktime': 'mov',
  // Documentos
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  // Áudio
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
}

/**
 * POST /api/upload
 * Upload de arquivo com validação e segurança
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tamanho (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máx 10MB)' },
        { status: 400 }
      )
    }

    // Validar MIME type
    if (!ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES]) {
      return NextResponse.json(
        {
          error: 'Tipo de arquivo não permitido',
          allowedTypes: Object.keys(ALLOWED_MIME_TYPES)
        },
        { status: 400 }
      )
    }

    // Obter extensão baseada no MIME type (não confiar na extensão do usuário)
    const ext = ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES]

    // Gerar nome único (previne path traversal e colisões)
    const fileName = `${randomUUID()}.${ext}`

    // Converter para Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determinar tipo de mídia
    let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document'
    if (file.type.startsWith('image/')) mediaType = 'image'
    else if (file.type.startsWith('video/')) mediaType = 'video'
    else if (file.type.startsWith('audio/')) mediaType = 'audio'

    // Tentar upload para Cloudinary (URLs públicas para Twilio)
    if (cloudinaryService.configured) {
      let cloudinaryResult

      if (mediaType === 'image') {
        cloudinaryResult = await cloudinaryService.uploadImage(buffer, fileName.replace(`.${ext}`, ''))
      } else if (mediaType === 'video') {
        cloudinaryResult = await cloudinaryService.uploadVideo(buffer, fileName.replace(`.${ext}`, ''))
      } else {
        cloudinaryResult = await cloudinaryService.uploadRaw(buffer, fileName.replace(`.${ext}`, ''))
      }

      if (cloudinaryResult.success && cloudinaryResult.url) {
        return NextResponse.json({
          success: true,
          fileName,
          filePath: cloudinaryResult.url,
          fullUrl: cloudinaryResult.url,
          mimeType: file.type,
          mediaType,
          size: file.size,
          storage: 'cloudinary',
          publicId: cloudinaryResult.publicId,
        })
      }
    }

    // Fallback: Storage local (não funciona com Twilio para mídia)
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filePath = join(uploadsDir, fileName)
    await writeFile(filePath, buffer)

    const publicPath = `/uploads/${fileName}`
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`
    const fullUrl = `${baseUrl}${publicPath}`

    return NextResponse.json({
      success: true,
      fileName,
      filePath: publicPath,
      fullUrl,
      mimeType: file.type,
      mediaType,
      size: file.size,
      storage: 'local',
      warning: 'URL local não funciona com Twilio. Configure Cloudinary para enviar mídia via Twilio.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao fazer upload' },
      { status: 500 }
    )
  }
}
