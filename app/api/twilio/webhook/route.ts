import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/twilio/webhook
 * Receber mensagens do Twilio WhatsApp
 * Configure este URL no Twilio Console: https://seu-dominio.com/api/twilio/webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Twilio envia dados como form-urlencoded
    const formData = await request.formData()

    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      data[key] = value.toString()
    })

    console.log('[Twilio Webhook] Mensagem recebida:', JSON.stringify(data, null, 2))

    // Dados importantes do Twilio
    const {
      MessageSid,
      AccountSid,
      From,
      To,
      Body,
      NumMedia,
      ProfileName,
      WaId, // WhatsApp ID do remetente
    } = data

    // Salvar mensagem recebida no banco
    await prisma.mensagemRecebida.create({
      data: {
        sid: MessageSid,
        de: From,
        para: To,
        corpo: Body || '',
        nomeRemetente: ProfileName || null,
        whatsappId: WaId || null,
        numMidia: parseInt(NumMedia || '0'),
        dadosCompletos: data,
        recebidaEm: new Date(),
      }
    })

    // Registrar log
    await prisma.logEvento.create({
      data: {
        tipo: 'mensagem_recebida_twilio',
        descricao: `Mensagem de ${ProfileName || From}: ${Body?.substring(0, 100) || '(sem texto)'}`,
        dadosJson: {
          sid: MessageSid,
          from: From,
          to: To,
          profileName: ProfileName,
        },
      }
    })

    // Twilio espera resposta TwiML ou 200 vazio
    // Resposta vazia = não enviar resposta automática
    return new NextResponse('', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })

  } catch (error: any) {
    console.error('[Twilio Webhook] Erro:', error.message)

    // Mesmo com erro, retornar 200 para Twilio não reenviar
    return new NextResponse('', { status: 200 })
  }
}

// GET para verificação do endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Twilio Webhook endpoint ativo',
    instrucoes: 'Configure este URL no Twilio Console como Webhook para mensagens recebidas'
  })
}
