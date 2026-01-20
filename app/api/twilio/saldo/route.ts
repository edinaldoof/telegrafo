import { NextResponse } from 'next/server'
import { getBalance, isConfigured } from '@/lib/services/twilio.service'

export async function GET() {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Twilio não configurado' },
        { status: 503 }
      )
    }

    const balance = await getBalance()

    return NextResponse.json({
      sucesso: true,
      saldo: balance
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao obter saldo:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
