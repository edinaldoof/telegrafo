import { NextRequest, NextResponse } from 'next/server'
import { instanceService } from '@/lib/services/instance.service'

/**
 * POST /api/instances/[instanceName]/disconnect
 * Desconectar instância (logout)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceName: string }> }
) {
  try {
    const { instanceName } = await params
    await instanceService.desconectar(instanceName)

    return NextResponse.json({ message: 'Instância desconectada com sucesso' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao desconectar instância' },
      { status: 400 }
    )
  }
}
