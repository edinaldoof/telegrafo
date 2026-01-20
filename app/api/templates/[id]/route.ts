import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const TemplateUpdateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  descricao: z.string().optional(),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório').optional(),
  tipo: z.enum(['texto', 'imagem', 'video', 'documento']).optional(),
  categoria: z.string().optional(),
  mediaUrl: z.string().url().optional().or(z.literal('')),
  ativo: z.boolean().optional(),
})

/**
 * GET /api/templates/[id]
 * Obter template por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const templateId = parseInt(id)

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        variaveis: true,
        _count: {
          select: { agendamentos: true }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Erro ao buscar template:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao buscar template' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/templates/[id]
 * Atualizar template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const templateId = parseInt(id)

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const validated = TemplateUpdateSchema.parse(body)

    // Se o conteúdo foi atualizado, extrair novas variáveis
    let variaveisParaCriar: string[] = []
    if (validated.conteudo) {
      const variavelRegex = /\{\{(\w+)\}\}/g
      let match
      while ((match = variavelRegex.exec(validated.conteudo)) !== null) {
        if (!variaveisParaCriar.includes(match[1])) {
          variaveisParaCriar.push(match[1])
        }
      }
    }

    // Atualizar template
    const template = await prisma.template.update({
      where: { id: templateId },
      data: {
        ...(validated.nome && { nome: validated.nome }),
        ...(validated.descricao !== undefined && { descricao: validated.descricao || null }),
        ...(validated.conteudo && { conteudo: validated.conteudo }),
        ...(validated.tipo && { tipo: validated.tipo }),
        ...(validated.categoria !== undefined && { categoria: validated.categoria || null }),
        ...(validated.mediaUrl !== undefined && { mediaUrl: validated.mediaUrl || null }),
        ...(validated.ativo !== undefined && { ativo: validated.ativo }),
      },
    })

    // Se o conteúdo foi atualizado, atualizar variáveis
    if (validated.conteudo && variaveisParaCriar.length > 0) {
      // Remover variáveis antigas
      await prisma.templateVariavel.deleteMany({
        where: { templateId }
      })

      // Criar novas variáveis
      await prisma.templateVariavel.createMany({
        data: variaveisParaCriar.map(nome => ({
          templateId,
          nome,
          obrigatorio: true,
        }))
      })
    }

    // Buscar template atualizado com variáveis
    const templateAtualizado = await prisma.template.findUnique({
      where: { id: templateId },
      include: { variaveis: true }
    })

    return NextResponse.json({
      message: 'Template atualizado com sucesso',
      template: templateAtualizado,
    })
  } catch (error) {
    console.error('Erro ao atualizar template:', error)

    if ((error as any).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: (error as any).errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao atualizar template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/[id]
 * Remover template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const templateId = parseInt(id)

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Verificar se template existe
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: { agendamentos: true }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    // Avisar se tem agendamentos associados
    if (template._count.agendamentos > 0) {
      return NextResponse.json(
        {
          error: 'Template não pode ser removido pois possui agendamentos associados',
          agendamentos: template._count.agendamentos
        },
        { status: 400 }
      )
    }

    // Deletar variáveis primeiro (cascade deveria fazer, mas por segurança)
    await prisma.templateVariavel.deleteMany({
      where: { templateId }
    })

    // Deletar template
    await prisma.template.delete({
      where: { id: templateId }
    })

    return NextResponse.json({ message: 'Template removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover template:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao remover template' },
      { status: 500 }
    )
  }
}
