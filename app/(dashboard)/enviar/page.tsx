'use client'

import { useState, useRef } from 'react'
import { Send, FileText, Users, Image, Video, Music, File, Calendar, Loader2, CheckCircle, Upload, X, UserCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type TipoMensagem = 'texto' | 'imagem' | 'video' | 'audio' | 'documento'
type TipoDestino = 'grupos' | 'contatos'

interface Anexo {
  url: string
  fullUrl: string
  fileName: string
  mimeType: string
  mediaType: string
}

export default function EnviarPage() {
  const [mensagem, setMensagem] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<TipoMensagem>('texto')
  const [tipoDestino, setTipoDestino] = useState<TipoDestino>('contatos')
  const [gruposSelecionados, setGruposSelecionados] = useState<number[]>([])
  const [contatosSelecionados, setContatosSelecionados] = useState<number[]>([])
  const [tagsSelecionadas, setTagsSelecionadas] = useState<number[]>([])
  const [anexo, setAnexo] = useState<Anexo | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Buscar instâncias ativas
  const { data: instances } = useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const res = await fetch('/api/instances')
      if (!res.ok) return []
      const data = await res.json()
      return data.data || data.instances || data || []
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

  type TagItem = {
    id: number
    nome: string
    cor?: string | null
    totalContatos?: number
  }

  const { data: tagsResponse } = useQuery({
    queryKey: ['tags'],
    queryFn: async (): Promise<TagItem[]> => {
      const res = await fetch('/api/tags')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data?.tags) ? data.tags : []
    },
  })

  const tagsDisponiveis: TagItem[] = tagsResponse ?? []

  // Calcular total de contatos das tags selecionadas
  const totalContatosTags = tagsDisponiveis
    .filter(t => tagsSelecionadas.includes(t.id))
    .reduce((acc, t) => acc + (t.totalContatos || 0), 0)

  // Upload de arquivo
  const handleFileUpload = async (file: File) => {
    setUploading(true)
    toast.info(`Enviando ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro no upload')
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Upload falhou')
      }

      setAnexo({
        url: data.fullUrl,
        fullUrl: data.fullUrl,
        fileName: data.fileName || file.name,
        mimeType: data.mimeType,
        mediaType: data.mediaType,
      })

      // Atualizar tipo baseado no arquivo
      if (data.mediaType === 'image') setTipoMensagem('imagem')
      else if (data.mediaType === 'video') setTipoMensagem('video')
      else if (data.mediaType === 'audio') setTipoMensagem('audio')
      else setTipoMensagem('documento')

      toast.success('Arquivo anexado!')
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Upload demorou demais. Tente uma imagem menor.')
      } else {
        toast.error(error.message || 'Erro ao fazer upload')
      }
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  // Mutation para enviar mensagem
  const enviarMutation = useMutation({
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
      const total = (data.totalGrupos || 0) + (data.totalDestinatarios || 0)
      toast.success(`Envio iniciado para ${total} destinatário(s)!`)
      setMensagem('')
      setGruposSelecionados([])
      setContatosSelecionados([])
      setTagsSelecionadas([])
      setAnexo(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar mensagem')
    },
  })

  const handleEnviar = () => {
    // Validações
    if (tipoDestino === 'grupos' && gruposSelecionados.length === 0) {
      toast.error('Selecione pelo menos um grupo')
      return
    }

    if (tipoDestino === 'contatos' && contatosSelecionados.length === 0 && tagsSelecionadas.length === 0) {
      toast.error('Selecione pelo menos um contato ou tag')
      return
    }

    if (tipoDestino === 'grupos' && !instanceId) {
      toast.error('Para enviar para grupos, selecione uma instância Baileys')
      return
    }

    if (tipoMensagem !== 'texto' && !anexo) {
      toast.error('Anexe um arquivo para este tipo de mensagem')
      return
    }

    if (tipoMensagem === 'texto' && !mensagem.trim()) {
      toast.error('Digite uma mensagem')
      return
    }

    // Preparar destinatários
    const destinatariosNumeros = contatos
      ?.filter((c: any) => contatosSelecionados.includes(c.id))
      .map((c: any) => c.numeroWhatsapp) || []

    enviarMutation.mutate({
      instanceId: tipoDestino === 'grupos' ? Number(instanceId) : undefined,
      tipo: tipoMensagem,
      conteudo: mensagem,
      grupos: tipoDestino === 'grupos' ? gruposSelecionados : [],
      destinatarios: tipoDestino === 'contatos' ? destinatariosNumeros : [],
      filtroTags: tipoDestino === 'contatos' ? tagsSelecionadas : [],
      anexo: anexo ? { url: anexo.fullUrl, fileName: anexo.fileName, mimeType: anexo.mimeType } : undefined,
    })
  }

  const toggleGrupo = (grupoId: number) => {
    setGruposSelecionados(prev =>
      prev.includes(grupoId)
        ? prev.filter(id => id !== grupoId)
        : [...prev, grupoId]
    )
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

  const getTipoIcon = (tipo: TipoMensagem) => {
    switch (tipo) {
      case 'texto': return <FileText className="h-4 w-4" />
      case 'imagem': return <Image className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'audio': return <Music className="h-4 w-4" />
      case 'documento': return <File className="h-4 w-4" />
    }
  }

  const getAcceptTypes = () => {
    switch (tipoMensagem) {
      case 'imagem': return 'image/*'
      case 'video': return 'video/*'
      case 'audio': return 'audio/*'
      case 'documento': return '.pdf,.doc,.docx,.xls,.xlsx'
      default: return '*/*'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Enviar Mensagens</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Envie mensagens para grupos (Baileys) ou contatos individuais (Twilio)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna 1: Configuração */}
        <div className="space-y-6">
          {/* Tipo de Destino */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Destino</CardTitle>
              <CardDescription>Escolha para quem enviar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant={tipoDestino === 'contatos' ? 'primary' : 'secondary'}
                  className="flex-1 justify-start"
                  onClick={() => setTipoDestino('contatos')}
                >
                  <UserCircle className="h-4 w-4 mr-2" />
                  Contatos (Twilio)
                </Button>
                <Button
                  variant={tipoDestino === 'grupos' ? 'primary' : 'secondary'}
                  className="flex-1 justify-start"
                  onClick={() => setTipoDestino('grupos')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Grupos (Baileys)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instância (só para grupos) */}
          {tipoDestino === 'grupos' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instância Baileys</CardTitle>
                <CardDescription>Obrigatório para enviar a grupos</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={instanceId} onValueChange={setInstanceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances
                      ?.filter((i: any) => i.status === 'connected')
                      .map((instance: any) => (
                        <SelectItem key={instance.id} value={String(instance.id)}>
                          {instance.displayName || instance.instanceName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Seleção de Destinatários */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {tipoDestino === 'grupos' ? 'Grupos' : 'Contatos'}
              </CardTitle>
              <CardDescription>
                {tipoDestino === 'grupos'
                  ? `${gruposSelecionados.length} grupo(s) selecionado(s)`
                  : `${contatosSelecionados.length} contato(s) + ${tagsSelecionadas.length} tag(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tipoDestino === 'grupos' ? (
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                  {grupos?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum grupo disponível</p>
                  ) : (
                    grupos?.map((grupo: any) => (
                      <div key={grupo.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`grupo-${grupo.id}`}
                          checked={gruposSelecionados.includes(grupo.id)}
                          onCheckedChange={() => toggleGrupo(grupo.id)}
                        />
                        <label htmlFor={`grupo-${grupo.id}`} className="text-sm cursor-pointer">
                          {grupo.nome}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {/* Tags */}
                  {tagsDisponiveis.length > 0 && (
                    <div className="space-y-2">
                      <Label>Enviar por Categoria (Tags)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Selecione uma ou mais tags para enviar para todos os contatos dessas categorias
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tagsDisponiveis.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant={tagsSelecionadas.includes(tag.id) ? 'default' : 'outline'}
                            className="cursor-pointer transition-all hover:scale-105"
                            style={
                              tagsSelecionadas.includes(tag.id)
                                ? { backgroundColor: tag.cor || '#3B82F6' }
                                : { borderColor: tag.cor || '#6B7280', color: tag.cor || '#6B7280' }
                            }
                            onClick={() => toggleTag(tag.id)}
                          >
                            {tag.nome} ({tag.totalContatos || 0})
                          </Badge>
                        ))}
                      </div>
                      {tagsSelecionadas.length > 0 && (
                        <p className="text-sm text-green-600 font-medium mt-2">
                          {totalContatosTags} contato(s) serão notificados
                        </p>
                      )}
                    </div>
                  )}

                  {/* Contatos */}
                  <div className="space-y-2">
                    <Label>Ou selecione contatos</Label>
                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                      {!contatos || contatos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum contato disponível</p>
                      ) : (
                        contatos.map((contato: any) => (
                          <div key={contato.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`contato-${contato.id}`}
                              checked={contatosSelecionados.includes(contato.id)}
                              onCheckedChange={() => toggleContato(contato.id)}
                            />
                            <label htmlFor={`contato-${contato.id}`} className="text-sm cursor-pointer">
                              {contato.nome} ({contato.numeroWhatsapp})
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Mensagem */}
        <div className="space-y-6">
          {/* Tipo de Mensagem */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipo de Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(['texto', 'imagem', 'video', 'audio', 'documento'] as TipoMensagem[]).map((tipo) => (
                  <Button
                    key={tipo}
                    variant={tipoMensagem === tipo ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      setTipoMensagem(tipo)
                      if (tipo === 'texto') setAnexo(null)
                    }}
                  >
                    {getTipoIcon(tipo)}
                    <span className="ml-2 capitalize">{tipo}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upload de Arquivo */}
          {tipoMensagem !== 'texto' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Arquivo</CardTitle>
                <CardDescription>Anexe {tipoMensagem === 'imagem' ? 'uma imagem' : tipoMensagem === 'video' ? 'um vídeo' : tipoMensagem === 'audio' ? 'um áudio' : 'um documento'}</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptTypes()}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />

                {!anexo ? (
                  <Button
                    variant="secondary"
                    className="w-full h-24 border-dashed border-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6" />
                        <span>Clique para selecionar arquivo</span>
                      </div>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {getTipoIcon(tipoMensagem)}
                      <span className="text-sm truncate max-w-[200px]">{anexo.fileName}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAnexo(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mensagem / Legenda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {tipoMensagem === 'texto' ? 'Mensagem' : 'Legenda (opcional)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={tipoMensagem === 'texto' ? 'Digite sua mensagem...' : 'Digite uma legenda para a mídia...'}
                className="min-h-[150px]"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">{mensagem.length} caracteres</p>
            </CardContent>
          </Card>

          {/* Botão Enviar */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleEnviar}
            disabled={enviarMutation.isPending}
          >
            {enviarMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar {tipoMensagem === 'texto' ? 'Mensagem' : tipoMensagem.charAt(0).toUpperCase() + tipoMensagem.slice(1)}
              </>
            )}
          </Button>

          {/* Resumo */}
          {(gruposSelecionados.length > 0 || contatosSelecionados.length > 0 || tagsSelecionadas.length > 0) && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">Resumo do Envio:</p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Tipo: {tipoMensagem}
                  </li>
                  {tipoDestino === 'grupos' && gruposSelecionados.length > 0 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {gruposSelecionados.length} grupo(s) via Baileys
                    </li>
                  )}
                  {tipoDestino === 'contatos' && contatosSelecionados.length > 0 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {contatosSelecionados.length} contato(s) via Twilio
                    </li>
                  )}
                  {tipoDestino === 'contatos' && tagsSelecionadas.length > 0 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {tagsSelecionadas.length} tag(s) selecionada(s)
                    </li>
                  )}
                  {anexo && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Arquivo: {anexo.fileName}
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Send className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-2">Como funciona</h3>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <strong>Contatos individuais:</strong> Usa Twilio (oficial, seguro, sem risco de ban)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  <strong>Grupos:</strong> Usa Baileys (requer instância conectada)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <strong>Mídia para grupos:</strong> Upload local funciona normalmente
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aviso sobre mídia Twilio */}
      {tipoDestino === 'contatos' && tipoMensagem !== 'texto' && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Image className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-700 mb-2">Aviso: Mídia via Twilio</h3>
                <p className="text-sm text-yellow-700/80 mb-2">
                  O Twilio requer que arquivos de mídia estejam hospedados em URLs <strong>públicas acessíveis pela internet</strong>.
                </p>
                <p className="text-sm text-yellow-700/80">
                  <strong>Solução:</strong> Use serviços como AWS S3, Cloudinary ou Firebase Storage para hospedar seus arquivos,
                  ou envie apenas mensagens de texto para contatos via Twilio.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
