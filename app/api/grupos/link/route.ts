import { NextResponse } from 'next/server'
import { grupoService } from '@/lib/services/grupo.service'

/**
 * GET /api/grupos/link
 * Obter link do grupo atual
 */
export async function GET() {
  try {
    const link = await grupoService.obterLinkAtual()

    return NextResponse.json({ link })
  } catch (error) {
    console.error('Erro ao obter link:', error)
    return NextResponse.json(
      { error: 'Erro ao obter link do grupo' },
      { status: 500 }
    )
  }
}
