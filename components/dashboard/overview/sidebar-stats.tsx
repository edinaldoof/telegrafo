import { Wallet, Smartphone, Zap, Send, Calendar, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardSidebarStatsProps {
  twilioSaldo: any
  instancesStats: any
  isLoading?: boolean
}

export function DashboardSidebarStats({ twilioSaldo, instancesStats, isLoading }: DashboardSidebarStatsProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Saldo Twilio API */}
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent motion-safe:animate-slide-in">
        <CardHeader className="border-b border-green-500/10 pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700 text-base sm:text-lg">
            <Wallet className="h-5 w-5" />
            Saldo Twilio API
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-center space-y-2">
              <Skeleton className="h-9 w-32 mx-auto" />
              <Skeleton className="h-3 w-40 mx-auto" />
            </div>
          ) : twilioSaldo?.saldo?.balance ? (
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                {twilioSaldo.saldo.currency} {parseFloat(twilioSaldo.saldo.balance).toFixed(2)}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Atualizado automaticamente
              </p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Carregando saldo...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status das Instâncias */}
      <Card className="border-border bg-card motion-safe:animate-slide-in">
        <CardHeader className="border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Smartphone className="h-5 w-5 text-primary" />
            Instâncias WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 sm:space-y-3">
          {isLoading ? (
            <>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-8" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Total</span>
                <Badge variant="secondary">{instancesStats?.total || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Conectadas
                </span>
                <Badge variant="success">{instancesStats?.conectadas || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                  Aguardando QR
                </span>
                <Badge variant="warning">{instancesStats?.aguardandoQr || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                  Desconectadas
                </span>
                <Badge variant="secondary">{instancesStats?.desconectadas || 0}</Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <Card className="border-border bg-card motion-safe:animate-slide-in">
        <CardHeader className="border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 pt-4">
          <a
            href="/enviar"
            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border border-primary/20 hover:border-primary/40 transition-all group"
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <p className="font-semibold text-xs sm:text-sm">Enviar Mensagem</p>
          </a>

          <a
            href="/agendamentos"
            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-blue-500/10 hover:from-blue-500/10 hover:to-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 transition-all group"
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </div>
            <p className="font-semibold text-xs sm:text-sm">Agendamentos</p>
          </a>

          <a
            href="/contatos"
            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-r from-purple-500/5 to-purple-500/10 hover:from-purple-500/10 hover:to-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
            </div>
            <p className="font-semibold text-xs sm:text-sm">Contatos</p>
          </a>

          <a
            href="/instances"
            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-r from-green-500/5 to-green-500/10 hover:from-green-500/10 hover:to-green-500/20 border border-green-500/20 hover:border-green-500/40 transition-all group"
          >
            <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
              <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
            </div>
            <p className="font-semibold text-xs sm:text-sm">Instâncias</p>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
