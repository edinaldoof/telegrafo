/**
 * Service helper para gerenciar grupos de forma fácil
 * Exemplos de uso no frontend
 */

interface Participante {
  phone: string
  isAdmin: boolean
  isSuperAdmin: boolean
}

export class GrupoManagerService {
  private baseUrl = '/api/grupos/gerenciar'

  /**
   * Listar TODOS os grupos que você participa
   */
  async listarTodosGrupos(instanceName: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'list-all-groups',
        instanceName,
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Ver participantes de um grupo
   */
  async verParticipantes(instanceName: string, groupJid: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-participants',
        instanceName,
        groupJid,
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Ver metadados completos do grupo
   */
  async verMetadados(instanceName: string, groupJid: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-metadata',
        instanceName,
        groupJid,
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Adicionar participantes (COM SEGURANÇA)
   * Adiciona em lotes com delay
   */
  async adicionarParticipantesSafe(
    instanceName: string,
    groupJid: string,
    participants: string[],
    options: {
      batchSize?: number // Padrão: 5
      delaySeconds?: number // Padrão: 30
    } = {}
  ) {
    const batchSize = options.batchSize || 5
    const delayMs = (options.delaySeconds || 30) * 1000

    const resultados = []

    // Processar em lotes
    for (let i = 0; i < participants.length; i += batchSize) {
      const lote = participants.slice(i, i + batchSize)

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-participants',
          instanceName,
          groupJid,
          data: { participants: lote },
        }),
      })

      const data = await response.json()
      resultados.push(data)

      // Delay entre lotes (exceto no último)
      if (i + batchSize < participants.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return resultados
  }

  /**
   * Remover participantes
   */
  async removerParticipantes(
    instanceName: string,
    groupJid: string,
    participants: string[]
  ) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove-participants',
        instanceName,
        groupJid,
        data: { participants },
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Promover a admin
   */
  async promoverAdmin(instanceName: string, groupJid: string, participants: string[]) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'promote-participants',
        instanceName,
        groupJid,
        data: { participants },
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Rebaixar de admin
   */
  async rebaixarAdmin(instanceName: string, groupJid: string, participants: string[]) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'demote-participants',
        instanceName,
        groupJid,
        data: { participants },
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Atualizar nome do grupo
   */
  async atualizarNome(instanceName: string, groupJid: string, name: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-name',
        instanceName,
        groupJid,
        data: { name },
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Atualizar descrição
   */
  async atualizarDescricao(instanceName: string, groupJid: string, description: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-description',
        instanceName,
        groupJid,
        data: { description },
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Restringir quem pode enviar mensagens
   * @param setting - 'announcement' (só admins) ou 'not_announcement' (todos)
   */
  async restringirMensagens(
    instanceName: string,
    groupJid: string,
    soAdmins: boolean
  ) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-settings',
        instanceName,
        groupJid,
        data: {
          setting: soAdmins ? 'announcement' : 'not_announcement',
        },
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Restringir quem pode editar info do grupo
   * @param locked - true (só admins) ou false (todos)
   */
  async restringirEdicao(instanceName: string, groupJid: string, locked: boolean) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-settings',
        instanceName,
        groupJid,
        data: {
          setting: locked ? 'locked' : 'unlocked',
        },
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Obter link de convite
   */
  async obterLinkConvite(instanceName: string, groupJid: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-invite-code',
        instanceName,
        groupJid,
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Revogar link de convite (gera novo)
   */
  async revogarLinkConvite(instanceName: string, groupJid: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'revoke-invite',
        instanceName,
        groupJid,
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Sair do grupo
   */
  async sairDoGrupo(instanceName: string, groupJid: string) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'leave-group',
        instanceName,
        groupJid,
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error)

    return data.result
  }

  /**
   * Análise de grupo (estatísticas úteis)
   */
  async analisarGrupo(instanceName: string, groupJid: string) {
    const [metadata, participants] = await Promise.all([
      this.verMetadados(instanceName, groupJid),
      this.verParticipantes(instanceName, groupJid),
    ])

    return {
      nome: metadata.subject,
      descricao: metadata.desc,
      criado: new Date(metadata.creation * 1000),
      totalMembros: participants.length,
      admins: participants.filter((p: Participante) => p.isAdmin).length,
      superAdmins: participants.filter((p: Participante) => p.isSuperAdmin).length,
      membrosComuns: participants.filter((p: Participante) => !p.isAdmin).length,
      listaAdmins: participants.filter((p: Participante) => p.isAdmin).map((p: Participante) => p.phone),
      listaMembros: participants.map((p: Participante) => p.phone),
      configuracoes: {
        apenasAdminsEnviam: metadata.announce || false,
        apenasAdminsEditam: metadata.restrict || false,
      },
    }
  }

  /**
   * Exportar lista de membros para CSV
   */
  async exportarMembrosCSV(instanceName: string, groupJid: string) {
    const participants = await this.verParticipantes(instanceName, groupJid)

    const csv = [
      'Telefone,Admin,SuperAdmin',
      ...participants.map(
        (p: Participante) => `${p.phone},${p.isAdmin ? 'Sim' : 'Não'},${p.isSuperAdmin ? 'Sim' : 'Não'}`
      ),
    ].join('\n')

    // Criar download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grupo-${groupJid.split('@')[0]}-membros.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return csv
  }
}

// Instância singleton
export const grupoManagerService = new GrupoManagerService()
