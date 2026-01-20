import { prisma } from '../prisma'

interface CreateTemplateInput {
  nome: string
  descricao?: string
  conteudo: string
  tipo?: 'texto' | 'imagem' | 'video' | 'documento'
  categoria?: string
  providerId?: number
  mediaUrl?: string
  variaveis?: Array<{
    nome: string
    exemplo?: string
    obrigatorio?: boolean
  }>
}

interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: number
}

class TemplateService {
  /**
   * Extrair variáveis do conteúdo do template
   * Exemplo: "Olá {{nome}}, bem-vindo à {{empresa}}" -> ['nome', 'empresa']
   */
  private extrairVariaveis(conteudo: string): string[] {
    const regex = /\{\{(\w+)\}\}/g
    const variaveis: string[] = []
    let match

    while ((match = regex.exec(conteudo)) !== null) {
      if (!variaveis.includes(match[1])) {
        variaveis.push(match[1])
      }
    }

    return variaveis
  }

  /**
   * Renderizar template com dados reais
   */
  renderizar(conteudo: string, dados: Record<string, any>): string {
    let resultado = conteudo

    Object.keys(dados).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      resultado = resultado.replace(regex, String(dados[key] || ''))
    })

    return resultado
  }

  /**
   * Criar novo template
   */
  async criar(input: CreateTemplateInput): Promise<any> {
    try {
      // Extrair variáveis do conteúdo
      const variaveisConteudo = this.extrairVariaveis(input.conteudo)

      const template = await prisma.template.create({
        data: {
          nome: input.nome,
          descricao: input.descricao,
          conteudo: input.conteudo,
          tipo: input.tipo || 'texto',
          categoria: input.categoria,
          providerId: input.providerId,
          mediaUrl: input.mediaUrl,
          ativo: true,
          variaveis: {
            create:
              input.variaveis?.map((v) => ({
                nome: v.nome,
                exemplo: v.exemplo,
                obrigatorio: v.obrigatorio || false,
              })) ||
              variaveisConteudo.map((nome) => ({
                nome,
                obrigatorio: false,
              })),
          },
        },
        include: {
          variaveis: true,
          provider: true,
        },
      })

      return template
    } catch (error) {
      throw error
    }
  }

  /**
   * Listar templates com filtros
   */
  async listar(filtros?: {
    tipo?: string
    categoria?: string
    ativo?: boolean
    providerId?: number
    busca?: string
  }): Promise<any[]> {
    const where: any = {}

    if (filtros?.tipo) where.tipo = filtros.tipo
    if (filtros?.categoria) where.categoria = filtros.categoria
    if (filtros?.ativo !== undefined) where.ativo = filtros.ativo
    if (filtros?.providerId) where.providerId = filtros.providerId
    if (filtros?.busca) {
      where.OR = [
        { nome: { contains: filtros.busca, mode: 'insensitive' } },
        { descricao: { contains: filtros.busca, mode: 'insensitive' } },
      ]
    }

    const templates = await prisma.template.findMany({
      where,
      include: {
        variaveis: true,
        provider: true,
        _count: {
          select: { agendamentos: true },
        },
      },
      orderBy: { criadoEm: 'desc' },
    })

    return templates
  }

  /**
   * Obter template por ID
   */
  async obterPorId(id: number): Promise<any> {
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        variaveis: true,
        provider: true,
        agendamentos: {
          take: 10,
          orderBy: { criadoEm: 'desc' },
        },
      },
    })

    if (!template) {
      throw new Error('Template não encontrado')
    }

    return template
  }

  /**
   * Atualizar template
   */
  async atualizar(input: UpdateTemplateInput): Promise<any> {
    try {
      const { id, variaveis, ...data } = input

      // Se o conteúdo foi alterado, atualizar variáveis
      if (data.conteudo) {
        const variaveisConteudo = this.extrairVariaveis(data.conteudo)

        // Deletar variáveis antigas
        await prisma.templateVariavel.deleteMany({
          where: { templateId: id },
        })

        // Criar novas variáveis
        await prisma.templateVariavel.createMany({
          data:
            variaveis?.map((v) => ({
              templateId: id,
              nome: v.nome,
              exemplo: v.exemplo,
              obrigatorio: v.obrigatorio || false,
            })) ||
            variaveisConteudo.map((nome) => ({
              templateId: id,
              nome,
              obrigatorio: false,
            })),
        })
      }

      const template = await prisma.template.update({
        where: { id },
        data,
        include: {
          variaveis: true,
          provider: true,
        },
      })

      return template
    } catch (error) {
      throw error
    }
  }

  /**
   * Deletar template
   */
  async deletar(id: number): Promise<void> {
    try {
      // Verificar se tem agendamentos pendentes
      const agendamentosPendentes = await prisma.agendamento.count({
        where: {
          templateId: id,
          status: { in: ['pendente', 'executando'] },
        },
      })

      if (agendamentosPendentes > 0) {
        throw new Error(
          'Não é possível deletar template com agendamentos pendentes'
        )
      }

      await prisma.template.delete({
        where: { id },
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * Ativar/Desativar template
   */
  async toggleAtivo(id: number): Promise<any> {
    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      throw new Error('Template não encontrado')
    }

    return prisma.template.update({
      where: { id },
      data: { ativo: !template.ativo },
    })
  }

  /**
   * Duplicar template
   */
  async duplicar(id: number): Promise<any> {
    const original = await this.obterPorId(id)

    const duplicado = await prisma.template.create({
      data: {
        nome: `${original.nome} (Cópia)`,
        descricao: original.descricao,
        conteudo: original.conteudo,
        tipo: original.tipo,
        categoria: original.categoria,
        providerId: original.providerId,
        mediaUrl: original.mediaUrl,
        ativo: true,
        variaveis: {
          create: original.variaveis.map((v: any) => ({
            nome: v.nome,
            exemplo: v.exemplo,
            obrigatorio: v.obrigatorio,
          })),
        },
      },
      include: {
        variaveis: true,
        provider: true,
      },
    })

    return duplicado
  }

  /**
   * Preview de template com dados de exemplo
   */
  async preview(
    id: number,
    dadosExemplo?: Record<string, any>
  ): Promise<string> {
    const template = await this.obterPorId(id)

    // Usar dados de exemplo das variáveis se não fornecidos
    const dados =
      dadosExemplo ||
      template.variaveis.reduce((acc: any, v: any) => {
        acc[v.nome] = v.exemplo || `[${v.nome}]`
        return acc
      }, {})

    return this.renderizar(template.conteudo, dados)
  }

  /**
   * Validar template
   */
  validar(conteudo: string): {
    valido: boolean
    erros: string[]
    variaveis: string[]
  } {
    const erros: string[] = []
    const variaveis = this.extrairVariaveis(conteudo)

    // Verificar sintaxe de variáveis
    const regex = /\{\{([^}]*)\}\}/g
    let match

    while ((match = regex.exec(conteudo)) !== null) {
      const nomeVariavel = match[1].trim()

      if (!nomeVariavel) {
        erros.push('Variável vazia encontrada: {{}}')
      }

      if (!/^\w+$/.test(nomeVariavel)) {
        erros.push(
          `Variável inválida: {{${nomeVariavel}}} (use apenas letras, números e _)`
        )
      }
    }

    return {
      valido: erros.length === 0,
      erros,
      variaveis,
    }
  }

  /**
   * Estatísticas de templates
   */
  async obterEstatisticas(): Promise<any> {
    const [
      total,
      ativos,
      porTipo,
      maisUsados,
    ] = await Promise.all([
      prisma.template.count(),
      prisma.template.count({ where: { ativo: true } }),
      prisma.template.groupBy({
        by: ['tipo'],
        _count: true,
      }),
      prisma.template.findMany({
        take: 5,
        include: {
          _count: {
            select: { agendamentos: true },
          },
        },
        orderBy: {
          agendamentos: {
            _count: 'desc',
          },
        },
      }),
    ])

    return {
      total,
      ativos,
      inativos: total - ativos,
      porTipo,
      maisUsados,
    }
  }
}

export const templateService = new TemplateService()
