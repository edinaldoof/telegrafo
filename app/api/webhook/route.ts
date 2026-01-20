import { NextRequest, NextResponse } from 'next/server'
import { grupoService } from '@/lib/services/grupo.service'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, json } from '@/lib/observability/api'
import { AppError } from '@/lib/observability/errors'
import { logger } from '@/lib/observability/log'

/**
 * POST /api/webhook
 * Receber eventos da Evolution API
 * Nota: Webhook não requer autenticação padrão, usa secret próprio
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validar token de segurança do webhook
  const webhookSecret = request.headers.get('x-webhook-secret')
  const expectedSecret = process.env.WEBHOOK_SECRET || 'webhook-secret-key-troque-em-producao'

  if (webhookSecret !== expectedSecret) {
    logger.warn('webhook.unauthorized', { path: new URL(request.url).pathname })
    throw new AppError('Unauthorized', 401, 'WEBHOOK_UNAUTHORIZED')
  }

  const body = await request.json()

  logger.info('webhook.received', { event: (body as any)?.event, instance: (body as any)?.instance })

  // Responder imediatamente (200 OK)
  const response = json({ received: true })

  // Processar eventos de forma assíncrona
  processarEvento(body).catch((error) => {
    logger.error('webhook.process_error', error)
  })

  return response
})

async function processarEvento(body: any) {
  try {
    const { event, instance, data } = body

    switch (event) {
      case 'groups.upsert':
        // Grupo criado ou atualizado
        await processarGrupoAtualizado(data)
        break

      case 'groups.update':
        // Informações do grupo atualizadas
        await processarGrupoAtualizado(data)
        break

      case 'group.participants.update':
        // Participantes adicionados/removidos
        await processarParticipantesAtualizados(data)
        break

      case 'messages.upsert':
        // Nova mensagem
        break

      case 'connection.update':
        // Status da conexão mudou
        await registrarLog('connection_update', data)
        break

      default:
        // Unhandled event
    }
  } catch (error) {
    // Error processing event
  }
}

async function processarGrupoAtualizado(data: any) {
  try {
    const groupId = data.id

    if (!groupId) return

    // Buscar grupo no banco
    const grupo = await prisma.grupo.findFirst({
      where: { whatsappGroupId: groupId },
    })

    if (grupo) {
      // Atualizar contagem de membros
      await grupoService.atualizarContagemMembros(groupId)

      await registrarLog('grupo_atualizado', {
        grupoId: grupo.id,
        whatsappGroupId: groupId,
      })
    }
  } catch (error) {
    // Error processing group update
  }
}

async function processarParticipantesAtualizados(data: any) {
  try {
    const { id: groupId, action, participants } = data

    if (!groupId) return

    // Buscar grupo no banco
    const grupo = await prisma.grupo.findFirst({
      where: { whatsappGroupId: groupId },
    })

    if (!grupo) return

    // Atualizar contagem de membros
    await grupoService.atualizarContagemMembros(groupId)

    if (action === 'add') {
      // Participantes adicionados
      for (const participant of participants) {
        await registrarLog('participante_adicionado', {
          grupoId: grupo.id,
          participante: participant,
        })
      }
    } else if (action === 'remove') {
      // Participantes removidos
      for (const participant of participants) {
        // Marcar contato como inativo
        await prisma.contato.updateMany({
          where: {
            numeroWhatsapp: participant,
            grupoId: grupo.id,
          },
          data: {
            ativo: false,
          },
        })

        await registrarLog('participante_removido', {
          grupoId: grupo.id,
          participante: participant,
        })
      }
    }
  } catch (error) {
    // Error processing participants
  }
}

async function registrarLog(tipo: string, dados: any) {
  try {
    await prisma.logEvento.create({
      data: {
        tipo,
        descricao: `Evento webhook: ${tipo}`,
        dadosJson: dados,
      },
    })
  } catch (error) {
    // Error registering log
  }
}
