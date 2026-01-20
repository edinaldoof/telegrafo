import { NextRequest, NextResponse } from 'next/server'
import { instanceService } from '@/lib/services/instance.service'

/**
 * GET /api/instances/[instanceName]/status
 * Obter status atualizado da instância
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceName: string }> }
) {
  try {
    const { instanceName } = await params
    const status = await instanceService.atualizarStatus(instanceName)

    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao obter status' },
      { status: 400 }
    )
  }
}
