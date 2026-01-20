import { NextRequest, NextResponse } from 'next/server'
import { agendamentoService } from '@/lib/services/agendamento.service'

/**
 * POST /api/agendamentos/[id]/executar
 * Executar agendamento manualmente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    await agendamentoService.executar(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao executar agendamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao executar agendamento' },
      { status: 400 }
    )
  }
}
