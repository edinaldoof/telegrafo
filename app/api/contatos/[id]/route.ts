import { NextRequest, NextResponse } from 'next/server'
import { contatoService } from '@/lib/services/contato.service'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/contatos/[id]
 * Obter contato por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contatoId = parseInt(id)

    if (isNaN(contatoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const contato = await prisma.contato.findUnique({
      where: { id: contatoId },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    })

    if (!contato) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ contato })
  } catch (error) {
    console.error('Erro ao buscar contato:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao buscar contato' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/contatos/[id]
 * Atualizar contato
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contatoId = parseInt(id)

    if (isNaN(contatoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()

    const contato = await prisma.contato.update({
      where: { id: contatoId },
      data: {
        nomeContato: body.nomeContato,
        numeroWhatsapp: body.numeroWhatsapp,
        email: body.email || null,
        empresa: body.empresa || null,
        ativo: body.ativo ?? true,
      },
    })

    return NextResponse.json({
      message: 'Contato atualizado com sucesso',
      contato,
    })
  } catch (error) {
    console.error('Erro ao atualizar contato:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao atualizar contato' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/contatos/[id]
 * Remover contato
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contatoId = parseInt(id)

    if (isNaN(contatoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await contatoService.removerContato(contatoId)

    return NextResponse.json({ message: 'Contato removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover contato:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao remover contato' },
      { status: 500 }
    )
  }
}
