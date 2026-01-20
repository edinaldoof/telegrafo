import { NextRequest, NextResponse } from 'next/server'
import { mensagemService } from '@/lib/services/mensagem.service'

/**
 * GET /api/mensagens/fila
 * Obter fila de envio
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const fila = await mensagemService.obterFila({
      status: status || undefined,
    })

    return NextResponse.json({ fila })
  } catch (error) {
    console.error('Erro ao obter fila:', error)
    return NextResponse.json({ error: 'Erro ao obter fila' }, { status: 500 })
  }
}
