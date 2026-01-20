import { prisma } from '../prisma'
import { templateService } from './template.service'
import { mensagemService } from './mensagem.service'

interface CreateAgendamentoInput {
  titulo: string
  templateId?: number
  conteudoPersonalizado?: string
  contatosIds: number[]
  filtros?: any
  attachmentId?: number
  dataAgendamento: Date
  fusoHorario?: string
}

interface UpdateAgendamentoInput extends Partial<CreateAgendamentoInput> {
  id: number
  status?: string
}

class AgendamentoService {
  /**
   * Criar novo agendamento
   */
  async criar(input: CreateAgendamentoInput): Promise<any> {
    try {
      // Validações
      if (!input.templateId && !input.conteudoPersonalizado) {
        throw new Error('Forneça um template ou conteúdo personalizado')
      }

      if (input.contatosIds.length === 0) {
        throw new Error('Selecione pelo menos um contato')
      }

      const dataAgendamento = new Date(input.dataAgendamento)
      if (dataAgendamento <= new Date()) {
        throw new Error('Data de agendamento deve ser no futuro')
      }

      const agendamento = await prisma.agendamento.create({
        data: {
          titulo: input.titulo,
          templateId: input.templateId,
          conteudoPersonalizado: input.conteudoPersonalizado,
          contatosIds: input.contatosIds,
          filtros: input.filtros,
          attachmentId: input.attachmentId,
          dataAgendamento,
          fusoHorario: input.fusoHorario || 'America/Sao_Paulo',
          status: 'pendente',
        },
        include: {
          template: {
            include: {
              variaveis: true,
            },
          },
          attachment: true,
        },
      })

      // Log do evento
      await prisma.logEvento.create({
        data: {
          tipo: 'agendamento_criado',
          descricao: `Agendamento "${agendamento.titulo}" criado para ${dataAgendamento.toLocaleString()}`,
          dadosJson: {
            agendamentoId: agendamento.id,
            totalContatos: input.contatosIds.length,
          },
        },
      })

      return agendamento
    } catch (error) {
      throw error
    }
  }

  /**
   * Listar agendamentos com filtros
   */
  async listar(filtros?: {
    status?: string
    dataInicio?: Date
    dataFim?: Date
    templateId?: number
  }): Promise<any[]> {
    const where: any = {}

    if (filtros?.status) where.status = filtros.status
    if (filtros?.templateId) where.templateId = filtros.templateId
    if (filtros?.dataInicio || filtros?.dataFim) {
      where.dataAgendamento = {}
      if (filtros.dataInicio) where.dataAgendamento.gte = filtros.dataInicio
      if (filtros.dataFim) where.dataAgendamento.lte = filtros.dataFim
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        template: true,
        attachment: true,
      },
      orderBy: { dataAgendamento: 'asc' },
    })

    return agendamentos
  }

  /**
   * Obter agendamento por ID
   */
  async obterPorId(id: number): Promise<any> {
    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            variaveis: true,
          },
        },
        attachment: true,
      },
    })

    if (!agendamento) {
      throw new Error('Agendamento não encontrado')
    }

    // Buscar dados dos contatos
    const contatos = await prisma.contato.findMany({
      where: {
        id: { in: agendamento.contatosIds },
      },
    })

    return {
      ...agendamento,
      contatos,
    }
  }

  /**
   * Atualizar agendamento
   */
  async atualizar(input: UpdateAgendamentoInput): Promise<any> {
    try {
      const { id, ...data } = input

      // Verificar se pode atualizar
      const agendamento = await prisma.agendamento.findUnique({
        where: { id },
      })

      if (!agendamento) {
        throw new Error('Agendamento não encontrado')
      }

      if (agendamento.status === 'executando') {
        throw new Error('Não é possível atualizar agendamento em execução')
      }

      if (agendamento.status === 'concluido') {
        throw new Error('Não é possível atualizar agendamento concluído')
      }

      const atualizado = await prisma.agendamento.update({
        where: { id },
        data,
        include: {
          template: true,
          attachment: true,
        },
      })

      return atualizado
    } catch (error) {
      throw error
    }
  }

  /**
   * Cancelar agendamento
   */
  async cancelar(id: number): Promise<any> {
    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
    })

    if (!agendamento) {
      throw new Error('Agendamento não encontrado')
    }

    if (agendamento.status === 'concluido') {
      throw new Error('Não é possível cancelar agendamento concluído')
    }

    if (agendamento.status === 'executando') {
      throw new Error('Não é possível cancelar agendamento em execução')
    }

    const cancelado = await prisma.agendamento.update({
      where: { id },
      data: { status: 'cancelado' },
    })

    await prisma.logEvento.create({
      data: {
        tipo: 'agendamento_cancelado',
        descricao: `Agendamento "${agendamento.titulo}" cancelado`,
        dadosJson: { agendamentoId: id },
      },
    })

    return cancelado
  }

  /**
   * Deletar agendamento
   */
  async deletar(id: number): Promise<void> {
    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
    })

    if (!agendamento) {
      throw new Error('Agendamento não encontrado')
    }

    if (agendamento.status === 'executando') {
      throw new Error('Não é possível deletar agendamento em execução')
    }

    await prisma.agendamento.delete({
      where: { id },
    })
  }

  /**
   * Executar agendamento (chamado pelo cron job)
   */
  async executar(id: number): Promise<void> {
    try {
      const agendamento = await this.obterPorId(id)

      if (agendamento.status !== 'pendente') {
        return
      }

      // Marcar como executando
      await prisma.agendamento.update({
        where: { id },
        data: { status: 'executando' },
      })

      // Preparar conteúdo da mensagem
      let conteudo: string

      if (agendamento.templateId && agendamento.template) {
        // Usar template - precisaríamos dos dados dos contatos para renderizar
        conteudo = agendamento.template.conteudo
      } else {
        conteudo = agendamento.conteudoPersonalizado || ''
      }

      // Buscar grupos dos contatos
      const contatos = await prisma.contato.findMany({
        where: {
          id: { in: agendamento.contatosIds },
        },
        include: {
          grupo: true,
        },
      })

      // Agrupar por grupo
      const gruposSet = new Set<number>()
      contatos.forEach((c) => {
        if (c.grupoId) gruposSet.add(c.grupoId)
      })

      const grupoIds = Array.from(gruposSet)

      if (grupoIds.length === 0) {
        throw new Error('Nenhum grupo encontrado para os contatos selecionados')
      }

      // Enviar mensagem
      const mensagem = await mensagemService.enviarMensagem({
        tipo: agendamento.attachment ? 'imagem' : 'texto', // Simplificado
        conteudo,
        caminhoArquivo: agendamento.attachment?.caminhoLocal,
        nomeArquivo: agendamento.attachment?.nomeArquivo,
        mimeType: agendamento.attachment?.tipoMime,
        grupoIds,
      })

      // Marcar como concluído
      await prisma.agendamento.update({
        where: { id },
        data: {
          status: 'concluido',
          executadoEm: new Date(),
          resultado: {
            mensagemId: mensagem.id,
            totalGrupos: grupoIds.length,
            totalContatos: contatos.length,
          },
        },
      })

      await prisma.logEvento.create({
        data: {
          tipo: 'agendamento_executado',
          descricao: `Agendamento "${agendamento.titulo}" executado com sucesso`,
          dadosJson: {
            agendamentoId: id,
            mensagemId: mensagem.id,
            totalContatos: contatos.length,
          },
        },
      })
    } catch (error: any) {
      // Marcar como erro
      await prisma.agendamento.update({
        where: { id },
        data: {
          status: 'erro',
          resultado: {
            erro: error.message,
            stack: error.stack,
          },
        },
      })

      await prisma.logEvento.create({
        data: {
          tipo: 'agendamento_erro',
          descricao: `Erro ao executar agendamento ${id}`,
          dadosJson: {
            agendamentoId: id,
            erro: error.message,
          },
        },
      })

      throw error
    }
  }

  /**
   * Verificar agendamentos pendentes (chamado periodicamente)
   */
  async verificarPendentes(): Promise<void> {
    const agora = new Date()

    const pendentes = await prisma.agendamento.findMany({
      where: {
        status: 'pendente',
        dataAgendamento: {
          lte: agora,
        },
      },
    })

    for (const agendamento of pendentes) {
      try {
        await this.executar(agendamento.id)
      } catch (error) {
        // Continua para os próximos
      }
    }
  }

  /**
   * Duplicar agendamento
   */
  async duplicar(id: number): Promise<any> {
    const original = await this.obterPorId(id)

    // Nova data: 1 dia depois da original
    const novaData = new Date(original.dataAgendamento)
    novaData.setDate(novaData.getDate() + 1)

    const duplicado = await this.criar({
      titulo: `${original.titulo} (Cópia)`,
      templateId: original.templateId,
      conteudoPersonalizado: original.conteudoPersonalizado,
      contatosIds: original.contatosIds,
      filtros: original.filtros,
      attachmentId: original.attachmentId,
      dataAgendamento: novaData,
      fusoHorario: original.fusoHorario,
    })

    return duplicado
  }

  /**
   * Estatísticas de agendamentos
   */
  async obterEstatisticas(): Promise<any> {
    const [
      total,
      pendentes,
      concluidos,
      cancelados,
      comErro,
      proximosHoje,
    ] = await Promise.all([
      prisma.agendamento.count(),
      prisma.agendamento.count({ where: { status: 'pendente' } }),
      prisma.agendamento.count({ where: { status: 'concluido' } }),
      prisma.agendamento.count({ where: { status: 'cancelado' } }),
      prisma.agendamento.count({ where: { status: 'erro' } }),
      prisma.agendamento.count({
        where: {
          status: 'pendente',
          dataAgendamento: {
            gte: new Date(),
            lt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    return {
      total,
      pendentes,
      concluidos,
      cancelados,
      comErro,
      proximosHoje,
    }
  }

  /**
   * Reagendar (alterar apenas a data)
   */
  async reagendar(id: number, novaData: Date): Promise<any> {
    if (novaData <= new Date()) {
      throw new Error('Nova data deve ser no futuro')
    }

    return this.atualizar({
      id,
      dataAgendamento: novaData,
      status: 'pendente', // Resetar status
    })
  }
}

export const agendamentoService = new AgendamentoService()
