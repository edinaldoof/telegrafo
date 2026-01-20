'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Upload, Download, Loader2, Pencil, Trash2, X, Filter, Tags, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useState, useRef } from 'react'

interface Tag {
  id: number
  nome: string
  cor: string | null
  totalContatos?: number
}

interface Contato {
  id: number
  nome: string
  nomeContato?: string
  numeroWhatsapp: string
  email?: string
  empresa?: string
  ativo: boolean
  tags?: string[] | Array<{ tag: { id: number; nome: string; cor?: string } }>
}

export default function ContatosPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContato, setEditingContato] = useState<Contato | null>(null)
  const [filtroTag, setFiltroTag] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    numeroWhatsapp: '',
    email: '',
    empresa: '',
  })

  // Buscar tags disponíveis
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags')
      if (!res.ok) return { tags: [] }
      return res.json()
    },
  })

  const tagsDisponiveis: Tag[] = tagsData?.tags || []

  const { data: contatosData, isLoading } = useQuery({
    queryKey: ['contatos'],
    queryFn: async () => {
      const res = await fetch('/api/contatos')
      if (!res.ok) {
        const error = await res.json()
        console.error('Erro ao carregar contatos:', error)
        return { contatos: [] }
      }
      return res.json()
    },
  })

  const contatosRaw = contatosData?.data || contatosData?.contatos || contatosData || []

  // Filtrar contatos por tag
  const contatos = Array.isArray(contatosRaw)
    ? contatosRaw.filter((contato: any) => {
        if (filtroTag === 'all') return true
        if (filtroTag === 'sem-tag') {
          const tags = contato.tags || []
          return tags.length === 0
        }
        // Filtrar por tag específica
        const tags = contato.tags || []
        const tagId = parseInt(filtroTag)
        // tags pode ser array de strings ou array de objetos
        if (tags.length > 0 && typeof tags[0] === 'string') {
          const tagNome = tagsDisponiveis.find((t) => t.id === tagId)?.nome
          return tagNome && tags.includes(tagNome)
        }
        return tags.some((t: any) => t.tag?.id === tagId || t.id === tagId)
      })
    : []

  // Helper para obter tags de um contato (normaliza formato)
  const getContatoTags = (contato: any): Array<{ id?: number; nome: string; cor?: string }> => {
    const tags = contato.tags || []
    if (tags.length === 0) return []
    if (typeof tags[0] === 'string') {
      // tags é array de strings (ex: ["vip", "cliente"])
      return tags.map((nome: string) => {
        const tagInfo = tagsDisponiveis.find((t) => t.nome === nome)
        return { id: tagInfo?.id, nome, cor: tagInfo?.cor || null }
      })
    }
    // tags é array de objetos
    return tags.map((t: any) => ({
      id: t.tag?.id || t.id,
      nome: t.tag?.nome || t.nome,
      cor: t.tag?.cor || t.cor,
    }))
  }

  // Mutation para criar/editar contato
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { tagsToAssign: number[] }) => {
      const url = editingContato
        ? `/api/contatos/${editingContato.id}`
        : '/api/contatos'

      const res = await fetch(url, {
        method: editingContato ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeContato: data.nome,
          numeroWhatsapp: data.numeroWhatsapp,
          email: data.email || undefined,
          empresa: data.empresa || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao salvar contato')
      }

      const result = await res.json()
      const contatoId = result.contato?.id || editingContato?.id

      // Gerenciar tags se houver contato ID
      if (contatoId && data.tagsToAssign.length > 0) {
        // Adicionar tags selecionadas
        for (const tagId of data.tagsToAssign) {
          await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contatoIds: [contatoId], tagId }),
          })
        }
      }

      // Se editando, remover tags que não estão mais selecionadas
      if (editingContato && contatoId) {
        const currentTags = getContatoTags(editingContato)
        const currentTagIds = currentTags.filter((t) => t.id).map((t) => t.id!)
        const tagsToRemove = currentTagIds.filter((id) => !data.tagsToAssign.includes(id))

        for (const tagId of tagsToRemove) {
          await fetch(`/api/tags?tagId=${tagId}&contatoId=${contatoId}`, {
            method: 'DELETE',
          })
        }
      }

      return result
    },
    onSuccess: () => {
      toast.success(editingContato ? 'Contato atualizado!' : 'Contato criado!')
      queryClient.invalidateQueries({ queryKey: ['contatos'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      handleCloseDialog()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar contato')
    },
  })

  // Mutation para deletar contato
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/contatos/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao deletar contato')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Contato removido!')
      queryClient.invalidateQueries({ queryKey: ['contatos'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao deletar contato')
    },
  })

  const handleOpenDialog = (contato?: Contato) => {
    if (contato) {
      setEditingContato(contato)
      setFormData({
        nome: contato.nome || contato.nomeContato || '',
        numeroWhatsapp: contato.numeroWhatsapp || '',
        email: contato.email || '',
        empresa: contato.empresa || '',
      })
      // Carregar tags do contato
      const contatoTags = getContatoTags(contato)
      setSelectedTags(contatoTags.filter((t) => t.id).map((t) => t.id!))
    } else {
      setEditingContato(null)
      setFormData({
        nome: '',
        numeroWhatsapp: '',
        email: '',
        empresa: '',
      })
      setSelectedTags([])
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingContato(null)
    setFormData({
      nome: '',
      numeroWhatsapp: '',
      email: '',
      empresa: '',
    })
    setSelectedTags([])
  }

  const toggleSelectedTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.numeroWhatsapp.trim()) {
      toast.error('Número de WhatsApp é obrigatório')
      return
    }

    saveMutation.mutate({ ...formData, tagsToAssign: selectedTags })
  }

  const handleDelete = (contato: Contato) => {
    if (confirm(`Deseja realmente excluir o contato "${contato.nome || contato.numeroWhatsapp}"?`)) {
      deleteMutation.mutate(contato.id)
    }
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/contatos/import-csv', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao importar')
      }

      const result = await res.json()

      if (result.erros > 0) {
        toast.warning(
          `Importacao: ${result.importados} novos, ${result.atualizados || 0} atualizados, ${result.erros} erros`
        )
      } else {
        const msg = result.atualizados
          ? `${result.importados} novos, ${result.atualizados} atualizados`
          : `${result.importados} contatos importados`
        toast.success(msg)
      }

      queryClient.invalidateQueries({ queryKey: ['contatos'] })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar CSV')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadInstrucoesPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 20

    // Título
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('TELEGRAFO', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Guia de Importacao de Contatos', pageWidth / 2, y, { align: 'center' })
    y += 20

    // Linha divisória
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 15

    // Formatos aceitos
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('FORMATOS ACEITOS', margin, y)
    y += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('- Arquivos CSV (.csv)', margin + 5, y)
    y += 6
    doc.text('- Arquivos Excel (.xlsx, .xls)', margin + 5, y)
    y += 15

    // Colunas
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('COLUNAS DA PLANILHA', margin, y)
    y += 10

    const colunas = [
      { nome: 'nome', desc: 'Nome do contato (opcional)', alt: 'name, nome_contato, fullname' },
      { nome: 'telefone', desc: 'Numero WhatsApp (OBRIGATORIO)', alt: 'phone, celular, whatsapp, number, mobile' },
      { nome: 'email', desc: 'Email do contato (opcional)', alt: 'e-mail, mail' },
      { nome: 'empresa', desc: 'Nome da empresa (opcional)', alt: 'company, organization' },
      { nome: 'tags', desc: 'Categorias separadas por | (opcional)', alt: 'categorias, labels' },
    ]

    doc.setFontSize(10)
    for (const col of colunas) {
      doc.setFont('helvetica', 'bold')
      doc.text(`${col.nome.toUpperCase()}`, margin + 5, y)
      doc.setFont('helvetica', 'normal')
      y += 5
      doc.text(`  ${col.desc}`, margin + 5, y)
      y += 5
      doc.setTextColor(100)
      doc.text(`  Alternativas: ${col.alt}`, margin + 5, y)
      doc.setTextColor(0)
      y += 8
    }
    y += 5

    // Formato do telefone
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('FORMATO DO TELEFONE', margin, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('O sistema aceita varios formatos e normaliza automaticamente:', margin + 5, y)
    y += 6
    doc.text('- 11999999999 -> adiciona 55 (Brasil)', margin + 10, y)
    y += 5
    doc.text('- 5511999999999 -> usa como esta', margin + 10, y)
    y += 5
    doc.text('- (11) 99999-9999 -> remove caracteres especiais', margin + 10, y)
    y += 5
    doc.text('- +55 11 99999-9999 -> remove + e espacos', margin + 10, y)
    y += 12

    // Tags
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('USANDO TAGS/CATEGORIAS', margin, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('- Separe multiplas tags com | (pipe)', margin + 5, y)
    y += 5
    doc.text('- Exemplo: vip|cliente|premium', margin + 5, y)
    y += 5
    doc.text('- Tags sao criadas automaticamente se nao existirem', margin + 5, y)
    y += 12

    // Exemplo CSV
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('EXEMPLO DE ARQUIVO CSV', margin, y)
    y += 8
    doc.setFontSize(9)
    doc.setFont('courier', 'normal')
    doc.text('nome,telefone,email,empresa,tags', margin + 5, y)
    y += 5
    doc.text('Joao Silva,5511999999999,joao@email.com,Empresa ABC,vip|cliente', margin + 5, y)
    y += 5
    doc.text('Maria Santos,11988888888,maria@email.com,Tech Corp,premium', margin + 5, y)
    y += 5
    doc.text('Pedro Costa,(21) 97777-7777,,Startup XYZ,lead|novo', margin + 5, y)
    y += 12

    // Exemplo Excel
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('EXEMPLO DE PLANILHA EXCEL', margin, y)
    y += 8
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Desenhar tabela simples
    const tableX = margin + 5
    const colWidths = [35, 40, 45, 35, 30]
    const headers = ['Nome', 'Telefone', 'Email', 'Empresa', 'Tags']
    const rows = [
      ['Joao Silva', '5511999999999', 'joao@email.com', 'Empresa ABC', 'vip|cliente'],
      ['Maria Santos', '11988888888', 'maria@email.com', 'Tech Corp', 'premium'],
    ]

    // Header da tabela
    let tableX2 = tableX
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(tableX, y - 4, colWidths.reduce((a, b) => a + b, 0), 7, 'F')
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], tableX2 + 2, y)
      tableX2 += colWidths[i]
    }
    y += 7

    // Linhas da tabela
    doc.setFont('helvetica', 'normal')
    for (const row of rows) {
      tableX2 = tableX
      for (let i = 0; i < row.length; i++) {
        doc.text(row[i].substring(0, 15), tableX2 + 2, y)
        tableX2 += colWidths[i]
      }
      y += 6
    }
    y += 10

    // Dicas
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('DICAS IMPORTANTES', margin, y)
    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('- Contatos duplicados (mesmo telefone) sao ATUALIZADOS', margin + 5, y)
    y += 5
    doc.text('- O sistema mostra quantos foram importados e atualizados', margin + 5, y)
    y += 5
    doc.text('- Linhas com erro sao ignoradas (o resto e importado)', margin + 5, y)
    y += 5
    doc.text('- Em CSV, linhas comecando com # sao ignoradas (comentarios)', margin + 5, y)

    // Rodapé
    y = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text('Telegrafo - Sistema de Automacao WhatsApp', pageWidth / 2, y, { align: 'center' })

    // Salvar PDF
    doc.save('instrucoes-importacao-telegrafo.pdf')
  }

  const downloadTemplateXLSX = async () => {
    // Importar xlsx dinamicamente
    const XLSX = await import('xlsx')

    const data = [
      { nome: 'Joao Silva', telefone: '5511999999999', email: 'joao@email.com', empresa: 'Empresa ABC', tags: 'vip|cliente' },
      { nome: 'Maria Santos', telefone: '11988888888', email: 'maria@email.com', empresa: 'Tech Corp', tags: 'premium|ativo' },
      { nome: 'Pedro Costa', telefone: '21977777777', email: '', empresa: 'Startup XYZ', tags: 'lead|novo' },
      { nome: 'Ana Oliveira', telefone: '31966666666', email: 'ana@empresa.com', empresa: '', tags: 'cliente' },
    ]

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos')

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 20 }, // nome
      { wch: 18 }, // telefone
      { wch: 25 }, // email
      { wch: 20 }, // empresa
      { wch: 20 }, // tags
    ]

    XLSX.writeFile(wb, 'template-contatos-telegrafo.xlsx')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Contatos</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Gerencie sua lista de contatos para envio de mensagens
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImportCSV}
            className="hidden"
          />
          {/* Filtro por Tag */}
          <Select value={filtroTag} onValueChange={setFiltroTag}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os contatos</SelectItem>
              <SelectItem value="sem-tag">Sem categoria</SelectItem>
              {tagsDisponiveis.map((tag) => (
                <SelectItem key={tag.id} value={String(tag.id)}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.cor || '#6B7280' }}
                    />
                    {tag.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={downloadInstrucoesPDF}
          >
            <FileText className="mr-2 h-4 w-4" />
            Instrucoes PDF
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={downloadTemplateXLSX}
          >
            <Download className="mr-2 h-4 w-4" />
            Template Excel
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </>
            )}
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total</CardDescription>
            <CardTitle className="text-2xl">{Array.isArray(contatos) ? contatos.length : 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Ativos</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {Array.isArray(contatos) ? contatos.filter((c: any) => c.ativo).length : 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Com Email</CardDescription>
            <CardTitle className="text-2xl">
              {Array.isArray(contatos) ? contatos.filter((c: any) => c.email).length : 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Com Tags</CardDescription>
            <CardTitle className="text-2xl">
              {Array.isArray(contatos) ? contatos.filter((c: any) => c.tags?.length > 0).length : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabela de Contatos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contatos</CardTitle>
          <CardDescription>
            {Array.isArray(contatos) ? contatos.length : 0} contatos no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Carregando...</p>
            </div>
          ) : !Array.isArray(contatos) || contatos.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum contato cadastrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Importe contatos via CSV ou adicione manualmente
              </p>
              <Button
                className="mt-4"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Contato
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Empresa</TableHead>
                    <TableHead className="hidden lg:table-cell">Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contatos.slice(0, 50).map((contato: any) => {
                    const contatoTags = getContatoTags(contato)
                    return (
                      <TableRow key={contato.id}>
                        <TableCell className="font-medium">
                          {contato.nome || contato.nomeContato || contato.numeroWhatsapp}
                        </TableCell>
                        <TableCell>{contato.numeroWhatsapp}</TableCell>
                        <TableCell className="hidden sm:table-cell">{contato.email || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">{contato.empresa || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {contatoTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {contatoTags.slice(0, 3).map((tag, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: tag.cor || '#6B7280',
                                    color: tag.cor || '#6B7280',
                                  }}
                                >
                                  {tag.nome}
                                </Badge>
                              ))}
                              {contatoTags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{contatoTags.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={contato.ativo ? 'success' : 'secondary'}>
                            {contato.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(contato)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(contato)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Adicionar/Editar Contato */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingContato ? 'Editar Contato' : 'Novo Contato'}
            </DialogTitle>
            <DialogDescription>
              {editingContato
                ? 'Atualize as informações do contato'
                : 'Preencha os dados do novo contato'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  placeholder="João Silva"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="numeroWhatsapp">
                  Número WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="numeroWhatsapp"
                  placeholder="5511999999999"
                  value={formData.numeroWhatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, numeroWhatsapp: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Formato: código do país + DDD + número (ex: 5511999999999)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  placeholder="Empresa XYZ"
                  value={formData.empresa}
                  onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                />
              </div>

              {/* Seletor de Tags */}
              {tagsDisponiveis.length > 0 && (
                <div className="grid gap-2">
                  <Label>Categorias</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                    {tagsDisponiveis.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                        className="cursor-pointer transition-all hover:scale-105"
                        style={
                          selectedTags.includes(tag.id)
                            ? { backgroundColor: tag.cor || '#3B82F6' }
                            : { borderColor: tag.cor || '#6B7280', color: tag.cor || '#6B7280' }
                        }
                        onClick={() => toggleSelectedTag(tag.id)}
                      >
                        {tag.nome}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique para selecionar/remover categorias
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseDialog}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  editingContato ? 'Atualizar' : 'Criar Contato'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
