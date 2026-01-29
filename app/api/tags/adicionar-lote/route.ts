import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tagService } from '@/lib/services/tag.service'

/**
 * POST /api/tags/adicionar-lote
 * Adicionar N contatos sem tag a uma tag específica
 * Body: { tagId: number, quantidade: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tagId, quantidade } = body

    if (!tagId || !quantidade) {
      return NextResponse.json(
        { error: 'tagId e quantidade são obrigatórios' },
        { status: 400 }
      )
    }

    if (quantidade < 1 || quantidade > 10000) {
      return NextResponse.json(
        { error: 'Quantidade deve ser entre 1 e 10.000' },
        { status: 400 }
      )
    }

    // Verificar se a tag existe
    const tag = await prisma.tag.findUnique({ where: { id: tagId } })
    if (!tag) {
      return NextResponse.json(
        { error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    // Buscar contatos ativos sem NENHUMA tag, mais antigos primeiro
    const contatosSemTag = await prisma.contato.findMany({
      where: {
        ativo: true,
        tags: { none: {} },
      },
      orderBy: { dataAdicao: 'asc' },
      take: quantidade,
      select: { id: true },
    })

    if (contatosSemTag.length === 0) {
      return NextResponse.json({
        adicionados: 0,
        totalSemTagRestante: 0,
        message: 'Nenhum contato sem tag disponível',
      })
    }

    // Adicionar em massa
    const ids = contatosSemTag.map(c => c.id)
    await tagService.adicionarEmMassa(ids, tagId)

    // Contar restantes sem tag
    const totalSemTagRestante = await prisma.contato.count({
      where: {
        ativo: true,
        tags: { none: {} },
      },
    })

    // Log
    await prisma.logEvento.create({
      data: {
        tipo: 'tag_lote',
        descricao: `${ids.length} contatos adicionados à tag "${tag.nome}"`,
        dadosJson: { tagId, tagNome: tag.nome, quantidade: ids.length },
      },
    })

    return NextResponse.json({
      adicionados: ids.length,
      totalSemTagRestante,
      message: `${ids.length} contatos adicionados à tag "${tag.nome}"`,
    })
  } catch (error: any) {
    console.error('Erro ao adicionar contatos em lote:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar contatos em lote' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tags/adicionar-lote
 * Retorna a contagem de contatos sem tag
 */
export async function GET() {
  try {
    const totalSemTag = await prisma.contato.count({
      where: {
        ativo: true,
        tags: { none: {} },
      },
    })

    return NextResponse.json({ totalSemTag })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao obter contagem' },
      { status: 500 }
    )
  }
}
