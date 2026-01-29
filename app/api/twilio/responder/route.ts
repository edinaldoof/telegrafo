import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isConfiguredAsync } from '@/lib/services/twilio.service'

/**
 * POST /api/twilio/responder
 * Responder mensagem dentro da janela de 24h (texto livre, sem template)
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: 'Twilio nao configurado' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { para, mensagem, mensagemRecebidaId } = body

    if (!para || !mensagem) {
      return NextResponse.json(
        { success: false, error: 'Destinatario e mensagem obrigatorios' },
        { status: 400 }
      )
    }

    // Buscar config do banco
    const configs = await prisma.dynamicConfig.findMany({
      where: {
        key: {
          in: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER']
        }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach(c => { configMap[c.key] = c.value })

    const accountSid = configMap.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || ''
    const authToken = configMap.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || ''
    const fromNumber = configMap.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER || ''

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { success: false, error: 'Credenciais Twilio nao configuradas' },
        { status: 503 }
      )
    }

    // Formatar numero destino
    let toNumber = para
    if (!toNumber.startsWith('whatsapp:')) {
      toNumber = `whatsapp:${toNumber}`
    }

    // Enviar via Twilio API
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const formData = new URLSearchParams()
    formData.append('From', fromNumber)
    formData.append('To', toNumber)
    formData.append('Body', mensagem)

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('[Twilio] Erro ao enviar resposta:', result)
      return NextResponse.json(
        {
          sucesso: false,
          erro: result.message || 'Erro ao enviar',
          codigo: result.code,
          detalhes: result.more_info
        },
        { status: 400 }
      )
    }

    // Marcar mensagem original como respondida
    if (mensagemRecebidaId) {
      await prisma.mensagemRecebida.update({
        where: { id: mensagemRecebidaId },
        data: { respondida: true, lida: true }
      })
    }

    // Registrar log
    await prisma.logEvento.create({
      data: {
        tipo: 'mensagem_resposta_twilio',
        descricao: `Resposta enviada para ${toNumber}: ${mensagem.substring(0, 100)}`,
        dadosJson: {
          sid: result.sid,
          to: toNumber,
          from: fromNumber,
          status: result.status,
        },
      }
    })

    return NextResponse.json({
      sucesso: true,
      sid: result.sid,
      status: result.status,
      para: toNumber
    })

  } catch (error: any) {
    console.error('[API Twilio] Erro ao responder:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
