import { NextRequest, NextResponse } from 'next/server'
import { getMessageStatus, isConfiguredAsync } from '@/lib/services/twilio.service'

export async function GET(request: NextRequest) {
  try {
    if (!(await isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: 'Twilio não configurado' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sid = searchParams.get('sid')

    if (!sid) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro obrigatório: sid' },
        { status: 400 }
      )
    }

    const result = await getMessageStatus(sid)

    return NextResponse.json({
      sucesso: true,
      mensagem: {
        sid: result.sid,
        status: result.status,
        para: result.to,
        de: result.from,
        dataEnvio: result.dateSent,
        dataAtualizacao: result.dateUpdated,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage
      }
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao verificar status:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
