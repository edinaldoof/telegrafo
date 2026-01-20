import { NextRequest, NextResponse } from 'next/server'
import { instanceService } from '@/lib/services/instance.service'

/**
 * GET /api/instances/stats
 * Obter estatísticas de instâncias
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await instanceService.obterEstatisticas()
    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}
