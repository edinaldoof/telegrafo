import { NextRequest, NextResponse } from 'next/server'
import { sendTemplate, isConfiguredAsync } from '@/lib/services/twilio.service'

export async function POST(request: NextRequest) {
  try {
    if (!(await isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: 'Twilio não configurado' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { numero, contentSid, variaveis } = body

    if (!numero || !contentSid) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: numero, contentSid' },
        { status: 400 }
      )
    }

    const result = await sendTemplate(numero, contentSid, variaveis || {})

    return NextResponse.json({
      sucesso: true,
      sid: result.sid,
      status: result.status,
      para: result.to
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao enviar template:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
