import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

/**
 * Webhook de callbacks do WhatsApp Business Cloud API.
 * Atualmente a aplicação utiliza Evolution API como provedor principal,
 * então este endpoint apenas registra os eventos recebidos para inspeção.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar webhook secret - MANDATORY in production
    const webhookSecret = config.security.webhookSecret
    const receivedSecret = request.headers.get('x-webhook-secret') || request.headers.get('x-hub-signature-256')

    // In production, webhook secret is required
    if (config.isProduction && !webhookSecret) {
      console.error('❌ WEBHOOK_SECRET not configured. Rejecting webhook.')
      return NextResponse.json(
        { error: 'Webhook secret not configured on server' },
        { status: 503 }
      )
    }

    // Validate the secret if configured (WhatsApp uses different header)
    if (webhookSecret && receivedSecret && !receivedSecret.includes(webhookSecret)) {
      console.warn(`⚠️ Invalid webhook secret from ${request.headers.get('x-forwarded-for') || 'unknown'}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const eventType = payload?.entry?.[0]?.changes?.[0]?.value?.statuses
      ? 'status'
      : payload?.entry?.[0]?.changes?.[0]?.value?.messages
        ? 'message'
        : 'unknown'

    console.log('[WEBHOOK][WABA]', eventType, JSON.stringify(payload).slice(0, 500))

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erro ao processar webhook WhatsApp Business:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}
