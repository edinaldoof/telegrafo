import { ReactNode, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
    period: string
  }
  description?: string
  className?: string
}

function MetricCardComponent({
  title,
  value,
  icon,
  trend,
  description,
  className = '',
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend.isPositive ? (
              <ArrowUpIcon className="h-3 w-3 text-green-600" />
            ) : (
              <ArrowDownIcon className="h-3 w-3 text-red-600" />
            )}
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">{trend.period}</span>
          </p>
        )}
        {description && !trend && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export const MetricCard = memo(MetricCardComponent)
