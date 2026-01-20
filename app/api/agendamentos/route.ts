import { NextRequest, NextResponse } from 'next/server'
import { agendamentoService } from '@/lib/services/agendamento.service'

/**
 * GET /api/agendamentos
 * Listar agendamentos com filtros
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filtros: any = {}

    const status = searchParams.get('status')
    if (status) filtros.status = status

    const dataInicio = searchParams.get('dataInicio')
    if (dataInicio) filtros.dataInicio = new Date(dataInicio)

    const dataFim = searchParams.get('dataFim')
    if (dataFim) filtros.dataFim = new Date(dataFim)

    const templateId = searchParams.get('templateId')
    if (templateId) filtros.templateId = parseInt(templateId)

    const agendamentos = await agendamentoService.listar(filtros)

    return NextResponse.json(agendamentos)
  } catch (error: any) {
    console.error('Erro ao listar agendamentos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar agendamentos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agendamentos
 * Criar novo agendamento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const agendamento = await agendamentoService.criar({
      titulo: body.titulo,
      templateId: body.templateId,
      conteudoPersonalizado: body.conteudoPersonalizado,
      contatosIds: body.contatosIds || body.gruposIds || [], // Suporte para ambos
      filtros: body.filtros,
      attachmentId: body.attachmentId,
      dataAgendamento: new Date(body.dataAgendamento),
      fusoHorario: body.fusoHorario,
    })

    return NextResponse.json(agendamento, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar agendamento' },
      { status: 400 }
    )
  }
}
