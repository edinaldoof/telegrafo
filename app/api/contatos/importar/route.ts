import { NextRequest, NextResponse } from 'next/server'
import { contatoService } from '@/lib/services/contato.service'

/**
 * POST /api/contatos/importar
 * Importar contatos de CSV
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { csvContent } = body

    if (!csvContent) {
      return NextResponse.json(
        { error: 'Conteúdo CSV é obrigatório' },
        { status: 400 }
      )
    }

    const resultado = await contatoService.importarCSV(csvContent)

    return NextResponse.json({
      message: 'Importação concluída',
      ...resultado,
    })
  } catch (error) {
    console.error('Erro ao importar contatos:', error)
    return NextResponse.json(
      { error: 'Erro ao importar contatos' },
      { status: 500 }
    )
  }
}
