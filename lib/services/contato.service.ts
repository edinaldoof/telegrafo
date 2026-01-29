import { prisma } from '../prisma'
import { baileysDirectService } from './baileys-direct.service'
import { grupoService } from './grupo.service'
import Papa from 'papaparse'
import { cache } from '@/lib/cache/cache'
import { logger } from '@/lib/observability/log'
import { cleanPhoneNumber, addBrazilCountryCode } from '@/lib/utils/phone-formatter'

const log = logger.child({ service: 'contato' })

interface ContatoInput {
  numeroWhatsapp: string
  nomeContato?: string
}

class ContatoService {
  /**
   * Adicionar um contato e distribuir no grupo atual
   */
  async adicionarContato(input: ContatoInput): Promise<any> {
    try {
      // Validar formato do número (deve ser internacional)
      const numeroLimpo = this.limparNumero(input.numeroWhatsapp)

      // Verificar se já existe
      const existente = await prisma.contato.findFirst({
        where: { numeroWhatsapp: numeroLimpo },
      })

      if (existente) {
        throw new Error('Contato já existe')
      }

      // Obter grupo atual
      const grupoAtual = await grupoService.obterGrupoAtual()

      if (!grupoAtual) {
        throw new Error('Nenhum grupo disponível')
      }

      // Adicionar ao grupo no WhatsApp via Baileys
      // TODO: Precisamos da instanceName para usar o Baileys
      // Por enquanto, pular adição automática ao grupo
      // await baileysDirectService.addGroupParticipants(instanceName, grupoAtual.whatsappGroupId, [numeroLimpo])

      // Salvar no banco
      const contato = await prisma.contato.create({
        data: {
          numeroWhatsapp: numeroLimpo,
          nomeContato: input.nomeContato,
          grupoId: grupoAtual.id,
          ativo: true,
        },
      })

      // Atualizar contagem
      await grupoService.atualizarContagemMembros(grupoAtual.whatsappGroupId)

      // Log
      await prisma.logEvento.create({
        data: {
          tipo: 'contato_adicionado',
          grupoId: grupoAtual.id,
          descricao: `Contato adicionado: ${numeroLimpo}`,
          dadosJson: { numeroWhatsapp: numeroLimpo, nome: input.nomeContato },
        },
      })

      return contato
    } catch (error) {
      log.error('Failed to add contact', error, { numeroWhatsapp: input.numeroWhatsapp })
      throw error
    }
  }

  /**
   * Importar contatos de CSV
   */
  async importarCSV(csvContent: string): Promise<{
    sucesso: number
    erros: number
    detalhes: any[]
  }> {
    return new Promise((resolve, reject) => {
      const resultados: any[] = []
      let sucesso = 0
      let erros = 0

      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            for (const row of results.data as any[]) {
              try {
                const numeroWhatsapp = row.numero || row.telefone || row.phone
                const nomeContato = row.nome || row.name || row.nome_completo

                if (!numeroWhatsapp) {
                  resultados.push({
                    linha: row,
                    erro: 'Número não encontrado',
                  })
                  erros++
                  continue
                }

                await this.adicionarContato({
                  numeroWhatsapp,
                  nomeContato,
                })

                resultados.push({
                  numeroWhatsapp,
                  nomeContato,
                  status: 'sucesso',
                })
                sucesso++

                // Aguardar 2 segundos entre cada adição (evitar ban)
                await new Promise((r) => setTimeout(r, 2000))
              } catch (error: any) {
                resultados.push({
                  linha: row,
                  erro: error.message,
                })
                erros++
              }
            }

            resolve({ sucesso, erros, detalhes: resultados })
          } catch (error) {
            reject(error)
          }
        },
        error: (error: Error) => {
          reject(error)
        },
      })
    })
  }

  /**
   * Listar contatos
   */
  async listarContatos(filtros?: {
    grupoId?: number
    ativo?: boolean
    busca?: string
  }): Promise<any[]> {
    const where: any = {}

    if (filtros?.grupoId) where.grupoId = filtros.grupoId
    if (filtros?.ativo !== undefined) where.ativo = filtros.ativo
    if (filtros?.busca) {
      where.OR = [
        { numeroWhatsapp: { contains: filtros.busca } },
        { nomeContato: { contains: filtros.busca } },
      ]
    }

    // Buscar contatos sem cache para garantir dados atualizados
    const contatos = await prisma.contato.findMany({
      where,
      include: {
        grupo: {
          select: {
            id: true,
            nome: true,
            numeroGrupo: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { dataAdicao: 'desc' },
    })

    // Retornar tags com objeto completo (id, nome, cor)
    const result = contatos.map(contato => ({
      ...contato,
      nome: contato.nomeContato,
      tags: contato.tags.map((relacao) => ({
        tag: {
          id: relacao.tag.id,
          nome: relacao.tag.nome,
          cor: relacao.tag.cor,
        }
      })),
    }))

    return result
  }

  /**
   * Remover contato
   */
  async removerContato(contatoId: number): Promise<void> {
    const contato = await prisma.contato.findUnique({
      where: { id: contatoId },
      include: { grupo: true },
    })

    if (!contato) {
      throw new Error('Contato não encontrado')
    }

    // Remover do WhatsApp se tiver grupo
    // TODO: Precisamos da instanceName para usar o Baileys
    // Por enquanto, apenas marcar como inativo no banco
    // if (contato.grupo && contato.grupo.whatsappGroupId) {
    //   try {
    //     await baileysDirectService.removeGroupParticipants(instanceName, contato.grupo.whatsappGroupId, [contato.numeroWhatsapp])
    //   } catch (error) {
    //     console.error('Erro ao remover do WhatsApp:', error)
    //   }
    // }

    // Marcar como inativo
    await prisma.contato.update({
      where: { id: contatoId },
      data: { ativo: false },
    })

    // Log
    await prisma.logEvento.create({
      data: {
        tipo: 'contato_removido',
        grupoId: contato.grupoId,
        descricao: `Contato removido: ${contato.numeroWhatsapp}`,
        dadosJson: { contatoId, numeroWhatsapp: contato.numeroWhatsapp },
      },
    })
  }

  /**
   * Distribuir contatos pendentes (sem grupo) nos grupos
   */
  async distribuirContatosPendentes(): Promise<{
    distribuidos: number
    erros: number
  }> {
    // Buscar contatos sem grupo
    const contatosPendentes = await prisma.contato.findMany({
      where: {
        grupoId: null,
        ativo: true,
      },
    })

    let distribuidos = 0
    let erros = 0

    for (const contato of contatosPendentes) {
      try {
        // Obter grupo atual
        const grupoAtual = await grupoService.obterGrupoAtual()

        if (!grupoAtual) {
          throw new Error('Nenhum grupo disponível')
        }

        // Adicionar ao grupo via Baileys
        // TODO: Precisamos da instanceName
        // await baileysDirectService.addGroupParticipants(instanceName, grupoAtual.whatsappGroupId, [contato.numeroWhatsapp])

        // Atualizar no banco
        await prisma.contato.update({
          where: { id: contato.id },
          data: { grupoId: grupoAtual.id },
        })

        distribuidos++

        // Aguardar 2 segundos
        await new Promise((r) => setTimeout(r, 2000))

        // Atualizar contagem
        await grupoService.atualizarContagemMembros(grupoAtual.whatsappGroupId)
      } catch (error) {
        log.error('Failed to distribute contact', error, { contatoId: contato.id, numeroWhatsapp: contato.numeroWhatsapp })
        erros++
      }
    }

    return { distribuidos, erros }
  }

  /**
   * Limpar número de telefone (uses centralized utility)
   */
  private limparNumero(numero: string): string {
    const limpo = addBrazilCountryCode(cleanPhoneNumber(numero))
    // Formato: 5511999999999@s.whatsapp.net
    return limpo + '@s.whatsapp.net'
  }

  /**
   * Sincronizar contatos vindos do WhatsApp (Baileys contacts.upsert)
   * Faz upsert em lote: cria novos ou atualiza nome de existentes
   */
  async syncFromWhatsApp(contacts: Array<{ phone: string; name?: string }>): Promise<{
    novos: number
    atualizados: number
    ignorados: number
  }> {
    let novos = 0
    let atualizados = 0
    let ignorados = 0

    // Processar em lotes de 100 dentro de uma transação
    const BATCH_SIZE = 100
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE)

      await prisma.$transaction(async (tx) => {
        for (const contact of batch) {
          try {
            if (!contact.phone) {
              ignorados++
              continue
            }

            const numeroLimpo = addBrazilCountryCode(cleanPhoneNumber(contact.phone))
            if (!numeroLimpo || numeroLimpo.length < 10) {
              ignorados++
              continue
            }

            const numeroWhatsapp = numeroLimpo + '@s.whatsapp.net'

            const existente = await tx.contato.findFirst({
              where: { numeroWhatsapp },
            })

            if (existente) {
              // Atualizar nome se veio do WhatsApp e o contato não tem nome
              if (contact.name && !existente.nomeContato) {
                await tx.contato.update({
                  where: { id: existente.id },
                  data: { nomeContato: contact.name },
                })
              }
              atualizados++
            } else {
              await tx.contato.create({
                data: {
                  numeroWhatsapp,
                  nomeContato: contact.name || null,
                  ativo: true,
                },
              })
              novos++
            }
          } catch {
            ignorados++
          }
        }
      }, { timeout: 30000 })
    }

    // Log do evento
    await prisma.logEvento.create({
      data: {
        tipo: 'sync_whatsapp',
        descricao: `Sync WhatsApp: ${novos} novos, ${atualizados} atualizados, ${ignorados} ignorados`,
        dadosJson: { novos, atualizados, ignorados },
      },
    })

    return { novos, atualizados, ignorados }
  }

  /**
   * Obter estatísticas de contatos
   */
  async obterEstatisticas(): Promise<any> {
    const [total, ativos, inativos, semGrupo, semTag] = await Promise.all([
      prisma.contato.count(),
      prisma.contato.count({ where: { ativo: true } }),
      prisma.contato.count({ where: { ativo: false } }),
      prisma.contato.count({ where: { grupoId: null, ativo: true } }),
      prisma.contato.count({ where: { ativo: true, tags: { none: {} } } }),
    ])

    return {
      total,
      ativos,
      inativos,
      semGrupo,
      semTag,
    }
  }
}

export const contatoService = new ContatoService()
