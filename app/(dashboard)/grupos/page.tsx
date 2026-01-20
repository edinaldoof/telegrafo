'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { List, Plus, MessageSquare, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { toast } from 'sonner'

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

  // Transforma contatos em opções para o Combobox
  const contatosOptions: ComboboxOption[] = (contatos?.data || []).map((contato: { numeroWhatsapp: string; nomeContato?: string }) => ({
    value: contato.numeroWhatsapp,
    label: contato.nomeContato || contato.numeroWhatsapp,
    description: contato.nomeContato ? contato.numeroWhatsapp : undefined,
  }))

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome || !contatoNumero || !instanceName) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    let imagemBase64: string | undefined

    // Converter imagem para base64 se houver
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Grupos WhatsApp</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Gerencie seus grupos criados automaticamente
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Criar Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
                <DialogDescription>
                  Crie um grupo WhatsApp com um contato inicial. O link de convite será gerado automaticamente.
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
                  <Label htmlFor="contato">Número do Contato Inicial</Label>
                  <Combobox
                    options={contatosOptions}
                    value={contatoNumero}
                    onValueChange={setContatoNumero}
                    placeholder="Selecione um contato..."
                    searchPlaceholder="Buscar por nome ou número..."
                    emptyMessage="Nenhum contato encontrado."
                    loading={contatosLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecione um contato existente ou adicione novos contatos na página de Contatos
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="instance">Instância WhatsApp</Label>
                  <select
                    id="instance"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Selecione uma instância conectada
                    </option>
                    {connectedInstances.length === 0 ? (
                      <option value="" disabled>
                        Nenhuma instância conectada
                      </option>
                    ) : (
                      connectedInstances.map((instance: any) => (
                        <option key={instance.id} value={instance.instanceName}>
                          {instance.displayName || instance.instanceName} ({instance.numero})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição do Grupo (Opcional)</Label>
                  <textarea
                    id="descricao"
                    placeholder="Ex: Grupo para divulgação de produtos"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="imagem">Foto do Grupo (Opcional)</Label>
                  <Input
                    id="imagem"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImagemFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
                  </p>
                </div>
                <div className="grid gap-3 pt-2 border-t">
                  <Label className="text-base font-semibold">Permissões do Grupo</Label>
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="somenteAdminsEnviam"
                      checked={somenteAdminsEnviam}
                      onChange={(e) => setSomenteAdminsEnviam(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex-1">
                      <Label htmlFor="somenteAdminsEnviam" className="cursor-pointer font-medium">
                        Somente admins podem enviar mensagens
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Quando ativado, apenas administradores podem enviar mensagens no grupo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="somenteAdminsEditam"
                      checked={somenteAdminsEditam}
                      onChange={(e) => setSomenteAdminsEditam(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex-1">
                      <Label htmlFor="somenteAdminsEditam" className="cursor-pointer font-medium">
                        Somente admins podem editar configurações
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Quando ativado, apenas administradores podem alterar nome, foto e descrição do grupo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={createGroupMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createGroupMutation.isPending || connectedInstances.length === 0}
                >
                  {createGroupMutation.isPending ? 'Criando...' : 'Criar Grupo'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <List className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-2">
                Como Funcionam os Grupos
              </h3>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Grupos são criados automaticamente via Evolution API
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Capacidade máxima configurável (padrão: 256 membros)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Participantes são adicionados automaticamente
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Grupos */}
      {isLoading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : grupos?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <List className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum grupo criado ainda</p>
            <p className="text-sm text-muted-foreground mt-2">
              Os grupos serão criados automaticamente quando você adicionar contatos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos?.map((grupo: any) => (
            <Card key={grupo.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {grupo.nome}
                  <Badge variant={grupo.status === 'ativo' ? 'success' : 'secondary'}>
                    {grupo.status}
                  </Badge>
                </CardTitle>
                <CardDescription>Grupo #{grupo.numeroGrupo}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Membros:</span>
                    <span className="font-medium">{grupo.totalMembros}/{grupo.capacidadeMaxima}</span>
                  </div>
                  {grupo.linkConvite && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        navigator.clipboard.writeText(grupo.linkConvite)
                        toast.success('Link copiado!')
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Copiar Link
                    </Button>
                  )}
                  {grupoToDelete === grupo.id ? (
                    <button
                      type="button"
                      className="w-full inline-flex items-center justify-center h-8 px-3 text-sm rounded-md font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg cursor-pointer animate-pulse"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteGroupMutation.mutate(grupo.id)
                        setGrupoToDelete(null)
                      }}
                      onBlur={() => {
                        setTimeout(() => setGrupoToDelete(null), 200)
                      }}
                      autoFocus
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Confirmar Exclusão?
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full inline-flex items-center justify-center h-8 px-3 text-sm rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setGrupoToDelete(grupo.id)
                      }}
                      disabled={deleteGroupMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleteGroupMutation.isPending ? 'Deletando...' : 'Deletar Grupo'}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
