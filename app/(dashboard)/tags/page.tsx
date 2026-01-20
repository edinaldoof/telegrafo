'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Tags,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Send,
  Users,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Tag {
  id: number
  nome: string
  cor: string | null
  descricao: string | null
  totalContatos: number
}

interface Contato {
  id: number
  numeroWhatsapp: string
  nomeContato: string | null
  email: string | null
  empresa: string | null
  ativo: boolean
}

interface TagDetails extends Tag {
  contatos: Contato[]
}

const CORES_DISPONIVEIS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
]

export default function TagsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [expandedTagId, setExpandedTagId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    cor: CORES_DISPONIVEIS[0],
    descricao: '',
  })

  // Buscar todas as tags
  const { data: tagsData, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags')
      if (!res.ok) throw new Error('Erro ao carregar tags')
      return res.json()
    },
  })

  const tags: Tag[] = tagsData?.tags || []

  // Buscar detalhes de uma tag específica (contatos)
  const { data: tagDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['tag-details', expandedTagId],
    queryFn: async () => {
      if (!expandedTagId) return null
      const res = await fetch(`/api/tags/${expandedTagId}`)
      if (!res.ok) throw new Error('Erro ao carregar detalhes')
      return res.json()
    },
    enabled: !!expandedTagId,
  })

  // Mutation para criar tag
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar tag')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Categoria criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      handleCloseDialog()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar categoria')
    },
  })

  // Mutation para atualizar tag
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao atualizar tag')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Categoria atualizada!')
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['tag-details'] })
      handleCloseDialog()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar categoria')
    },
  })

  // Mutation para deletar tag
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao deletar tag')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Categoria removida!')
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      if (expandedTagId) {
        setExpandedTagId(null)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover categoria')
    },
  })

  // Mutation para remover contato de uma tag
  const removeContatoMutation = useMutation({
    mutationFn: async ({ tagId, contatoId }: { tagId: number; contatoId: number }) => {
      const res = await fetch(`/api/tags?tagId=${tagId}&contatoId=${contatoId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao remover contato')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Contato removido da categoria!')
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['tag-details'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover contato')
    },
  })

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag)
      setFormData({
        nome: tag.nome,
        cor: tag.cor || CORES_DISPONIVEIS[0],
        descricao: tag.descricao || '',
      })
    } else {
      setEditingTag(null)
      setFormData({
        nome: '',
        cor: CORES_DISPONIVEIS[Math.floor(Math.random() * CORES_DISPONIVEIS.length)],
        descricao: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingTag(null)
    setFormData({
      nome: '',
      cor: CORES_DISPONIVEIS[0],
      descricao: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Nome da categoria é obrigatório')
      return
    }

    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (tag: Tag) => {
    if (
      confirm(
        `Deseja realmente excluir a categoria "${tag.nome}"?\n\nIsso irá desvincular ${tag.totalContatos} contato(s).`
      )
    ) {
      deleteMutation.mutate(tag.id)
    }
  }

  const toggleExpand = (tagId: number) => {
    setExpandedTagId(expandedTagId === tagId ? null : tagId)
  }

  const totalContatos = tags.reduce((acc, tag) => acc + tag.totalContatos, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Organize seus contatos com categorias/tags para envio segmentado
          </p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total de Categorias</CardDescription>
            <CardTitle className="text-2xl">{tags.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Contatos Categorizados</CardDescription>
            <CardTitle className="text-2xl text-green-600">{totalContatos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Média por Categoria</CardDescription>
            <CardTitle className="text-2xl">
              {tags.length > 0 ? Math.round(totalContatos / tags.length) : 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Maior Categoria</CardDescription>
            <CardTitle className="text-2xl">
              {tags.length > 0 ? Math.max(...tags.map((t) => t.totalContatos)) : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de Categorias */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorias</CardTitle>
          <CardDescription>
            Clique em uma categoria para ver os contatos vinculados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Carregando...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12">
              <Tags className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhuma categoria cadastrada</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crie categorias para organizar seus contatos
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Categoria
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tags.map((tag) => (
                <div key={tag.id} className="border rounded-lg overflow-hidden">
                  {/* Header da Tag */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(tag.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.cor || '#6B7280' }}
                      />
                      <div>
                        <h3 className="font-medium">{tag.nome}</h3>
                        {tag.descricao && (
                          <p className="text-sm text-muted-foreground">{tag.descricao}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {tag.totalContatos} contato{tag.totalContatos !== 1 ? 's' : ''}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/enviar?tag=${tag.id}`
                          }}
                          disabled={tag.totalContatos === 0}
                          title="Enviar para esta categoria"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDialog(tag)
                          }}
                          title="Editar categoria"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(tag)
                          }}
                          title="Excluir categoria"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        {expandedTagId === tag.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lista de Contatos Expandida */}
                  {expandedTagId === tag.id && (
                    <div className="border-t bg-muted/30 p-4">
                      {isLoadingDetails ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        </div>
                      ) : tagDetails?.contatos?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum contato nesta categoria
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead className="hidden sm:table-cell">Email</TableHead>
                                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tagDetails?.contatos?.map((contato: Contato) => (
                                <TableRow key={contato.id}>
                                  <TableCell className="font-medium">
                                    {contato.nomeContato || contato.numeroWhatsapp}
                                  </TableCell>
                                  <TableCell>{contato.numeroWhatsapp}</TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    {contato.email || '-'}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {contato.empresa || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={contato.ativo ? 'success' : 'secondary'}>
                                      {contato.ativo ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeContatoMutation.mutate({
                                          tagId: tag.id,
                                          contatoId: contato.id,
                                        })
                                      }
                                      title="Remover da categoria"
                                    >
                                      <X className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Tags className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-2">Como usar categorias</h3>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <strong>Importação CSV:</strong> Use a coluna "tags" com valores separados por |
                  (ex: vip|cliente)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <strong>Envio em massa:</strong> Selecione categorias na página de envio para
                  mensagens segmentadas
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <strong>Organização:</strong> Um contato pode ter múltiplas categorias
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Criar/Editar Categoria */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            <DialogDescription>
              {editingTag
                ? 'Atualize as informações da categoria'
                : 'Preencha os dados da nova categoria'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: VIP, Cliente, Lead..."
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {CORES_DISPONIVEIS.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.cor === cor
                          ? 'ring-2 ring-offset-2 ring-primary scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: cor }}
                      onClick={() => setFormData((prev) => ({ ...prev, cor }))}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descrição da categoria..."
                  value={formData.descricao}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : editingTag ? (
                  'Atualizar'
                ) : (
                  'Criar Categoria'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
