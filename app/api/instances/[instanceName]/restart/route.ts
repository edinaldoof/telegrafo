import { NextRequest, NextResponse } from 'next/server'
import { instanceService } from '@/lib/services/instance.service'

/**
 * POST /api/instances/[instanceName]/restart
 * Reiniciar instância
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceName: string }> }
) {
  try {
    const { instanceName } = await params
    await instanceService.reiniciar(instanceName)

    return NextResponse.json({ message: 'Instância reiniciada com sucesso' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao reiniciar instância' },
      { status: 400 }
    )
  }
}
