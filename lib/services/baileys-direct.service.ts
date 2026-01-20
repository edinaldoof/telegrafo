import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WAMessage,
  AnyMessageContent,
  downloadMediaMessage,
  proto
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import { EventEmitter } from 'events'
import path from 'path'
import { prisma } from '../prisma'
import P from 'pino'
import fs from 'fs/promises'

const logger = P({ level: 'silent' })

interface SendMessageOptions {
  text?: string
  media?: {
    type: 'image' | 'video' | 'audio' | 'document'
    url?: string
    buffer?: Buffer
    caption?: string
    fileName?: string
  }
}

// Global socket storage que sobrevive ao hot-reload do Next.js
declare global {
  var baileysSocketsGlobal: Map<string, any> | undefined
}

if (!global.baileysSocketsGlobal) {
  global.baileysSocketsGlobal = new Map<string, any>()
}

class BaileysDirectService extends EventEmitter {
  private get activeSockets(): Map<string, any> {
    return global.baileysSocketsGlobal!
  }
  private authPath = path.join(process.cwd(), 'baileys-auth')

  async connectInstance(instanceName: string): Promise<void> {
    try {
      const authDir = path.join(this.authPath, instanceName)
      const { state, saveCreds } = await useMultiFileAuthState(authDir)
      const { version } = await fetchLatestBaileysVersion()

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger,
        version,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: undefined,
      })

      this.activeSockets.set(instanceName, sock)

      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          try {
            const qrCodeData = await QRCode.toDataURL(qr)

            await prisma.instance.updateMany({
              where: { instanceName },
              data: {
                status: 'qr',
                qrCode: qrCodeData,
                qrCodeUrl: qrCodeData,
              }
            })

            this.emit('qr', instanceName, qrCodeData)
          } catch (err) {
            // Error processing QR code
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut

          // Se erro 401 (Unauthorized), limpar credenciais corrompidas
          if (statusCode === 401) {
            try {
              const authDir = path.join(this.authPath, instanceName)
              await fs.rm(authDir, { recursive: true, force: true })
            } catch (cleanError) {
              // Error cleaning credentials
            }
          }

          await prisma.instance.updateMany({
            where: { instanceName },
            data: { status: 'disconnected' }
          })

          this.activeSockets.delete(instanceName)

          if (shouldReconnect && statusCode !== 401) {
            setTimeout(() => this.connectInstance(instanceName), 3000)
          } else {
            this.emit('disconnected', instanceName)
          }
        } else if (connection === 'connecting') {
          await prisma.instance.updateMany({
            where: { instanceName },
            data: { status: 'connecting' }
          })
        } else if (connection === 'open') {
          const me = sock.user
          const phoneNumber = me?.id?.split(':')[0] || null

          await prisma.instance.updateMany({
            where: { instanceName },
            data: {
              status: 'connected',
              numero: phoneNumber,
              ultimaConexao: new Date(),
              qrCode: null,
              qrCodeUrl: null,
            }
          })

          await prisma.connectionHistory.create({
            data: {
              instanceName,
              evento: 'connected',
              detalhes: {
                phoneNumber,
                user: me ? JSON.parse(JSON.stringify(me)) : null
              },
            },
          })

          this.emit('connected', instanceName, sock)
        }
      })

      sock.ev.on('messages.upsert', (m) => {
        this.emit('messages.upsert', instanceName, m)
      })

    } catch (error) {
      await prisma.instance.updateMany({
        where: { instanceName },
        data: { status: 'disconnected' }
      })
      throw error
    }
  }

  async generateQRCode(instanceName: string): Promise<string | null> {
    try {
      // Desconectar socket existente se houver
      await this.disconnect(instanceName)

      // Aguardar QR code ser gerado (máximo 30 segundos)
      const qrCodeData = await new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(null)
        }, 30000)

        // Registrar listener ANTES de iniciar conexão (evita race condition)
        this.once('qr', (name: string, qr: string) => {
          if (name === instanceName) {
            clearTimeout(timeout)
            resolve(qr)
          }
        })

        // Iniciar nova conexão APÓS registrar o listener
        this.connectInstance(instanceName)
      })

      return qrCodeData
    } catch (error) {
      return null
    }
  }

  getSocket(instanceName: string) {
    const socket = this.activeSockets.get(instanceName)
    return socket
  }

  async disconnect(instanceName: string) {
    const sock = this.activeSockets.get(instanceName)
    if (sock) {
      await sock.logout()
      this.activeSockets.delete(instanceName)
    }
  }

  // ============================================
  // ENVIO DE MENSAGENS
  // ============================================

  /**
   * Enviar mensagem de texto
   */
  async sendTextMessage(instanceName: string, jid: string, text: string): Promise<any> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const message = await sock.sendMessage(jid, { text })
    return message
  }

  /**
   * Enviar mídia (imagem, vídeo, áudio, documento)
   */
  async sendMediaMessage(
    instanceName: string,
    jid: string,
    options: SendMessageOptions
  ): Promise<any> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    if (!options.media) {
      throw new Error('Mídia não fornecida')
    }

    const { type, url, buffer, caption, fileName } = options.media
    let content: AnyMessageContent

    // Preparar conteúdo baseado no tipo
    const mediaData = buffer || (url ? { url } : null)
    if (!mediaData) {
      throw new Error('Buffer ou URL da mídia é obrigatório')
    }

    switch (type) {
      case 'image':
        content = {
          image: mediaData,
          caption: caption || '',
        }
        break
      case 'video':
        content = {
          video: mediaData,
          caption: caption || '',
        }
        break
      case 'audio':
        content = {
          audio: mediaData,
          mimetype: 'audio/mp4',
        }
        break
      case 'document':
        content = {
          document: mediaData,
          mimetype: 'application/pdf',
          fileName: fileName || 'document.pdf',
        }
        break
      default:
        throw new Error(`Tipo de mídia não suportado: ${type}`)
    }

    const message = await sock.sendMessage(jid, content)
    return message
  }

  /**
   * Enviar mensagem para vários destinatários
   */
  async sendBulkMessage(
    instanceName: string,
    jids: string[],
    options: SendMessageOptions
  ): Promise<any[]> {
    const results = []

    for (const jid of jids) {
      try {
        if (options.text) {
          const result = await this.sendTextMessage(instanceName, jid, options.text)
          results.push({ jid, success: true, result })
        } else if (options.media) {
          const result = await this.sendMediaMessage(instanceName, jid, options)
          results.push({ jid, success: true, result })
        }
      } catch (error: any) {
        results.push({ jid, success: false, error: error.message })
      }

      // Delay entre mensagens para evitar ban
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return results
  }

  // ============================================
  // GERENCIAMENTO DE GRUPOS
  // ============================================

  /**
   * Criar grupo
   */
  async createGroup(instanceName: string, name: string, participants: string[]): Promise<any> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const group = await sock.groupCreate(name, participants)
    return group
  }

  /**
   * Obter link de convite do grupo
   */
  async getGroupInviteCode(instanceName: string, groupJid: string): Promise<string> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const code = await sock.groupInviteCode(groupJid)
    return `https://chat.whatsapp.com/${code}`
  }

  /**
   * Atualizar configurações do grupo
   */
  async updateGroupSettings(
    instanceName: string,
    groupJid: string,
    setting: 'announcement' | 'locked' | 'not_announcement' | 'unlocked'
  ): Promise<void> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    await sock.groupSettingUpdate(groupJid, setting)
  }

  /**
   * Adicionar participantes ao grupo
   */
  async addGroupParticipants(
    instanceName: string,
    groupJid: string,
    participants: string[]
  ): Promise<any> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const result = await sock.groupParticipantsUpdate(groupJid, participants, 'add')
    return result
  }

  /**
   * Remover participantes do grupo
   */
  async removeGroupParticipants(
    instanceName: string,
    groupJid: string,
    participants: string[]
  ): Promise<any> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const result = await sock.groupParticipantsUpdate(groupJid, participants, 'remove')
    return result
  }

  /**
   * Promover participantes a admin
   */
  async promoteGroupParticipants(
    instanceName: string,
    groupJid: string,
    participants: string[]
  ): Promise<any> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const result = await sock.groupParticipantsUpdate(groupJid, participants, 'promote')
    return result
  }

  /**
   * Rebaixar admin a participante
   */
  async demoteGroupParticipants(
    instanceName: string,
    groupJid: string,
    participants: string[]
  ): Promise<any> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const result = await sock.groupParticipantsUpdate(groupJid, participants, 'demote')
    return result
  }

  /**
   * Atualizar nome do grupo
   */
  async updateGroupName(instanceName: string, groupJid: string, name: string): Promise<void> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    await sock.groupUpdateSubject(groupJid, name)
  }

  /**
   * Atualizar descrição do grupo
   */
  async updateGroupDescription(
    instanceName: string,
    groupJid: string,
    description: string
  ): Promise<void> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    await sock.groupUpdateDescription(groupJid, description)
  }

  /**
   * Atualizar foto do grupo
   */
  async updateGroupPicture(
    instanceName: string,
    groupJid: string,
    imageBase64: string
  ): Promise<void> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    // Converter base64 para buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    await sock.updateProfilePicture(groupJid, buffer)
  }

  /**
   * Obter metadados do grupo (inclui participantes, admins, etc)
   */
  async getGroupMetadata(instanceName: string, groupJid: string): Promise<any> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const metadata = await sock.groupMetadata(groupJid)
    return metadata
  }

  /**
   * Listar TODOS os grupos que você participa
   */
  async getAllGroups(instanceName: string): Promise<any[]> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    try {
      // Buscar todos os chats
      const chats = await sock.groupFetchAllParticipating()

      // Converter para array e adicionar informações úteis
      const groups = Object.values(chats).map((group: any) => ({
        id: group.id,
        name: group.subject,
        owner: group.owner,
        creation: group.creation,
        desc: group.desc,
        participants: group.participants,
        participantCount: group.participants?.length || 0,
        admins: group.participants?.filter((p: any) => p.admin === 'admin' || p.admin === 'superadmin').map((p: any) => p.id) || [],
        iAmAdmin: group.participants?.some((p: any) =>
          p.id === sock.user?.id && (p.admin === 'admin' || p.admin === 'superadmin')
        ) || false,
        announce: group.announce || false,
        restrict: group.restrict || false,
      }))

      return groups
    } catch (error) {
      throw error
    }
  }

  /**
   * Obter apenas PARTICIPANTES de um grupo (simplificado)
   */
  async getGroupParticipants(instanceName: string, groupJid: string): Promise<any[]> {
    const metadata = await this.getGroupMetadata(instanceName, groupJid)

    return metadata.participants.map((p: any) => ({
      id: p.id,
      phone: p.id.split('@')[0],
      isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
      isSuperAdmin: p.admin === 'superadmin',
      admin: p.admin || null,
    }))
  }

  /**
   * Sair de um grupo
   */
  async leaveGroup(instanceName: string, groupJid: string): Promise<void> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    await sock.groupLeave(groupJid)
  }

  /**
   * Revogar link de convite do grupo (gera novo)
   */
  async revokeGroupInvite(instanceName: string, groupJid: string): Promise<string> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    const newCode = await sock.groupRevokeInvite(groupJid)
    return `https://chat.whatsapp.com/${newCode}`
  }

  // ============================================
  // OUTRAS OPERAÇÕES
  // ============================================

  /**
   * Verificar se número existe no WhatsApp
   */
  async checkNumberExists(instanceName: string, number: string): Promise<boolean> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    try {
      const [result] = await sock.onWhatsApp(number)
      return result?.exists || false
    } catch (error) {
      return false
    }
  }

  /**
   * Download de mídia
   */
  async downloadMedia(message: WAMessage): Promise<Buffer | null> {
    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger,
          reuploadRequest: () => Promise.resolve({} as any)
        }
      )
      return buffer as Buffer
    } catch (error) {
      return null
    }
  }

  /**
   * Marcar mensagem como lida
   */
  async markMessageRead(instanceName: string, jid: string, messageIds: string[]): Promise<void> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    await sock.readMessages([{ remoteJid: jid, id: messageIds[0], participant: undefined }])
  }

  /**
   * Enviar presença (digitando, gravando, online)
   */
  async sendPresenceUpdate(
    instanceName: string,
    type: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused',
    jid?: string
  ): Promise<void> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    await sock.sendPresenceUpdate(type, jid)
  }

  /**
   * Obter foto de perfil
   */
  async getProfilePicture(instanceName: string, jid: string): Promise<string | null> {
    const sock = this.getSocket(instanceName)
    if (!sock) {
      throw new Error(`Instância ${instanceName} não está conectada`)
    }

    try {
      const url = await sock.profilePictureUrl(jid, 'image')
      return url
    } catch (error) {
      return null
    }
  }
}

export const baileysDirectService = new BaileysDirectService()
