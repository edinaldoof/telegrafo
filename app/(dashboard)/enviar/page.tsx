'use client'

import { useState, useRef } from 'react'
import { Send, Loader2, CheckCircle, Users, MessageSquare, FileText, Eye, UserCircle, Upload, X, Image, DollarSign, AlertTriangle, Calculator } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TwilioTemplate {
  sid: string
  nome: string
  idioma: string
  tipos: string[]
  corpo: string | null
  variaveis: Record<string, any>
  status: string
  podeUsar: boolean
}

interface TagItem {
  id: number
  nome: string
  cor?: string | null
  totalContatos?: number
}

interface Anexo {
  url: string
  fullUrl: string
  fileName: string
  mimeType: string
  mediaType: string
}

type TipoDestino = 'contatos' | 'grupos'

export default function EnviarPage() {
  const [tipoDestino, setTipoDestino] = useState<TipoDestino>('contatos')
  const [templateSelecionado, setTemplateSelecionado] = useState<TwilioTemplate | null>(null)
  const [contatosSelecionados, setContatosSelecionados] = useState<number[]>([])
  const [tagsSelecionadas, setTagsSelecionadas] = useState<number[]>([])
  const [gruposSelecionados, setGruposSelecionados] = useState<number[]>([])
  const [variaveis, setVariaveis] = useState<Record<string, string>>({})
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [anexo, setAnexo] = useState<Anexo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Custo por mensagem WhatsApp Business (Brasil) em USD
  const CUSTO_POR_MENSAGEM_USD = 0.0625

  // Buscar templates aprovados do Twilio
  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['twilio-templates'],
    queryFn: async () => {
      const res = await fetch('/api/twilio/templates')
      if (!res.ok) return { templates: [] }
      return res.json()
    },
  })

  const templatesAprovados: TwilioTemplate[] = (templatesData?.templates || [])
    .filter((t: TwilioTemplate) => t.podeUsar)

  // Buscar contatos
  const { data: contatos } = useQuery({
    queryKey: ['contatos'],
    queryFn: async () => {
      const res = await fetch('/api/contatos')
      if (!res.ok) return []
      const data = await res.json()
      return data.data || data.contatos || []
    },
  })

  // Buscar tags
  const { data: tagsResponse } = useQuery({
    queryKey: ['tags'],
    queryFn: async (): Promise<TagItem[]> => {
      const res = await fetch('/api/tags')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data?.tags) ? data.tags : []
    },
  })

  // Buscar grupos
  const { data: grupos } = useQuery({
    queryKey: ['grupos'],
    queryFn: async () => {
      const res = await fetch('/api/grupos')
      if (!res.ok) return []
      const data = await res.json()
      return data.data || data.grupos || data || []
    },
  })

  // Buscar instancias
  const { data: instances } = useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const res = await fetch('/api/instances')
      if (!res.ok) return []
      const data = await res.json()
      return data.data || data.instances || data || []
    },
  })

  // Buscar saldo Twilio
  const { data: saldoData } = useQuery({
    queryKey: ['twilio-saldo'],
    queryFn: async () => {
      const res = await fetch('/api/twilio/saldo')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  })

  const saldoAtual = saldoData?.saldo?.balance ? parseFloat(saldoData.saldo.balance) : 0
  const moeda = saldoData?.saldo?.currency || 'USD'

  const tagsDisponiveis: TagItem[] = tagsResponse ?? []

  // Filtrar contatos pela busca
  const contatosFiltrados = (contatos || []).filter((c: any) =>
    busca === '' ||
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.numeroWhatsapp?.includes(busca)
  )

  // Calcular total de contatos das tags selecionadas
  const totalContatosTags = tagsDisponiveis
    .filter(t => tagsSelecionadas.includes(t.id))
    .reduce((acc, t) => acc + (t.totalContatos || 0), 0)

  // Extrair variaveis do template
  const extractVariables = (corpo: string | null): string[] => {
    if (!corpo) return []
    const regex = /\{\{(\d+)\}\}/g
    const vars: string[] = []
    let match
    while ((match = regex.exec(corpo)) !== null) {
      if (!vars.includes(match[1])) {
        vars.push(match[1])
      }
    }
    return vars.sort((a, b) => parseInt(a) - parseInt(b))
  }

  const variaveisTemplate = templateSelecionado ? extractVariables(templateSelecionado.corpo) : []

  // Upload de arquivo (para grupos)
  const handleFileUpload = async (file: File) => {
    setUploading(true)
    toast.info('Enviando ' + file.name + '...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro no upload')
      }

      const data = await res.json()
      setAnexo({
        url: data.fullUrl,
        fullUrl: data.fullUrl,
        fileName: data.fileName || file.name,
        mimeType: data.mimeType,
        mediaType: data.mediaType,
      })
      toast.success('Arquivo anexado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  // Mutation para enviar via Twilio (templates)
  const enviarTwilioMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/twilio/enviar-massa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || error.erro || 'Erro ao enviar')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Envio iniciado! ' + (data.totalEnviados || 0) + ' mensagem(ns) enviada(s)')
      setContatosSelecionados([])
      setTagsSelecionadas([])
      setVariaveis({})
      setTemplateSelecionado(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar mensagem')
    },
  })

  // Mutation para enviar via Baileys (grupos)
  const enviarBaileysMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/mensagens/enviar-massa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao enviar')
      }
      return res.json()
    },
    onSuccess: (data) => {
      const total = data.totalGrupos || 0
      toast.success('Envio iniciado para ' + total + ' grupo(s)!')
      setMensagem('')
      setGruposSelecionados([])
      setAnexo(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar mensagem')
    },
  })

  const handleEnviar = () => {
    if (tipoDestino === 'contatos') {
      // Enviar via Twilio com template
      if (!templateSelecionado) {
        toast.error('Selecione um template')
        return
      }

      if (contatosSelecionados.length === 0 && tagsSelecionadas.length === 0) {
        toast.error('Selecione pelo menos um contato ou tag')
        return
      }

      for (const v of variaveisTemplate) {
        if (!variaveis[v]?.trim()) {
          toast.error('Preencha a variavel ' + v)
          return
        }
      }

      // Abrir dialog de confirmacao com custos
      setIsConfirmOpen(true)
    } else {
      // Enviar via Baileys para grupos
      if (gruposSelecionados.length === 0) {
        toast.error('Selecione pelo menos um grupo')
        return
      }

      if (!instanceId) {
        toast.error('Selecione uma instancia Baileys')
        return
      }

      if (!mensagem.trim() && !anexo) {
        toast.error('Digite uma mensagem ou anexe um arquivo')
        return
      }

      enviarBaileysMutation.mutate({
        instanceId: Number(instanceId),
        tipo: anexo ? anexo.mediaType : 'texto',
        conteudo: mensagem,
        grupos: gruposSelecionados,
        anexo: anexo ? { url: anexo.fullUrl, fileName: anexo.fileName, mimeType: anexo.mimeType } : undefined,
      })
    }
  }

  const toggleContato = (contatoId: number) => {
    setContatosSelecionados(prev =>
      prev.includes(contatoId)
        ? prev.filter(id => id !== contatoId)
        : [...prev, contatoId]
    )
  }

  const toggleTag = (tagId: number) => {
    setTagsSelecionadas(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const toggleGrupo = (grupoId: number) => {
    setGruposSelecionados(prev =>
      prev.includes(grupoId)
        ? prev.filter(id => id !== grupoId)
        : [...prev, grupoId]
    )
  }

  const selecionarTodos = () => {
    if (contatosSelecionados.length === contatosFiltrados.length) {
      setContatosSelecionados([])
    } else {
      setContatosSelecionados(contatosFiltrados.map((c: any) => c.id))
    }
  }

  const totalDestinatarios = contatosSelecionados.length + totalContatosTags
  const isPending = enviarTwilioMutation.isPending || enviarBaileysMutation.isPending

  // Calculos de custo
  const custoEstimado = totalDestinatarios * CUSTO_POR_MENSAGEM_USD
  const mensagensRestantes = saldoAtual > 0 ? Math.floor(saldoAtual / CUSTO_POR_MENSAGEM_USD) : 0
  const saldoAposEnvio = saldoAtual - custoEstimado
  const temSaldoSuficiente = saldoAposEnvio >= 0

  // Funcao para confirmar e enviar
  const confirmarEnvio = () => {
    const destinatariosNumeros = contatos
      ?.filter((c: any) => contatosSelecionados.includes(c.id))
      .map((c: any) => c.numeroWhatsapp) || []

    enviarTwilioMutation.mutate({
      templateSid: templateSelecionado!.sid,
      destinatarios: destinatariosNumeros,
      filtroTags: tagsSelecionadas,
      variaveis: variaveis,
    })
    setIsConfirmOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Enviar Mensagens</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Envie mensagens para contatos ou grupos
        </p>
      </div>

      {/* Tipo de Destino */}
      <Card>
        <CardContent className="p-3 sm:pt-6 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant={tipoDestino === 'contatos' ? 'primary' : 'secondary'}
              className="flex-1 justify-start text-xs sm:text-sm"
              onClick={() => setTipoDestino('contatos')}
            >
              <UserCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Contatos (Twilio)</span>
            </Button>
            <Button
              variant={tipoDestino === 'grupos' ? 'primary' : 'secondary'}
              className="flex-1 justify-start text-xs sm:text-sm"
              onClick={() => setTipoDestino('grupos')}
            >
              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Grupos (Baileys)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {tipoDestino === 'contatos' ? (
        /* MODO CONTATOS - TWILIO COM TEMPLATES */
        <>
        {/* Card de Saldo e Previsao */}
        <Card className="border-0 bg-gradient-to-r from-green-500/10 to-blue-500/10">
          <CardContent className="p-4 sm:pt-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-3">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 text-center sm:text-left">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo</p>
                  <p className="text-sm sm:text-lg font-bold font-mono">${saldoAtual.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 text-center sm:text-left">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Msgs Possiveis</p>
                  <p className="text-sm sm:text-lg font-bold">{mensagensRestantes.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 text-center sm:text-left">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Custo/Msg</p>
                  <p className="text-sm sm:text-lg font-bold font-mono">${CUSTO_POR_MENSAGEM_USD}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Template
                </CardTitle>
                <CardDescription>Selecione um template aprovado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTemplates ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : templatesAprovados.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum template aprovado</p>
                    <p className="text-xs mt-1">Crie templates no Console do Twilio</p>
                  </div>
                ) : (
                  <>
                    <Select
                      value={templateSelecionado?.sid || ''}
                      onValueChange={(sid) => {
                        const template = templatesAprovados.find(t => t.sid === sid)
                        setTemplateSelecionado(template || null)
                        setVariaveis({})
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templatesAprovados.map((template) => (
                          <SelectItem key={template.sid} value={template.sid}>
                            {template.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {templateSelecionado && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-green-500/20 text-green-400 border-0">Aprovado</Badge>
                          <Button variant="ghost" size="sm" onClick={() => setIsPreviewOpen(true)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                        {templateSelecionado.corpo && (
                          <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {templateSelecionado.corpo}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {templateSelecionado && variaveisTemplate.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Variaveis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {variaveisTemplate.map((v) => (
                    <div key={v} className="space-y-2">
                      <Label>Variavel {v}</Label>
                      <Input
                        value={variaveis[v] || ''}
                        onChange={(e) => setVariaveis(prev => ({ ...prev, [v]: e.target.value }))}
                        placeholder={'Valor para variavel ' + v}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Destinatarios
                </CardTitle>
                <CardDescription>
                  Selecione categorias e/ou contatos individuais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Secao 1: Categorias (Tags) */}
                {tagsDisponiveis.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Categorias</Label>
                    <div className="flex flex-wrap gap-2">
                      {tagsDisponiveis.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={tagsSelecionadas.includes(tag.id) ? 'default' : 'secondary'}
                          className="cursor-pointer text-sm px-3 py-1.5 transition-all hover:scale-105"
                          style={tagsSelecionadas.includes(tag.id) ? { backgroundColor: tag.cor || '#3B82F6' } : {}}
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.nome} ({tag.totalContatos || 0})
                        </Badge>
                      ))}
                    </div>
                    {tagsSelecionadas.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {totalContatosTags} contato(s) via categorias
                      </p>
                    )}
                  </div>
                )}

                {/* Secao 2: Contatos Individuais (colapsavel) */}
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2 py-2 border-t pt-4">
                    <span className="text-xs group-open:rotate-90 transition-transform">&#9654;</span>
                    Adicionar contatos individualmente
                    {contatosSelecionados.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {contatosSelecionados.length} selecionado(s)
                      </Badge>
                    )}
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Buscar..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="secondary" size="sm" onClick={selecionarTodos}>
                        {contatosSelecionados.length === contatosFiltrados.length ? 'Limpar' : 'Todos'}
                      </Button>
                    </div>
                    <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                      {contatosFiltrados.map((contato: any) => (
                        <div key={contato.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={contatosSelecionados.includes(contato.id)}
                            onCheckedChange={() => toggleContato(contato.id)}
                          />
                          <span className="text-sm">{contato.nome} ({contato.numeroWhatsapp})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>

                {/* Rodape: Total */}
                {totalDestinatarios > 0 && (
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Total: {totalDestinatarios} destinatario(s)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tagsSelecionadas.length > 0 && `${totalContatosTags} via categorias`}
                      {tagsSelecionadas.length > 0 && contatosSelecionados.length > 0 && ' + '}
                      {contatosSelecionados.length > 0 && `${contatosSelecionados.length} individuais`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={handleEnviar}
              disabled={isPending || !templateSelecionado || totalDestinatarios === 0}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar para {totalDestinatarios} destinatario(s)
            </Button>
          </div>
        </div>
        </>
      ) : (
        /* MODO GRUPOS - BAILEYS COM TEXTO LIVRE */
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instancia Baileys</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={instanceId} onValueChange={setInstanceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma instancia" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances?.filter((i: any) => i.status === 'connected').map((instance: any) => (
                      <SelectItem key={instance.id} value={String(instance.id)}>
                        {instance.displayName || instance.instanceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grupos</CardTitle>
                <CardDescription>{gruposSelecionados.length} selecionado(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                  {grupos?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum grupo</p>
                  ) : (
                    grupos?.map((grupo: any) => (
                      <div key={grupo.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={gruposSelecionados.includes(grupo.id)}
                          onCheckedChange={() => toggleGrupo(grupo.id)}
                        />
                        <span className="text-sm">{grupo.nome}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mensagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  className="min-h-[150px]"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />

                {!anexo ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Anexar arquivo (opcional)
                  </Button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      <span className="text-sm truncate">{anexo.fileName}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAnexo(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={handleEnviar}
              disabled={isPending || gruposSelecionados.length === 0 || !instanceId}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar para {gruposSelecionados.length} grupo(s)
            </Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{templateSelecionado?.nome}</DialogTitle>
            <DialogDescription>Preview do template</DialogDescription>
          </DialogHeader>
          {templateSelecionado && (
            <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
              {templateSelecionado.corpo || 'Sem corpo'}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmacao de Envio com Custos */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calculator className="h-5 w-5 text-primary" />
              Confirmar Envio
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Revise os custos estimados antes de enviar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            {/* Resumo do Envio */}
            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Template:</span>
                <span className="font-medium truncate ml-2 max-w-[150px]">{templateSelecionado?.nome}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Destinatarios:</span>
                <span className="font-medium">{totalDestinatarios}</span>
              </div>
            </div>

            {/* Custos */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between p-2 sm:p-3 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-xs sm:text-sm">Custo/msg:</span>
                </div>
                <span className="font-mono font-medium text-xs sm:text-sm">${CUSTO_POR_MENSAGEM_USD.toFixed(4)}</span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-xs sm:text-sm font-medium">Total estimado:</span>
                </div>
                <span className="font-mono font-bold text-base sm:text-lg">${custoEstimado.toFixed(4)}</span>
              </div>
            </div>

            {/* Saldo */}
            <div className="border-t pt-3 sm:pt-4 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Saldo atual:</span>
                <span className="font-mono font-medium">${saldoAtual.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Saldo apos envio:</span>
                <span className={`font-mono font-medium ${saldoAposEnvio < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ${saldoAposEnvio.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
                <span className="text-muted-foreground">Msgs possiveis:</span>
                <span className="font-mono font-bold text-primary">{mensagensRestantes.toLocaleString()}</span>
              </div>
            </div>

            {/* Aviso de saldo insuficiente */}
            {!temSaldoSuficiente && (
              <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-red-600">
                  <p className="font-medium">Saldo insuficiente!</p>
                  <p>Precisa de mais ${Math.abs(saldoAposEnvio).toFixed(4)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
            <Button variant="secondary" className="flex-1 order-2 sm:order-1" onClick={() => setIsConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 order-1 sm:order-2"
              onClick={confirmarEnvio}
              disabled={!temSaldoSuficiente || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-2">Modos de Envio</h3>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <strong>Contatos:</strong> Templates aprovados via Twilio (oficial)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  <strong>Grupos:</strong> Texto livre via Baileys (requer instancia)
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
