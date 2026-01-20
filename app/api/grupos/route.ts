import { NextRequest, NextResponse } from 'next/server'
import { grupoService } from '@/lib/services/grupo.service'

/**
 * GET /api/grupos
 * Listar todos os grupos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const grupos = await grupoService.listarGrupos({ status })

    return NextResponse.json(grupos)
  } catch (error) {
    console.error('Erro ao listar grupos:', error)
    return NextResponse.json(
      { error: 'Erro ao listar grupos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/grupos
 * Criar novo grupo manualmente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nome,
      contatoNumero,
      instanceName,
      descricao,
      imagem,
      somenteAdminsEnviam,
      somenteAdminsEditam
    } = body

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome do grupo é obrigatório' },
        { status: 400 }
      )
    }

    if (!contatoNumero) {
      return NextResponse.json(
        { error: 'Número do contato inicial é obrigatório' },
        { status: 400 }
      )
    }

    if (!instanceName) {
      return NextResponse.json(
        { error: 'Instância é obrigatória' },
        { status: 400 }
      )
    }

    const grupo = await grupoService.criarNovoGrupo({
      nome,
      contatoNumero,
      instanceName,
      descricao,
      imagem,
      somenteAdminsEnviam,
      somenteAdminsEditam,
    })

    return NextResponse.json({
      message: 'Grupo criado com sucesso',
      grupo,
    })
  } catch (error: any) {
    console.error('Erro ao criar grupo:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar grupo' },
      { status: 500 }
    )
  }
}
