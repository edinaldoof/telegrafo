'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Inbox,
  RefreshCw,
  CheckCheck,
  MessageSquare,
  Send,
  User,
  Clock,
  ChevronLeft,
  Loader2,
  Mail,
  MailOpen,
  Search,
} from 'lucide-react'

interface MensagemRecebida {
  id: number
  sid: string
  de: string
  para: string
  corpo: string
  nomeRemetente: string | null
  whatsappId: string | null
  numMidia: number
  lida: boolean
  respondida: boolean
  recebidaEm: string
}

export default function InboxPage() {
  const [mensagens, setMensagens] = useState<MensagemRecebida[]>([])
  const [loading, setLoading] = useState(true)
  const [totalNaoLidas, setTotalNaoLidas] = useState(0)
  const [filtroNaoLidas, setFiltroNaoLidas] = useState(false)
  const [busca, setBusca] = useState('')

  // Conversa selecionada
  const [conversaSelecionada, setConversaSelecionada] = useState<MensagemRecebida | null>(null)
  const [respostaTexto, setRespostaTexto] = useState('')
  const [enviandoResposta, setEnviandoResposta] = useState(false)

  const carregarMensagens = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroNaoLidas) params.append('naoLidas', 'true')

      const res = await fetch(`/api/twilio/inbox?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMensagens(data.mensagens || [])
        setTotalNaoLidas(data.totalNaoLidas || 0)
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    } finally {
      setLoading(false)
    }
  }, [filtroNaoLidas])

  useEffect(() => {
    carregarMensagens()
  }, [carregarMensagens])

  // Auto-refresh a cada 30s
  useEffect(() => {
    const interval = setInterval(carregarMensagens, 30000)
    return () => clearInterval(interval)
  }, [carregarMensagens])

  const marcarComoLida = async (id: number) => {
    try {
      await fetch('/api/twilio/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      carregarMensagens()
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  const marcarTodasComoLidas = async () => {
    try {
      await fetch('/api/twilio/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marcarTodas: true }),
      })
      toast.success('Todas marcadas como lidas')
      carregarMensagens()
    } catch (error) {
      toast.error('Erro ao marcar como lidas')
    }
  }

  const abrirConversa = (msg: MensagemRecebida) => {
    setConversaSelecionada(msg)
    setRespostaTexto('')
    if (!msg.lida) {
      marcarComoLida(msg.id)
    }
  }

  const enviarResposta = async () => {
    if (!conversaSelecionada || !respostaTexto.trim()) return

    setEnviandoResposta(true)
    try {
      const res = await fetch('/api/twilio/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          para: conversaSelecionada.de,
          mensagem: respostaTexto,
          mensagemRecebidaId: conversaSelecionada.id,
        }),
      })

      const data = await res.json()

      if (data.sucesso) {
        toast.success('Resposta enviada!')
        setRespostaTexto('')
        carregarMensagens()
      } else {
        toast.error(data.erro || 'Erro ao enviar resposta')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar resposta')
    } finally {
      setEnviandoResposta(false)
    }
  }

  const formatarNumero = (numero: string) => {
    return numero.replace('whatsapp:', '').replace('+55', '')
  }

  const formatarData = (data: string) => {
    const d = new Date(data)
    const hoje = new Date()
    const diffDias = Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDias === 0) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDias === 1) {
      return 'Ontem ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  }

  // Filtrar por busca
  const mensagensFiltradas = mensagens.filter(m => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      m.corpo.toLowerCase().includes(termo) ||
      m.nomeRemetente?.toLowerCase().includes(termo) ||
      m.de.includes(termo)
    )
  })

  // View de conversa aberta
  if (conversaSelecionada) {
    return (
      <div className="space-y-4">
        {/* Header da conversa */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setConversaSelecionada(null)} className="p-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold truncate">
              {conversaSelecionada.nomeRemetente || formatarNumero(conversaSelecionada.de)}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {formatarNumero(conversaSelecionada.de)}
            </p>
          </div>
        </div>

        {/* Mensagem recebida */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                  <span className="font-medium text-sm sm:text-base truncate">
                    {conversaSelecionada.nomeRemetente || 'Contato'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatarData(conversaSelecionada.recebidaEm)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3 break-words">
                  {conversaSelecionada.corpo}
                </p>
                {conversaSelecionada.respondida && (
                  <span className="text-xs text-green-600 mt-2 inline-flex items-center gap-1">
                    <CheckCheck className="h-3 w-3" /> Respondida
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campo de resposta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Send className="h-4 w-4" />
              Responder (Texto Livre - Janela 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <textarea
                className="w-full min-h-[100px] sm:min-h-[120px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Digite sua resposta..."
                value={respostaTexto}
                onChange={(e) => setRespostaTexto(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-muted-foreground order-2 sm:order-1">
                  Respostas dentro de 24h nao precisam de template
                </p>
                <Button
                  onClick={enviarResposta}
                  disabled={enviandoResposta || !respostaTexto.trim()}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {enviandoResposta ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Resposta
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // View principal - Lista de mensagens
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Inbox WhatsApp
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Mensagens recebidas via Twilio
          </p>
        </div>
        <div className="flex gap-2">
          {totalNaoLidas > 0 && (
            <Button variant="secondary" size="sm" onClick={marcarTodasComoLidas} className="flex-1 sm:flex-none">
              <CheckCheck className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Marcar todas</span>
              <span className="sm:hidden">Lidas</span>
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={carregarMensagens} disabled={loading} className="flex-1 sm:flex-none">
            <RefreshCw className={`mr-1 sm:mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
            <span className="sm:hidden">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-blue-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{mensagens.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-0 cursor-pointer transition-all ${
            filtroNaoLidas ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-red-500/10 hover:bg-red-500/15'
          }`}
          onClick={() => setFiltroNaoLidas(!filtroNaoLidas)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{totalNaoLidas}</p>
                <p className="text-xs text-muted-foreground">Nao lidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MailOpen className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{mensagens.length - totalNaoLidas}</p>
                <p className="text-xs text-muted-foreground">Lidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-purple-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCheck className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {mensagens.filter(m => m.respondida).length}
                </p>
                <p className="text-xs text-muted-foreground">Respondidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, numero ou mensagem..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de mensagens */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : mensagensFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {filtroNaoLidas ? 'Nenhuma mensagem nao lida' : 'Nenhuma mensagem recebida'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Configure o webhook no Twilio Console para receber mensagens
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {mensagensFiltradas.map((msg) => (
            <Card
              key={msg.id}
              className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                !msg.lida ? 'border-l-4 border-l-primary bg-primary/5' : ''
              }`}
              onClick={() => abrirConversa(msg)}
            >
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    !msg.lida ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center justify-between gap-2">
                      <span className={`font-medium text-sm sm:text-base truncate ${!msg.lida ? 'text-primary' : ''}`}>
                        {msg.nomeRemetente || formatarNumero(msg.de)}
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                        <Clock className="h-3 w-3 hidden sm:block" />
                        {formatarData(msg.recebidaEm)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                      {msg.corpo}
                    </p>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatarNumero(msg.de)}
                      </span>
                      {msg.respondida && (
                        <span className="text-[10px] sm:text-xs text-green-600 flex items-center gap-1">
                          <CheckCheck className="h-3 w-3" /> Respondida
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
