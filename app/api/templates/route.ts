import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const TemplateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  tipo: z.enum(['texto', 'imagem', 'video', 'documento']).default('texto'),
  categoria: z.string().optional(),
  mediaUrl: z.string().url().optional().or(z.literal('')),
  ativo: z.boolean().default(true),
})

/**
 * GET /api/templates
 * Listar templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ativo = searchParams.get('ativo')
    const tipo = searchParams.get('tipo')
    const categoria = searchParams.get('categoria')
    const busca = searchParams.get('busca')

    const where: any = {}

    if (ativo !== null) {
      where.ativo = ativo === 'true'
    }

    if (tipo) {
      where.tipo = tipo
    }

    if (categoria) {
      where.categoria = categoria
    }

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
        { conteudo: { contains: busca, mode: 'insensitive' } },
      ]
    }

    const templates = await prisma.template.findMany({
      where,
      include: {
        variaveis: true,
        _count: {
          select: { agendamentos: true }
        }
      },
      orderBy: { criadoEm: 'desc' },
    })

    // Extrair categorias únicas para filtro
    const categorias = await prisma.template.findMany({
      where: { categoria: { not: null } },
      select: { categoria: true },
      distinct: ['categoria'],
    })

    return NextResponse.json({
      templates,
      categorias: categorias.map(c => c.categoria).filter(Boolean),
    })
  } catch (error: any) {
    console.error('Erro ao listar templates:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Criar template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = TemplateSchema.parse(body)

    // Extrair variáveis do conteúdo (formato: {{variavel}})
    const variavelRegex = /\{\{(\w+)\}\}/g
    const variaveisEncontradas: string[] = []
    let match
    while ((match = variavelRegex.exec(validated.conteudo)) !== null) {
      if (!variaveisEncontradas.includes(match[1])) {
        variaveisEncontradas.push(match[1])
      }
    }

    const template = await prisma.template.create({
      data: {
        nome: validated.nome,
        descricao: validated.descricao || null,
        conteudo: validated.conteudo,
        tipo: validated.tipo,
        categoria: validated.categoria || null,
        mediaUrl: validated.mediaUrl || null,
        ativo: validated.ativo,
        variaveis: {
          create: variaveisEncontradas.map(nome => ({
            nome,
            obrigatorio: true,
          }))
        }
      },
      include: {
        variaveis: true,
      }
    })

    return NextResponse.json({
      message: 'Template criado com sucesso',
      template,
    })
  } catch (error: any) {
    console.error('Erro ao criar template:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Erro ao criar template' },
      { status: 500 }
    )
  }
}
