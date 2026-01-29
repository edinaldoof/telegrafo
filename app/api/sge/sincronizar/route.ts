import { NextRequest, NextResponse } from 'next/server'
import { sgeService } from '@/lib/services/sge.service'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/sge/sincronizar
 * Sincroniza as inscrições da API SGE com o banco de dados local
 *
 * Esta operação:
 * - Busca todos os dados da API SGE (pode demorar ~4-5 segundos)
 * - Processa em lotes de 500 registros para não sobrecarregar
 * - Atualiza registros existentes (por CPF)
 * - Insere novos registros
 * - Registra log da sincronização
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se há sincronização em andamento (evita duplicação)
    const ultimaSincronizacao = await prisma.logEvento.findFirst({
      where: {
        tipo: 'sge_sincronizacao',
        criadoEm: {
          gte: new Date(Date.now() - 60000), // últimos 60 segundos
        },
      },
      orderBy: { criadoEm: 'desc' },
    })

    if (ultimaSincronizacao) {
      return NextResponse.json(
        { error: 'Sincronização já em andamento. Aguarde um minuto.' },
        { status: 429 }
      )
    }

    // Registrar início da sincronização
    await prisma.logEvento.create({
      data: {
        tipo: 'sge_sincronizacao',
        descricao: 'Sincronização SGE iniciada',
        dadosJson: { status: 'iniciado' },
      },
    })

    // Executar sincronização
    const resultado = await sgeService.sincronizar()

    // Registrar conclusão
    await prisma.logEvento.create({
      data: {
        tipo: 'sge_sincronizacao',
        descricao: `Sincronização SGE concluída: ${resultado.novos} novos, ${resultado.atualizados} atualizados`,
        dadosJson: {
          status: 'concluido',
          ...resultado,
        },
      },
    })

    return NextResponse.json({
      message: 'Sincronização concluída com sucesso',
      ...resultado,
    })
  } catch (error: any) {
    console.error('Erro na sincronização SGE:', error)

    // Registrar erro
    await prisma.logEvento.create({
      data: {
        tipo: 'sge_sincronizacao',
        descricao: `Erro na sincronização SGE: ${error.message}`,
        dadosJson: {
          status: 'erro',
          erro: error.message,
        },
      },
    })

    return NextResponse.json(
      { error: error.message || 'Erro na sincronização' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sge/sincronizar
 * Retorna status da última sincronização
 */
export async function GET(request: NextRequest) {
  try {
    const ultimaSincronizacao = await prisma.logEvento.findFirst({
      where: {
        tipo: 'sge_sincronizacao',
        dadosJson: {
          path: ['status'],
          equals: 'concluido',
        },
      },
      orderBy: { criadoEm: 'desc' },
    })

    const stats = await sgeService.obterEstatisticas()

    return NextResponse.json({
      ultimaSincronizacao: ultimaSincronizacao?.criadoEm || null,
      detalhes: ultimaSincronizacao?.dadosJson || null,
      estatisticas: stats,
    })
  } catch (error) {
    console.error('Erro ao obter status de sincronização:', error)
    return NextResponse.json(
      { error: 'Erro ao obter status' },
      { status: 500 }
    )
  }
}
