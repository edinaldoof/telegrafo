import { Activity, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { AreaChart } from '@/components/dashboard/area-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardChartsSectionProps {
  chartData: any[]
  chartCategories: string[]
  agendamentosStats: any
  isLoading?: boolean
}

function ChartSkeleton() {
  return (
    <Card className="glass border-primary/10">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

function StatusCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-12" />
    </div>
  )
}

export function DashboardChartsSection({
  chartData,
  chartCategories,
  agendamentosStats,
  isLoading,
}: DashboardChartsSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartSkeleton />
        <Card className="glass border-primary/10">
          <CardHeader className="border-b border-primary/10">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <StatusCardSkeleton />
            <StatusCardSkeleton />
            <StatusCardSkeleton />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Gráfico de Mensagens */}
      <div className="rounded-xl border border-border bg-card motion-safe:animate-slide-in">
        <AreaChart
          title="Mensagens - Últimos 7 dias"
          data={chartData}
          categories={chartCategories}
          height={350}
        />
      </div>

      {/* Status dos Agendamentos */}
      <Card className="border-border bg-card motion-safe:animate-slide-in card-hover">
        <CardHeader className="border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Status dos Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6">
          <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 motion-safe:hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              <div>
                <p className="font-semibold text-sm sm:text-base text-green-900">Concluídos</p>
                <p className="text-xs sm:text-sm text-green-700">Total geral</p>
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-green-600">
              {agendamentosStats?.concluidos || 0}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 motion-safe:hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <div>
                <p className="font-semibold text-sm sm:text-base text-blue-900">Pendentes</p>
                <p className="text-xs sm:text-sm text-blue-700">Aguardando</p>
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-blue-600">
              {agendamentosStats?.pendentes || 0}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200 motion-safe:hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 sm:gap-3">
              <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              <div>
                <p className="font-semibold text-sm sm:text-base text-red-900">Com Erro</p>
                <p className="text-xs sm:text-sm text-red-700">Atenção</p>
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-red-600">
              {agendamentosStats?.comErro || 0}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
