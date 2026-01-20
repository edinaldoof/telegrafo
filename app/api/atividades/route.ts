import { NextRequest, NextResponse } from 'next/server'
import { auditoriaService } from '@/lib/services/auditoria.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const usuario = searchParams.get('usuario')
    const limite = searchParams.get('limite')
    const pagina = searchParams.get('pagina')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    const resultado = await auditoriaService.listar({
      tipo: tipo || undefined,
      usuario: usuario || undefined,
      limite: limite ? parseInt(limite) : 50,
      pagina: pagina ? parseInt(pagina) : 1,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
    })

    const atividadesFormatadas = resultado.atividades.map((atividade) => {
      let icone = 'activity'
      let cor = 'text-gray-600'

      switch (atividade.tipo) {
        case 'login':
          icone = 'log-in'
          cor = 'text-green-600'
          break
        case 'logout':
          icone = 'log-out'
          cor = 'text-gray-600'
          break
        case 'mensagem_enviada':
          icone = 'send'
          cor = 'text-green-600'
          break
        case 'contato_adicionado':
        case 'contato_importado':
          icone = 'user-plus'
          cor = 'text-blue-600'
          break
        case 'contato_removido':
          icone = 'user-minus'
          cor = 'text-red-600'
          break
        case 'grupo_criado':
          icone = 'users'
          cor = 'text-purple-600'
          break
        case 'grupo_deletado':
          icone = 'users'
          cor = 'text-red-600'
          break
        case 'config_alterada':
          icone = 'settings'
          cor = 'text-yellow-600'
          break
        case 'instance_criada':
        case 'instance_conectada':
          icone = 'smartphone'
          cor = 'text-green-600'
          break
        case 'instance_desconectada':
          icone = 'smartphone'
          cor = 'text-red-600'
          break
        case 'template_criado':
          icone = 'file-text'
          cor = 'text-blue-600'
          break
        case 'agendamento_criado':
          icone = 'calendar'
          cor = 'text-indigo-600'
          break
        case 'erro':
          icone = 'alert-circle'
          cor = 'text-red-600'
          break
        default:
          icone = 'activity'
          cor = 'text-gray-600'
      }

      const agora = new Date()
      const criadoEm = new Date(atividade.criadoEm)
      const diffMs = agora.getTime() - criadoEm.getTime()
      const diffMinutos = Math.floor(diffMs / (1000 * 60))
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      let tempoRelativo = ''
      if (diffMinutos < 1) {
        tempoRelativo = 'agora mesmo'
      } else if (diffMinutos < 60) {
        tempoRelativo = `${diffMinutos} minuto${diffMinutos > 1 ? 's' : ''} atrás`
      } else if (diffHoras < 24) {
        tempoRelativo = `${diffHoras} hora${diffHoras > 1 ? 's' : ''} atrás`
      } else {
        tempoRelativo = `${diffDias} dia${diffDias > 1 ? 's' : ''} atrás`
      }

      return {
        id: atividade.id,
        tipo: atividade.tipo,
        descricao: atividade.descricao,
        usuario: atividade.usuario,
        ip: atividade.ip,
        icone,
        cor,
        tempoRelativo,
        criadoEm: atividade.criadoEm,
        grupo: atividade.grupo,
        dados: atividade.dadosJson,
      }
    })

    return NextResponse.json({
      atividades: atividadesFormatadas,
      total: resultado.total,
      pagina: resultado.pagina,
      totalPaginas: resultado.totalPaginas,
    })
  } catch (error: unknown) {
    console.error('Erro ao obter atividades:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao obter atividades' },
      { status: 500 }
    )
  }
}
