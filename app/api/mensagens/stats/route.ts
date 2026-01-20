import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/mensagens/stats
 * Obter estatísticas completas de mensagens
 */
export async function GET(request: NextRequest) {
  try {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - hoje.getDay())

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    // Estatísticas gerais
    const [
      totalGeral,
      totalHoje,
      totalSemana,
      totalMes,
      pendentes,
      enviados,
      comErro,
    ] = await Promise.all([
      prisma.mensagem.count(),
      prisma.mensagem.count({
        where: { enviadoEm: { gte: hoje } },
      }),
      prisma.mensagem.count({
        where: { enviadoEm: { gte: inicioSemana } },
      }),
      prisma.mensagem.count({
        where: { enviadoEm: { gte: inicioMes } },
      }),
      prisma.filaEnvio.count({
        where: { status: 'pendente' },
      }),
      prisma.filaEnvio.count({
        where: { status: 'enviado' },
      }),
      prisma.filaEnvio.count({
        where: { status: 'erro' },
      }),
    ])

    // Dados para gráfico dos últimos 7 dias
    const ultimosDias = []
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoje)
      dia.setDate(hoje.getDate() - i)
      const proximoDia = new Date(dia)
      proximoDia.setDate(dia.getDate() + 1)

      const count = await prisma.mensagem.count({
        where: {
          enviadoEm: {
            gte: dia,
            lt: proximoDia,
          },
        },
      })

      ultimosDias.push({
        data: dia.toISOString().split('T')[0],
        dia: dia.toLocaleDateString('pt-BR', { weekday: 'short' }),
        total: count,
      })
    }

    // Mensagens por tipo
    const porTipo = await prisma.mensagem.groupBy({
      by: ['tipo'],
      _count: true,
    })

    // Taxa de entrega (baseado na fila)
    const totalFila = pendentes + enviados + comErro
    const taxaEntrega = totalFila > 0
      ? Math.round((enviados / totalFila) * 100)
      : 100

    return NextResponse.json({
      totalGeral,
      totalHoje,
      totalSemana,
      totalMes,
      fila: {
        pendentes,
        enviados,
        comErro,
      },
      taxaEntrega,
      ultimosDias,
      porTipo: porTipo.map(t => ({
        tipo: t.tipo,
        total: t._count,
      })),
    })
  } catch (error: any) {
    console.error('Erro ao obter estatísticas de mensagens:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}
