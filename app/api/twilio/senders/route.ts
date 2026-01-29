import { NextRequest, NextResponse } from 'next/server'
import { isConfiguredAsync } from '@/lib/services/twilio.service'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    if (!(await isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: 'Twilio nao configurado' },
        { status: 503 }
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
    const currentNumber = configMap.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER || ''

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    // Buscar WhatsApp Senders via Messaging API
    let senders: any[] = []

    try {
      // Tentar buscar via PhoneNumbers com filtro WhatsApp
      const phoneResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`,
        {
          headers: { 'Authorization': `Basic ${authHeader}` }
        }
      )

      if (phoneResponse.ok) {
        const phoneData = await phoneResponse.json()
        const phones = phoneData.incoming_phone_numbers || []

        // Filtrar apenas numeros com capacidades
        senders = phones.map((p: any) => ({
          sid: p.sid,
          phoneNumber: p.phone_number,
          friendlyName: p.friendly_name,
          status: p.status || 'active',
          capabilities: p.capabilities,
          dateCreated: p.date_created,
          isWhatsApp: false
        }))
      }
    } catch (e) {
      console.error('[Twilio] Erro ao buscar phone numbers:', e)
    }

    // Buscar especificamente WhatsApp Senders (se disponivel)
    try {
      const whatsappResponse = await fetch(
        `https://messaging.twilio.com/v1/Senders?PageSize=100`,
        {
          headers: { 'Authorization': `Basic ${authHeader}` }
        }
      )

      if (whatsappResponse.ok) {
        const whatsappData = await whatsappResponse.json()
        const whatsappSenders = whatsappData.senders || []

        // Adicionar senders WhatsApp
        whatsappSenders.forEach((ws: any) => {
          // Verificar se ja existe
          const exists = senders.find(s =>
            s.phoneNumber === ws.phone_number ||
            s.phoneNumber === ws.sender
          )

          if (!exists) {
            senders.push({
              sid: ws.sid,
              phoneNumber: ws.phone_number || ws.sender,
              friendlyName: ws.display_name || ws.phone_number,
              status: ws.status || 'active',
              capabilities: { whatsapp: true },
              dateCreated: ws.date_created,
              isWhatsApp: true
            })
          } else {
            // Marcar como WhatsApp enabled
            exists.isWhatsApp = true
            exists.whatsappStatus = ws.status
          }
        })
      }
    } catch (e) {
      console.error('[Twilio] Erro ao buscar WhatsApp senders:', e)
    }

    // Adicionar os numeros conhecidos de producao do usuario
    // (baseado no que foi informado anteriormente)
    const knownWhatsAppNumbers = [
      { phoneNumber: 'whatsapp:+558695148163', friendlyName: 'Fadex', status: 'Online' },
      { phoneNumber: 'whatsapp:+558698097060', friendlyName: 'Projeto Acredita No Primeiro Passo - FADEX', status: 'Online' }
    ]

    knownWhatsAppNumbers.forEach(known => {
      const exists = senders.find(s =>
        s.phoneNumber === known.phoneNumber ||
        s.phoneNumber === known.phoneNumber.replace('whatsapp:', '') ||
        `whatsapp:${s.phoneNumber}` === known.phoneNumber
      )

      if (!exists) {
        senders.push({
          sid: null,
          phoneNumber: known.phoneNumber,
          friendlyName: known.friendlyName,
          status: known.status,
          capabilities: { whatsapp: true },
          isWhatsApp: true,
          isKnown: true
        })
      }
    })

    return NextResponse.json({
      sucesso: true,
      numeroAtual: currentNumber,
      senders: senders.map(s => ({
        ...s,
        isSelected: s.phoneNumber === currentNumber ||
                   `whatsapp:${s.phoneNumber}` === currentNumber ||
                   s.phoneNumber === currentNumber.replace('whatsapp:', '')
      }))
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao listar senders:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}

// Alterar numero ativo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Numero obrigatorio' },
        { status: 400 }
      )
    }

    // Formatar numero
    let formattedNumber = phoneNumber
    if (!formattedNumber.startsWith('whatsapp:')) {
      formattedNumber = `whatsapp:${formattedNumber}`
    }

    // Atualizar no banco
    await prisma.dynamicConfig.upsert({
      where: { key: 'TWILIO_WHATSAPP_NUMBER' },
      update: { value: formattedNumber },
      create: {
        key: 'TWILIO_WHATSAPP_NUMBER',
        value: formattedNumber,
        category: 'twilio',
        description: 'Numero WhatsApp para envio'
      }
    })

    return NextResponse.json({
      sucesso: true,
      numeroAtivo: formattedNumber
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao alterar sender:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
