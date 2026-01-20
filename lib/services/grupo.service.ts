import { prisma } from '../prisma'
import { baileysDirectService } from './baileys-direct.service'

interface CreateGroupInput {
  nome: string
  contatoNumero: string
  instanceName: string
  descricao?: string
  imagem?: string
  somenteAdminsEnviam?: boolean
  somenteAdminsEditam?: boolean
}

class GrupoService {
  /**
   * Criar um novo grupo com configurações específicas
   */
  async criarNovoGrupo(input: CreateGroupInput): Promise<any> {
    try {
      const {
        nome,
        contatoNumero,
        instanceName,
        descricao,
        imagem,
        somenteAdminsEnviam = true,
        somenteAdminsEditam = true
      } = input

      // 1. Verificar se a instância está conectada
      const socket = baileysDirectService.getSocket(instanceName)
      if (!socket) {
        throw new Error(`Instância ${instanceName} não está conectada`)
      }

      // 2. Determinar número do próximo grupo
      const ultimoGrupo = await prisma.grupo.findFirst({
        orderBy: { numeroGrupo: 'desc' },
      })

      const proximoNumero = (ultimoGrupo?.numeroGrupo || 0) + 1
      const nomeGrupo = nome || `Grupo ${proximoNumero}`

      // 3. Formatar número do contato (garantir formato correto)
      const numeroFormatado = contatoNumero.replace(/\D/g, '')
      const participantJid = `${numeroFormatado}@s.whatsapp.net`

      // 3.1. Verificar se o número existe no WhatsApp
      const [numberExists] = await socket.onWhatsApp(participantJid)
      if (!numberExists || !numberExists.exists) {
        throw new Error(`O número ${numeroFormatado} não existe no WhatsApp ou está inválido`)
      }

      // 4. Criar grupo no WhatsApp via Baileys com o contato
      const whatsappGroup = await socket.groupCreate(nomeGrupo, [participantJid])

      if (!whatsappGroup || !whatsappGroup.id) {
        throw new Error('Falha ao criar grupo no WhatsApp')
      }

      // 5. Configurar permissões do grupo
      if (somenteAdminsEnviam) {
        await socket.groupSettingUpdate(whatsappGroup.id, 'announcement')
      } else {
        await socket.groupSettingUpdate(whatsappGroup.id, 'not_announcement')
      }

      if (somenteAdminsEditam) {
        await socket.groupSettingUpdate(whatsappGroup.id, 'locked')
      } else {
        await socket.groupSettingUpdate(whatsappGroup.id, 'unlocked')
      }

      // 6. Obter link de convite
      const inviteCode = await socket.groupInviteCode(whatsappGroup.id)
      const inviteUrl = `https://chat.whatsapp.com/${inviteCode}`

      // 7. Configurar descrição do grupo (se fornecida)
      if (descricao) {
        await baileysDirectService.updateGroupDescription(instanceName, whatsappGroup.id, descricao)
      }

      // 8. Configurar foto do grupo (se fornecida)
      if (imagem) {
        await baileysDirectService.updateGroupPicture(instanceName, whatsappGroup.id, imagem)
      }

      // 9-11. Salvar no banco usando transação (evita race conditions)
      const grupo = await prisma.$transaction(async (tx) => {
        // Desmarcar todos os grupos atuais primeiro
        await tx.grupo.updateMany({
          where: { ehGrupoAtual: true },
          data: { ehGrupoAtual: false },
        })

        // Criar novo grupo
        const novoGrupo = await tx.grupo.create({
          data: {
            whatsappGroupId: whatsappGroup.id,
            numeroGrupo: proximoNumero,
            nome: nomeGrupo,
            linkConvite: inviteUrl,
            totalMembros: 1, // Já tem 1 contato inicial
            capacidadeMaxima: 256, // Capacidade padrão
            status: 'ativo',
            ehGrupoAtual: true,
          },
        })

        // Adicionar o contato ao banco
        await tx.contato.create({
          data: {
            numeroWhatsapp: numeroFormatado,
            grupoId: novoGrupo.id,
            ativo: true,
          },
        })

        // Criar log
        await tx.logEvento.create({
          data: {
            tipo: 'grupo_criado',
            grupoId: novoGrupo.id,
            descricao: `Grupo criado: ${nomeGrupo}`,
            dadosJson: {
              whatsappGroupId: whatsappGroup.id,
              numeroGrupo: proximoNumero,
            },
          },
        })

        return novoGrupo
      })

      return grupo
    } catch (error: any) {

      // Melhorar mensagem de erro
      if (error.message?.includes('não existe no WhatsApp')) {
        throw error // Já tem mensagem clara
      } else if (error.data === 400 || error.output?.statusCode === 400) {
        throw new Error('Não foi possível criar o grupo. Verifique se o número está correto e existe no WhatsApp.')
      } else if (error.message?.includes('não está conectada')) {
        throw error // Já tem mensagem clara
      } else {
        throw new Error(`Erro ao criar grupo: ${error.message || 'Erro desconhecido'}`)
      }
    }
  }

  /**
   * Obter o grupo atual (que está recebendo novos membros)
   */
  async obterGrupoAtual(): Promise<any | null> {
    const grupo = await prisma.grupo.findFirst({
      where: {
        ehGrupoAtual: true,
        status: 'ativo',
      },
    })

    return grupo
  }

  /**
   * Obter link do grupo atual
   * NOTA: Não cria mais grupos automaticamente - use criarNovoGrupo() manualmente
   */
  async obterLinkAtual(): Promise<string> {
    const grupoAtual = await this.obterGrupoAtual()

    if (!grupoAtual) {
      throw new Error('Nenhum grupo ativo. Crie um grupo manualmente primeiro.')
    }

    // Verificar se está cheio
    if (grupoAtual.totalMembros >= grupoAtual.capacidadeMaxima) {
      throw new Error(`Grupo ${grupoAtual.nome} está cheio. Crie um novo grupo manualmente.`)
    }

    return grupoAtual.linkConvite
  }

  /**
   * Rotacionar para um novo grupo
   * DEPRECATED: Rotação automática não é mais suportada - crie grupos manualmente
   */
  private async rotacionarGrupo(grupoId: number): Promise<any> {
    // Marcar grupo atual como cheio
    await prisma.grupo.update({
      where: { id: grupoId },
      data: {
        status: 'cheio',
        ehGrupoAtual: false,
      },
    })

    throw new Error('Rotação automática de grupos não é mais suportada. Crie um novo grupo manualmente.')
  }

  /**
   * Atualizar contagem de membros de um grupo
   */
  async atualizarContagemMembros(groupId: string, instanceName?: string): Promise<void> {
    try {
      // Se não tiver instanceName, buscar uma instância conectada
      if (!instanceName) {
        const instance = await prisma.instance.findFirst({
          where: { status: 'connected' },
        })
        if (!instance) {
          return
        }
        instanceName = instance.instanceName
      }

      // Obter info do WhatsApp via Baileys
      const info = await baileysDirectService.getGroupMetadata(instanceName, groupId)
      const totalMembros = info.participants.length

      // Atualizar no banco
      const grupo = await prisma.grupo.update({
        where: { whatsappGroupId: groupId },
        data: { totalMembros },
      })

      // Verificar se precisa criar novo grupo
      if (grupo.ehGrupoAtual && totalMembros >= grupo.capacidadeMaxima) {
        await this.rotacionarGrupo(grupo.id)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Listar todos os grupos
   */
  async listarGrupos(filtros?: { status?: string }): Promise<any[]> {
    const where: any = {}

    if (filtros?.status) {
      where.status = filtros.status
    }

    const grupos = await prisma.grupo.findMany({
      where,
      orderBy: { numeroGrupo: 'desc' },
      include: {
        _count: {
          select: { contatos: true },
        },
      },
    })

    return grupos
  }

  /**
   * Obter estatísticas
   */
  async obterEstatisticas(): Promise<any> {
    const [
      totalGrupos,
      gruposAtivos,
      gruposCheios,
      gruposArquivados,
      totalContatos,
    ] = await Promise.all([
      prisma.grupo.count(),
      prisma.grupo.count({ where: { status: 'ativo' } }),
      prisma.grupo.count({ where: { status: 'cheio' } }),
      prisma.grupo.count({ where: { status: 'arquivado' } }),
      prisma.contato.count({ where: { ativo: true } }),
    ])

    return {
      totalGrupos,
      gruposAtivos,
      gruposCheios,
      gruposArquivados,
      totalContatos,
    }
  }

  /**
   * Arquivar grupo
   */
  async arquivarGrupo(grupoId: number): Promise<void> {
    await prisma.grupo.update({
      where: { id: grupoId },
      data: {
        status: 'arquivado',
        ehGrupoAtual: false,
      },
    })

    await prisma.logEvento.create({
      data: {
        tipo: 'grupo_arquivado',
        grupoId,
        descricao: 'Grupo arquivado',
      },
    })
  }

  /**
   * Deletar grupo (remove do banco de dados)
   */
  async deletarGrupo(grupoId: number): Promise<void> {
    // Deletar em cascata: contatos, logs relacionados, etc serão deletados automaticamente pelo Prisma
    await prisma.grupo.delete({
      where: { id: grupoId },
    })
  }
}

export const grupoService = new GrupoService()
