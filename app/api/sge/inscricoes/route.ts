import { NextRequest, NextResponse } from 'next/server'
import { sgeService } from '@/lib/services/sge.service'
import { parseListQueryParams } from '@/lib/utils/pagination'

/**
 * GET /api/sge/inscricoes
 * Lista inscrições SGE do banco de dados com paginação e filtros
 *
 * Query params:
 * - page: número da página (default: 1)
 * - limit: itens por página (default: 50, max: 100)
 * - search: busca por nome, email, CPF ou telefone
 * - municipio: filtrar por município
 * - situacao: filtrar por situação
 * - curso: filtrar por curso
 * - apenasNaoImportados: mostrar apenas não importados (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 5000)
    const search = searchParams.get('search') || undefined
    const municipio = searchParams.get('municipio') || undefined
    const situacao = searchParams.get('situacao') || undefined
    const curso = searchParams.get('curso') || undefined
    const apenasNaoImportados = searchParams.get('apenasNaoImportados') === 'true'

    const resultado = await sgeService.listar({
      page,
      limit,
      search,
      municipio,
      situacao,
      curso,
      apenasNaoImportados,
    })

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro ao listar inscrições SGE:', error)
    return NextResponse.json(
      { error: 'Erro ao listar inscrições' },
      { status: 500 }
    )
  }
}
