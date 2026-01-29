import { Clock, Activity, AlertCircle, Send, UserPlus, Users, Calendar, RefreshCw, Smartphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

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

interface DashboardRecentActivityProps {
  atividadesData: any
  isLoading?: boolean
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/30">
      <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  )
}

export function DashboardRecentActivity({ atividadesData, isLoading }: DashboardRecentActivityProps) {
  return (
    <Card className="lg:col-span-2 border-border bg-card motion-safe:animate-slide-in">
      <CardHeader className="border-b border-primary/10">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Atividades Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 sm:pt-6">
        <div className="space-y-3 sm:space-y-4">
          {isLoading ? (
            <>
              <ActivitySkeleton />
              <ActivitySkeleton />
              <ActivitySkeleton />
              <ActivitySkeleton />
            </>
          ) : atividadesData?.atividades?.length > 0 ? (
            atividadesData.atividades.map((atividade: any, index: number) => {
              const Icon = iconeMap[atividade.icone] || Activity
              return (
                <div
                  key={atividade.id}
                  className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all motion-safe:hover:scale-[1.01] motion-safe:animate-slide-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${atividade.cor}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs sm:text-sm font-medium leading-tight line-clamp-2">
                      {atividade.descricao}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {atividade.tempoRelativo}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50 motion-safe:animate-pulse" />
              <p className="text-sm">Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
