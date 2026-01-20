import { prisma } from '../prisma'

interface CreateTagInput {
  nome: string
  cor?: string
  descricao?: string
}

class TagService {
  /**
   * Criar nova tag
   */
  async criar(input: CreateTagInput): Promise<any> {
    try {
      const tag = await prisma.tag.create({
        data: {
          nome: input.nome,
          cor: input.cor || this.gerarCorAleatoria(),
          descricao: input.descricao,
        },
      })

      return tag
    } catch (error) {
      throw error
    }
  }

  /**
   * Listar todas as tags
   */
  async listar(): Promise<any[]> {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { contatos: true },
        },
      },
      orderBy: { nome: 'asc' },
    })

    return tags
  }

  /**
   * Atualizar tag
   */
  async atualizar(
    id: number,
    data: Partial<CreateTagInput>
  ): Promise<any> {
    return prisma.tag.update({
      where: { id },
      data,
    })
  }

  /**
   * Deletar tag
   */
  async deletar(id: number): Promise<void> {
    await prisma.tag.delete({
      where: { id },
    })
  }

  /**
   * Adicionar tag a contato
   */
  async adicionarAoContato(contatoId: number, tagId: number): Promise<any> {
    return prisma.contatoTag.create({
      data: {
        contatoId,
        tagId,
      },
    })
  }

  /**
   * Remover tag de contato
   */
  async removerDoContato(contatoId: number, tagId: number): Promise<void> {
    await prisma.contatoTag.delete({
      where: {
        contatoId_tagId: {
          contatoId,
          tagId,
        },
      },
    })
  }

  /**
   * Adicionar tag a múltiplos contatos (bulk)
   */
  async adicionarEmMassa(contatosIds: number[], tagId: number): Promise<void> {
    const data = contatosIds.map((contatoId) => ({
      contatoId,
      tagId,
    }))

    await prisma.contatoTag.createMany({
      data,
      skipDuplicates: true,
    })
  }

  /**
   * Remover tag de múltiplos contatos (bulk)
   */
  async removerEmMassa(contatosIds: number[], tagId: number): Promise<void> {
    await prisma.contatoTag.deleteMany({
      where: {
        contatoId: { in: contatosIds },
        tagId,
      },
    })
  }

  /**
   * Obter tags de um contato
   */
  async obterPorContato(contatoId: number): Promise<any[]> {
    const contatoTags = await prisma.contatoTag.findMany({
      where: { contatoId },
      include: {
        tag: true,
      },
    })

    return contatoTags.map((ct) => ct.tag)
  }

  /**
   * Gerar cor aleatória para tag
   */
  private gerarCorAleatoria(): string {
    const cores = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // yellow
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#84CC16', // lime
    ]

    return cores[Math.floor(Math.random() * cores.length)]
  }
}

export const tagService = new TagService()
