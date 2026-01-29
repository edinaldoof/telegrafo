'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Settings,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  MessageSquare,
  Cloud,
  Database,
  Globe,
  User,
  Server,
  Phone,
  CheckCircle2,
  Loader2,
  GraduationCap,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ConfigData {
  // Twilio
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  TWILIO_WHATSAPP_NUMBER: string
  // WhatsApp Business
  WHATSAPP_BUSINESS_PHONE_ID: string
  WHATSAPP_BUSINESS_TOKEN: string
  // WhatsApp Híbrido API
  WHATSAPP_API_URL: string
  WHATSAPP_API_KEY: string
  // Database
  DATABASE_URL: string
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_API_SECRET: string
  // App
  NEXT_PUBLIC_APP_URL: string
  // Evolution API
  EVOLUTION_API_URL: string
  EVOLUTION_API_KEY: string
  EVOLUTION_INSTANCE_NAME: string
  // Admin
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  // SGE COTEC
  SGE_API_URL: string
  SGE_API_TOKEN: string
}

const EMPTY_CONFIG: ConfigData = {
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',
  TWILIO_WHATSAPP_NUMBER: '',
  WHATSAPP_BUSINESS_PHONE_ID: '',
  WHATSAPP_BUSINESS_TOKEN: '',
  WHATSAPP_API_URL: '',
  WHATSAPP_API_KEY: '',
  DATABASE_URL: '',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
  NEXT_PUBLIC_APP_URL: '',
  EVOLUTION_API_URL: '',
  EVOLUTION_API_KEY: '',
  EVOLUTION_INSTANCE_NAME: '',
  ADMIN_USERNAME: '',
  ADMIN_PASSWORD: '',
  SGE_API_URL: '',
  SGE_API_TOKEN: '',
}

interface Sender {
  sid: string | null
  phoneNumber: string
  friendlyName: string
  status: string
  capabilities?: { whatsapp?: boolean }
  isWhatsApp: boolean
  isSelected?: boolean
  isKnown?: boolean
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<ConfigData>(EMPTY_CONFIG)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [senders, setSenders] = useState<Sender[]>([])
  const [sendersLoading, setSendersLoading] = useState(false)
  const [currentSender, setCurrentSender] = useState('')
  const [changingSender, setChangingSender] = useState<string | null>(null)

  // Carregar configurações automaticamente
  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/config')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao carregar')
      }
      const data = await res.json()
      setConfig(data)
      setIsLoaded(true)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar configuracoes')
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar WhatsApp Senders
  const loadSenders = async () => {
    setSendersLoading(true)
    try {
      const res = await fetch('/api/twilio/senders')
      if (res.ok) {
        const data = await res.json()
        setSenders(data.senders || [])
        setCurrentSender(data.numeroAtual || '')
      }
    } catch (error) {
      console.error('Erro ao carregar senders:', error)
    } finally {
      setSendersLoading(false)
    }
  }

  // Alterar sender ativo
  const changeSender = async (phoneNumber: string) => {
    setChangingSender(phoneNumber)
    try {
      const res = await fetch('/api/twilio/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentSender(data.numeroAtivo || phoneNumber)
        toast.success('Numero de envio alterado com sucesso!')
        loadSenders() // Recarregar lista
        loadConfig() // Recarregar config para atualizar o campo
      } else {
        const error = await res.json()
        toast.error(error.erro || 'Erro ao alterar numero')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar numero')
    } finally {
      setChangingSender(null)
    }
  }

  // Carregar ao montar componente
  useEffect(() => {
    loadConfig()
    loadSenders()
  }, [])

  // Salvar configurações
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao salvar')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Configuracoes salvas!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar')
    },
  })

  const handleSave = () => {
    saveMutation.mutate()
  }

  const toggleShowPassword = (field: string) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const updateConfig = (key: keyof ConfigData, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  // Tela de carregamento
  if (!isLoaded && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando configuracoes...</p>
        </div>
      </div>
    )
  }

  // Componente para campo com toggle de senha
  const PasswordField = ({ label, field, placeholder }: { label: string; field: keyof ConfigData; placeholder: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={showPasswords[field] ? 'text' : 'password'}
          value={config[field]}
          onChange={(e) => updateConfig(field, e.target.value)}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-8 w-8 p-0"
          onClick={() => toggleShowPassword(field)}
        >
          {showPasswords[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )

  // Tela de configurações
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Configurações
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gerencie as credenciais e variáveis de ambiente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={loadConfig} disabled={isLoading} className="flex-1 sm:flex-none">
            <RefreshCw className={`mr-1 sm:mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Recarregar</span>
            <span className="sm:hidden">Reload</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="flex-1 sm:flex-none">
            <Save className="mr-1 sm:mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* WhatsApp Híbrido API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-emerald-500" />
            WhatsApp Híbrido API (Principal)
          </CardTitle>
          <CardDescription>
            API interna para envio de mensagens via Twilio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>URL da API</Label>
              <Input
                value={config.WHATSAPP_API_URL}
                onChange={(e) => updateConfig('WHATSAPP_API_URL', e.target.value)}
                placeholder="http://localhost:3001"
              />
            </div>
            <PasswordField label="API Key" field="WHATSAPP_API_KEY" placeholder="Chave da API" />
          </div>
        </CardContent>
      </Card>

      {/* Twilio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            Twilio (WhatsApp Individual)
          </CardTitle>
          <CardDescription>
            Credenciais para envio de mensagens individuais via Twilio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Account SID</Label>
              <Input
                value={config.TWILIO_ACCOUNT_SID}
                onChange={(e) => updateConfig('TWILIO_ACCOUNT_SID', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <PasswordField label="Auth Token" field="TWILIO_AUTH_TOKEN" placeholder="Token de autenticação" />
          </div>
          <div className="space-y-2">
            <Label>Número WhatsApp Twilio</Label>
            <Input
              value={config.TWILIO_WHATSAPP_NUMBER}
              onChange={(e) => updateConfig('TWILIO_WHATSAPP_NUMBER', e.target.value)}
              placeholder="whatsapp:+14155238886"
            />
            <p className="text-xs text-muted-foreground">
              Formato: whatsapp:+[código país][número]
            </p>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Senders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-500" />
            WhatsApp Senders (Numeros de Envio)
          </CardTitle>
          <CardDescription>
            Numeros WhatsApp disponiveis para envio de mensagens via Twilio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sendersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando numeros...</span>
            </div>
          ) : senders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum numero WhatsApp encontrado</p>
              <p className="text-xs mt-2">Configure suas credenciais Twilio acima</p>
            </div>
          ) : (
            <div className="space-y-3">
              {senders.filter(s => s.isWhatsApp || s.capabilities?.whatsapp).map((sender) => {
                const isSelected = sender.phoneNumber === currentSender ||
                  `whatsapp:${sender.phoneNumber}` === currentSender ||
                  sender.phoneNumber === currentSender.replace('whatsapp:', '')

                return (
                  <div
                    key={sender.sid || sender.phoneNumber}
                    className={`p-3 sm:p-4 rounded-lg border ${
                      isSelected
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border bg-card hover:bg-accent/50'
                    } transition-colors`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{sender.friendlyName}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{sender.phoneNumber}</p>
                          <div className="flex items-center flex-wrap gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              sender.status === 'Online' || sender.status === 'active'
                                ? 'bg-green-500/20 text-green-600'
                                : 'bg-yellow-500/20 text-yellow-600'
                            }`}>
                              {sender.status}
                            </span>
                            {sender.isKnown && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600">
                                Producao
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isSelected && (
                        <Button
                          size="sm"
                          onClick={() => changeSender(sender.phoneNumber)}
                          disabled={changingSender !== null}
                          className="w-full sm:w-auto"
                        >
                          {changingSender === sender.phoneNumber ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Alterando...
                            </>
                          ) : (
                            'Usar este'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-4"
                onClick={loadSenders}
                disabled={sendersLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${sendersLoading ? 'animate-spin' : ''}`} />
                Atualizar lista
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Business */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            WhatsApp Business API (Meta)
          </CardTitle>
          <CardDescription>
            Credenciais da API oficial do WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone Number ID</Label>
              <Input
                value={config.WHATSAPP_BUSINESS_PHONE_ID}
                onChange={(e) => updateConfig('WHATSAPP_BUSINESS_PHONE_ID', e.target.value)}
                placeholder="ID do número de telefone"
              />
            </div>
            <PasswordField label="Access Token" field="WHATSAPP_BUSINESS_TOKEN" placeholder="Token de acesso" />
          </div>
        </CardContent>
      </Card>

      {/* Cloudinary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-purple-500" />
            Cloudinary (Upload de Mídia)
          </CardTitle>
          <CardDescription>
            Credenciais para upload de imagens e arquivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Cloud Name</Label>
              <Input
                value={config.CLOUDINARY_CLOUD_NAME}
                onChange={(e) => updateConfig('CLOUDINARY_CLOUD_NAME', e.target.value)}
                placeholder="nome-do-cloud"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                value={config.CLOUDINARY_API_KEY}
                onChange={(e) => updateConfig('CLOUDINARY_API_KEY', e.target.value)}
                placeholder="API Key"
              />
            </div>
            <PasswordField label="API Secret" field="CLOUDINARY_API_SECRET" placeholder="API Secret" />
          </div>
        </CardContent>
      </Card>

      {/* Database & App */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-500" />
            Banco de Dados & Aplicação
          </CardTitle>
          <CardDescription>
            Configurações do banco de dados e URL da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordField label="DATABASE_URL" field="DATABASE_URL" placeholder="postgresql://user:pass@host:5432/db" />
          <div className="space-y-2">
            <Label>URL da Aplicação</Label>
            <Input
              value={config.NEXT_PUBLIC_APP_URL}
              onChange={(e) => updateConfig('NEXT_PUBLIC_APP_URL', e.target.value)}
              placeholder="https://seu-dominio.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Evolution API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-500" />
            Evolution API (Baileys)
          </CardTitle>
          <CardDescription>
            Credenciais para integração com Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>URL da API</Label>
              <Input
                value={config.EVOLUTION_API_URL}
                onChange={(e) => updateConfig('EVOLUTION_API_URL', e.target.value)}
                placeholder="http://localhost:8080"
              />
            </div>
            <PasswordField label="API Key" field="EVOLUTION_API_KEY" placeholder="Chave da API" />
            <div className="space-y-2">
              <Label>Nome da Instância</Label>
              <Input
                value={config.EVOLUTION_INSTANCE_NAME}
                onChange={(e) => updateConfig('EVOLUTION_INSTANCE_NAME', e.target.value)}
                placeholder="minha-instancia"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-red-500" />
            Administrador
          </CardTitle>
          <CardDescription>
            Credenciais de acesso administrativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Usuário Admin</Label>
              <Input
                value={config.ADMIN_USERNAME}
                onChange={(e) => updateConfig('ADMIN_USERNAME', e.target.value)}
                placeholder="admin"
              />
            </div>
            <PasswordField label="Senha Admin" field="ADMIN_PASSWORD" placeholder="Senha do admin" />
          </div>
        </CardContent>
      </Card>

      {/* SGE COTEC API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            SGE COTEC (Inscricoes)
          </CardTitle>
          <CardDescription>
            Credenciais para sincronizar inscricoes do Sistema de Gestao Educacional
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>URL da API</Label>
              <Input
                value={config.SGE_API_URL}
                onChange={(e) => updateConfig('SGE_API_URL', e.target.value)}
                placeholder="https://sge.cotec.go.gov.br/api/v2/inscricoes/api/index"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar a URL padrao
              </p>
            </div>
            <PasswordField label="Token de Autenticacao" field="SGE_API_TOKEN" placeholder="Token Bearer da API SGE" />
          </div>
        </CardContent>
      </Card>

      {/* Aviso */}
      <Card className="border-green-500/50 bg-green-500/10">
        <CardContent className="pt-6">
          <p className="text-sm text-green-700">
            <strong>Configurações Dinâmicas:</strong> As alterações são aplicadas em tempo real,
            sem necessidade de reiniciar a aplicação. Basta salvar e as mudanças já estarão ativas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
