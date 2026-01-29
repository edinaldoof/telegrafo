import { NextRequest, NextResponse } from 'next/server'
import { sendMedia, isConfiguredAsync } from '@/lib/services/twilio.service'

export async function POST(request: NextRequest) {
  try {
    if (!(await isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: 'Twilio não configurado' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { numero, mediaUrl, legenda } = body

    if (!numero || !mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: numero, mediaUrl' },
        { status: 400 }
      )
    }

    // Verificar se é URL localhost
    if (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')) {
      return NextResponse.json(
        { sucesso: false, erro: 'Twilio requer URLs públicas. URLs localhost não funcionam.' },
        { status: 400 }
      )
    }

    const result = await sendMedia(numero, mediaUrl, legenda)

    return NextResponse.json({
      sucesso: true,
      sid: result.sid,
      status: result.status,
      para: result.to,
      dataEnvio: result.dateSent
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao enviar mídia:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
