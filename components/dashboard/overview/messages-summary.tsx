import { TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardMessagesSummaryProps {
  mensagensStats: any
  isLoading?: boolean
}

export function DashboardMessagesSummary({ mensagensStats, isLoading }: DashboardMessagesSummaryProps) {
  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-transparent to-accent/5 motion-safe:animate-slide-in card-hover">
      <CardContent className="p-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
          </div>
          <div className="flex-1 w-full">
            <h3 className="font-bold text-base sm:text-xl gradient-text mb-3 sm:mb-4">
              Resumo de Mensagens
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              {isLoading ? (
                <>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-7 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-7 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-7 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-7 w-16 mx-auto mb-1" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                    <p className="text-lg sm:text-2xl font-bold text-primary">{mensagensStats?.totalGeral || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Geral</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                    <p className="text-lg sm:text-2xl font-bold text-green-600">{mensagensStats?.totalSemana || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Esta Semana</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">{mensagensStats?.fila?.pendentes || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Na Fila</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/50">
                    <p className="text-lg sm:text-2xl font-bold text-purple-600">{mensagensStats?.taxaEntrega || 100}%</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Taxa Entrega</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
