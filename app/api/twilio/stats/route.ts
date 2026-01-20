import { NextResponse } from 'next/server'
import { getStats, isConfigured } from '@/lib/services/twilio.service'

export async function GET() {
  try {
    const stats = getStats()

    return NextResponse.json({
      sucesso: true,
      configurado: isConfigured(),
      estatisticas: stats
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao obter stats:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
