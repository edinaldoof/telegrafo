'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Plus,
  MessageSquare,
  Trash2,
  RefreshCw,
  Crown,
  Shield,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Phone,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { toast } from 'sonner'

interface Membro {
  id: number
  numero: string
  nome: string | null
  ehAdmin: boolean
  ehSuperAdmin: boolean
  sincronizadoEm: string
  instanceName: string | null
}

interface Grupo {
  id: number
  nome: string
  numeroGrupo: number
  whatsappGroupId: string | null
  linkConvite: string | null
  totalMembros: number
  capacidadeMaxima: number
  status: string
  ultimaSincronizacao: string | null
  _count?: { contatos: number }
}

export default function GruposPage() {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [contatoNumero, setContatoNumero] = useState('')
  const [instanceName, setInstanceName] = useState('')
  const [descricao, setDescricao] = useState('')
  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [somenteAdminsEnviam, setSomenteAdminsEnviam] = useState(true)
  const [somenteAdminsEditam, setSomenteAdminsEditam] = useState(true)
  const [grupoToDelete, setGrupoToDelete] = useState<number | null>(null)
  const [expandedGrupo, setExpandedGrupo] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: grupos, isLoading } = useQuery({
    queryKey: ['grupos'],
    queryFn: async () => {
      const res = await fetch('/api/grupos')
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: instances } = useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const res = await fetch('/api/instances')
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: contatos, isLoading: contatosLoading } = useQuery({
    queryKey: ['contatos-lista'],
    queryFn: async () => {
      const res = await fetch('/api/contatos?limit=500')
      if (!res.ok) return { data: [] }
      return res.json()
    },
  })

  // Query para membros do grupo expandido
  const { data: membrosData, isLoading: membrosLoading } = useQuery({
    queryKey: ['grupo-membros', expandedGrupo],
    queryFn: async () => {
      if (!expandedGrupo) return null
      const res = await fetch(`/api/grupos/${expandedGrupo}/membros`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!expandedGrupo,
  })

  const contatosOptions: ComboboxOption[] = (contatos?.data || []).map(
    (contato: { numeroWhatsapp: string; nomeContato?: string }) => ({
      value: contato.numeroWhatsapp,
      label: contato.nomeContato || contato.numeroWhatsapp,
      description: contato.nomeContato ? contato.numeroWhatsapp : undefined,
    })
  )

  const createGroupMutation = useMutation({
    mutationFn: async (data: {
      nome: string
      contatoNumero: string
      instanceName: string
      descricao?: string
      imagem?: string
      somenteAdminsEnviam?: boolean
      somenteAdminsEditam?: boolean
    }) => {
      const res = await fetch('/api/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar grupo')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Grupo criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['grupos'] })
      setOpen(false)
      setNome('')
      setContatoNumero('')
      setInstanceName('')
      setDescricao('')
      setImagemFile(null)
      setSomenteAdminsEnviam(true)
      setSomenteAdminsEditam(true)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar grupo')
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: async (grupoId: number) => {
      const res = await fetch(`/api/grupos/${grupoId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao deletar grupo')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Grupo deletado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['grupos'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao deletar grupo')
    },
  })

  const syncMutation = useMutation({
    mutationFn: async (grupoId: number) => {
      const res = await fetch(`/api/grupos/${grupoId}/membros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao sincronizar')
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Sincronizado! ${data.totalMembros} membros encontrados`)
      queryClient.invalidateQueries({ queryKey: ['grupos'] })
      queryClient.invalidateQueries({ queryKey: ['grupo-membros'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao sincronizar membros')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome || !contatoNumero || !instanceName) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    let imagemBase64: string | undefined

    if (imagemFile) {
      try {
        const reader = new FileReader()
        imagemBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(imagemFile)
        })
      } catch (error) {
        toast.error('Erro ao processar imagem')
        return
      }
    }

    createGroupMutation.mutate({
      nome,
      contatoNumero,
      instanceName,
      descricao: descricao || undefined,
      imagem: imagemBase64,
      somenteAdminsEnviam,
      somenteAdminsEditam,
    })
  }

  const connectedInstances = instances?.filter((i: any) => i.status === 'connected') || []

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPhone = (phone: string) => {
    // Formatar número de telefone
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`
    }
    if (phone.length === 12) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 8)}-${phone.slice(8)}`
    }
    return phone
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Grupos WhatsApp</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Gerencie seus grupos e visualize membros
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" variant="primary" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Criar Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
                <DialogDescription>
                  Crie um grupo WhatsApp com um contato inicial.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do Grupo</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Grupo de Vendas"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contato">Contato Inicial</Label>
                  <Combobox
                    options={contatosOptions}
                    value={contatoNumero}
                    onValueChange={setContatoNumero}
                    placeholder="Selecione um contato..."
                    searchPlaceholder="Buscar..."
                    emptyMessage="Nenhum contato encontrado."
                    loading={contatosLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="instance">Instância</Label>
                  <select
                    id="instance"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      Selecione uma instância
                    </option>
                    {connectedInstances.length === 0 ? (
                      <option value="" disabled>
                        Nenhuma instância conectada
                      </option>
                    ) : (
                      connectedInstances.map((instance: any) => (
                        <option key={instance.id} value={instance.instanceName}>
                          {instance.displayName || instance.instanceName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição (Opcional)</Label>
                  <textarea
                    id="descricao"
                    placeholder="Descrição do grupo"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="somenteAdminsEnviam"
                    checked={somenteAdminsEnviam}
                    onChange={(e) => setSomenteAdminsEnviam(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="somenteAdminsEnviam" className="text-sm">
                    Somente admins enviam mensagens
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createGroupMutation.isPending || connectedInstances.length === 0}
                >
                  {createGroupMutation.isPending ? 'Criando...' : 'Criar Grupo'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Grupos */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando grupos...</p>
        </div>
      ) : grupos?.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum grupo criado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Clique em "Criar Grupo" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos?.map((grupo: Grupo) => (
            <Card key={grupo.id} className="border-border overflow-hidden">
              {/* Header do Grupo */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{grupo.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {grupo.totalMembros} / {grupo.capacidadeMaxima} membros
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={grupo.status === 'ativo' ? 'success' : 'secondary'}>
                      {grupo.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedGrupo(expandedGrupo === grupo.id ? null : grupo.id)
                      }
                    >
                      {expandedGrupo === grupo.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Ações do Grupo */}
              <CardContent className="pt-0 pb-3 border-b border-border">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => syncMutation.mutate(grupo.id)}
                    disabled={syncMutation.isPending || !grupo.whatsappGroupId}
                  >
                    <RefreshCw
                      className={`mr-1.5 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                    />
                    Sincronizar
                  </Button>

                  {grupo.linkConvite && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(grupo.linkConvite!)
                        toast.success('Link copiado!')
                      }}
                    >
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copiar Link
                    </Button>
                  )}

                  {grupoToDelete === grupo.id ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        deleteGroupMutation.mutate(grupo.id)
                        setGrupoToDelete(null)
                      }}
                      onBlur={() => setTimeout(() => setGrupoToDelete(null), 200)}
                      autoFocus
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Confirmar?
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setGrupoToDelete(grupo.id)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Deletar
                    </Button>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                    <Clock className="h-3.5 w-3.5" />
                    Sincronizado: {formatDate(grupo.ultimaSincronizacao)}
                  </div>
                </div>
              </CardContent>

              {/* Tabela de Membros (expandido) */}
              {expandedGrupo === grupo.id && (
                <CardContent className="pt-4">
                  {membrosLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-sm text-muted-foreground">Carregando membros...</p>
                    </div>
                  ) : membrosData?.membros?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhum membro sincronizado</p>
                      <p className="text-xs mt-1">Clique em "Sincronizar" para buscar membros</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 font-medium">Membro</th>
                            <th className="text-left py-2 px-3 font-medium">Número</th>
                            <th className="text-left py-2 px-3 font-medium">Função</th>
                          </tr>
                        </thead>
                        <tbody>
                          {membrosData?.membros?.map((membro: Membro) => (
                            <tr key={membro.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  {membro.ehSuperAdmin ? (
                                    <Crown className="h-4 w-4 text-yellow-500" />
                                  ) : membro.ehAdmin ? (
                                    <Shield className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <User className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span>{membro.nome || 'Sem nome'}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-mono text-xs">
                                    {formatPhone(membro.numero)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                {membro.ehSuperAdmin ? (
                                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                    Criador
                                  </Badge>
                                ) : membro.ehAdmin ? (
                                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                    Admin
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Membro</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
