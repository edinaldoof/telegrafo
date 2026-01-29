'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileText,
  ArrowLeft,
  Send,
  Loader2,
  Type,
  Image,
  ListChecks,
  Phone,
  MessageSquareReply,
  CreditCard,
  Plus,
  Trash2,
  Info,
} from 'lucide-react'
import Link from 'next/link'

type TipoTemplate = 'text' | 'media' | 'quick-reply' | 'call-to-action' | 'list-picker' | 'card'

interface Acao {
  type: string
  title: string
  url?: string
  phone?: string
  id?: string
}

interface ItemLista {
  id: string
  title: string
  description?: string
}

const IDIOMAS = [
  { value: 'pt_BR', label: 'Portugues (Brasil)' },
  { value: 'en', label: 'Ingles' },
  { value: 'es', label: 'Espanhol' },
]

const TIPOS_TEMPLATE = [
  { value: 'text', label: 'Texto', icon: Type, desc: 'Mensagem de texto simples' },
  { value: 'media', label: 'Midia', icon: Image, desc: 'Texto com imagem/video/documento' },
  { value: 'quick-reply', label: 'Resposta Rapida', icon: MessageSquareReply, desc: 'Texto com botoes de resposta' },
  { value: 'call-to-action', label: 'Call to Action', icon: Phone, desc: 'Botoes para ligar ou abrir URL' },
  { value: 'list-picker', label: 'Lista', icon: ListChecks, desc: 'Menu de opcoes em lista' },
  { value: 'card', label: 'Card', icon: CreditCard, desc: 'Card com titulo, subtitulo e acoes' },
]

export default function CriarTemplatePage() {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)

  // Campos do template
  const [nome, setNome] = useState('')
  const [idioma, setIdioma] = useState('pt_BR')
  const [tipo, setTipo] = useState<TipoTemplate>('text')

  // Conteudo
  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [titulo, setTitulo] = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [botaoLista, setBotaoLista] = useState('Ver opcoes')

  // Acoes (para quick-reply e call-to-action)
  const [acoes, setAcoes] = useState<Acao[]>([])

  // Items (para list-picker)
  const [items, setItems] = useState<ItemLista[]>([])

  const adicionarAcao = () => {
    if (tipo === 'quick-reply') {
      setAcoes([...acoes, { type: 'QUICK_REPLY', title: '', id: `qr_${Date.now()}` }])
    } else if (tipo === 'call-to-action') {
      setAcoes([...acoes, { type: 'URL', title: '', url: '' }])
    } else if (tipo === 'card') {
      setAcoes([...acoes, { type: 'URL', title: '', url: '' }])
    }
  }

  const removerAcao = (index: number) => {
    setAcoes(acoes.filter((_, i) => i !== index))
  }

  const atualizarAcao = (index: number, campo: string, valor: string) => {
    const novasAcoes = [...acoes]
    novasAcoes[index] = { ...novasAcoes[index], [campo]: valor }
    setAcoes(novasAcoes)
  }

  const adicionarItem = () => {
    setItems([...items, { id: `item_${Date.now()}`, title: '', description: '' }])
  }

  const removerItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const atualizarItem = (index: number, campo: string, valor: string) => {
    const novosItems = [...items]
    novosItems[index] = { ...novosItems[index], [campo]: valor }
    setItems(novosItems)
  }

  const validarNome = (value: string) => {
    // Apenas lowercase, numeros e underscore
    return value.replace(/[^a-z0-9_]/g, '')
  }

  const montarConteudo = () => {
    switch (tipo) {
      case 'text':
        return { body }

      case 'media':
        return {
          body,
          media: mediaUrl ? [mediaUrl] : []
        }

      case 'quick-reply':
        return {
          body,
          actions: acoes.map(a => ({
            type: 'QUICK_REPLY',
            title: a.title,
            id: a.id
          }))
        }

      case 'call-to-action':
        return {
          body,
          actions: acoes.map(a => {
            if (a.type === 'URL') {
              return { type: 'URL', title: a.title, url: a.url }
            } else {
              return { type: 'PHONE_NUMBER', title: a.title, phone: a.phone }
            }
          })
        }

      case 'list-picker':
        return {
          body,
          button: botaoLista,
          items: items.map(i => ({
            id: i.id,
            title: i.title,
            description: i.description
          }))
        }

      case 'card':
        return {
          title: titulo,
          subtitle: subtitulo,
          media: mediaUrl ? [mediaUrl] : [],
          actions: acoes.map(a => ({
            type: a.type,
            title: a.title,
            url: a.url,
            phone: a.phone
          }))
        }

      default:
        return { body }
    }
  }

  const enviarTemplate = async () => {
    if (!nome.trim()) {
      toast.error('Nome do template e obrigatorio')
      return
    }

    if (tipo !== 'card' && !body.trim()) {
      toast.error('Corpo da mensagem e obrigatorio')
      return
    }

    if (tipo === 'card' && !titulo.trim()) {
      toast.error('Titulo do card e obrigatorio')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/twilio/templates/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          idioma,
          tipo,
          conteudo: montarConteudo()
        }),
      })

      const data = await res.json()

      if (data.sucesso) {
        toast.success('Template criado e enviado para aprovacao!')
        router.push('/templates')
      } else {
        toast.error(data.erro || 'Erro ao criar template')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar template')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="sm" className="self-start">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Criar Template
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            O template sera enviado para aprovacao do Meta/WhatsApp
          </p>
        </div>
      </div>

      {/* Aviso */}
      <Card className="border-blue-500/50 bg-blue-500/10">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Processo de Aprovacao</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>Templates precisam ser aprovados pelo Meta/WhatsApp antes de usar</li>
                <li>A aprovacao pode levar de minutos ate 24 horas</li>
                <li>Use variaveis como {'{{1}}'}, {'{{2}}'} para dados dinamicos</li>
                <li>Evite conteudo promocional excessivo para aumentar chance de aprovacao</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informacoes Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Informacoes Gerais</CardTitle>
          <CardDescription>Nome unico e idioma do template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Template *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(validarNome(e.target.value.toLowerCase()))}
                placeholder="meu_template_boas_vindas"
                maxLength={450}
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras minusculas, numeros e underscore. {nome.length}/450
              </p>
            </div>
            <div className="space-y-2">
              <Label>Idioma *</Label>
              <select
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                {IDIOMAS.map(i => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tipo de Template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Tipo de Conteudo</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Selecione o formato do template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-3">
            {TIPOS_TEMPLATE.map(t => {
              const Icon = t.icon
              const isSelected = tipo === t.value

              return (
                <button
                  key={t.value}
                  onClick={() => {
                    setTipo(t.value as TipoTemplate)
                    setAcoes([])
                    setItems([])
                  }}
                  className={`p-3 sm:p-4 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }`}
                >
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-xs sm:text-sm">{t.label}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{t.desc}</p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conteudo do Template */}
      <Card>
        <CardHeader>
          <CardTitle>Conteudo</CardTitle>
          <CardDescription>Configure o conteudo do seu template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Corpo da mensagem (para todos exceto card) */}
          {tipo !== 'card' && (
            <div className="space-y-2">
              <Label>Corpo da Mensagem *</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ola {{1}}, seja bem-vindo! Seu codigo e {{2}}."
                className="w-full min-h-[120px] p-3 rounded-lg border bg-background resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{1}}'}, {'{{2}}'}, etc. para variaveis dinamicas
              </p>
            </div>
          )}

          {/* URL de midia (para media e card) */}
          {(tipo === 'media' || tipo === 'card') && (
            <div className="space-y-2">
              <Label>URL da Midia (opcional)</Label>
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <p className="text-xs text-muted-foreground">
                URL publica de imagem, video ou documento
              </p>
            </div>
          )}

          {/* Campos do Card */}
          {tipo === 'card' && (
            <>
              <div className="space-y-2">
                <Label>Titulo *</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Titulo do card"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitulo</Label>
                <Input
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  placeholder="Subtitulo opcional"
                />
              </div>
            </>
          )}

          {/* Botao da lista (para list-picker) */}
          {tipo === 'list-picker' && (
            <div className="space-y-2">
              <Label>Texto do Botao</Label>
              <Input
                value={botaoLista}
                onChange={(e) => setBotaoLista(e.target.value)}
                placeholder="Ver opcoes"
              />
            </div>
          )}

          {/* Acoes (para quick-reply, call-to-action, card) */}
          {(tipo === 'quick-reply' || tipo === 'call-to-action' || tipo === 'card') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  {tipo === 'quick-reply' ? 'Botoes de Resposta' : 'Botoes de Acao'}
                </Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={adicionarAcao}
                  disabled={acoes.length >= 3}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {acoes.map((acao, index) => (
                <div key={index} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                  {tipo === 'quick-reply' ? (
                    <Input
                      value={acao.title}
                      onChange={(e) => atualizarAcao(index, 'title', e.target.value)}
                      placeholder="Texto do botao"
                      className="flex-1"
                    />
                  ) : (
                    <div className="flex-1 space-y-2">
                      <select
                        value={acao.type}
                        onChange={(e) => atualizarAcao(index, 'type', e.target.value)}
                        className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                      >
                        <option value="URL">Abrir URL</option>
                        <option value="PHONE_NUMBER">Ligar</option>
                      </select>
                      <Input
                        value={acao.title}
                        onChange={(e) => atualizarAcao(index, 'title', e.target.value)}
                        placeholder="Texto do botao"
                      />
                      {acao.type === 'URL' ? (
                        <Input
                          value={acao.url || ''}
                          onChange={(e) => atualizarAcao(index, 'url', e.target.value)}
                          placeholder="https://exemplo.com"
                        />
                      ) : (
                        <Input
                          value={acao.phone || ''}
                          onChange={(e) => atualizarAcao(index, 'phone', e.target.value)}
                          placeholder="+5511999999999"
                        />
                      )}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerAcao(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}

              {acoes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Adicione ate 3 botoes
                </p>
              )}
            </div>
          )}

          {/* Items (para list-picker) */}
          {tipo === 'list-picker' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items da Lista</Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={adicionarItem}
                  disabled={items.length >= 10}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.title}
                      onChange={(e) => atualizarItem(index, 'title', e.target.value)}
                      placeholder="Titulo do item"
                    />
                    <Input
                      value={item.description || ''}
                      onChange={(e) => atualizarItem(index, 'description', e.target.value)}
                      placeholder="Descricao (opcional)"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}

              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Adicione ate 10 items na lista
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botao Enviar */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
        <Link href="/templates" className="order-2 sm:order-1">
          <Button variant="secondary" className="w-full sm:w-auto">Cancelar</Button>
        </Link>
        <Button onClick={enviarTemplate} disabled={enviando} className="w-full sm:w-auto order-1 sm:order-2">
          {enviando ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Criar e Enviar para Aprovacao</span>
              <span className="sm:hidden">Criar Template</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
