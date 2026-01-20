import { NextRequest, NextResponse } from 'next/server'
import { getHistory } from '@/lib/services/twilio.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const history = getHistory(limit)

    return NextResponse.json({
      sucesso: true,
      total: history.length,
      historico: history
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao obter histórico:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
