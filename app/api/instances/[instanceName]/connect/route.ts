import { NextRequest, NextResponse } from 'next/server'
import { instanceService } from '@/lib/services/instance.service'

/**
 * POST /api/instances/[instanceName]/connect
 * Conectar instância e gerar QR Code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceName: string }> }
) {
  try {
    const { instanceName } = await params
    const qrData = await instanceService.conectar(instanceName)

    return NextResponse.json({
      message: 'QR Code gerado com sucesso',
      qrcode: qrData.qrcode,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao conectar instância' },
      { status: 400 }
    )
  }
}
