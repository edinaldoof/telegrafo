import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability/log'
import { cleanPhoneNumber, addBrazilCountryCode } from '@/lib/utils/phone-formatter'
import { dynamicConfigService } from './dynamic-config.service'

const log = logger.child({ service: 'sge' })

// Tipos para os dados da API SGE
export interface SGEInscricaoRaw {
  id: number
  nome_completo: string
  cpf: string
  email: string
  telefone: string
  telefone_alternativo?: string
  cep?: string
  municipio: string
  estado: string
  logradouro?: string
  numero?: string
  bairro?: string
  data_nascimento?: string
  nome_mae?: string
  situacao: string
  turma_id?: number
  created_at?: string
  updated_at?: string
  turma?: {
    id: number
    nome: string
    nome_turma: string
    turno?: string
    vagas?: string
    inscritos?: string
    curso?: {
      id: number
      nome_curso: string
      categoria?: string
    }
    edital?: {
      id: number
      nome_fantasia?: string
      situacao?: string
    }
  }
}

class SGEService {
  private defaultApiUrl = 'https://sge.cotec.go.gov.br/api/v2/inscricoes/api/index'

  /**
   * Obtém a URL da API SGE (primeiro do banco, depois do .env)
   */
  private async getApiUrl(): Promise<string> {
    const url = await dynamicConfigService.get('SGE_API_URL')
    return url || process.env.SGE_API_URL || this.defaultApiUrl
  }

  /**
   * Obtém o token da API SGE (primeiro do banco, depois do .env)
   */
  private async getApiToken(): Promise<string> {
    const token = await dynamicConfigService.get('SGE_API_TOKEN')
    return token || process.env.SGE_API_TOKEN || ''
  }

  /**
   * Sincroniza todas as inscrições da API SGE com o banco de dados
   * Processa em lotes para não sobrecarregar a memória
   */
  async sincronizar(progressCallback?: (progress: { total: number; processados: number; novos: number; atualizados: number }) => void): Promise<{
    total: number
    novos: number
    atualizados: number
    erros: number
    tempoMs: number
  }> {
    const apiToken = await this.getApiToken()
    const apiUrl = await this.getApiUrl()

    if (!apiToken) {
      throw new Error('SGE_API_TOKEN não configurado. Acesse Configurações para adicionar.')
    }

    log.info('Iniciando sincronização SGE...')
    const startTime = Date.now()

    try {
      // 1. Buscar dados da API (isso pode demorar)
      log.info('Buscando dados da API SGE...')
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(60000), // 60 segundos timeout
      })

      if (!response.ok) {
        throw new Error(`SGE API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Formato de resposta inválido da API SGE')
      }

      const inscricoesRaw: SGEInscricaoRaw[] = data.data
      log.info(`Recebidas ${inscricoesRaw.length} inscrições da API SGE`)

      // 2. Processar em lotes de 500
      const BATCH_SIZE = 500
      let novos = 0
      let atualizados = 0
      let erros = 0

      for (let i = 0; i < inscricoesRaw.length; i += BATCH_SIZE) {
        const batch = inscricoesRaw.slice(i, i + BATCH_SIZE)

        const resultado = await this.processarLote(batch)
        novos += resultado.novos
        atualizados += resultado.atualizados
        erros += resultado.erros

        // Callback de progresso
        if (progressCallback) {
          progressCallback({
            total: inscricoesRaw.length,
            processados: Math.min(i + BATCH_SIZE, inscricoesRaw.length),
            novos,
            atualizados,
          })
        }

        log.info(`Processado lote ${Math.ceil((i + BATCH_SIZE) / BATCH_SIZE)}/${Math.ceil(inscricoesRaw.length / BATCH_SIZE)}`)
      }

      const tempoMs = Date.now() - startTime
      log.info(`Sincronização concluída em ${tempoMs}ms - Novos: ${novos}, Atualizados: ${atualizados}, Erros: ${erros}`)

      return {
        total: inscricoesRaw.length,
        novos,
        atualizados,
        erros,
        tempoMs,
      }
    } catch (error) {
      log.error('Erro na sincronização SGE', error)
      throw error
    }
  }

  /**
   * Processa um lote de inscrições usando upsert
   */
  private async processarLote(inscricoes: SGEInscricaoRaw[]): Promise<{
    novos: number
    atualizados: number
    erros: number
  }> {
    let novos = 0
    let atualizados = 0
    let erros = 0

    // Usar transação para garantir consistência
    await prisma.$transaction(async (tx) => {
      for (const inscricao of inscricoes) {
        try {
          const telefoneLimpo = this.normalizarTelefone(inscricao.telefone)

          if (!telefoneLimpo) {
            erros++
            continue
          }

          const dados = {
            nomeCompleto: inscricao.nome_completo,
            cpf: inscricao.cpf,
            email: inscricao.email || null,
            telefone: inscricao.telefone,
            telefoneAlternativo: inscricao.telefone_alternativo || null,
            telefoneLimpo,
            municipio: inscricao.municipio,
            estado: inscricao.estado,
            cep: inscricao.cep || null,
            logradouro: inscricao.logradouro || null,
            numero: inscricao.numero || null,
            bairro: inscricao.bairro || null,
            dataNascimento: inscricao.data_nascimento ? new Date(inscricao.data_nascimento) : null,
            nomeMae: inscricao.nome_mae || null,
            situacao: inscricao.situacao,
            turmaId: inscricao.turma_id || null,
            turmaNome: inscricao.turma?.nome || null,
            cursoNome: inscricao.turma?.curso?.nome_curso || inscricao.turma?.nome_turma || null,
            turno: inscricao.turma?.turno || null,
            editalNome: inscricao.turma?.edital?.nome_fantasia || null,
            dadosExtras: {
              vagas: inscricao.turma?.vagas,
              inscritos: inscricao.turma?.inscritos,
              created_at: inscricao.created_at,
              updated_at: inscricao.updated_at,
            },
          }

          // Verificar se existe pelo CPF (mais confiável que o ID)
          const existente = await tx.inscricaoSGE.findUnique({
            where: { cpf: inscricao.cpf },
          })

          if (existente) {
            await tx.inscricaoSGE.update({
              where: { cpf: inscricao.cpf },
              data: dados,
            })
            atualizados++
          } else {
            await tx.inscricaoSGE.create({
              data: {
                id: inscricao.id,
                ...dados,
              },
            })
            novos++
          }
        } catch (error) {
          log.error('Erro ao processar inscrição', error, { cpf: inscricao.cpf })
          erros++
        }
      }
    }, {
      timeout: 60000, // 60 segundos de timeout para a transação
    })

    return { novos, atualizados, erros }
  }

  /**
   * Normaliza telefone para formato WhatsApp
   */
  private normalizarTelefone(telefone: string): string {
    if (!telefone) return ''
    try {
      return addBrazilCountryCode(cleanPhoneNumber(telefone))
    } catch {
      return ''
    }
  }

  /**
   * Lista inscrições com paginação e filtros (do banco de dados)
   */
  async listar(params: {
    page?: number
    limit?: number
    search?: string
    municipio?: string
    situacao?: string
    curso?: string
    apenasNaoImportados?: boolean
  }): Promise<{
    data: any[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const {
      page = 1,
      limit = 50,
      search,
      municipio,
      situacao,
      curso,
      apenasNaoImportados = false
    } = params

    // Construir where
    const where: any = {}

    if (search) {
      where.OR = [
        { nomeCompleto: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
        { telefoneLimpo: { contains: search } },
        { telefone: { contains: search } },
      ]
    }

    if (municipio && municipio !== 'todos') {
      where.municipio = municipio
    }

    if (situacao && situacao !== 'todos') {
      where.situacao = situacao
    }

    if (curso && curso !== 'todos') {
      where.cursoNome = curso
    }

    if (apenasNaoImportados) {
      where.importadoContato = false
    }

    // Contagem e busca em paralelo
    const [total, inscricoes] = await Promise.all([
      prisma.inscricaoSGE.count({ where }),
      prisma.inscricaoSGE.findMany({
        where,
        orderBy: { nomeCompleto: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return {
      data: inscricoes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Obtém filtros disponíveis (valores únicos)
   */
  async obterFiltros(): Promise<{
    municipios: string[]
    situacoes: string[]
    cursos: string[]
  }> {
    const [municipios, situacoes, cursos] = await Promise.all([
      prisma.inscricaoSGE.findMany({
        select: { municipio: true },
        distinct: ['municipio'],
        orderBy: { municipio: 'asc' },
      }),
      prisma.inscricaoSGE.findMany({
        select: { situacao: true },
        distinct: ['situacao'],
        orderBy: { situacao: 'asc' },
      }),
      prisma.inscricaoSGE.findMany({
        select: { cursoNome: true },
        distinct: ['cursoNome'],
        orderBy: { cursoNome: 'asc' },
        where: { cursoNome: { not: null } },
      }),
    ])

    return {
      municipios: municipios.map(m => m.municipio).filter(Boolean),
      situacoes: situacoes.map(s => s.situacao).filter(Boolean),
      cursos: cursos.map(c => c.cursoNome).filter(Boolean) as string[],
    }
  }

  /**
   * Obtém estatísticas das inscrições
   */
  async obterEstatisticas(): Promise<{
    total: number
    importados: number
    naoImportados: number
    ultimaSincronizacao?: Date
    porMunicipio: { municipio: string; count: number }[]
    porSituacao: { situacao: string; count: number }[]
    porCurso: { curso: string; count: number }[]
  }> {
    const [
      total,
      importados,
      ultimoRegistro,
      porMunicipio,
      porSituacao,
      porCurso,
    ] = await Promise.all([
      prisma.inscricaoSGE.count(),
      prisma.inscricaoSGE.count({ where: { importadoContato: true } }),
      prisma.inscricaoSGE.findFirst({ orderBy: { sincronizadoEm: 'desc' }, select: { sincronizadoEm: true } }),
      prisma.inscricaoSGE.groupBy({
        by: ['municipio'],
        _count: true,
        orderBy: { _count: { municipio: 'desc' } },
        take: 10,
      }),
      prisma.inscricaoSGE.groupBy({
        by: ['situacao'],
        _count: true,
        orderBy: { _count: { situacao: 'desc' } },
      }),
      prisma.inscricaoSGE.groupBy({
        by: ['cursoNome'],
        _count: true,
        orderBy: { _count: { cursoNome: 'desc' } },
        take: 10,
        where: { cursoNome: { not: null } },
      }),
    ])

    return {
      total,
      importados,
      naoImportados: total - importados,
      ultimaSincronizacao: ultimoRegistro?.sincronizadoEm,
      porMunicipio: porMunicipio.map(p => ({ municipio: p.municipio, count: p._count })),
      porSituacao: porSituacao.map(p => ({ situacao: p.situacao, count: p._count })),
      porCurso: porCurso.map(p => ({ curso: p.cursoNome || 'Sem curso', count: p._count })),
    }
  }

  /**
   * Importa inscrições selecionadas como contatos
   */
  async importarComoContatos(inscricaoIds: number[]): Promise<{
    importados: number
    jaExistentes: number
    erros: number
  }> {
    let importados = 0
    let jaExistentes = 0
    let erros = 0

    const inscricoes = await prisma.inscricaoSGE.findMany({
      where: {
        id: { in: inscricaoIds },
        importadoContato: false,
      },
    })

    for (const inscricao of inscricoes) {
      try {
        // Verificar se já existe contato com esse telefone
        const contatoExistente = await prisma.contato.findFirst({
          where: { numeroWhatsapp: inscricao.telefoneLimpo },
        })

        if (contatoExistente) {
          // Apenas marcar como importado e vincular
          await prisma.inscricaoSGE.update({
            where: { id: inscricao.id },
            data: {
              importadoContato: true,
              contatoId: contatoExistente.id,
            },
          })
          jaExistentes++
        } else {
          // Criar novo contato
          const contato = await prisma.contato.create({
            data: {
              numeroWhatsapp: inscricao.telefoneLimpo,
              nomeContato: inscricao.nomeCompleto,
              email: inscricao.email,
              dadosExtras: {
                cpf: inscricao.cpf,
                municipio: inscricao.municipio,
                estado: inscricao.estado,
                curso: inscricao.cursoNome,
                situacaoSGE: inscricao.situacao,
                inscricaoSGEId: inscricao.id,
              },
              ativo: true,
            },
          })

          await prisma.inscricaoSGE.update({
            where: { id: inscricao.id },
            data: {
              importadoContato: true,
              contatoId: contato.id,
            },
          })
          importados++
        }
      } catch (error) {
        log.error('Erro ao importar inscrição como contato', error, { inscricaoId: inscricao.id })
        erros++
      }
    }

    return { importados, jaExistentes, erros }
  }

  /**
   * Busca uma inscrição por ID
   */
  async buscarPorId(id: number) {
    return prisma.inscricaoSGE.findUnique({ where: { id } })
  }
}

export const sgeService = new SGEService()
