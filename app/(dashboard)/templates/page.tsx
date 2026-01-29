'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, Loader2, Eye, CheckCircle2, Clock, XCircle, AlertCircle, MessageSquare, RefreshCw, Plus, Copy } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import { toast } from 'sonner'

interface TwilioTemplate {
  sid: string
  nome: string
  idioma: string
  tipos: string[]
  corpo: string | null
  variaveis: Record<string, any>
  status: string
  eligibility: string[]
  podeUsar: boolean
  criadoEm: string
  atualizadoEm: string
}

export default function TemplatesPage() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<TwilioTemplate | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  // Templates do Twilio/WhatsApp
  const { data: twilioData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['twilio-templates'],
    queryFn: async () => {
      const res = await fetch('/api/twilio/templates')
      if (!res.ok) {
        console.error('Erro ao carregar templates Twilio')
        return { templates: [], resumo: { aprovados: 0, pendentes: 0, rejeitados: 0, naoSubmetidos: 0 } }
      }
      return res.json()
    },
  })

  const templates: TwilioTemplate[] = twilioData?.templates || []
  const resumo = twilioData?.resumo || { aprovados: 0, pendentes: 0, rejeitados: 0, naoSubmetidos: 0 }

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    const matchSearch = searchTerm === '' ||
      template.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.corpo && template.corpo.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchStatus = filterStatus === 'todos' ||
      template.status === filterStatus

    return matchSearch && matchStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      case 'rejected': return <Badge className="bg-red-100 text-red-800">Rejeitado</Badge>
      default: return <Badge variant="secondary">Desconhecido</Badge>
    }
  }

  const handlePreview = (template: TwilioTemplate) => {
    setPreviewTemplate(template)
    setIsPreviewOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('SID copiado!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Templates WhatsApp</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Templates aprovados pelo Meta para envio em massa
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} disabled={isRefetching} variant="secondary">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Link href="/templates/criar">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-green-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Aprovados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resumo.aprovados}</div>
            <p className="text-xs text-green-600/70">Prontos para uso</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-yellow-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{resumo.pendentes}</div>
            <p className="text-xs text-yellow-600/70">Aguardando aprovacao</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-red-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{resumo.rejeitados}</div>
            <p className="text-xs text-red-600/70">Precisam ajustes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="approved">Aprovados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            {filteredTemplates.length} template(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum template encontrado</p>
              <p className="text-sm mt-2">
                Crie templates no{' '}
                <a
                  href="https://console.twilio.com/us1/develop/sms/content-template-builder"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Console do Twilio
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.sid}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  {/* Header do Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{template.nome}</h3>
                        {getStatusBadge(template.status)}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                        {template.sid}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {template.podeUsar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(template.sid)}
                          title="Copiar SID"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Corpo truncado */}
                  {template.corpo && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.corpo}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline" className="text-xs">{template.idioma}</Badge>
                    {template.tipos.map(tipo => (
                      <Badge key={tipo} variant="secondary" className="text-xs">
                        {tipo.replace('twilio/', '')}
                      </Badge>
                    ))}
                    {template.eligibility?.includes('business_initiated') && (
                      <Badge className="bg-blue-500/20 text-blue-600 border-0 text-xs">
                        Business
                      </Badge>
                    )}
                    {template.eligibility?.includes('user_initiated') && (
                      <Badge className="bg-purple-500/20 text-purple-600 border-0 text-xs">
                        User
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {previewTemplate && getStatusIcon(previewTemplate.status)}
              <span className="truncate">{previewTemplate?.nome}</span>
            </DialogTitle>
            <DialogDescription>
              Detalhes do template WhatsApp
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(previewTemplate.status)}
                <Badge variant="outline">{previewTemplate.idioma}</Badge>
                {previewTemplate.tipos.map(tipo => (
                  <Badge key={tipo} variant="secondary">
                    {tipo.replace('twilio/', '')}
                  </Badge>
                ))}
              </div>

              {/* Eligibility */}
              <div className="flex flex-wrap gap-2">
                {previewTemplate.eligibility?.includes('business_initiated') && (
                  <Badge className="bg-blue-500/20 text-blue-600 border-0">
                    Business initiated
                  </Badge>
                )}
                {previewTemplate.eligibility?.includes('user_initiated') && (
                  <Badge className="bg-purple-500/20 text-purple-600 border-0">
                    User initiated
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label>Content SID:</Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs sm:text-sm font-mono break-all">
                    {previewTemplate.sid}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => copyToClipboard(previewTemplate.sid)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </div>

              {previewTemplate.corpo && (
                <div className="space-y-2">
                  <Label>Corpo da mensagem:</Label>
                  <div className="p-3 sm:p-4 bg-muted rounded-lg whitespace-pre-wrap text-xs sm:text-sm">
                    {previewTemplate.corpo}
                  </div>
                </div>
              )}

              {previewTemplate.variaveis && Object.keys(previewTemplate.variaveis).length > 0 && (
                <div className="space-y-2">
                  <Label>Variaveis:</Label>
                  <div className="p-3 bg-muted rounded-lg overflow-x-auto">
                    <pre className="text-xs sm:text-sm">
                      {JSON.stringify(previewTemplate.variaveis, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Criado em:</Label>
                  <p className="text-sm">{new Date(previewTemplate.criadoEm).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Atualizado em:</Label>
                  <p className="text-sm">{new Date(previewTemplate.atualizadoEm).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}</p>
                </div>
              </div>

              {previewTemplate.podeUsar ? (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>Este template pode ser usado para envio em massa</span>
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Este template ainda nao foi aprovado para uso</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button variant="secondary" onClick={() => setIsPreviewOpen(false)} className="w-full sm:w-auto">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-2">Como usar templates para envio em massa</h3>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Templates <strong>aprovados</strong> podem ser usados para iniciar conversas
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Copie o <strong>Content SID</strong> para usar na rota de envio
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Crie novos templates pelo botao <strong>"Criar Template"</strong> acima
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  A aprovacao pelo Meta/WhatsApp pode levar ate 24 horas
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
