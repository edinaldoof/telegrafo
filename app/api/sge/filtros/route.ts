import { NextRequest, NextResponse } from 'next/server'
import { sgeService } from '@/lib/services/sge.service'

/**
 * GET /api/sge/filtros
 * Retorna valores únicos para filtros (municipios, situações, cursos)
 */
export async function GET(request: NextRequest) {
  try {
    const filtros = await sgeService.obterFiltros()

    return NextResponse.json(filtros)
  } catch (error) {
    console.error('Erro ao obter filtros SGE:', error)
    return NextResponse.json(
      { error: 'Erro ao obter filtros' },
      { status: 500 }
    )
  }
}
