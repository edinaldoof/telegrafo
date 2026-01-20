import { NextRequest, NextResponse } from 'next/server'
import { baileysDirectService } from '@/lib/services/baileys-direct.service'

/**
 * POST /api/grupos/gerenciar
 * Gerenciar grupos - várias ações
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, instanceName, groupJid, data } = body

    if (!instanceName) {
      return NextResponse.json(
        { error: 'instanceName é obrigatório' },
        { status: 400 }
      )
    }

    let result: any

    switch (action) {
      // ============================================
      // CONSULTAS
      // ============================================

      case 'list-all-groups':
        // Listar TODOS os grupos
        result = await baileysDirectService.getAllGroups(instanceName)
        break

      case 'get-metadata':
        // Obter metadados completos do grupo
        if (!groupJid) throw new Error('groupJid é obrigatório')
        result = await baileysDirectService.getGroupMetadata(instanceName, groupJid)
        break

      case 'get-participants':
        // Obter apenas participantes (simplificado)
        if (!groupJid) throw new Error('groupJid é obrigatório')
        result = await baileysDirectService.getGroupParticipants(instanceName, groupJid)
        break

      case 'get-invite-code':
        // Obter link de convite
        if (!groupJid) throw new Error('groupJid é obrigatório')
        result = await baileysDirectService.getGroupInviteCode(instanceName, groupJid)
        break

      // ============================================
      // GERENCIAMENTO DE MEMBROS
      // ============================================

      case 'add-participants':
        // Adicionar participantes
        if (!groupJid || !data?.participants) {
          throw new Error('groupJid e participants são obrigatórios')
        }
        result = await baileysDirectService.addGroupParticipants(
          instanceName,
          groupJid,
          data.participants
        )
        break

      case 'remove-participants':
        // Remover participantes
        if (!groupJid || !data?.participants) {
          throw new Error('groupJid e participants são obrigatórios')
        }
        result = await baileysDirectService.removeGroupParticipants(
          instanceName,
          groupJid,
          data.participants
        )
        break

      case 'promote-participants':
        // Promover a admin
        if (!groupJid || !data?.participants) {
          throw new Error('groupJid e participants são obrigatórios')
        }
        result = await baileysDirectService.promoteGroupParticipants(
          instanceName,
          groupJid,
          data.participants
        )
        break

      case 'demote-participants':
        // Rebaixar de admin
        if (!groupJid || !data?.participants) {
          throw new Error('groupJid e participants são obrigatórios')
        }
        result = await baileysDirectService.demoteGroupParticipants(
          instanceName,
          groupJid,
          data.participants
        )
        break

      // ============================================
      // CONFIGURAÇÕES DO GRUPO
      // ============================================

      case 'update-settings':
        // Atualizar configurações (announcement, locked, etc)
        if (!groupJid || !data?.setting) {
          throw new Error('groupJid e setting são obrigatórios')
        }
        result = await baileysDirectService.updateGroupSettings(
          instanceName,
          groupJid,
          data.setting
        )
        break

      case 'update-name':
        // Atualizar nome
        if (!groupJid || !data?.name) {
          throw new Error('groupJid e name são obrigatórios')
        }
        result = await baileysDirectService.updateGroupName(
          instanceName,
          groupJid,
          data.name
        )
        break

      case 'update-description':
        // Atualizar descrição
        if (!groupJid || !data?.description) {
          throw new Error('groupJid e description são obrigatórios')
        }
        result = await baileysDirectService.updateGroupDescription(
          instanceName,
          groupJid,
          data.description
        )
        break

      case 'update-picture':
        // Atualizar foto
        if (!groupJid || !data?.imageBase64) {
          throw new Error('groupJid e imageBase64 são obrigatórios')
        }
        result = await baileysDirectService.updateGroupPicture(
          instanceName,
          groupJid,
          data.imageBase64
        )
        break

      // ============================================
      // AÇÕES DE SEGURANÇA
      // ============================================

      case 'leave-group':
        // Sair do grupo
        if (!groupJid) throw new Error('groupJid é obrigatório')
        result = await baileysDirectService.leaveGroup(instanceName, groupJid)
        break

      case 'revoke-invite':
        // Revogar link de convite (gera novo)
        if (!groupJid) throw new Error('groupJid é obrigatório')
        result = await baileysDirectService.revokeGroupInvite(instanceName, groupJid)
        break

      default:
        return NextResponse.json(
          { error: `Ação desconhecida: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      result,
    })
  } catch (error: any) {
    console.error('Erro ao gerenciar grupo:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerenciar grupo' },
      { status: 500 }
    )
  }
}
