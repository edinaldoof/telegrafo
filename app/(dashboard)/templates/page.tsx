'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Loader2, Pencil, Trash2, X, Copy, Eye, Tag } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useState } from 'react'

interface TemplateVariavel {
  id: number
  nome: string
  exemplo?: string
  obrigatorio: boolean
}

interface Template {
  id: number
  nome: string
  descricao?: string
  conteudo: string
  tipo: 'texto' | 'imagem' | 'video' | 'documento'
  categoria?: string
  mediaUrl?: string
  ativo: boolean
  criadoEm: string
  variaveis: TemplateVariavel[]
  _count?: {
    agendamentos: number
  }
}

const CATEGORIAS_SUGERIDAS = [
  'saudacao',
  'promocao',
  'lembrete',
  'notificacao',
  'confirmacao',
  'boas-vindas',
  'atualizacao',
  'outro',
]

export default function TemplatesPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState<string>('todas')

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    tipo: 'texto' as 'texto' | 'imagem' | 'video' | 'documento',
    categoria: '',
    mediaUrl: '',
  })

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates')
      if (!res.ok) {
        const error = await res.json()
        console.error('Erro ao carregar templates:', error)
        return { templates: [], categorias: [] }
      }
      return res.json()
    },
  })

  const templates: Template[] = templatesData?.templates || []
  const categorias: string[] = templatesData?.categorias || []

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    const matchSearch = searchTerm === '' ||
      template.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.conteudo.toLowerCase().includes(searchTerm.toLowerCase())

    const matchCategoria = filterCategoria === 'todas' ||
      template.categoria === filterCategoria

    return matchSearch && matchCategoria
  })

  // Mutation para criar/editar template
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates'

      const res = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao salvar template')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success(editingTemplate ? 'Template atualizado!' : 'Template criado!')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      handleCloseDialog()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar template')
    },
  })

  // Mutation para deletar template
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao deletar template')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Template removido!')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao deletar template')
    },
  })

  const handleOpenDialog = (template?: Template) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        nome: template.nome,
        descricao: template.descricao || '',
        conteudo: template.conteudo,
        tipo: template.tipo,
        categoria: template.categoria || '',
        mediaUrl: template.mediaUrl || '',
      })
    } else {
      setEditingTemplate(null)
      setFormData({
        nome: '',
        descricao: '',
        conteudo: '',
        tipo: 'texto',
        categoria: '',
        mediaUrl: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingTemplate(null)
    setFormData({
      nome: '',
      descricao: '',
      conteudo: '',
      tipo: 'texto',
      categoria: '',
      mediaUrl: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim() || !formData.conteudo.trim()) {
      toast.error('Nome e conteudo sao obrigatorios')
      return
    }
    saveMutation.mutate(formData)
  }

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja remover este template?')) {
      deleteMutation.mutate(id)
    }
  }

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template)
    setIsPreviewOpen(true)
  }

  const handleDuplicate = (template: Template) => {
    setEditingTemplate(null)
    setFormData({
      nome: template.nome + ' (copia)',
      descricao: template.descricao || '',
      conteudo: template.conteudo,
      tipo: template.tipo,
      categoria: template.categoria || '',
      mediaUrl: template.mediaUrl || '',
    })
    setIsDialogOpen(true)
  }

  // Extrair variaveis do conteudo para preview
  const extractVariables = (conteudo: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const vars: string[] = []
    let match
    while ((match = regex.exec(conteudo)) !== null) {
      if (!vars.includes(match[1])) {
        vars.push(match[1])
      }
    }
    return vars
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'texto': return 'bg-blue-100 text-blue-800'
      case 'imagem': return 'bg-green-100 text-green-800'
      case 'video': return 'bg-purple-100 text-purple-800'
      case 'documento': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Gerencie templates de mensagens com variaveis personalizadas
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => t.ativo).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorias.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Uso</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => (t._count?.agendamentos || 0) > 0).length}
            </div>
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
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
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
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum template encontrado</p>
              <Button variant="secondary" className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Variaveis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.nome}</div>
                          {template.descricao && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {template.descricao}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTipoColor(template.tipo)}>
                          {template.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.categoria ? (
                          <Badge variant="outline">{template.categoria}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.variaveis.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {template.variaveis.slice(0, 3).map(v => (
                              <Badge key={v.id} variant="secondary" className="text-xs">
                                {`{{${v.nome}}}`}
                              </Badge>
                            ))}
                            {template.variaveis.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{template.variaveis.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nenhuma</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.ativo ? 'default' : 'secondary'}>
                          {template.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(template)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(template)}
                            title="Duplicar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(template)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            title="Remover"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar/editar template */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              Use {'{{variavel}}'} para criar campos dinamicos
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Boas-vindas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="documento">Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria || 'sem-categoria'}
                onValueChange={(value) => setFormData({ ...formData, categoria: value === 'sem-categoria' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-categoria">Sem categoria</SelectItem>
                  {CATEGORIAS_SUGERIDAS.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Breve descricao do template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conteudo">Conteudo *</Label>
              <Textarea
                id="conteudo"
                value={formData.conteudo}
                onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                placeholder="Ola {{nome}}, seja bem-vindo(a) a {{empresa}}!"
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                {formData.conteudo.length} caracteres
                {extractVariables(formData.conteudo).length > 0 && (
                  <> | Variaveis: {extractVariables(formData.conteudo).map(v => '{{' + v + '}}').join(', ')}</>
                )}
              </p>
            </div>

            {formData.tipo !== 'texto' && (
              <div className="space-y-2">
                <Label htmlFor="mediaUrl">URL da Midia</Label>
                <Input
                  id="mediaUrl"
                  type="url"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  URL publica do arquivo de midia
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTemplate ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.nome}</DialogTitle>
            <DialogDescription>
              Visualizacao do template
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getTipoColor(previewTemplate.tipo)}>
                  {previewTemplate.tipo}
                </Badge>
                {previewTemplate.categoria && (
                  <Badge variant="outline">{previewTemplate.categoria}</Badge>
                )}
                <Badge variant={previewTemplate.ativo ? 'default' : 'secondary'}>
                  {previewTemplate.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              {previewTemplate.descricao && (
                <p className="text-sm text-muted-foreground">{previewTemplate.descricao}</p>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="whitespace-pre-wrap">{previewTemplate.conteudo}</p>
              </div>

              {previewTemplate.variaveis.length > 0 && (
                <div>
                  <Label>Variaveis:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewTemplate.variaveis.map(v => (
                      <Badge key={v.id} variant="secondary">
                        {'{{' + v.nome + '}}'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {previewTemplate.mediaUrl && (
                <div>
                  <Label>URL da Midia:</Label>
                  <p className="text-sm text-muted-foreground break-all mt-1">
                    {previewTemplate.mediaUrl}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Criado em: {new Date(previewTemplate.criadoEm).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPreviewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsPreviewOpen(false)
              if (previewTemplate) handleOpenDialog(previewTemplate)
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-2">Como usar variaveis</h3>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Use <code className="bg-muted px-1 rounded">{'{{nome}}'}</code> para inserir o nome do contato
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Use <code className="bg-muted px-1 rounded">{'{{empresa}}'}</code> para inserir o nome da empresa
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Crie suas proprias variaveis: <code className="bg-muted px-1 rounded">{'{{data}}'}</code>, <code className="bg-muted px-1 rounded">{'{{codigo}}'}</code>, etc.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
