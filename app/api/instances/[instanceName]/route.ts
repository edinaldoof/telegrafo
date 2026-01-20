import { NextRequest, NextResponse } from 'next/server'
import { instanceService } from '@/lib/services/instance.service'

/**
 * GET /api/instances/[instanceName]
 * Obter detalhes de uma instância
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceName: string }> }
) {
  try {
    const { instanceName } = await params
    const instance = await instanceService.obterPorNome(instanceName)
    return NextResponse.json(instance)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Instância não encontrada' },
      { status: 404 }
    )
  }
}

/**
 * PUT /api/instances/[instanceName]
 * Atualizar instância
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ instanceName: string }> }
) {
  try {
    const { instanceName } = await params
    const body = await request.json()

    const instance = await instanceService.obterPorNome(instanceName)

    const updated = await instanceService.atualizar({
      id: instance.id,
      ...body,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar instância' },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/instances/[instanceName]
 * Deletar instância
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ instanceName: string }> }
) {
  try {
    const { instanceName } = await params
    const instance = await instanceService.obterPorNome(instanceName)
    await instanceService.deletar(instance.id)

    return NextResponse.json({ message: 'Instância deletada com sucesso' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar instância' },
      { status: 400 }
    )
  }
}
