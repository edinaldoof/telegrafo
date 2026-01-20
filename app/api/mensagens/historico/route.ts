import { NextRequest, NextResponse } from 'next/server'
import { mensagemService } from '@/lib/services/mensagem.service'

/**
 * GET /api/mensagens/historico
 * Listar histórico de mensagens
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const status = searchParams.get('status')
    const limite = searchParams.get('limite')

    const mensagens = await mensagemService.listarHistorico({
      tipo: tipo || undefined,
      status: status || undefined,
      limite: limite ? parseInt(limite) : undefined,
    })

    return NextResponse.json({ mensagens })
  } catch (error) {
    console.error('Erro ao listar histórico:', error)
    return NextResponse.json(
      { error: 'Erro ao listar histórico' },
      { status: 500 }
    )
  }
}
