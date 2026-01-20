import { NextRequest, NextResponse } from 'next/server'
import { agendamentoService } from '@/lib/services/agendamento.service'

/**
 * POST /api/agendamentos/[id]/cancelar
 * Cancelar agendamento
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const agendamento = await agendamentoService.cancelar(id)

    return NextResponse.json(agendamento)
  } catch (error: any) {
    console.error('Erro ao cancelar agendamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao cancelar agendamento' },
      { status: 400 }
    )
  }
}
