import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isConfiguredAsync } from '@/lib/services/twilio.service'

// Listar mensagens recebidas
export async function GET(request: NextRequest) {
  try {
    if (!(await isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: 'Twilio nao configurado' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const naoLidas = searchParams.get('naoLidas') === 'true'

    const where = naoLidas ? { lida: false } : {}

    const [mensagens, total] = await Promise.all([
      prisma.mensagemRecebida.findMany({
        where,
        orderBy: { recebidaEm: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mensagemRecebida.count({ where })
    ])

    const totalNaoLidas = await prisma.mensagemRecebida.count({
      where: { lida: false }
    })

    return NextResponse.json({
      sucesso: true,
      mensagens,
      total,
      totalNaoLidas,
      pagina: page,
      totalPaginas: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro ao listar inbox:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}

// Marcar mensagem como lida
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ids, marcarTodas } = body

    if (marcarTodas) {
      await prisma.mensagemRecebida.updateMany({
        where: { lida: false },
        data: { lida: true }
      })
      return NextResponse.json({ sucesso: true, mensagem: 'Todas marcadas como lidas' })
    }

    if (ids && ids.length > 0) {
      await prisma.mensagemRecebida.updateMany({
        where: { id: { in: ids } },
        data: { lida: true }
      })
      return NextResponse.json({ sucesso: true, mensagem: `${ids.length} marcadas como lidas` })
    }

    if (id) {
      await prisma.mensagemRecebida.update({
        where: { id },
        data: { lida: true }
      })
      return NextResponse.json({ sucesso: true, mensagem: 'Marcada como lida' })
    }

    return NextResponse.json(
      { sucesso: false, erro: 'ID ou IDs obrigatorios' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[API Twilio] Erro ao marcar como lida:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
