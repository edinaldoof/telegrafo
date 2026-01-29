import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isConfiguredAsync } from '@/lib/services/twilio.service'

/**
 * POST /api/twilio/templates/criar
 * Criar template e enviar para aprovacao no Twilio/Meta
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
    const { nome, idioma, tipo, conteudo } = body

    // Validacoes
    if (!nome || !idioma || !tipo || !conteudo) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatorios: nome, idioma, tipo, conteudo' },
        { status: 400 }
      )
    }

    // Validar nome (apenas lowercase, numeros e underscore)
    const nomeRegex = /^[a-z0-9_]+$/
    if (!nomeRegex.test(nome)) {
      return NextResponse.json(
        { success: false, error: 'Nome deve conter apenas letras minusculas, numeros e underscore' },
        { status: 400 }
      )
    }

    // Buscar config do banco
    const configs = await prisma.dynamicConfig.findMany({
      where: {
        key: {
          in: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN']
        }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach(c => { configMap[c.key] = c.value })

    const accountSid = configMap.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || ''
    const authToken = configMap.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || ''

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    // Montar payload baseado no tipo
    let types: any = {}

    switch (tipo) {
      case 'text':
        types = {
          'twilio/text': {
            body: conteudo.body
          }
        }
        break

      case 'media':
        types = {
          'twilio/media': {
            body: conteudo.body || '',
            media: conteudo.media || []
          }
        }
        break

      case 'quick-reply':
        types = {
          'twilio/quick-reply': {
            body: conteudo.body,
            actions: conteudo.actions || []
          }
        }
        break

      case 'call-to-action':
        types = {
          'twilio/call-to-action': {
            body: conteudo.body,
            actions: conteudo.actions || []
          }
        }
        break

      case 'list-picker':
        types = {
          'twilio/list-picker': {
            body: conteudo.body,
            button: conteudo.button || 'Ver opcoes',
            items: conteudo.items || []
          }
        }
        break

      case 'card':
        types = {
          'twilio/card': {
            title: conteudo.title,
            subtitle: conteudo.subtitle,
            media: conteudo.media || [],
            actions: conteudo.actions || []
          }
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de template invalido' },
          { status: 400 }
        )
    }

    // Criar template via Content API
    const templatePayload = {
      friendly_name: nome,
      language: idioma,
      types
    }

    console.log('[Twilio] Criando template:', JSON.stringify(templatePayload, null, 2))

    const response = await fetch('https://content.twilio.com/v1/Content', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templatePayload),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[Twilio] Erro ao criar template:', result)
      return NextResponse.json(
        {
          sucesso: false,
          erro: result.message || 'Erro ao criar template',
          detalhes: result
        },
        { status: 400 }
      )
    }

    // Enviar para aprovacao do WhatsApp
    const approvalResponse = await fetch(
      `https://content.twilio.com/v1/Content/${result.sid}/ApprovalRequests/whatsapp`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nome,
          category: 'UTILITY' // UTILITY, MARKETING, ou AUTHENTICATION
        }),
      }
    )

    let approvalResult = null
    if (approvalResponse.ok) {
      approvalResult = await approvalResponse.json()
    } else {
      const approvalError = await approvalResponse.json()
      console.log('[Twilio] Aviso na aprovacao:', approvalError)
    }

    // Registrar log
    await prisma.logEvento.create({
      data: {
        tipo: 'template_criado',
        descricao: `Template "${nome}" criado e enviado para aprovacao`,
        dadosJson: {
          sid: result.sid,
          nome,
          idioma,
          tipo,
          approvalStatus: approvalResult?.status || 'pending'
        },
      }
    })

    return NextResponse.json({
      sucesso: true,
      template: {
        sid: result.sid,
        nome: result.friendly_name,
        idioma: result.language,
        dataCriacao: result.date_created,
      },
      aprovacao: approvalResult,
      mensagem: 'Template criado e enviado para aprovacao. Aguarde revisao do Meta/WhatsApp (pode levar ate 24h).'
    })

  } catch (error: any) {
    console.error('[API Twilio] Erro ao criar template:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
