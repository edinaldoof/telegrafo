import { Users, Send, MessageSquare, Calendar } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardStatsProps {
  contatosStats: any
  mensagensStats: any
  gruposStats: any
  agendamentosStats: any
  isLoading?: boolean
}

function MetricCardSkeleton() {
  return (
    <Card className="glass border-primary/10">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardStats({
  contatosStats,
  mensagensStats,
  gruposStats,
  agendamentosStats,
  isLoading,
}: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    )
  }

  return (
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
  )
}
