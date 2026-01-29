import { NextResponse } from 'next/server'
import { baileysDirectService } from '@/lib/services/baileys-direct.service'
import { contatoService } from '@/lib/services/contato.service'

/**
 * POST /api/contatos/sync-whatsapp
 * Trigger manual de sync de contatos WhatsApp
 * Recebe { instanceName: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { instanceName } = body

    if (!instanceName) {
      return NextResponse.json(
        { error: 'instanceName é obrigatório' },
        { status: 400 }
      )
    }

    const sock = baileysDirectService.getSocket(instanceName)
    if (!sock) {
      return NextResponse.json(
        { error: `Instância ${instanceName} não está conectada` },
        { status: 400 }
      )
    }

    // Tentar obter contatos do store do Baileys
    // O Baileys armazena contatos internamente após contacts.upsert
    const store = sock.store
    const contacts: Array<{ phone: string; name?: string }> = []

    // Se o socket tem store com contatos, usar diretamente
    if (store?.contacts) {
      for (const [id, contact] of Object.entries(store.contacts)) {
        if (typeof id === 'string' && id.endsWith('@s.whatsapp.net')) {
          const phone = id.split('@')[0]
          const c = contact as any
          contacts.push({
            phone,
            name: c.notify || c.name || undefined,
          })
        }
      }
    }

    if (contacts.length === 0) {
      return NextResponse.json({
        message: 'Nenhum contato encontrado no store do WhatsApp. Os contatos são sincronizados automaticamente ao conectar.',
        novos: 0,
        atualizados: 0,
        ignorados: 0,
      })
    }

    const result = await contatoService.syncFromWhatsApp(contacts)

    return NextResponse.json({
      message: `Sync concluída: ${result.novos} novos, ${result.atualizados} atualizados`,
      ...result,
    })
  } catch (error: any) {
    console.error('Erro no sync WhatsApp:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar contatos WhatsApp' },
      { status: 500 }
    )
  }
}
