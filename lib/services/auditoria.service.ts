import { prisma } from '@/lib/prisma'

export type TipoEvento =
  | 'login'
  | 'logout'
  | 'grupo_criado'
  | 'grupo_deletado'
  | 'contato_adicionado'
  | 'contato_removido'
  | 'contato_importado'
  | 'mensagem_enviada'
  | 'config_alterada'
  | 'instance_criada'
  | 'instance_conectada'
  | 'instance_desconectada'
  | 'template_criado'
  | 'agendamento_criado'
  | 'erro'

interface RegistrarAtividadeParams {
  tipo: TipoEvento
  descricao: string
  usuario?: string
  ip?: string
  userAgent?: string
  grupoId?: number
  dados?: object
}

class AuditoriaService {
  async registrar(params: RegistrarAtividadeParams) {
    try {
      return await prisma.logEvento.create({
        data: {
          tipo: params.tipo,
          descricao: params.descricao,
          usuario: params.usuario || 'Sistema',
          ip: params.ip,
          userAgent: params.userAgent,
          grupoId: params.grupoId,
          dadosJson: params.dados,
        },
      })
    } catch (error) {
      console.error('Erro ao registrar atividade:', error)
    }
  }

  async listar(filtros?: {
    tipo?: string
    usuario?: string
    dataInicio?: Date
    dataFim?: Date
    limite?: number
    pagina?: number
  }) {
    const where: Record<string, unknown> = {}

    if (filtros?.tipo) {
      where.tipo = filtros.tipo
    }

    if (filtros?.usuario) {
      where.usuario = { contains: filtros.usuario, mode: 'insensitive' }
    }

    if (filtros?.dataInicio || filtros?.dataFim) {
      where.criadoEm = {}
      if (filtros.dataInicio) {
        (where.criadoEm as Record<string, Date>).gte = filtros.dataInicio
      }
      if (filtros.dataFim) {
        (where.criadoEm as Record<string, Date>).lte = filtros.dataFim
      }
    }

    const limite = filtros?.limite || 50
    const pagina = filtros?.pagina || 1
    const skip = (pagina - 1) * limite

    const [total, atividades] = await Promise.all([
      prisma.logEvento.count({ where }),
      prisma.logEvento.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limite,
        include: {
          grupo: {
            select: { id: true, nome: true },
          },
        },
      }),
    ])

    return {
      atividades,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    }
  }

  async estatisticas() {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const [totalHoje, porTipo, ultimosUsuarios] = await Promise.all([
      prisma.logEvento.count({
        where: { criadoEm: { gte: hoje } },
      }),
      prisma.logEvento.groupBy({
        by: ['tipo'],
        _count: { tipo: true },
        orderBy: { _count: { tipo: 'desc' } },
        take: 10,
      }),
      prisma.logEvento.findMany({
        where: { usuario: { not: null } },
        select: { usuario: true, criadoEm: true },
        distinct: ['usuario'],
        orderBy: { criadoEm: 'desc' },
        take: 5,
      }),
    ])

    return {
      totalHoje,
      porTipo: porTipo.map((t) => ({ tipo: t.tipo, total: t._count.tipo })),
      ultimosUsuarios,
    }
  }
}

export const auditoriaService = new AuditoriaService()
