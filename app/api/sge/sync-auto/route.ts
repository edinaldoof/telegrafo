import { NextResponse } from 'next/server'
import { sgeService } from '@/lib/services/sge.service'
import { prisma } from '@/lib/prisma'

// Rate limit: armazenar última execução em memória
let lastSyncTime = 0
const MIN_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

/**
 * POST /api/sge/sync-auto
 * Endpoint para sync automática do SGE (chamado por polling do frontend)
 * Rate limited a 1 execução a cada 5 minutos
 */
export async function POST() {
  try {
    const now = Date.now()

    // Rate limit
    if (now - lastSyncTime < MIN_INTERVAL_MS) {
      return NextResponse.json({
        skipped: true,
        message: 'Sync recente, aguardando intervalo mínimo',
        nextSyncIn: Math.ceil((MIN_INTERVAL_MS - (now - lastSyncTime)) / 1000),
      })
    }

    lastSyncTime = now

    // 1. Sincronizar inscrições da API SGE
    const syncResult = await sgeService.sincronizar()

    // 2. Se houve novos registros, importar automaticamente como contatos
    let importResult = { importados: 0, jaExistentes: 0, erros: 0 }

    if (syncResult.novos > 0) {
      // Buscar IDs dos não importados
      const naoImportados = await prisma.inscricaoSGE.findMany({
        where: { importadoContato: false },
        select: { id: true },
      })

      if (naoImportados.length > 0) {
        const ids = naoImportados.map(i => i.id)
        importResult = await sgeService.importarComoContatos(ids)
      }
    }

    return NextResponse.json({
      skipped: false,
      sync: syncResult,
      import: importResult,
    })
  } catch (error: any) {
    // Sync automática não deve gerar erros visíveis
    console.error('Erro na sync automática SGE:', error)
    return NextResponse.json(
      { error: error.message || 'Erro na sync automática' },
      { status: 500 }
    )
  }
}
