'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { DashboardHeader } from '@/components/dashboard/overview/header'
import { DashboardStats } from '@/components/dashboard/overview/stats'
import { DashboardChartsSection } from '@/components/dashboard/overview/charts-section'
import { DashboardRecentActivity } from '@/components/dashboard/overview/recent-activity'
import { DashboardSidebarStats } from '@/components/dashboard/overview/sidebar-stats'
import { DashboardMessagesSummary } from '@/components/dashboard/overview/messages-summary'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Buscar estatísticas de grupos
  const { data: gruposStats, isLoading: loadingGrupos } = useQuery({
    queryKey: ['grupos-stats'],
    queryFn: async () => {
      const res = await fetch('/api/grupos/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 30000, // Atualizar a cada 30s
  })

  // Buscar estatísticas de contatos
  const { data: contatosStats, isLoading: loadingContatos } = useQuery({
    queryKey: ['contatos-stats'],
    queryFn: async () => {
      const res = await fetch('/api/contatos/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 30000,
  })

  // Buscar estatísticas de instâncias
  const { data: instancesStats, isLoading: loadingInstances } = useQuery({
    queryKey: ['instances-stats'],
    queryFn: async () => {
      const res = await fetch('/api/instances/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 10000, // Atualizar a cada 10s
  })

  // Buscar estatísticas de agendamentos
  const { data: agendamentosStats, isLoading: loadingAgendamentos } = useQuery({
    queryKey: ['agendamentos-stats'],
    queryFn: async () => {
      const res = await fetch('/api/agendamentos/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 30000,
  })

  // Buscar estatísticas de mensagens
  const { data: mensagensStats, isLoading: loadingMensagens } = useQuery({
    queryKey: ['mensagens-stats'],
    queryFn: async () => {
      const res = await fetch('/api/mensagens/stats')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 15000,
  })

  // Buscar atividades recentes
  const { data: atividadesData, isLoading: loadingAtividades } = useQuery({
    queryKey: ['atividades'],
    queryFn: async () => {
      const res = await fetch('/api/atividades?limite=5')
      if (!res.ok) return { atividades: [] }
      return res.json()
    },
    refetchInterval: 15000,
  })

  // Buscar saldo do Twilio
  const { data: twilioSaldo, isLoading: loadingSaldo } = useQuery({
    queryKey: ['twilio-saldo'],
    queryFn: async () => {
      const res = await fetch('/api/twilio/saldo')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  })

  // Estados de loading combinados
  const isLoadingStats = loadingContatos || loadingMensagens || loadingGrupos || loadingAgendamentos
  const isLoadingCharts = loadingMensagens || loadingAgendamentos
  const isLoadingHeader = loadingSaldo || loadingInstances

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['grupos-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['contatos-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['instances-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['agendamentos-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['mensagens-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['atividades'] }),
      queryClient.invalidateQueries({ queryKey: ['twilio-saldo'] })
    ])
    // Pequeno delay visual
    setTimeout(() => setIsRefreshing(false), 800)
    toast.success('Dashboard atualizado!')
  }

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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 motion-safe:animate-fade-in pb-10">
      <DashboardHeader
        twilioSaldo={twilioSaldo}
        instancesStats={instancesStats}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isLoading={isLoadingHeader}
      />

      <DashboardStats
        contatosStats={contatosStats}
        mensagensStats={mensagensStats}
        gruposStats={gruposStats}
        agendamentosStats={agendamentosStats}
        isLoading={isLoadingStats}
      />

      <DashboardChartsSection
        chartData={chartData}
        chartCategories={chartCategories}
        agendamentosStats={agendamentosStats}
        isLoading={isLoadingCharts}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <DashboardRecentActivity atividadesData={atividadesData} isLoading={loadingAtividades} />
        <DashboardSidebarStats twilioSaldo={twilioSaldo} instancesStats={instancesStats} isLoading={isLoadingHeader} />
      </div>

      <DashboardMessagesSummary mensagensStats={mensagensStats} isLoading={loadingMensagens} />
    </div>
  )
}