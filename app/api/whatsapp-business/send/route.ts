import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint placeholder para envio via WhatsApp Business.
 * A aplicação está focada na Evolution API, portanto este endpoint apenas
 * retorna uma resposta informativa.
 */
export async function POST(request: NextRequest) {
  console.log('[WhatsApp Business] Requisição recebida', await request.json().catch(() => null))
  return NextResponse.json(
    {
      error: 'Integração com WhatsApp Business não configurada nesta instalação. Utilize a Evolution API.',
    },
    { status: 501 }
  )
}
