'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Smartphone,
  Plus,
  QrCode,
  Power,
  PowerOff,
  RefreshCw,
  Settings,
  Trash2,
  CheckCircle2,
  Clock,
  MessageSquare,
  Activity,
  Wifi,
  WifiOff,
  Send,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function InstancesPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [selectedInstance, setSelectedInstance] = useState<any>(null)
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false)
  const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null)

  // Buscar instâncias
  const { data: instances, isLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const res = await fetch('/api/instances')
      if (!res.ok) throw new Error('Erro ao carregar instâncias')
      return res.json()
    },
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  })

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['instances-stats'],
    queryFn: async () => {
      const res = await fetch('/api/instances/stats')
      return res.json()
    },
  })

  // Criar instância
  const createMutation = useMutation({
    mutationFn: async (data: { instanceName: string; displayName?: string }) => {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar instância')
      }
      return res.json()
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      queryClient.invalidateQueries({ queryKey: ['instances-stats'] })
      toast.success('Instância criada! Gerando QR Code...')
      setIsCreateOpen(false)
      setNewInstanceName('')
      setNewDisplayName('')

      // Conectar automaticamente e mostrar QR Code
      setTimeout(() => {
        connectMutation.mutate(variables.instanceName)
      }, 1000)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Buscar QR Code de uma instância específica (com polling)
  const { data: qrCodeData } = useQuery({
    queryKey: ['qrcode', selectedInstance?.instanceName],
    queryFn: async () => {
      if (!selectedInstance?.instanceName) return null
      const res = await fetch(`/api/instances/${selectedInstance.instanceName}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: qrCodeDialogOpen && !!selectedInstance?.instanceName,
    refetchInterval: qrCodeDialogOpen ? 2000 : false, // Poll a cada 2 segundos enquanto dialog estiver aberto
  })

  // Conectar instância
  const connectMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const res = await fetch(`/api/instances/${instanceName}/connect`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Erro ao conectar')
      return res.json()
    },
    onSuccess: (data, instanceName) => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      const instance = instances?.find((i: any) => i.instanceName === instanceName)
      setSelectedInstance({ ...instance, instanceName })
      setQrCodeDialogOpen(true)
      toast.success('Gerando QR Code... Aguarde alguns segundos.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Desconectar instância
  const disconnectMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const res = await fetch(`/api/instances/${instanceName}/disconnect`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Erro ao desconectar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      queryClient.invalidateQueries({ queryKey: ['instances-stats'] })
      toast.success('Instância desconectada!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Deletar instância
  const deleteMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      const res = await fetch(`/api/instances/${instanceName}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao deletar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      queryClient.invalidateQueries({ queryKey: ['instances-stats'] })
      toast.success('Instância deletada!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleCreate = () => {
    if (!newInstanceName) {
      toast.error('Nome da instância é obrigatório')
      return
    }

    createMutation.mutate({
      instanceName: newInstanceName,
      displayName: newDisplayName || newInstanceName,
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      connected: {
        variant: 'success' as const,
        label: 'Conectada',
        icon: Wifi,
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      disconnected: {
        variant: 'secondary' as const,
        label: 'Desconectada',
        icon: WifiOff,
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      },
      qr: {
        variant: 'warning' as const,
        label: 'Aguardando QR',
        icon: QrCode,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      connecting: {
        variant: 'info' as const,
        label: 'Conectando',
        icon: Clock,
        className: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse'
      },
    }

    const badge = badges[status as keyof typeof badges] || badges.disconnected
    const Icon = badge.icon

    return (
      <Badge className={`${badge.className} flex items-center gap-1.5 px-3 py-1`}>
        <Icon className="h-3.5 w-3.5" />
        {badge.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Moderno */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-3xl -z-10" />
        <div className="glass rounded-2xl p-6 sm:p-8 border border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text">
                Instâncias WhatsApp
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Gerencie suas conexões com o WhatsApp Business
              </p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Nova Instância
                </Button>
              </DialogTrigger>
              <DialogContent
                className="w-[95vw] max-w-md mx-auto glass border-2 border-primary/20"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  padding: '32px',
                }}
              >
                <DialogHeader>
                  <DialogTitle style={{ color: '#000000', fontSize: '24px', fontWeight: 'bold' }}>
                    Criar Nova Instância
                  </DialogTitle>
                  <DialogDescription style={{ color: '#666666', fontSize: '16px' }}>
                    Configure uma nova conexão WhatsApp
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="instanceName" style={{ color: '#000000', fontSize: '16px', fontWeight: '600' }}>
                      Nome da Instância *
                    </Label>
                    <Input
                      id="instanceName"
                      placeholder="minha-instancia"
                      value={newInstanceName}
                      onChange={(e) => setNewInstanceName(e.target.value)}
                      className="w-full"
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: '2px solid #16a34a',
                        fontSize: '16px',
                        padding: '12px',
                      }}
                    />
                    <p style={{ color: '#666666', fontSize: '14px' }}>
                      Use apenas letras minúsculas, números e hífens
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName" style={{ color: '#000000', fontSize: '16px', fontWeight: '600' }}>
                      Nome de Exibição
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="Minha Instância"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="w-full"
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: '2px solid #16a34a',
                        fontSize: '16px',
                        padding: '12px',
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="w-full"
                    size="lg"
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      padding: '16px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {createMutation.isPending ? 'Criando...' : 'Criar Instância'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas Modernos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-in">
        <Card className="glass border-primary/10 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm">Total</CardDescription>
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold gradient-text">
              {stats?.total || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="glass border-green-500/20 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm">Conectadas</CardDescription>
              <Wifi className="h-4 w-4 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-600">
              {stats?.conectadas || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="glass border-gray-500/20 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm">Desconectadas</CardDescription>
              <WifiOff className="h-4 w-4 text-gray-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-600">
              {stats?.desconectadas || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="glass border-blue-500/20 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm">Mensagens</CardDescription>
              <Send className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-blue-600">
              {stats?.totalMensagens || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* CTA Quando não há instâncias */}
      {(!instances || instances.length === 0) && !isLoading && (
        <Card className="border border-primary/20 bg-card animate-slide-in">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-6 mb-6">
              <Smartphone className="h-16 w-16 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-500 mb-3">
              Nenhuma instância configurada
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Crie uma instância para conectar seu WhatsApp e começar a enviar mensagens
            </p>
            <Button
              size="lg"
              variant="primary"
              className="px-6"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar Instância
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de Instâncias Redesenhada */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : instances?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {instances?.map((instance: any, index: number) => (
            <Card
              key={instance.id}
              className="glass border-primary/10 overflow-hidden card-hover animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl font-bold">
                      {instance.displayName || instance.instanceName}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1 font-mono">
                      {instance.instanceName}
                    </CardDescription>
                  </div>
                  {getStatusBadge(instance.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Informações */}
                <div className="space-y-3">
                  {instance.numero && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                      <Smartphone className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">+{instance.numero}</span>
                    </div>
                  )}

                  {instance._count && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5">
                      <Send className="h-4 w-4 text-accent" />
                      <span className="text-sm">
                        {instance._count.mensagensEnviadas || 0} mensagens enviadas
                      </span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  {instance.status === 'connected' ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        disconnectMutation.mutate(instance.instanceName)
                      }}
                      disabled={disconnectMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 cursor-pointer"
                    >
                      <PowerOff className="mr-1.5 h-4 w-4" />
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        connectMutation.mutate(instance.instanceName)
                      }}
                      disabled={connectMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 cursor-pointer"
                    >
                      <Power className="mr-1.5 h-4 w-4" />
                      Conectar
                    </Button>
                  )}

                  {instanceToDelete === instance.instanceName ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteMutation.mutate(instance.instanceName)
                        setInstanceToDelete(null)
                      }}
                      onBlur={() => {
                        setTimeout(() => setInstanceToDelete(null), 200)
                      }}
                      className="inline-flex items-center justify-center h-8 px-3 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 relative z-50 font-bold animate-pulse"
                      title="Clique novamente para confirmar"
                      style={{ pointerEvents: 'auto' }}
                      autoFocus
                    >
                      Confirmar?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setInstanceToDelete(instance.instanceName)
                      }}
                      className="inline-flex items-center justify-center h-8 px-3 text-sm rounded-md bg-gray-200 text-gray-900 hover:bg-red-500 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 relative z-50"
                      title="Deletar instância"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Trash2 className="h-4 w-4 pointer-events-none" />
                    </button>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toast.info('Configurações em desenvolvimento')
                    }}
                    className="hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    title="Configurações"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Dialog Melhorado */}
      <Dialog open={qrCodeDialogOpen} onOpenChange={setQrCodeDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto glass border-2 border-primary/30 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold gradient-text flex items-center gap-2">
              <QrCode className="h-8 w-8" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Escaneie o QR Code com seu celular para conectar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-6">
            {qrCodeData?.qrCode ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
                <div className="relative bg-white p-8 rounded-2xl shadow-2xl border-4 border-primary/20 hover:border-primary/40 transition-all">
                  <img
                    src={qrCodeData.qrCode}
                    alt="QR Code"
                    className="w-72 h-72 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="w-72 h-72 bg-white/50 backdrop-blur rounded-2xl flex flex-col items-center justify-center border-4 border-dashed border-primary/30 shadow-xl">
                <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground font-medium">Gerando QR Code...</p>
                <p className="text-xs text-muted-foreground mt-1">Aguarde alguns segundos</p>
              </div>
            )}

            <div className="w-full bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 space-y-4 border border-primary/20 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-primary" />
                <p className="text-sm font-bold">Como conectar:</p>
              </div>
              <ol className="text-sm space-y-3">
                <li className="flex items-start gap-3 group">
                  <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-primary to-accent text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md group-hover:scale-110 transition-transform">1</span>
                  <span className="pt-0.5">Abra o <strong>WhatsApp</strong> no seu celular</span>
                </li>
                <li className="flex items-start gap-3 group">
                  <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-primary to-accent text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md group-hover:scale-110 transition-transform">2</span>
                  <span className="pt-0.5">Toque em <strong>Mais opções</strong> → <strong>Aparelhos conectados</strong></span>
                </li>
                <li className="flex items-start gap-3 group">
                  <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-primary to-accent text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md group-hover:scale-110 transition-transform">3</span>
                  <span className="pt-0.5">Toque em <strong>Conectar um aparelho</strong></span>
                </li>
                <li className="flex items-start gap-3 group">
                  <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-primary to-accent text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md group-hover:scale-110 transition-transform">4</span>
                  <span className="pt-0.5">Aponte a câmera para o QR Code acima</span>
                </li>
              </ol>

              {qrCodeData?.status === 'connected' && (
                <div className="mt-4 p-4 bg-green-100 rounded-xl border-2 border-green-500 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm font-bold text-green-900">Conectado com sucesso!</p>
                    <p className="text-xs text-green-700">Você já pode fechar esta janela</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}