import { prisma } from '../prisma'
import { baileysDirectService } from './baileys-direct.service'
import { whatsappHibridoApi } from './whatsapp-hibrido-api.service'

interface EnviarMensagemInput {
  tipo: 'texto' | 'imagem' | 'video' | 'documento' | 'audio'
  conteudo?: string
  caminhoArquivo?: string
  nomeArquivo?: string
  mimeType?: string
  grupoIds: number[]
}

class MensagemService {
  private async getConnectedInstance() {
    const instance = await prisma.instance.findFirst({
      where: { status: 'connected' },
      orderBy: { atualizadoEm: 'desc' },
    })

    if (!instance) {
      throw new Error('Nenhuma instância Baileys conectada. Conecte uma instância primeiro.')
    }

    return instance
  }

  /**
   * Enviar mensagem para múltiplos grupos
   */
  async enviarMensagem(input: EnviarMensagemInput): Promise<any> {
    try {
      // Criar registro da mensagem
      const mensagem = await prisma.mensagem.create({
        data: {
          tipo: input.tipo,
          conteudo: input.conteudo,
          caminhoArquivo: input.caminhoArquivo,
          nomeArquivo: input.nomeArquivo,
          mimeType: input.mimeType,
          grupoIds: input.grupoIds,
          totalGrupos: input.grupoIds.length,
          totalEnviados: 0,
          totalErros: 0,
          status: 'pendente',
        },
      })

      // Criar items na fila de envio
      for (const grupoId of input.grupoIds) {
        await prisma.filaEnvio.create({
          data: {
            mensagemId: mensagem.id,
            grupoId,
            status: 'pendente',
            tentativas: 0,
          },
        })
      }

      // Processar fila em background (não aguardar)
      this.processarFila(mensagem.id).catch(() => {
        // Error processing queue
      })

      return mensagem
    } catch (error) {
      throw error
    }
  }

  /**
   * Processar fila de envio usando Baileys
   */
  private async processarFila(mensagemId: number): Promise<void> {
    try {
      // Atualizar status da mensagem
      await prisma.mensagem.update({
        where: { id: mensagemId },
        data: { status: 'enviando' },
      })

      // Buscar mensagem
      const mensagem = await prisma.mensagem.findUnique({
        where: { id: mensagemId },
      })

      if (!mensagem) {
        throw new Error('Mensagem não encontrada')
      }

      // Buscar items pendentes
      const items = await prisma.filaEnvio.findMany({
        where: {
          mensagemId,
          status: 'pendente',
        },
        include: {
          grupo: true,
        },
      })

      // Buscar instância conectada
      const instance = await this.getConnectedInstance()

      let enviados = 0
      let erros = 0

      for (const item of items) {
        try {
          // Marcar como enviando
          await prisma.filaEnvio.update({
            where: { id: item.id },
            data: { status: 'enviando' },
          })

          // Roteamento híbrido: Twilio para contatos, Baileys para grupos
          const destino = item.grupo.whatsappGroupId || ''
          const isGrupo = destino.includes('@g.us')

          if (isGrupo) {
            // GRUPOS: usar Baileys (Twilio não suporta grupos)

            if (mensagem.tipo === 'texto') {
              await baileysDirectService.sendTextMessage(
                instance.instanceName,
                destino,
                mensagem.conteudo || ''
              )
            } else if (mensagem.tipo === 'imagem' || mensagem.tipo === 'video') {
              await baileysDirectService.sendMediaMessage(
                instance.instanceName,
                destino,
                {
                  media: {
                    type: mensagem.tipo === 'imagem' ? 'image' : 'video',
                    url: mensagem.caminhoArquivo ?? undefined,
                    caption: mensagem.conteudo ?? undefined
                  }
                }
              )
            } else if (mensagem.tipo === 'documento') {
              await baileysDirectService.sendMediaMessage(
                instance.instanceName,
                destino,
                {
                  media: {
                    type: 'document',
                    url: mensagem.caminhoArquivo ?? undefined,
                    fileName: mensagem.nomeArquivo ?? undefined,
                    caption: mensagem.conteudo ?? undefined
                  }
                }
              )
            } else if (mensagem.tipo === 'audio') {
              await baileysDirectService.sendMediaMessage(
                instance.instanceName,
                destino,
                {
                  media: {
                    type: 'audio',
                    url: mensagem.caminhoArquivo ?? undefined
                  }
                }
              )
            }
          } else {
            // CONTATOS INDIVIDUAIS: usar Twilio (oficial, seguro)
            const numero = destino.replace('@s.whatsapp.net', '').replace(/\D/g, '')

            if (mensagem.tipo === 'texto') {
              await whatsappHibridoApi.enviarTexto(numero, mensagem.conteudo || '')
            } else if (mensagem.tipo === 'imagem' || mensagem.tipo === 'video') {
              await whatsappHibridoApi.enviarMidia(
                numero,
                mensagem.caminhoArquivo || '',
                mensagem.conteudo ?? undefined
              )
            } else {
              // Documento e áudio não suportados via Twilio, fallback para Baileys
              await baileysDirectService.sendMediaMessage(
                instance.instanceName,
                destino,
                {
                  media: {
                    type: mensagem.tipo === 'documento' ? 'document' : 'audio',
                    url: mensagem.caminhoArquivo ?? undefined,
                    fileName: mensagem.nomeArquivo ?? undefined
                  }
                }
              )
            }
          }

          // Marcar como enviado
          await prisma.filaEnvio.update({
            where: { id: item.id },
            data: {
              status: 'enviado',
              enviadoEm: new Date(),
            },
          })

          enviados++

          // Log
          await prisma.logEvento.create({
            data: {
              tipo: 'mensagem_enviada',
              grupoId: item.grupoId,
              descricao: `Mensagem enviada para ${item.grupo.nome}`,
              dadosJson: {
                mensagemId,
                tipo: mensagem.tipo,
              },
            },
          })

          // Aguardar entre envios (evitar ban)
          const delay = Number(process.env.MESSAGE_DELAY_MS || '2000')
          await new Promise((resolve) => setTimeout(resolve, delay))

        } catch (error: any) {
          erros++

          // Atualizar tentativas
          const tentativas = item.tentativas + 1

          await prisma.filaEnvio.update({
            where: { id: item.id },
            data: {
              tentativas,
              status: tentativas >= 3 ? 'erro' : 'pendente',
              erroMensagem: error.message,
            },
          })
        }
      }

      // Atualizar mensagem
      await prisma.mensagem.update({
        where: { id: mensagemId },
        data: {
          totalEnviados: enviados,
          totalErros: erros,
          status: erros === 0 ? 'concluido' : 'erro',
        },
      })
    } catch (error) {

      // Marcar mensagem como erro
      await prisma.mensagem.update({
        where: { id: mensagemId },
        data: { status: 'erro' },
      })
    }
  }

  /**
   * Listar histórico de mensagens
   */
  async listarHistorico(filtros?: {
    tipo?: string
    status?: string
    limite?: number
  }): Promise<any[]> {
    const where: any = {}

    if (filtros?.tipo) where.tipo = filtros.tipo
    if (filtros?.status) where.status = filtros.status

    const mensagens = await prisma.mensagem.findMany({
      where,
      orderBy: { enviadoEm: 'desc' },
      take: filtros?.limite || 50,
      include: {
        filaEnvio: {
          include: {
            grupo: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    })

    return mensagens
  }

  /**
   * Obter detalhes da mensagem
   */
  async obterDetalhes(mensagemId: number): Promise<any> {
    const mensagem = await prisma.mensagem.findUnique({
      where: { id: mensagemId },
      include: {
        filaEnvio: {
          include: {
            grupo: true,
          },
        },
      },
    })

    if (!mensagem) {
      throw new Error('Mensagem não encontrada')
    }

    return mensagem
  }

  /**
   * Obter fila de envio
   */
  async obterFila(filtros?: { status?: string }): Promise<any[]> {
    const where: any = {}

    if (filtros?.status) where.status = filtros.status

    const fila = await prisma.filaEnvio.findMany({
      where,
      include: {
        mensagem: true,
        grupo: true,
      },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    })

    return fila
  }

  /**
   * Retentar envio de mensagens com erro
   */
  async retentarErros(mensagemId: number): Promise<void> {
    // Resetar items com erro
    await prisma.filaEnvio.updateMany({
      where: {
        mensagemId,
        status: 'erro',
      },
      data: {
        status: 'pendente',
        tentativas: 0,
        erroMensagem: null,
      },
    })

    // Processar fila novamente
    await this.processarFila(mensagemId)
  }

  /**
   * Recuperar mensagens travadas (executar no startup)
   * Detecta mensagens que ficaram em "enviando" quando servidor reiniciou
   */
  async recuperarMensagensTravadas(): Promise<void> {
    try {
      // Encontrar mensagens que estão "enviando" há mais de 5 minutos
      const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000)

      const mensagensTravadas = await prisma.mensagem.findMany({
        where: {
          status: 'enviando',
          enviadoEm: { lt: cincoMinutosAtras },
        },
      })

      if (mensagensTravadas.length === 0) {
        return
      }

      for (const mensagem of mensagensTravadas) {
        // Verificar items da fila
        const [itemsEnviando, itemsPendentes, itemsEnviados] = await Promise.all([
          prisma.filaEnvio.count({
            where: { mensagemId: mensagem.id, status: 'enviando' },
          }),
          prisma.filaEnvio.count({
            where: { mensagemId: mensagem.id, status: 'pendente' },
          }),
          prisma.filaEnvio.count({
            where: { mensagemId: mensagem.id, status: 'enviado' },
          }),
        ])

        // Resetar items que estavam "enviando" para "pendente"
        if (itemsEnviando > 0) {
          await prisma.filaEnvio.updateMany({
            where: {
              mensagemId: mensagem.id,
              status: 'enviando',
            },
            data: {
              status: 'pendente',
            },
          })
        }

        // Decidir o que fazer com a mensagem
        if (itemsPendentes > 0 || itemsEnviando > 0) {
          // Tem items para enviar, resetar para pendente
          await prisma.mensagem.update({
            where: { id: mensagem.id },
            data: { status: 'pendente' },
          })

          // Processar novamente
          this.processarFila(mensagem.id).catch(() => {
            // Error reprocessing message
          })
        } else if (itemsEnviados === mensagem.totalGrupos) {
          // Todos foram enviados, marcar como concluído
          await prisma.mensagem.update({
            where: { id: mensagem.id },
            data: {
              status: 'concluido',
              totalEnviados: itemsEnviados,
            },
          })
        } else {
          // Alguns falharam, marcar como erro
          const erros = mensagem.totalGrupos - itemsEnviados

          await prisma.mensagem.update({
            where: { id: mensagem.id },
            data: {
              status: 'erro',
              totalEnviados: itemsEnviados,
              totalErros: erros,
            },
          })
        }
      }
    } catch (error) {
      // Error recovering stuck messages
    }
  }

  /**
   * Obter estatísticas de mensagens
   */
  async obterEstatisticas(): Promise<any> {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const [totalHoje, totalGeral, pendentes, comErro] = await Promise.all([
      prisma.mensagem.count({
        where: { enviadoEm: { gte: hoje } },
      }),
      prisma.mensagem.count(),
      prisma.filaEnvio.count({
        where: { status: 'pendente' },
      }),
      prisma.filaEnvio.count({
        where: { status: 'erro' },
      }),
    ])

    return {
      totalHoje,
      totalGeral,
      pendentes,
      comErro,
    }
  }

  /**
   * Enviar para todos os grupos ativos
   */
  async enviarParaTodosGrupos(input: {
    tipo: 'texto' | 'imagem' | 'video' | 'documento' | 'audio'
    conteudo?: string
    caminhoArquivo?: string
    nomeArquivo?: string
    mimeType?: string
  }): Promise<any> {
    // Buscar todos os grupos ativos
    const grupos = await prisma.grupo.findMany({
      where: {
        status: { in: ['ativo', 'cheio'] },
        whatsappGroupId: { not: null },
      },
      select: { id: true },
    })

    const grupoIds = grupos.map((g) => g.id)

    if (grupoIds.length === 0) {
      throw new Error('Nenhum grupo disponível para envio')
    }

    return this.enviarMensagem({
      ...input,
      grupoIds,
    })
  }
}

export const mensagemService = new MensagemService()
