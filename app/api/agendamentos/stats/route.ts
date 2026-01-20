import { NextRequest, NextResponse } from 'next/server'
import { agendamentoService } from '@/lib/services/agendamento.service'

/**
 * GET /api/agendamentos/stats
 * Obter estatísticas de agendamentos
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await agendamentoService.obterEstatisticas()

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}
