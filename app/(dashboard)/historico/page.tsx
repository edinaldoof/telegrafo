'use client'

import { useQuery } from '@tanstack/react-query'
import { History, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function formatarConteudo(conteudo: string | null): { mensagem: string; destinatario: string | null } {
  if (!conteudo) return { mensagem: '-', destinatario: null }

  let mensagem = conteudo
  let destinatario: string | null = null

  // Remove prefixo [Twilio:...] ou [Evolution:...] (formato antigo)
  mensagem = mensagem.replace(/^\[(?:Twilio|Evolution):[^\]]+\]\s*/i, '')

  // Formato novo: "mensagem | Destinatario: numero"
  const pipeMatch = mensagem.match(/^(.+?)\s*\|\s*Destinat[aá]rio:\s*(\d+)/i)
  if (pipeMatch) {
    mensagem = pipeMatch[1]
    destinatario = pipeMatch[2]
  } else {
    // Formato antigo: "mensagem\n\nDestinatario: numero"
    const destinatarioMatch = mensagem.match(/\s*Destinat[aá]rio:\s*(\d+)\s*$/i)
    if (destinatarioMatch) {
      destinatario = destinatarioMatch[1]
      mensagem = mensagem.replace(/\s*Destinat[aá]rio:\s*\d+\s*$/i, '')
    }
  }

  // Remove parte de erro se houver
  mensagem = mensagem.replace(/\s*\|\s*Erro:.*$/i, '')

  return { mensagem: mensagem.trim() || '-', destinatario }
}

function formatarTelefone(numero: string | null): string {
  if (!numero) return '-'
  if (numero.length >= 12) {
    const ddi = numero.slice(0, 2)
    const ddd = numero.slice(2, 4)
    const parte1 = numero.slice(4, -4)
    const parte2 = numero.slice(-4)
    return `+${ddi} (${ddd}) ${parte1}-${parte2}`
  }
  return numero
}

export default function HistoricoPage() {
  const { data: mensagens, isLoading } = useQuery({
    queryKey: ['mensagens-historico'],
    queryFn: async () => {
      const res = await fetch('/api/mensagens/historico')
      if (!res.ok) return []
      const data = await res.json()
      // API retorna { mensagens: [...] }
      return Array.isArray(data?.mensagens) ? data.mensagens : []
    },
  })

  const getStatusBadge = (status: string) => {
    const variants = {
      concluido: { variant: 'success' as const, icon: CheckCircle2, label: 'Concluído' },
      enviando: { variant: 'info' as const, icon: Clock, label: 'Enviando' },
      erro: { variant: 'destructive' as const, icon: XCircle, label: 'Erro' },
      pendente: { variant: 'warning' as const, icon: Clock, label: 'Pendente' },
    }

    const config = variants[status as keyof typeof variants] || variants.pendente
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Histórico de Envios</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Acompanhe todas as mensagens enviadas pelo sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Enviadas</CardDescription>
            <CardTitle className="text-2xl">
              {(Array.isArray(mensagens) ? mensagens.length : 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Concluídas</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {(Array.isArray(mensagens) ? mensagens.filter((m: any) => m.status === 'concluido').length : 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Pendentes</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {(Array.isArray(mensagens) ? mensagens.filter((m: any) => m.status === 'pendente' || m.status === 'enviando').length : 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Com Erro</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {(Array.isArray(mensagens) ? mensagens.filter((m: any) => m.status === 'erro').length : 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Mensagens Enviadas</CardTitle>
          <CardDescription>
            Histórico completo de todas as mensagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : !Array.isArray(mensagens) || mensagens.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhuma mensagem enviada ainda</p>
              <p className="text-sm text-muted-foreground mt-2">
                Quando você enviar mensagens, elas aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead className="hidden sm:table-cell">Destinatário</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(mensagens) ? mensagens : []).map((mensagem: any) => {
                    const { mensagem: conteudoFormatado, destinatario } = formatarConteudo(mensagem.conteudo)
                    return (
                      <TableRow key={mensagem.id}>
                        <TableCell>
                          <Badge variant="outline">{mensagem.tipo}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="line-clamp-2">{conteudoFormatado}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm font-mono">{formatarTelefone(destinatario)}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell whitespace-nowrap">
                          {new Date(mensagem.enviadoEm).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{getStatusBadge(mensagem.status)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
