import { NextRequest, NextResponse } from 'next/server'
import { sendText, isConfigured } from '@/lib/services/twilio.service'
import { prisma } from '@/lib/prisma'
import { auditoriaService } from '@/lib/services/auditoria.service'
import { AuthService } from '@/lib/auth/service'

export async function POST(request: NextRequest) {
  let numero = ''
  let mensagem = ''
  let usuario = 'Sistema'

  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Twilio não configurado' },
        { status: 503 }
      )
    }

    const auth = await AuthService.authenticate(request)
    if (auth) {
      usuario = String(auth.id)
    }

    const body = await request.json()
    numero = body.numero || ''
    mensagem = body.mensagem || ''

    if (!numero || !mensagem) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: numero, mensagem' },
        { status: 400 }
      )
    }

    // Enviar via Twilio
    const result = await sendText(numero, mensagem)

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

    // Registrar no histórico
    try {
      await prisma.mensagem.create({
        data: {
          tipo: 'texto',
          conteudo: `${mensagem} | Destinatario: ${numero}`,
          status: result.status === 'queued' ? 'enviando' : 'concluido',
          grupoIds: [],
          totalGrupos: 0,
          totalEnviados: 1,
          totalErros: 0,
        }
      })

      await auditoriaService.registrar({
        tipo: 'mensagem_enviada',
        descricao: `Mensagem enviada para ${numero}`,
        usuario,
        ip,
        dados: { numero, sid: result.sid, status: result.status },
      })
    } catch (dbError) {
      console.error('[Twilio] Erro ao salvar no histórico:', dbError)
    }

    return NextResponse.json({
      sucesso: true,
      sid: result.sid,
      status: result.status,
      para: result.to,
      dataEnvio: result.dateSent
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[API Twilio] Erro ao enviar:', errorMessage)

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

    // Registrar erro no histórico
    try {
      await prisma.mensagem.create({
        data: {
          tipo: 'texto',
          conteudo: `${mensagem} | Destinatario: ${numero || 'N/A'} | Erro: ${errorMessage}`,
          status: 'erro',
          grupoIds: [],
          totalGrupos: 0,
          totalEnviados: 0,
          totalErros: 1,
        }
      })

      await auditoriaService.registrar({
        tipo: 'erro',
        descricao: `Erro ao enviar mensagem para ${numero}: ${errorMessage}`,
        usuario,
        ip,
        dados: { numero, erro: errorMessage },
      })
    } catch (dbError) {
      console.error('[Twilio] Erro ao salvar erro no histórico:', dbError)
    }

    return NextResponse.json(
      { sucesso: false, erro: errorMessage },
      { status: 500 }
    )
  }
}
