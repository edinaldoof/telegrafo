import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { baileysDirectService } from '@/lib/services/baileys-direct.service'

/**
 * GET /api/grupos/[id]/membros
 * Listar membros de um grupo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const grupoId = parseInt(id)

    if (isNaN(grupoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      include: {
        membros: {
          orderBy: [
            { ehSuperAdmin: 'desc' },
            { ehAdmin: 'desc' },
            { nome: 'asc' },
          ],
        },
        sincronizacoes: {
          orderBy: { sincronizadoEm: 'desc' },
          take: 5,
        },
      },
    })

    if (!grupo) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      grupo: {
        id: grupo.id,
        nome: grupo.nome,
        whatsappGroupId: grupo.whatsappGroupId,
        totalMembros: grupo.totalMembros,
        ultimaSincronizacao: grupo.ultimaSincronizacao,
      },
      membros: grupo.membros,
      sincronizacoes: grupo.sincronizacoes,
    })
  } catch (error) {
    console.error('Erro ao listar membros:', error)
    return NextResponse.json(
      { error: 'Erro ao listar membros do grupo' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/grupos/[id]/membros/sync
 * Sincronizar membros do grupo com WhatsApp
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const grupoId = parseInt(id)

    if (isNaN(grupoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { instanceName: requestedInstance } = body

    // Buscar grupo
    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
    })

    if (!grupo) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    if (!grupo.whatsappGroupId) {
      return NextResponse.json(
        { error: 'Grupo não possui ID do WhatsApp' },
        { status: 400 }
      )
    }

    // Buscar instâncias conectadas
    const instances = await prisma.instance.findMany({
      where: { status: 'connected' },
    })

    if (instances.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma instância conectada' },
        { status: 400 }
      )
    }

    // Usar instância específica ou a primeira conectada
    let instanceToUse = instances[0].instanceName
    if (requestedInstance) {
      const found = instances.find(i => i.instanceName === requestedInstance)
      if (found) {
        instanceToUse = found.instanceName
      }
    }

    // Obter membros do grupo via Baileys
    let participants: any[] = []
    let syncError: string | null = null

    try {
      participants = await baileysDirectService.getGroupParticipants(
        instanceToUse,
        grupo.whatsappGroupId
      )
    } catch (error: any) {
      syncError = error.message || 'Erro ao obter participantes'

      // Registrar erro de sincronização
      await prisma.sincronizacaoGrupo.create({
        data: {
          grupoId,
          instanceName: instanceToUse,
          totalMembros: 0,
          status: 'erro',
          erro: syncError,
        },
      })

      return NextResponse.json(
        { error: syncError },
        { status: 500 }
      )
    }

    // Atualizar membros no banco usando transação
    const result = await prisma.$transaction(async (tx) => {
      // Remover membros antigos
      await tx.membroGrupo.deleteMany({
        where: { grupoId },
      })

      // Inserir novos membros
      const membrosData = participants.map((p: any) => ({
        grupoId,
        whatsappGroupId: grupo.whatsappGroupId!,
        numero: p.phone,
        nome: null, // Nome precisa ser obtido separadamente
        ehAdmin: p.isAdmin || false,
        ehSuperAdmin: p.isSuperAdmin || false,
        instanceName: instanceToUse,
      }))

      if (membrosData.length > 0) {
        await tx.membroGrupo.createMany({
          data: membrosData,
        })
      }

      // Atualizar grupo
      await tx.grupo.update({
        where: { id: grupoId },
        data: {
          totalMembros: participants.length,
          ultimaSincronizacao: new Date(),
        },
      })

      // Registrar sincronização
      await tx.sincronizacaoGrupo.create({
        data: {
          grupoId,
          instanceName: instanceToUse,
          totalMembros: participants.length,
          status: 'sucesso',
        },
      })

      return {
        totalMembros: participants.length,
        membros: membrosData,
      }
    })

    return NextResponse.json({
      message: 'Sincronização concluída',
      instanceUsada: instanceToUse,
      totalMembros: result.totalMembros,
      membros: result.membros,
    })
  } catch (error: any) {
    console.error('Erro ao sincronizar membros:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar membros' },
      { status: 500 }
    )
  }
}
