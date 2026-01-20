import { NextRequest, NextResponse } from 'next/server'
import { createWhatsAppBusinessService } from '@/lib/services/whatsapp-business.service'

/**
 * Gerenciamento de templates do WhatsApp Business
 */

// GET - Listar templates
export async function GET(request: NextRequest) {
  try {
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

    if (!businessAccountId) {
      return NextResponse.json(
        { error: 'WHATSAPP_BUSINESS_ACCOUNT_ID não configurado' },
        { status: 500 }
      )
    }

    const service = createWhatsAppBusinessService()
    if (!service) {
      return NextResponse.json(
        { error: 'Credenciais do WhatsApp Business não configuradas' },
        { status: 500 }
      )
    }

    const templates = await service.getTemplates(businessAccountId)

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    })
  } catch (error: any) {
    console.error('Erro ao listar templates:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar templates' },
      { status: 500 }
    )
  }
}

// POST - Criar template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, language, category, components } = body

    // Validação
    if (!name || !language || !category || !components) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: name, language, category, components' },
        { status: 400 }
      )
    }

    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

    if (!businessAccountId) {
      return NextResponse.json(
        { error: 'WHATSAPP_BUSINESS_ACCOUNT_ID não configurado' },
        { status: 500 }
      )
    }

    const service = createWhatsAppBusinessService()
    if (!service) {
      return NextResponse.json(
        { error: 'Credenciais do WhatsApp Business não configuradas' },
        { status: 500 }
      )
    }

    const result = await service.createTemplate(businessAccountId, {
      name,
      language,
      category,
      components,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      templateId: result.templateId,
      status: result.status,
      message: 'Template criado com sucesso. Aguarde aprovação da Meta (24-48h).',
    })
  } catch (error: any) {
    console.error('Erro ao criar template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar template' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir template
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const templateName = searchParams.get('name')

    if (!templateName) {
      return NextResponse.json(
        { error: 'Nome do template obrigatório' },
        { status: 400 }
      )
    }

    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

    if (!businessAccountId) {
      return NextResponse.json(
        { error: 'WHATSAPP_BUSINESS_ACCOUNT_ID não configurado' },
        { status: 500 }
      )
    }

    const service = createWhatsAppBusinessService()
    if (!service) {
      return NextResponse.json(
        { error: 'Credenciais do WhatsApp Business não configuradas' },
        { status: 500 }
      )
    }

    const result = await service.deleteTemplate(businessAccountId, templateName)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template excluído com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao excluir template:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir template' },
      { status: 500 }
    )
  }
}
