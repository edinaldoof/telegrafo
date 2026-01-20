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
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<ConfigData>(EMPTY_CONFIG)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

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

  // Carregar ao montar componente
  useEffect(() => {
    loadConfig()
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            Configurações
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Gerencie as credenciais e variáveis de ambiente do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadConfig} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
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

      {/* Aviso */}
      <Card className="border-yellow-500/50 bg-yellow-500/10">
        <CardContent className="pt-6">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            <strong>Importante:</strong> Após salvar as configurações, reinicie a aplicação
            para que as mudanças entrem em vigor. Use: <code className="bg-muted px-1 rounded">pm2 restart telegrafo</code>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
