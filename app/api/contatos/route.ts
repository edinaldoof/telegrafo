import { NextRequest, NextResponse } from 'next/server'
import { contatoService } from '@/lib/services/contato.service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parseListQueryParams, createPaginatedResponse, getPrismaSkipTake, buildSearchClause } from '@/lib/utils/pagination'
import { addBrazilCountryCode, cleanPhoneNumber } from '@/lib/utils/phone-formatter'
import { createErrorResponse, Errors } from '@/lib/utils/error-handler'

const ContatoSchema = z.object({
  numeroWhatsapp: z.string().min(1, 'Número é obrigatório'),
  nomeContato: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  empresa: z.string().optional(),
})

/**
 * Limpar número de telefone (now uses centralized utility)
 */
function limparNumero(numero: string): string {
  return addBrazilCountryCode(cleanPhoneNumber(numero))
}

/**
 * GET /api/contatos
 * Listar contatos com paginação
 *
 * Query params:
 * - page: número da página (default: 1)
 * - limit: itens por página (default: 20, max: 100)
 * - search: busca por nome ou número
 * - grupoId: filtrar por grupo
 * - ativo: filtrar por status (true/false)
 * - orderBy: campo para ordenação (default: dataAdicao)
 * - order: direção da ordenação (asc/desc, default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = parseListQueryParams(request, 'dataAdicao')
    const grupoId = searchParams.get('grupoId')
    const ativo = searchParams.get('ativo')

    // Build where clause
    const where: Record<string, unknown> = {}

    if (grupoId) {
      where.grupoId = parseInt(grupoId)
    }

    if (ativo !== null) {
      where.ativo = ativo === 'true'
    }

    // Add search clause if search term provided
    if (queryParams.search) {
      const searchClause = buildSearchClause(queryParams.search, ['numeroWhatsapp', 'nomeContato', 'email', 'empresa'])
      if (searchClause) {
        Object.assign(where, searchClause)
      }
    }

    // Get pagination values
    const { skip, take } = getPrismaSkipTake(queryParams)

    // Execute count and find in parallel
    const [total, contatos] = await Promise.all([
      prisma.contato.count({ where }),
      prisma.contato.findMany({
        where,
        include: {
          grupo: {
            select: {
              id: true,
              nome: true,
              numeroGrupo: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: queryParams.orderBy ? { [queryParams.orderBy]: queryParams.order } : { dataAdicao: 'desc' },
        skip,
        take,
      }),
    ])

    // Format response
    const formattedContatos = contatos.map(contato => ({
      ...contato,
      nome: contato.nomeContato,
      tags: contato.tags.map((relacao) => ({
        tag: {
          id: relacao.tag.id,
          nome: relacao.tag.nome,
          cor: relacao.tag.cor,
        }
      })),
    }))

    return NextResponse.json(createPaginatedResponse(formattedContatos, total, queryParams))
  } catch (error) {
    console.error('Erro ao listar contatos:', error)
    return createErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}

/**
 * POST /api/contatos
 * Adicionar contato (sem exigir grupo)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = ContatoSchema.parse(body)

    // Normalizar número
    const numeroWhatsapp = limparNumero(validated.numeroWhatsapp)

    // Verificar se já existe
    const existente = await prisma.contato.findFirst({
      where: { numeroWhatsapp },
    })

    if (existente) {
      throw Errors.alreadyExists('Contato', numeroWhatsapp)
    }

    // Criar contato diretamente (sem exigir grupo)
    const contato = await prisma.contato.create({
      data: {
        numeroWhatsapp,
        nomeContato: validated.nomeContato || null,
        email: validated.email || null,
        empresa: validated.empresa || null,
        ativo: true,
      },
    })

    return NextResponse.json({
      message: 'Contato adicionado com sucesso',
      contato,
    })
  } catch (error) {
    console.error('Erro ao adicionar contato:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return createErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
