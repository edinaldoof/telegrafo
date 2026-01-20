import { prisma } from '../prisma'
import { baileysDirectService } from './baileys-direct.service'

interface CreateInstanceInput {
  instanceName: string
  displayName?: string
  qrcode?: boolean
}

interface UpdateInstanceInput {
  id: number
  displayName?: string
  webhookUrl?: string
  webhookEvents?: string[]
  config?: any
}

type ApiInstanceInfo = {
  status?: string
  phoneNumber?: string
  displayName?: string
}

const LIST_INCLUDE = {
  _count: {
    select: {
      mensagensEnviadas: true,
      webhooks: true,
    },
  },
} as const

const DETAIL_INCLUDE = {
  mensagensEnviadas: {
    take: 10,
    orderBy: { enviadoEm: 'desc' as const },
  },
  webhooks: true,
  _count: {
    select: {
      mensagensEnviadas: true,
      webhooks: true,
    },
  },
} as const

class InstanceService {

  private normalizeStatus(rawStatus?: string | null): string | undefined {
    if (!rawStatus) return undefined

    switch (rawStatus.toLowerCase()) {
      case 'open':
      case 'connected':
        return 'connected'
      case 'close':
      case 'closed':
      case 'disconnected':
        return 'disconnected'
      case 'connecting':
      case 'reconnecting':
        return 'connecting'
      case 'qr':
      case 'qrcode':
        return 'qr'
      default:
        return rawStatus
    }
  }


  async criar(input: CreateInstanceInput): Promise<any> {
    const existing = await prisma.instance.findUnique({
      where: { instanceName: input.instanceName },
    })

    if (existing) {
      throw new Error('Instância já existe com este nome')
    }

    // Criar no banco local
    const instance = await prisma.instance.create({
      data: {
        instanceName: input.instanceName,
        displayName: input.displayName || input.instanceName,
        status: 'disconnected',
      },
      include: LIST_INCLUDE,
    })

    await prisma.connectionHistory.create({
      data: {
        instanceName: input.instanceName,
        evento: 'instance_created',
        detalhes: { displayName: input.displayName },
      },
    })

    return instance
  }

  async listar(): Promise<any[]> {
    // Usar apenas o banco de dados local para status
    // Evolution API não é mais consultado para evitar conflitos com Baileys Direct
    const instances = await prisma.instance.findMany({
      orderBy: { criadoEm: 'desc' },
      include: LIST_INCLUDE,
    })

    return instances
  }

  async obterPorId(id: number): Promise<any> {
    const instance = await prisma.instance.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    })

    if (!instance) {
      throw new Error('Instância não encontrada')
    }

    // Retornar diretamente do banco de dados local
    // Não consultar Evolution API para evitar conflitos com Baileys Direct
    return instance
  }

  async obterPorNome(instanceName: string): Promise<any> {
    const instance = await prisma.instance.findUnique({
      where: { instanceName },
      include: LIST_INCLUDE,
    })

    if (!instance) {
      throw new Error('Instância não encontrada')
    }

    // Retornar diretamente do banco de dados local
    // Não consultar Evolution API para evitar conflitos com Baileys Direct
    return instance
  }


  async atualizar(input: UpdateInstanceInput): Promise<any> {
    const { id, ...data } = input

    const instance = await prisma.instance.update({
      where: { id },
      data,
    })

    return instance
  }

  async deletar(id: number): Promise<void> {
    const instance = await prisma.instance.findUnique({
      where: { id },
    })

    if (!instance) {
      throw new Error('Instância não encontrada')
    }

    // Desconectar socket do Baileys se estiver ativo
    try {
      await baileysDirectService.disconnect(instance.instanceName)
    } catch (error) {
      // Socket was not active
    }

    // Deletar todos os registros relacionados primeiro
    await Promise.all([
      prisma.mensagemInstance.deleteMany({ where: { instanceId: id } }),
      prisma.webhook.deleteMany({ where: { instanceId: id } }),
      prisma.chatwootIntegration.deleteMany({ where: { instanceId: id } }),
      prisma.typebotIntegration.deleteMany({ where: { instanceId: id } }),
      prisma.openAIIntegration.deleteMany({ where: { instanceId: id } }),
      prisma.connectionHistory.deleteMany({ where: { instanceName: instance.instanceName } }),
    ])

    // Criar histórico antes de deletar
    await prisma.connectionHistory.create({
      data: {
        instanceName: instance.instanceName,
        evento: 'instance_deleted',
      },
    })

    // Deletar do banco de dados
    await prisma.instance.delete({
      where: { id },
    })
  }

  async conectar(instanceName: string): Promise<any> {

    await prisma.connectionHistory.create({
      data: {
        instanceName,
        evento: 'connection_requested',
      },
    })

    // Usar Baileys diretamente para gerar QR code
    const qrCode = await baileysDirectService.generateQRCode(instanceName)

    if (qrCode) {
      // Salvar QR code no banco
      await prisma.instance.updateMany({
        where: { instanceName },
        data: {
          status: 'qr',
          qrCode: qrCode,
          qrCodeUrl: qrCode,
        }
      })
    }

    return {
      message: qrCode ? 'QR Code gerado com sucesso' : 'Erro ao gerar QR Code',
      qrcode: qrCode ? { base64: qrCode } : null,
    }
  }

  async desconectar(instanceName: string): Promise<void> {
    await baileysDirectService.disconnect(instanceName)

    await prisma.instance.updateMany({
      where: { instanceName },
      data: { status: 'disconnected' }
    })

    await prisma.connectionHistory.create({
      data: {
        instanceName,
        evento: 'disconnected',
      },
    })
  }

  async reiniciar(instanceName: string): Promise<void> {
    // Desconectar e reconectar
    await this.desconectar(instanceName)
    await this.conectar(instanceName)

    await prisma.connectionHistory.create({
      data: {
        instanceName,
        evento: 'instance_restarted',
      },
    })
  }

  async atualizarStatus(instanceName: string): Promise<any> {
    // Retornar status atual do banco de dados local
    // Não consultar Evolution API para evitar conflitos com Baileys Direct
    const instance = await prisma.instance.findUnique({
      where: { instanceName },
      include: LIST_INCLUDE,
    })

    if (!instance) {
      throw new Error('Instância não encontrada')
    }

    return instance
  }


  async obterEstatisticas(): Promise<any> {
    // Usar apenas dados do banco de dados local
    const [total, totalMensagens, instances] = await Promise.all([
      prisma.instance.count(),
      prisma.mensagemInstance.count(),
      prisma.instance.findMany({ select: { status: true } }),
    ])

    let conectadas = 0
    let desconectadas = 0
    let aguardandoQr = 0

    for (const instance of instances) {
      switch (instance.status) {
        case 'connected':
          conectadas += 1
          break
        case 'qr':
          aguardandoQr += 1
          break
        default:
          desconectadas += 1
          break
      }
    }

    return {
      total,
      conectadas,
      desconectadas,
      aguardandoQr,
      totalMensagens,
    }
  }

  async obterHistorico(instanceName: string, limit: number = 50): Promise<any[]> {
    const historico = await prisma.connectionHistory.findMany({
      where: { instanceName },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return historico
  }

}

export const instanceService = new InstanceService()
