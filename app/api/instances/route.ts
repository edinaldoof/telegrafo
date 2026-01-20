import { NextRequest, NextResponse } from 'next/server'
import { instanceService } from '@/lib/services/instance.service'

/**
 * GET /api/instances
 * Listar todas as instâncias
 */
export async function GET(request: NextRequest) {
  try {
    const instances = await instanceService.listar()
    return NextResponse.json(instances)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao listar instâncias' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/instances
 * Criar nova instância
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validação
    if (!body.instanceName) {
      return NextResponse.json(
        { error: 'instanceName é obrigatório' },
        { status: 400 }
      )
    }

    const instance = await instanceService.criar({
      instanceName: body.instanceName,
      displayName: body.displayName,
      qrcode: body.qrcode ?? true,
    })

    return NextResponse.json(instance, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao criar instância' },
      { status: 400 }
    )
  }
}
