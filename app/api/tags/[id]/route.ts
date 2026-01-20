import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTagSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  cor: z.string().optional(),
  descricao: z.string().optional(),
})

/**
 * GET /api/tags/:id
 * Retorna detalhes de uma tag específica com lista de contatos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tagId = parseInt(id)

    if (isNaN(tagId) || tagId <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        contatos: {
          include: {
            contato: {
              select: {
                id: true,
                numeroWhatsapp: true,
                nomeContato: true,
                email: true,
                empresa: true,
                ativo: true,
              },
            },
          },
        },
        _count: {
          select: { contatos: true },
        },
      },
    })

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: tag.id,
      nome: tag.nome,
      cor: tag.cor,
      descricao: tag.descricao,
      criadoEm: tag.criadoEm,
      totalContatos: tag._count.contatos,
      contatos: tag.contatos.map((ct) => ct.contato),
    })
  } catch (error) {
    console.error('Erro ao buscar tag:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar tag' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tags/:id
 * Atualiza nome, cor ou descrição da tag
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tagId = parseInt(id)

    if (isNaN(tagId) || tagId <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const payload = updateTagSchema.parse(body)

    // Verificar se tag existe
    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se nome já existe (se estiver alterando)
    if (payload.nome && payload.nome !== existing.nome) {
      const duplicate = await prisma.tag.findUnique({
        where: { nome: payload.nome },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Já existe uma tag com esse nome' },
          { status: 409 }
        )
      }
    }

    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: payload,
    })

    return NextResponse.json({
      success: true,
      tag,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar tag:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar tag' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tags/:id
 * Deleta a tag (associações são removidas em cascata pelo Prisma)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tagId = parseInt(id)

    if (isNaN(tagId) || tagId <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se tag existe
    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        _count: {
          select: { contatos: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    // Deletar tag (as associações são removidas em cascata)
    await prisma.tag.delete({
      where: { id: tagId },
    })

    return NextResponse.json({
      success: true,
      message: `Tag "${existing.nome}" removida com sucesso`,
      contatosDesvinculados: existing._count.contatos,
    })
  } catch (error) {
    console.error('Erro ao deletar tag:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar tag' },
      { status: 500 }
    )
  }
}
