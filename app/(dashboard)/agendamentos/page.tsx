'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Trash2,
  Edit,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Agendamento {
  id: number
  titulo: string
  status: 'pendente' | 'executando' | 'concluido' | 'cancelado' | 'erro'
  dataAgendamento: string
  dataCriacao: string
  dataExecucao?: string
  contatosIds: number[]
  conteudoPersonalizado?: string
  mensagemErro?: string
}

const statusConfig = {
  pendente: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Pendente' },
  executando: { color: 'bg-yellow-100 text-yellow-800', icon: Loader2, label: 'Executando' },
  concluido: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Concluído' },
  cancelado: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Cancelado' },
  erro: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Erro' },
}

export default function AgendamentosPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    dataAgendamento: '',
    conteudoPersonalizado: '',
    gruposIds: [] as number[],
  })

  // Buscar agendamentos
  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: async () => {
      const res = await fetch('/api/agendamentos')
      if (!res.ok) throw new Error('Erro ao buscar agendamentos')
      return res.json()
    },
  })

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['agendamentos-stats'],
    queryFn: async () => {
      const res = await fetch('/api/agendamentos/stats')
      if (!res.ok) return { pendentes: 0, concluidos: 0, cancelados: 0, comErro: 0 }
      return res.json()
    },
  })

  // Buscar grupos disponíveis
  const { data: grupos } = useQuery({
    queryKey: ['grupos'],
    queryFn: async () => {
      const res = await fetch('/api/grupos')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Criar agendamento
  const criarMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar agendamento')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Agendamento criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos-stats'] })
      setDialogOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar agendamento')
    },
  })

  // Executar agendamento manualmente
  const executarMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/agendamentos/${id}/executar`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao executar agendamento')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Agendamento executado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao executar agendamento')
    },
  })

  // Cancelar agendamento
  const cancelarMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/agendamentos/${id}/cancelar`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao cancelar agendamento')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Agendamento cancelado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cancelar agendamento')
    },
  })

  // Deletar agendamento
  const deletarMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao deletar agendamento')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Agendamento deletado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao deletar agendamento')
    },
  })

  const resetForm = () => {
    setFormData({
      titulo: '',
      dataAgendamento: '',
      conteudoPersonalizado: '',
      gruposIds: [],
    })
    setSelectedAgendamento(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.titulo || !formData.dataAgendamento || !formData.conteudoPersonalizado) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (formData.gruposIds.length === 0) {
      toast.error('Selecione pelo menos um grupo')
      return
    }

    criarMutation.mutate({
      ...formData,
      contatosIds: formData.gruposIds, // O backend aceita contatosIds ou gruposIds
    })
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const handleOpenDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Gerencie e agende envios de mensagens para grupos
          </p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" onClick={handleOpenDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Pendentes</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {stats?.pendentes || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Concluídos</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {stats?.concluidos || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Cancelados</CardDescription>
            <CardTitle className="text-2xl text-gray-600">
              {stats?.cancelados || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Com Erro</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {stats?.comErro || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabela de Agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Agendamentos</CardTitle>
          <CardDescription>
            {agendamentos?.length || 0} agendamentos no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Carregando...</p>
            </div>
          ) : !agendamentos || agendamentos?.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum agendamento cadastrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crie seu primeiro agendamento para enviar mensagens
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Agendado para</TableHead>
                    <TableHead className="hidden md:table-cell">Criado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendamentos?.map((agendamento: Agendamento) => {
                    const statusInfo = statusConfig[agendamento.status]
                    const StatusIcon = statusInfo.icon

                    return (
                      <TableRow key={agendamento.id}>
                        <TableCell className="font-medium">{agendamento.titulo}</TableCell>
                        <TableCell>{formatDate(agendamento.dataAgendamento)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(agendamento.dataCriacao)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color} variant="secondary">
                            <StatusIcon className={`mr-1 h-3 w-3 ${agendamento.status === 'executando' ? 'animate-spin' : ''}`} />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {agendamento.status === 'pendente' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => executarMutation.mutate(agendamento.id)}
                                  disabled={executarMutation.isPending}
                                  title="Executar agora"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelarMutation.mutate(agendamento.id)}
                                  disabled={cancelarMutation.isPending}
                                  title="Cancelar"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletarMutation.mutate(agendamento.id)}
                              disabled={deletarMutation.isPending}
                              title="Deletar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar agendamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              Agende o envio de mensagens para grupos selecionados
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                placeholder="Ex: Promoção da Semana"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataAgendamento">Data e Hora *</Label>
              <Input
                id="dataAgendamento"
                type="datetime-local"
                value={formData.dataAgendamento}
                onChange={(e) => setFormData({ ...formData, dataAgendamento: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grupos">Grupos *</Label>
              <Select
                onValueChange={(value) => {
                  const grupoId = parseInt(value)
                  if (!formData.gruposIds.includes(grupoId)) {
                    setFormData({
                      ...formData,
                      gruposIds: [...formData.gruposIds, grupoId]
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione os grupos" />
                </SelectTrigger>
                <SelectContent>
                  {grupos?.map((grupo: any) => (
                    <SelectItem key={grupo.id} value={grupo.id.toString()}>
                      {grupo.nomeGrupo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Grupos selecionados */}
              {formData.gruposIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.gruposIds.map((grupoId) => {
                    const grupo = grupos?.find((g: any) => g.id === grupoId)
                    return (
                      <Badge key={grupoId} variant="secondary" className="cursor-pointer">
                        {grupo?.nomeGrupo}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              gruposIds: formData.gruposIds.filter((id) => id !== grupoId),
                            })
                          }}
                          className="ml-2"
                        >
                          ×
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="conteudo">Mensagem *</Label>
              <Textarea
                id="conteudo"
                placeholder="Digite a mensagem que será enviada..."
                value={formData.conteudoPersonalizado}
                onChange={(e) => setFormData({ ...formData, conteudoPersonalizado: e.target.value })}
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Você pode usar variáveis como {'{{nome}}'}, {'{{empresa}}'}, etc.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={criarMutation.isPending}
              >
                {criarMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Criar Agendamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
