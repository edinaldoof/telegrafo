'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Upload, Download, Loader2, Pencil, Trash2, X, Filter, Tags, FileText, RefreshCw, GraduationCap, CheckCircle, Clock, UserPlus } from 'lucide-react'
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
  const [isSGEDialogOpen, setIsSGEDialogOpen] = useState(false)
  const [editingContato, setEditingContato] = useState<Contato | null>(null)
  const [filtroTag, setFiltroTag] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [selectedSGEIds, setSelectedSGEIds] = useState<number[]>([])
  const [sgePage, setSGEPage] = useState(1)
  const [isBatchTagDialogOpen, setIsBatchTagDialogOpen] = useState(false)
  const [batchTagId, setBatchTagId] = useState<string>('')
  const [batchQuantidade, setBatchQuantidade] = useState<string>('100')

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    numeroWhatsapp: '',
    email: '',
    empresa: '',
  })

  // Buscar estatísticas SGE
  const { data: sgeStats } = useQuery({
    queryKey: ['sge-stats'],
    queryFn: async () => {
      const res = await fetch('/api/sge/stats')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 60000, // 1 minuto
  })

  // Buscar inscrições SGE (apenas quando dialog está aberto)
  const { data: sgeData, isLoading: sgeLoading, refetch: refetchSGE } = useQuery({
    queryKey: ['sge-inscricoes', sgePage],
    queryFn: async () => {
      const res = await fetch(`/api/sge/inscricoes?page=${sgePage}&limit=20&apenasNaoImportados=true`)
      if (!res.ok) return { data: [], total: 0, totalPages: 0 }
      return res.json()
    },
    enabled: isSGEDialogOpen,
  })

  // Mutation para sincronizar SGE
  const sincronizarSGEMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sge/sincronizar', { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro na sincronização')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`SGE sincronizado: ${data.novos} novos, ${data.atualizados} atualizados`)
      queryClient.invalidateQueries({ queryKey: ['sge-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sge-inscricoes'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na sincronização')
    },
  })

  // Mutation para importar inscrições SGE como contatos
  const importarSGEMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch('/api/sge/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscricaoIds: ids }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro na importação')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Importado: ${data.importados} novos, ${data.jaExistentes} já existiam`)
      setSelectedSGEIds([])
      queryClient.invalidateQueries({ queryKey: ['contatos'] })
      queryClient.invalidateQueries({ queryKey: ['sge-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sge-inscricoes'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na importação')
    },
  })

  // Mutation para importar TODOS os pendentes de uma vez
  const importarTodosSGEMutation = useMutation({
    mutationFn: async () => {
      // Buscar todos os IDs pendentes em múltiplas páginas (API limita a 100 por página)
      const todosIds: number[] = []
      let page = 1
      let totalPages = 1

      // Buscar todas as páginas
      while (page <= totalPages) {
        const res = await fetch(`/api/sge/inscricoes?page=${page}&limit=100&apenasNaoImportados=true`)
        if (!res.ok) throw new Error('Erro ao buscar inscrições')
        const data = await res.json()

        const ids = data.data?.map((i: any) => i.id) || []
        todosIds.push(...ids)

        totalPages = data.totalPages || 1
        page++
      }

      if (todosIds.length === 0) {
        throw new Error('Nenhuma inscrição pendente')
      }

      // Importar em lotes de 500 para não sobrecarregar
      const BATCH_SIZE = 500
      let totalImportados = 0
      let totalJaExistentes = 0
      let totalErros = 0

      for (let i = 0; i < todosIds.length; i += BATCH_SIZE) {
        const batch = todosIds.slice(i, i + BATCH_SIZE)
        const importRes = await fetch('/api/sge/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inscricaoIds: batch }),
        })

        if (importRes.ok) {
          const result = await importRes.json()
          totalImportados += result.importados || 0
          totalJaExistentes += result.jaExistentes || 0
          totalErros += result.erros || 0
        }
      }

      return { importados: totalImportados, jaExistentes: totalJaExistentes, erros: totalErros, total: todosIds.length }
    },
    onSuccess: (data) => {
      toast.success(`Importacao em massa concluida: ${data.importados} novos, ${data.jaExistentes} ja existiam`)
      queryClient.invalidateQueries({ queryKey: ['contatos'] })
      queryClient.invalidateQueries({ queryKey: ['sge-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sge-inscricoes'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro na importação em massa')
    },
  })

  // Buscar contagem de contatos sem tag
  const { data: semTagData } = useQuery({
    queryKey: ['contatos-sem-tag'],
    queryFn: async () => {
      const res = await fetch('/api/tags/adicionar-lote')
      if (!res.ok) return { totalSemTag: 0 }
      return res.json()
    },
  })

  const totalSemTag: number = semTagData?.totalSemTag || 0

  // Mutation para adicionar em lote por tag
  const batchAddTagMutation = useMutation({
    mutationFn: async ({ tagId, quantidade }: { tagId: number; quantidade: number }) => {
      const res = await fetch('/api/tags/adicionar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId, quantidade }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao adicionar contatos')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || `${data.adicionados} contatos adicionados!`)
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['contatos'] })
      queryClient.invalidateQueries({ queryKey: ['contatos-sem-tag'] })
      setIsBatchTagDialogOpen(false)
      setBatchTagId('')
      setBatchQuantidade('100')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar contatos em lote')
    },
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
      const res = await fetch('/api/contatos?limit=5000')
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
          {filtroTag === 'sem-tag' && totalSemTag > 0 && (
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                setBatchQuantidade(String(totalSemTag))
                setIsBatchTagDialogOpen(true)
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar a Tag ({totalSemTag})
            </Button>
          )}
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
            onClick={() => setIsSGEDialogOpen(true)}
          >
            <GraduationCap className="mr-2 h-4 w-4" />
            Importar SGE
            {sgeStats?.naoImportados > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {sgeStats.naoImportados}
              </Badge>
            )}
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Sem Tag</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{totalSemTag}</CardTitle>
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
                                  variant="secondary"
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

      {/* Dialog para Importar SGE */}
      <Dialog open={isSGEDialogOpen} onOpenChange={setIsSGEDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Importar Inscricoes SGE
            </DialogTitle>
            <DialogDescription>
              Sincronize e importe inscricoes do Sistema de Gestao Educacional como contatos
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Total SGE</p>
                  <p className="text-2xl font-bold">{sgeStats?.total || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Importados</p>
                  <p className="text-2xl font-bold text-green-600">{sgeStats?.importados || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-orange-600">{sgeStats?.naoImportados || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Sincronizar */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Sincronizar com API SGE</p>
                <p className="text-xs text-muted-foreground">
                  Ultima: {sgeStats?.ultimaSincronizacao
                    ? new Date(sgeStats.ultimaSincronizacao).toLocaleString('pt-BR')
                    : 'Nunca'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => sincronizarSGEMutation.mutate()}
                disabled={sincronizarSGEMutation.isPending}
              >
                {sincronizarSGEMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar
                  </>
                )}
              </Button>
            </div>

            {/* Importar Todos de uma vez */}
            {sgeStats?.naoImportados > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">Importar Todos os Pendentes</p>
                  <p className="text-xs text-green-600">
                    Importa todas as {sgeStats.naoImportados} inscricoes de uma vez
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (confirm(`Deseja importar todas as ${sgeStats.naoImportados} inscricoes pendentes como contatos?`)) {
                      importarTodosSGEMutation.mutate()
                    }
                  }}
                  disabled={importarTodosSGEMutation.isPending}
                >
                  {importarTodosSGEMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Importar Todos ({sgeStats.naoImportados})
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Lista de inscrições pendentes */}
            {sgeLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Carregando inscricoes...</p>
              </div>
            ) : sgeData?.data?.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="font-medium">Todas as inscricoes ja foram importadas!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em Sincronizar para buscar novas inscricoes
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {sgeData?.total || 0} inscricoes pendentes
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const allIds = sgeData?.data?.map((i: any) => i.id) || []
                      setSelectedSGEIds(prev =>
                        prev.length === allIds.length ? [] : allIds
                      )
                    }}
                  >
                    {selectedSGEIds.length === sgeData?.data?.length
                      ? 'Desmarcar todos'
                      : 'Selecionar todos'}
                  </Button>
                </div>

                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="hidden sm:table-cell">Curso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sgeData?.data?.map((inscricao: any) => (
                        <TableRow key={inscricao.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedSGEIds.includes(inscricao.id)}
                              onChange={() => {
                                setSelectedSGEIds(prev =>
                                  prev.includes(inscricao.id)
                                    ? prev.filter(id => id !== inscricao.id)
                                    : [...prev, inscricao.id]
                                )
                              }}
                              className="w-4 h-4"
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{inscricao.nomeCompleto}</p>
                            <p className="text-xs text-muted-foreground">{inscricao.municipio}</p>
                          </TableCell>
                          <TableCell className="text-sm">{inscricao.telefone}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground truncate max-w-[150px]">
                            {inscricao.cursoNome || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {sgeData?.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Pagina {sgePage} de {sgeData.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSGEPage(p => Math.max(1, p - 1))}
                        disabled={sgePage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSGEPage(p => p + 1)}
                        disabled={sgePage >= sgeData.totalPages}
                      >
                        Proximo
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => setIsSGEDialogOpen(false)}>
              Fechar
            </Button>
            {selectedSGEIds.length > 0 && (
              <Button
                onClick={() => importarSGEMutation.mutate(selectedSGEIds)}
                disabled={importarSGEMutation.isPending}
              >
                {importarSGEMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Importar {selectedSGEIds.length} Contatos
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Adicionar Contatos em Lote a uma Tag */}
      <Dialog open={isBatchTagDialogOpen} onOpenChange={setIsBatchTagDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Adicionar Contatos a uma Tag
            </DialogTitle>
            <DialogDescription>
              Selecione uma categoria e a quantidade de contatos sem tag para adicionar
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Contatos disponíveis sem categoria</p>
              <p className="text-2xl font-bold">{totalSemTag}</p>
            </div>

            <div className="grid gap-2">
              <Label>Categoria destino</Label>
              <Select value={batchTagId} onValueChange={setBatchTagId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="batch-qtd">Quantidade</Label>
              <Input
                id="batch-qtd"
                type="number"
                min={1}
                max={Math.min(totalSemTag, 10000)}
                value={batchQuantidade}
                onChange={(e) => setBatchQuantidade(e.target.value)}
                placeholder="Ex: 200"
              />
              <p className="text-xs text-muted-foreground">
                Os contatos mais antigos (sem categoria) serão adicionados primeiro
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsBatchTagDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const tagId = parseInt(batchTagId)
                const quantidade = parseInt(batchQuantidade)
                if (!tagId) {
                  toast.error('Selecione uma categoria')
                  return
                }
                if (!quantidade || quantidade < 1) {
                  toast.error('Informe uma quantidade válida')
                  return
                }
                batchAddTagMutation.mutate({ tagId, quantidade })
              }}
              disabled={batchAddTagMutation.isPending || !batchTagId || !batchQuantidade}
            >
              {batchAddTagMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar {batchQuantidade || 0} contatos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
