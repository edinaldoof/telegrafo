import { prisma } from '../prisma'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface CreateAttachmentInput {
  nomeArquivo: string
  buffer: Buffer
  tipoMime: string
  largura?: number
  altura?: number
  duracao?: number
}

class AttachmentService {
  private uploadDir = path.join(process.cwd(), 'public', 'uploads')

  constructor() {
    this.ensureUploadDirExists()
  }

  /**
   * Garantir que o diretório de uploads existe
   */
  private async ensureUploadDirExists() {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true })
    }
  }

  /**
   * Fazer upload de arquivo
   */
  async upload(input: CreateAttachmentInput): Promise<any> {
    try {
      await this.ensureUploadDirExists()

      // Gerar nome único
      const timestamp = Date.now()
      const extensao = path.extname(input.nomeArquivo)
      const nomeUnico = `${timestamp}-${Math.random().toString(36).substring(7)}${extensao}`

      // Caminho completo
      const caminhoCompleto = path.join(this.uploadDir, nomeUnico)

      // Salvar arquivo
      await writeFile(caminhoCompleto, input.buffer)

      // URL pública
      const url = `/uploads/${nomeUnico}`

      // Salvar no banco
      const attachment = await prisma.attachment.create({
        data: {
          nomeArquivo: input.nomeArquivo,
          caminhoLocal: caminhoCompleto,
          url,
          tipoMime: input.tipoMime,
          tamanho: BigInt(input.buffer.length),
          largura: input.largura,
          altura: input.altura,
          duracao: input.duracao,
        },
      })

      return attachment
    } catch (error) {
      throw error
    }
  }

  /**
   * Fazer upload múltiplo
   */
  async uploadMultiplo(
    inputs: CreateAttachmentInput[]
  ): Promise<any[]> {
    const attachments = []

    for (const input of inputs) {
      const attachment = await this.upload(input)
      attachments.push(attachment)
    }

    return attachments
  }

  /**
   * Listar attachments com filtros
   */
  async listar(filtros?: {
    tipo?: string
    dataInicio?: Date
    dataFim?: Date
    limite?: number
  }): Promise<any[]> {
    const where: any = {}

    if (filtros?.tipo) {
      where.tipoMime = {
        startsWith: filtros.tipo,
      }
    }

    if (filtros?.dataInicio || filtros?.dataFim) {
      where.uploadedEm = {}
      if (filtros.dataInicio) where.uploadedEm.gte = filtros.dataInicio
      if (filtros.dataFim) where.uploadedEm.lte = filtros.dataFim
    }

    const attachments = await prisma.attachment.findMany({
      where,
      include: {
        _count: {
          select: { agendamentos: true },
        },
      },
      orderBy: { uploadedEm: 'desc' },
      take: filtros?.limite || 100,
    })

    return attachments
  }

  /**
   * Obter attachment por ID
   */
  async obterPorId(id: number): Promise<any> {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        agendamentos: {
          take: 10,
        },
      },
    })

    if (!attachment) {
      throw new Error('Attachment não encontrado')
    }

    return attachment
  }

  /**
   * Deletar attachment
   */
  async deletar(id: number): Promise<void> {
    // Verificar se está sendo usado em agendamentos pendentes
    const agendamentosPendentes = await prisma.agendamento.count({
      where: {
        attachmentId: id,
        status: { in: ['pendente', 'executando'] },
      },
    })

    if (agendamentosPendentes > 0) {
      throw new Error(
        'Não é possível deletar arquivo usado em agendamentos pendentes'
      )
    }

    await prisma.attachment.delete({
      where: { id },
    })
  }

  /**
   * Obter estatísticas de attachments
   */
  async obterEstatisticas(): Promise<any> {
    const [
      total,
      porTipo,
      tamanhoTotal,
    ] = await Promise.all([
      prisma.attachment.count(),
      prisma.$queryRaw`
        SELECT
          SPLIT_PART(tipo_mime, '/', 1) as tipo,
          COUNT(*)::integer as total
        FROM attachments
        GROUP BY tipo
      `,
      prisma.$queryRaw`
        SELECT SUM(tamanho)::bigint as total
        FROM attachments
      `,
    ])

    return {
      total,
      porTipo,
      tamanhoTotal: (tamanhoTotal as any)[0]?.total || 0,
    }
  }

  /**
   * Validar tipo de arquivo
   */
  validarTipo(tipoMime: string, tiposPermitidos: string[]): boolean {
    return tiposPermitidos.some((tipo) => tipoMime.startsWith(tipo))
  }

  /**
   * Validar tamanho de arquivo
   */
  validarTamanho(tamanho: number, maxTamanhoMB: number): boolean {
    const maxBytes = maxTamanhoMB * 1024 * 1024
    return tamanho <= maxBytes
  }
}

export const attachmentService = new AttachmentService()
