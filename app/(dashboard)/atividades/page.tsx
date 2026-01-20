'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  LogIn,
  LogOut,
  Send,
  UserPlus,
  UserMinus,
  Users,
  Settings,
  Smartphone,
  FileText,
  Calendar,
  AlertCircle,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const TIPOS_EVENTO = [
  { value: '', label: 'Todos' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'mensagem_enviada', label: 'Mensagem Enviada' },
  { value: 'contato_adicionado', label: 'Contato Adicionado' },
  { value: 'contato_removido', label: 'Contato Removido' },
  { value: 'grupo_criado', label: 'Grupo Criado' },
  { value: 'grupo_deletado', label: 'Grupo Deletado' },
  { value: 'config_alterada', label: 'Configuração Alterada' },
  { value: 'instance_conectada', label: 'Instância Conectada' },
  { value: 'instance_desconectada', label: 'Instância Desconectada' },
  { value: 'erro', label: 'Erro' },
]

const iconeMap: Record<string, React.ReactNode> = {
  'log-in': <LogIn className="h-4 w-4" />,
  'log-out': <LogOut className="h-4 w-4" />,
  send: <Send className="h-4 w-4" />,
  'user-plus': <UserPlus className="h-4 w-4" />,
  'user-minus': <UserMinus className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  smartphone: <Smartphone className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  'alert-circle': <AlertCircle className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
}

export default function AtividadesPage() {
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [pagina, setPagina] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['atividades', filtroTipo, filtroUsuario, pagina],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (filtroUsuario) params.set('usuario', filtroUsuario)
      params.set('pagina', pagina.toString())
      params.set('limite', '20')

      const res = await fetch(`/api/atividades?${params}`)
      if (!res.ok) return { atividades: [], total: 0, totalPaginas: 0 }
      return res.json()
    },
  })

  const atividades = data?.atividades || []
  const totalPaginas = data?.totalPaginas || 1

  const getTipoBadge = (tipo: string) => {
    const cores: Record<string, string> = {
      login: 'bg-green-100 text-green-800',
      logout: 'bg-gray-100 text-gray-800',
      mensagem_enviada: 'bg-blue-100 text-blue-800',
      contato_adicionado: 'bg-cyan-100 text-cyan-800',
      contato_removido: 'bg-red-100 text-red-800',
      grupo_criado: 'bg-purple-100 text-purple-800',
      grupo_deletado: 'bg-red-100 text-red-800',
      config_alterada: 'bg-yellow-100 text-yellow-800',
      instance_conectada: 'bg-green-100 text-green-800',
      instance_desconectada: 'bg-red-100 text-red-800',
      erro: 'bg-red-100 text-red-800',
    }

    const labels: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      mensagem_enviada: 'Mensagem',
      contato_adicionado: 'Contato +',
      contato_removido: 'Contato -',
      grupo_criado: 'Grupo +',
      grupo_deletado: 'Grupo -',
      config_alterada: 'Config',
      instance_conectada: 'Conectou',
      instance_desconectada: 'Desconectou',
      erro: 'Erro',
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${cores[tipo] || 'bg-gray-100 text-gray-800'}`}>
        {labels[tipo] || tipo}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Atividades do Sistema</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Acompanhe todas as ações realizadas no sistema
          </p>
        </div>
        <Button onClick={() => refetch()} variant="secondary">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Tipo de Atividade</label>
              <select
                value={filtroTipo}
                onChange={(e) => {
                  setFiltroTipo(e.target.value)
                  setPagina(1)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TIPOS_EVENTO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Usuário</label>
              <Input
                placeholder="Filtrar por usuário..."
                value={filtroUsuario}
                onChange={(e) => {
                  setFiltroUsuario(e.target.value)
                  setPagina(1)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Atividades</CardTitle>
          <CardDescription>
            Total: {data?.total || 0} atividades registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : atividades.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhuma atividade encontrada</p>
              <p className="text-sm text-muted-foreground mt-2">
                As atividades do sistema aparecerão aqui
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="hidden md:table-cell">IP</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atividades.map((atividade: any) => (
                      <TableRow key={atividade.id}>
                        <TableCell>
                          <span className={atividade.cor}>
                            {iconeMap[atividade.icone] || <Activity className="h-4 w-4" />}
                          </span>
                        </TableCell>
                        <TableCell>{getTipoBadge(atividade.tipo)}</TableCell>
                        <TableCell className="max-w-xs">
                          <span className="line-clamp-2">{atividade.descricao}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{atividade.usuario || 'Sistema'}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">
                          {atividade.ip || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm">{atividade.tempoRelativo}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(atividade.criadoEm).toLocaleString('pt-BR')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagina === 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Página {pagina} de {totalPaginas}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
