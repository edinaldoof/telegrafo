import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

/**
 * Importação de contatos via CSV ou XLSX
 *
 * Formato esperado das colunas:
 * - nome (opcional): Nome do contato
 * - telefone (obrigatório): Número com código do país (5511999999999)
 * - email (opcional): Email do contato
 * - empresa (opcional): Nome da empresa
 * - tags (opcional): Categorias separadas por | (ex: vip|cliente)
 *
 * Colunas alternativas aceitas:
 * - name, nome, nome_contato, nomecontato -> nome
 * - phone, telefone, celular, whatsapp, numero, number -> telefone
 * - email, e-mail, mail -> email
 * - company, empresa, companhia -> empresa
 * - tags, categorias, labels -> tags
 */

// Mapeamento de colunas (normaliza diferentes nomes)
const COLUMN_MAPPINGS: Record<string, string> = {
  // Nome
  'nome': 'nome',
  'name': 'nome',
  'nome_contato': 'nome',
  'nomecontato': 'nome',
  'nome contato': 'nome',
  'full name': 'nome',
  'fullname': 'nome',

  // Telefone
  'telefone': 'telefone',
  'phone': 'telefone',
  'celular': 'telefone',
  'whatsapp': 'telefone',
  'numero': 'telefone',
  'number': 'telefone',
  'tel': 'telefone',
  'mobile': 'telefone',
  'phone number': 'telefone',
  'phonenumber': 'telefone',
  'numero whatsapp': 'telefone',
  'numerowhatsapp': 'telefone',

  // Email
  'email': 'email',
  'e-mail': 'email',
  'mail': 'email',
  'e_mail': 'email',
  'email address': 'email',

  // Empresa
  'empresa': 'empresa',
  'company': 'empresa',
  'companhia': 'empresa',
  'organization': 'empresa',
  'org': 'empresa',

  // Tags
  'tags': 'tags',
  'categorias': 'tags',
  'labels': 'tags',
  'categoria': 'tags',
  'tag': 'tags',
  'grupos': 'tags',
}

interface ParsedRow {
  nome?: string
  telefone?: string
  email?: string
  empresa?: string
  tags?: string[]
}

function normalizeColumnName(col: string): string {
  const normalized = col.toLowerCase().trim().replace(/[_\-\s]+/g, ' ')
  return COLUMN_MAPPINGS[normalized] || normalized
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))

  if (lines.length === 0) return []

  // Detectar separador (vírgula ou ponto-e-vírgula)
  const firstLine = lines[0]
  const separator = firstLine.includes(';') ? ';' : ','

  // Parse header
  const headerLine = lines[0]
  const headers = headerLine
    .split(separator)
    .map(h => normalizeColumnName(h.replace(/^["']|["']$/g, '').trim()))

  // Verificar se é realmente um header ou dados
  const isHeader = headers.some(h =>
    ['nome', 'telefone', 'email', 'empresa', 'tags'].includes(h)
  )

  const startIndex = isHeader ? 1 : 0
  const rows: ParsedRow[] = []

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line
      .split(separator)
      .map(v => v.trim().replace(/^["']|["']$/g, ''))

    const row: ParsedRow = {}

    if (isHeader) {
      // Usar headers para mapear
      headers.forEach((header, idx) => {
        const value = values[idx]?.trim()
        if (!value) return

        switch (header) {
          case 'nome':
            row.nome = value
            break
          case 'telefone':
            row.telefone = value
            break
          case 'email':
            row.email = value
            break
          case 'empresa':
            row.empresa = value
            break
          case 'tags':
            row.tags = value.split('|').map(t => t.trim()).filter(Boolean)
            break
        }
      })
    } else {
      // Sem header: assumir ordem padrão (nome, telefone, email, empresa, tags)
      row.nome = values[0]
      row.telefone = values[1]
      row.email = values[2]
      row.empresa = values[3]
      row.tags = values[4] ? values[4].split('|').map(t => t.trim()).filter(Boolean) : []
    }

    rows.push(row)
  }

  return rows
}

function parseXLSX(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Converter para JSON com headers
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false
  })

  if (rawData.length === 0) return []

  const rows: ParsedRow[] = []

  for (const rawRow of rawData) {
    const row: ParsedRow = {}

    for (const [key, value] of Object.entries(rawRow)) {
      const normalizedKey = normalizeColumnName(key)
      const strValue = String(value || '').trim()

      if (!strValue) continue

      switch (normalizedKey) {
        case 'nome':
          row.nome = strValue
          break
        case 'telefone':
          row.telefone = strValue
          break
        case 'email':
          row.email = strValue
          break
        case 'empresa':
          row.empresa = strValue
          break
        case 'tags':
          row.tags = strValue.split('|').map(t => t.trim()).filter(Boolean)
          break
      }
    }

    rows.push(row)
  }

  return rows
}

function normalizePhone(phone: string): string {
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '')

  // Se começar com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // Se não tiver código do país (menos de 12 dígitos), adiciona 55 (Brasil)
  if (cleaned.length <= 11) {
    cleaned = '55' + cleaned
  }

  return cleaned
}

function validatePhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizePhone(phone)

  if (normalized.length < 12) {
    return { valid: false, normalized, error: 'Telefone muito curto' }
  }

  if (normalized.length > 15) {
    return { valid: false, normalized, error: 'Telefone muito longo' }
  }

  return { valid: true, normalized }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo obrigatório (CSV ou XLSX)' },
        { status: 400 }
      )
    }

    const fileName = file.name.toLowerCase()
    const isXLSX = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

    let rows: ParsedRow[]

    if (isXLSX) {
      const buffer = await file.arrayBuffer()
      rows = parseXLSX(buffer)
    } else {
      const text = await file.text()
      rows = parseCSV(text)
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Arquivo vazio ou sem dados válidos' },
        { status: 400 }
      )
    }

    let importados = 0
    let atualizados = 0
    let erros = 0
    const errosList: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const lineNum = i + 2 // +1 para índice, +1 para header

      try {
        if (!row.telefone) {
          errosList.push(`Linha ${lineNum}: Telefone não encontrado`)
          erros++
          continue
        }

        const phoneValidation = validatePhone(row.telefone)
        if (!phoneValidation.valid) {
          errosList.push(`Linha ${lineNum}: ${phoneValidation.error} - "${row.telefone}"`)
          erros++
          continue
        }

        const numeroWhatsapp = phoneValidation.normalized

        await prisma.$transaction(async (tx) => {
          // Garantir que todas as tags existam
          const tags = row.tags || []
          const uniqueTags = Array.from(new Set(tags))
          const tagRecords = await Promise.all(
            uniqueTags.map(async (tagName) => {
              const nome = tagName.trim()
              if (!nome) return null
              const tag = await tx.tag.upsert({
                where: { nome },
                create: { nome },
                update: {},
              })
              return tag
            })
          )

          const validTags = tagRecords.filter(Boolean) as { id: number }[]

          // Verificar se contato já existe
          const existing = await tx.contato.findFirst({
            where: { numeroWhatsapp },
          })

          if (existing) {
            // Atualizar contato existente
            await tx.contato.update({
              where: { id: existing.id },
              data: {
                nomeContato: row.nome || existing.nomeContato,
                email: row.email || existing.email,
                empresa: row.empresa || existing.empresa,
              },
            })

            // Atualizar tags se houver
            if (validTags.length > 0) {
              await tx.contatoTag.deleteMany({
                where: { contatoId: existing.id },
              })

              await tx.contatoTag.createMany({
                data: validTags.map((tag) => ({
                  contatoId: existing.id,
                  tagId: tag.id,
                })),
                skipDuplicates: true,
              })
            }

            atualizados++
          } else {
            // Criar novo contato
            const novoContato = await tx.contato.create({
              data: {
                numeroWhatsapp,
                nomeContato: row.nome || null,
                email: row.email || null,
                empresa: row.empresa || null,
                ativo: true,
              },
            })

            if (validTags.length > 0) {
              await tx.contatoTag.createMany({
                data: validTags.map((tag) => ({
                  contatoId: novoContato.id,
                  tagId: tag.id,
                })),
                skipDuplicates: true,
              })
            }

            importados++
          }
        })
      } catch (error: any) {
        errosList.push(`Linha ${lineNum}: ${error.message}`)
        erros++
      }
    }

    return NextResponse.json({
      success: true,
      importados,
      atualizados,
      erros,
      errosList: errosList.slice(0, 20), // Limitar erros exibidos
      totalLinhas: rows.length,
      mensagem: `${importados} novos, ${atualizados} atualizados, ${erros} erros`,
    })
  } catch (error: any) {
    console.error('Erro ao importar:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao importar arquivo' },
      { status: 500 }
    )
  }
}
