import { NextResponse } from 'next/server'
import { contatoService } from '@/lib/services/contato.service'

/**
 * GET /api/contatos/stats
 * Obter estatísticas de contatos
 */
export async function GET() {
  try {
    const stats = await contatoService.obterEstatisticas()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}
