import { DollarSign, CircleDot, Circle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardHeaderProps {
  twilioSaldo: any
  instancesStats: any
  onRefresh?: () => void
  isRefreshing?: boolean
  isLoading?: boolean
}

export function DashboardHeader({
  twilioSaldo,
  instancesStats,
  onRefresh,
  isRefreshing,
  isLoading
}: DashboardHeaderProps) {
  return (
    <div className="relative">
      <div className="rounded-2xl p-4 sm:p-6 lg:p-8 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 border border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold gradient-text">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1 sm:mt-2">
              Visão geral do sistema Telegrafo
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            {/* Status da Conexão e Saldo - Visível em todos os tamanhos */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Saldo Twilio */}
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : twilioSaldo?.saldo?.balance ? (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm">
                  <DollarSign className="h-3 w-3" />
                  <span className="hidden xs:inline">{twilioSaldo.saldo.currency}</span> {parseFloat(twilioSaldo.saldo.balance).toFixed(2)}
                </Badge>
              ) : null}

              {/* Conexões */}
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : instancesStats?.conectadas > 0 ? (
                <Badge variant="success" className="flex items-center gap-1 text-xs sm:text-sm">
                  <CircleDot className="h-3 w-3" />
                  <span className="hidden sm:inline">{instancesStats.conectadas} conectada{instancesStats.conectadas > 1 ? 's' : ''}</span>
                  <span className="sm:hidden">{instancesStats.conectadas}</span>
                </Badge>
              ) : (
                <Badge variant="warning" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Circle className="h-3 w-3" />
                  <span className="hidden sm:inline">Nenhuma conexão</span>
                  <span className="sm:hidden">Offline</span>
                </Badge>
              )}
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className={`hover:bg-primary/10 transition-all p-2 ${isRefreshing ? 'motion-safe:animate-spin' : ''}`}
                title="Atualizar dados"
              >
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}