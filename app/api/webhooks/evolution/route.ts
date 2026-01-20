import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'

/**
 * POST /api/webhooks/evolution
 * Receber webhooks da Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar webhook secret - MANDATORY in production
    const webhookSecret = config.security.webhookSecret
    const receivedSecret = request.headers.get('x-webhook-secret')

    // In production, webhook secret is required
    if (config.isProduction && !webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured on server' },
        { status: 503 }
      )
    }

    // Validate the secret if configured
    if (webhookSecret && receivedSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const { event, instance, data } = payload

    // Processar diferentes eventos
    switch (event) {
      case 'qrcode.updated':
        await handleQrCodeUpdate(instance, data)
        break

      case 'connection.update':
        await handleConnectionUpdate(instance, data)
        break

      case 'messages.upsert':
        await handleMessageUpsert(instance, data)
        break

      case 'messages.update':
        await handleMessageUpdate(instance, data)
        break

      case 'groups.upsert':
        await handleGroupsUpsert(instance, data)
        break

      case 'group.participants.update':
        await handleGroupParticipantsUpdate(instance, data)
        break

      default:
        // Unhandled event
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao processar webhook', message: error.message },
      { status: 500 }
    )
  }
}

// ===== HANDLERS =====

async function handleQrCodeUpdate(instanceName: string, data: any) {
  const { qrcode } = data

  // Atualizar QR Code no banco
  await prisma.instance.updateMany({
    where: { instanceName },
    data: {
      status: 'qr',
      qrCode: qrcode?.base64 || qrcode,
      qrCodeUrl: qrcode?.base64 || qrcode,
    }
  })

  // Registrar no histórico
  await prisma.connectionHistory.create({
    data: {
      instanceName,
      evento: 'qr_updated',
      detalhes: { hasQrCode: !!qrcode },
      timestamp: new Date()
    }
  })
}

async function handleConnectionUpdate(instanceName: string, data: any) {
  const { state, statusReason } = data
  const normalizedState = normalizeConnectionState(state)

  // Atualizar status no banco
  await prisma.instance.updateMany({
    where: { instanceName },
    data: {
      status: normalizedState,
      ultimaConexao: normalizedState === 'connected' ? new Date() : undefined
    }
  })

  // Registrar no histórico
  await prisma.connectionHistory.create({
    data: {
      instanceName,
      evento: normalizedState,
      detalhes: { statusReason },
      timestamp: new Date()
    }
  })
}

async function handleMessageUpsert(instanceName: string, data: any) {
  // data pode ser um array ou objeto único
  const messages = Array.isArray(data) ? data : [data]

  for (const msg of messages) {
    const {
      key,
      message,
      messageType,
      messageTimestamp,
      pushName
    } = msg

    // Salvar mensagem no banco
    await prisma.mensagemInstance.create({
      data: {
        instance: { connect: { instanceName } },
        tipo: messageType || 'text',
        remoteJid: key.remoteJid,
        conteudo: message,
        messageId: key.id,
        status: 'received',
        metadata: {
          fromMe: key.fromMe,
          pushName,
          participant: key.participant
        },
        enviadoEm: new Date(messageTimestamp * 1000)
      }
    }).catch(() => {
      // Message already exists
    })
  }
}

function normalizeConnectionState(state?: string): string {
  if (!state) return 'disconnected'

  switch (state.toLowerCase()) {
    case 'open':
      return 'connected'
    case 'close':
    case 'closed':
      return 'disconnected'
    default:
      return state
  }
}

async function handleMessageUpdate(instanceName: string, data: any) {
  // Atualizar status de mensagens (lida, entregue, etc)
  const updates = Array.isArray(data) ? data : [data]

  for (const update of updates) {
    const { key, update: msgUpdate } = update

    if (!key?.id) continue

    await prisma.mensagemInstance.updateMany({
      where: {
        instance: { instanceName },
        messageId: key.id
      },
      data: {
        status: msgUpdate?.status || 'updated',
        metadata: msgUpdate
      }
    })
  }
}

async function handleGroupsUpsert(instanceName: string, data: any) {
  const groups = Array.isArray(data) ? data : [data]

  for (const group of groups) {
    const { id, subject, participants } = group

    // Verificar se grupo já existe
    const exists = await prisma.grupo.findUnique({
      where: { whatsappGroupId: id }
    })

    if (exists) {
      // Atualizar
      await prisma.grupo.update({
        where: { whatsappGroupId: id },
        data: {
          nome: subject,
          totalMembros: participants?.length || 0
        }
      })
    } else {
      // Criar (se foi criado fora do sistema)
      const ultimoGrupo = await prisma.grupo.findFirst({
        orderBy: { numeroGrupo: 'desc' }
      })

      await prisma.grupo.create({
        data: {
          whatsappGroupId: id,
          numeroGrupo: (ultimoGrupo?.numeroGrupo || 0) + 1,
          nome: subject,
          totalMembros: participants?.length || 0,
          capacidadeMaxima: 256,
          status: 'ativo',
          ehGrupoAtual: false
        }
      })
    }
  }
}

async function handleGroupParticipantsUpdate(instanceName: string, data: any) {
  const { id: groupJid, participants, action } = data

  // Atualizar contagem
  const grupo = await prisma.grupo.findUnique({
    where: { whatsappGroupId: groupJid }
  })

  if (grupo) {
    let novaQuantidade = grupo.totalMembros

    if (action === 'add') {
      novaQuantidade += participants.length
    } else if (action === 'remove') {
      novaQuantidade -= participants.length
    }

    await prisma.grupo.update({
      where: { whatsappGroupId: groupJid },
      data: {
        totalMembros: Math.max(0, novaQuantidade),
        status: novaQuantidade >= 256 ? 'cheio' : 'ativo'
      }
    })

    // Registrar log
    await prisma.logEvento.create({
      data: {
        tipo: `participante_${action}`,
        grupoId: grupo.id,
        descricao: `${action === 'add' ? 'Adicionados' : 'Removidos'} ${participants.length} participantes`,
        dadosJson: { groupJid, action, participants }
      }
    })
  }
}
