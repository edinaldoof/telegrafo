'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Send,
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Zap,
  Smartphone,
  UserPlus,
  RefreshCw,
  Circle,
  CircleDot,
} from 'lucide-react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { AreaChart } from '@/components/dashboard/area-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Mapeamento de ícones
const iconeMap: Record<string, any> = {
  'send': Send,
  'user-plus': UserPlus,
  'users': Users,
  'calendar': Calendar,
  'calendar-x': Calendar,
  'alert-circle': AlertCircle,
  'refresh-cw': RefreshCw,
  'smartphone': Smartphone,
  'smartphone-off': Smartphone,
  'activity': Activity,
}

export default function DashboardPage() {
  // Buscar estatísticas de grupos
  const { data: gruposStats } = useQuery({
    queryKey: ['grupos-stats'],
    queryFn: async () => {
      const res = await fetch('/api/grupos/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 30000, // Atualizar a cada 30s
  })

  // Buscar estatísticas de contatos
  const { data: contatosStats } = useQuery({
    queryKey: ['contatos-stats'],
    queryFn: async () => {
      const res = await fetch('/api/contatos/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 30000,
  })

  // Buscar estatísticas de instâncias
  const { data: instancesStats } = useQuery({
    queryKey: ['instances-stats'],
    queryFn: async () => {
      const res = await fetch('/api/instances/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 10000, // Atualizar a cada 10s
  })

  // Buscar estatísticas de agendamentos
  const { data: agendamentosStats } = useQuery({
    queryKey: ['agendamentos-stats'],
    queryFn: async () => {
      const res = await fetch('/api/agendamentos/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 30000,
  })

  // Buscar estatísticas de mensagens
  const { data: mensagensStats } = useQuery({
    queryKey: ['mensagens-stats'],
    queryFn: async () => {
      const res = await fetch('/api/mensagens/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 15000,
  })

  // Buscar atividades recentes
  const { data: atividadesData } = useQuery({
    queryKey: ['atividades'],
    queryFn: async () => {
      const res = await fetch('/api/atividades?limite=5')
      if (!res.ok) return { atividades: [] }
      return res.json()
    },
    refetchInterval: 15000,
  })

  // Preparar dados do gráfico
  const chartData = mensagensStats?.ultimosDias
    ? [
        {
          name: 'Mensagens',
          data: mensagensStats.ultimosDias.map((d: any) => d.total),
        },
      ]
    : [{ name: 'Mensagens', data: [0, 0, 0, 0, 0, 0, 0] }]

  const chartCategories = mensagensStats?.ultimosDias
    ? mensagensStats.ultimosDias.map((d: any) => d.dia)
    : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-3xl -z-10" />
        <div className="glass rounded-2xl p-6 sm:p-8 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Visão geral do sistema Telegrafo
              </p>
            </div>
            {/* Status da Conexão */}
            <div className="hidden sm:flex items-center gap-2">
              {instancesStats?.conectadas > 0 ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CircleDot className="h-3 w-3" />
                  {instancesStats.conectadas} conectada{instancesStats.conectadas > 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Circle className="h-3 w-3" />
                  Nenhuma conexão
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <MetricCard
          title="Contatos"
          value={contatosStats?.total || 0}
          icon={<Users className="h-5 w-5" />}
          description={`${contatosStats?.ativos || 0} ativos`}
        />

        <MetricCard
          title="Mensagens Hoje"
          value={mensagensStats?.totalHoje || 0}
          icon={<Send className="h-5 w-5" />}
          trend={
            mensagensStats?.totalSemana
              ? {
                  value: mensagensStats.totalSemana,
                  isPositive: true,
                  period: 'esta semana',
                }
              : undefined
          }
          description={`${mensagensStats?.taxaEntrega || 100}% entregues`}
        />

        <MetricCard
          title="Grupos"
          value={gruposStats?.totalGrupos || 0}
          icon={<MessageSquare className="h-5 w-5" />}
          description={`${gruposStats?.gruposAtivos || 0} ativos`}
        />

        <MetricCard
          title="Agendamentos"
          value={agendamentosStats?.pendentes || 0}
          icon={<Calendar className="h-5 w-5" />}
          description={`${agendamentosStats?.proximosHoje || 0} hoje`}
        />
      </div>

      {/* Gráficos e Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Gráfico de Mensagens */}
        <div className="glass rounded-xl p-1 animate-slide-in">
          <AreaChart
            title="Mensagens - Últimos 7 dias"
            data={chartData}
            categories={chartCategories}
            height={350}
          />
        </div>

        {/* Status dos Agendamentos */}
        <Card className="glass border-primary/10 animate-slide-in card-hover">
          <CardHeader className="border-b border-primary/10">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Status dos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl border border-green-200 dark:border-green-800 transform hover:scale-105 transition-all">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">Concluídos</p>
                  <p className="text-sm text-green-700 dark:text-green-300">Total geral</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {agendamentosStats?.concluidos || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl border border-blue-200 dark:border-blue-800 transform hover:scale-105 transition-all">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Pendentes</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Aguardando execução</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {agendamentosStats?.pendentes || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-xl border border-red-200 dark:border-red-800 transform hover:scale-105 transition-all">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Com Erro</p>
                  <p className="text-sm text-red-700 dark:text-red-300">Requerem atenção</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {agendamentosStats?.comErro || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividades Recentes e Status das Instâncias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Atividades Recentes */}
        <Card className="lg:col-span-2 glass border-primary/10 animate-slide-in">
          <CardHeader className="border-b border-primary/10">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {atividadesData?.atividades?.map((atividade: any, index: number) => {
                const Icon = iconeMap[atividade.icone] || Activity
                return (
                  <div
                    key={atividade.id}
                    className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all transform hover:scale-105 animate-slide-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                      <Icon className={`h-5 w-5 ${atividade.cor}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {atividade.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {atividade.tempoRelativo}
                      </p>
                    </div>
                  </div>
                )
              })}

              {(!atividadesData?.atividades || atividadesData.atividades.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50 animate-pulse-slow" />
                  <p>Nenhuma atividade recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas + Status Instâncias */}
        <div className="space-y-6">
          {/* Status das Instâncias */}
          <Card className="glass border-primary/10 animate-slide-in">
            <CardHeader className="border-b border-primary/10">
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Instâncias WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <Badge variant="secondary">{instancesStats?.total || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Conectadas
                </span>
                <Badge variant="success">{instancesStats?.conectadas || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                  Aguardando QR
                </span>
                <Badge variant="warning">{instancesStats?.aguardandoQr || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                  Desconectadas
                </span>
                <Badge variant="secondary">{instancesStats?.desconectadas || 0}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card className="glass border-primary/10 animate-slide-in">
            <CardHeader className="border-b border-primary/10">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <a
                href="/enviar"
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Enviar Mensagem</p>
                </div>
              </a>

              <a
                href="/agendamentos"
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-blue-500/10 hover:from-blue-500/10 hover:to-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 transition-all group"
              >
                <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Agendamentos</p>
                </div>
              </a>

              <a
                href="/contatos"
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/5 to-purple-500/10 hover:from-purple-500/10 hover:to-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
              >
                <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Contatos</p>
                </div>
              </a>

              <a
                href="/instances"
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-green-500/5 to-green-500/10 hover:from-green-500/10 hover:to-green-500/20 border border-green-500/20 hover:border-green-500/40 transition-all group"
              >
                <div className="p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                  <Smartphone className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Instâncias</p>
                </div>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resumo de Mensagens */}
      <Card className="glass border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 animate-slide-in card-hover">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl gradient-text mb-4">
                Resumo de Mensagens
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-primary">{mensagensStats?.totalGeral || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Geral</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-green-600">{mensagensStats?.totalSemana || 0}</p>
                  <p className="text-xs text-muted-foreground">Esta Semana</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-blue-600">{mensagensStats?.fila?.pendentes || 0}</p>
                  <p className="text-xs text-muted-foreground">Na Fila</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-purple-600">{mensagensStats?.taxaEntrega || 100}%</p>
                  <p className="text-xs text-muted-foreground">Taxa Entrega</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
