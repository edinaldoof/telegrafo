import { NextResponse } from 'next/server'
import { grupoService } from '@/lib/services/grupo.service'

/**
 * GET /api/grupos/stats
 * Obter estatísticas gerais
 */
export async function GET() {
  try {
    const stats = await grupoService.obterEstatisticas()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}
