import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTagSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cor: z.string().optional(),
  descricao: z.string().optional(),
})

const assignTagsSchema = z.object({
  contatoIds: z.array(z.union([z.string(), z.number()])).min(1, 'Informe ao menos um contato'),
  tagId: z.union([z.string(), z.number()]).optional(),
  tag: z.string().optional(),
})

/**
 * GET /api/tags
 * Retorna todas as tags cadastradas com contagem de contatos vinculados
 */
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: { contatos: true },
        },
      },
    })

    const response = tags.map((tag) => ({
      id: tag.id,
      nome: tag.nome,
      cor: tag.cor,
      descricao: tag.descricao,
      totalContatos: tag._count.contatos,
    }))

    return NextResponse.json({
      tags: response,
      count: response.length,
    })
  } catch (error) {
    console.error('Erro ao listar tags:', error)
    return NextResponse.json(
      { error: 'Erro ao listar tags' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tags
 * Cria uma nova tag ou associa uma tag existente a contatos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Fluxo para atribuição de tag a contatos (retrocompatível)
    if (body.contatoIds) {
      const { contatoIds, tag, tagId } = assignTagsSchema.parse(body)

      const parsedContatoIds = contatoIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)

      if (parsedContatoIds.length === 0) {
        return NextResponse.json(
          { error: 'IDs de contato inválidos' },
          { status: 400 }
        )
      }

      let resolvedTagId: number | null = null

      if (tagId !== undefined) {
        const numericTagId = Number(tagId)
        if (!Number.isInteger(numericTagId) || numericTagId <= 0) {
          return NextResponse.json(
            { error: 'tagId inválido' },
            { status: 400 }
          )
        }

        const existingTag = await prisma.tag.findUnique({
          where: { id: numericTagId },
        })

        if (!existingTag) {
          return NextResponse.json(
            { error: 'Tag não encontrada' },
            { status: 404 }
          )
        }

        resolvedTagId = numericTagId
      } else if (tag) {
        const tagRecord = await prisma.tag.upsert({
          where: { nome: tag },
          create: { nome: tag },
          update: {},
        })
        resolvedTagId = tagRecord.id
      } else {
        return NextResponse.json(
          { error: 'Informe tagId ou tag' },
          { status: 400 }
        )
      }

      await prisma.contatoTag.createMany({
        data: parsedContatoIds.map((contatoId) => ({
          contatoId,
          tagId: resolvedTagId!,
        })),
        skipDuplicates: true,
      })

      return NextResponse.json({
        success: true,
        message: `Tag associada a ${parsedContatoIds.length} contato(s)`,
      })
    }

    // Fluxo de criação de tag
    const payload = createTagSchema.parse(body)
    const tag = await prisma.tag.create({
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

    console.error('Erro ao criar/atribuir tag:', error)
    return NextResponse.json(
      { error: 'Erro ao processar tag' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tags
 * Remove associações de tags ou desvincula dos contatos
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tagIdParam = searchParams.get('tagId')
    const tagNameParam = searchParams.get('tag')
    const contatoIdParam = searchParams.get('contatoId')

    if (!tagIdParam && !tagNameParam) {
      return NextResponse.json(
        { error: 'Informe tagId ou tag' },
        { status: 400 }
      )
    }

    let tagRecord = null

    if (tagIdParam) {
      const tagId = Number(tagIdParam)
      if (!Number.isInteger(tagId) || tagId <= 0) {
        return NextResponse.json(
          { error: 'tagId inválido' },
          { status: 400 }
        )
      }
      tagRecord = await prisma.tag.findUnique({ where: { id: tagId } })
    } else if (tagNameParam) {
      tagRecord = await prisma.tag.findUnique({ where: { nome: tagNameParam } })
    }

    if (!tagRecord) {
      return NextResponse.json(
        { error: 'Tag não encontrada' },
        { status: 404 }
      )
    }

    if (contatoIdParam) {
      const contatoId = Number(contatoIdParam)
      if (!Number.isInteger(contatoId) || contatoId <= 0) {
        return NextResponse.json(
          { error: 'contatoId inválido' },
          { status: 400 }
        )
      }

      await prisma.contatoTag.deleteMany({
        where: {
          contatoId,
          tagId: tagRecord.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Tag removida do contato',
      })
    }

    const deleted = await prisma.contatoTag.deleteMany({
      where: {
        tagId: tagRecord.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Tag desvinculada de ${deleted.count} contato(s)`,
    })
  } catch (error) {
    console.error('Erro ao remover tag:', error)
    return NextResponse.json(
      { error: 'Erro ao remover tag' },
      { status: 500 }
    )
  }
}
