import { NextRequest, NextResponse } from 'next/server'
import { listWhatsAppTemplates, getTemplateDetails, isConfiguredAsync } from '@/lib/services/twilio.service'

/**
 * GET /api/twilio/templates
 * Lista todos os templates disponíveis com status de aprovação
 */
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

    // Se passou um SID específico, buscar detalhes
    if (sid) {
      const template = await getTemplateDetails(sid)
      return NextResponse.json({
        sucesso: true,
        template
      })
    }

    // Listar todos os templates
    const templates = await listWhatsAppTemplates()

    // Separar por status
    const approved = templates.filter(t => t.approvalStatus === 'approved')
    const pending = templates.filter(t => t.approvalStatus === 'pending')
    const rejected = templates.filter(t => t.approvalStatus === 'rejected')
    const notSubmitted = templates.filter(t => t.approvalStatus === 'not_submitted' || t.approvalStatus === 'unknown')

    return NextResponse.json({
      sucesso: true,
      total: templates.length,
      resumo: {
        aprovados: approved.length,
        pendentes: pending.length,
        rejeitados: rejected.length,
        naoSubmetidos: notSubmitted.length
      },
      templates: templates.map(t => ({
        sid: t.sid,
        nome: t.name,
        idioma: t.language,
        tipos: t.types,
        corpo: t.body,
        variaveis: t.variables,
        status: t.approvalStatus,
        eligibility: t.eligibility || [],
        podeUsar: t.canUse,
        criadoEm: t.dateCreated,
        atualizadoEm: t.dateUpdated
      }))
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao listar templates:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
