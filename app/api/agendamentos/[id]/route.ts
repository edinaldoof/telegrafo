import { NextRequest, NextResponse } from 'next/server'
import { agendamentoService } from '@/lib/services/agendamento.service'

/**
 * GET /api/agendamentos/[id]
 * Obter agendamento por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const agendamento = await agendamentoService.obterPorId(id)

    return NextResponse.json(agendamento)
  } catch (error: any) {
    console.error('Erro ao obter agendamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao obter agendamento' },
      { status: 404 }
    )
  }
}

/**
 * PUT /api/agendamentos/[id]
 * Atualizar agendamento
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const body = await request.json()

    const agendamento = await agendamentoService.atualizar({
      id,
      ...body,
      dataAgendamento: body.dataAgendamento
        ? new Date(body.dataAgendamento)
        : undefined,
    })

    return NextResponse.json(agendamento)
  } catch (error: any) {
    console.error('Erro ao atualizar agendamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar agendamento' },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/agendamentos/[id]
 * Deletar agendamento
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    await agendamentoService.deletar(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar agendamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar agendamento' },
      { status: 400 }
    )
  }
}
