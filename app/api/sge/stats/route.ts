import { NextRequest, NextResponse } from 'next/server'
import { sgeService } from '@/lib/services/sge.service'

/**
 * GET /api/sge/stats
 * Retorna estatísticas das inscrições SGE
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await sgeService.obterEstatisticas()

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro ao obter estatísticas SGE:', error)
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}
