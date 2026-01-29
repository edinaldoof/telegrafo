import { NextRequest, NextResponse } from 'next/server'
import { sgeService } from '@/lib/services/sge.service'
import { z } from 'zod'

const ImportarSchema = z.object({
  inscricaoIds: z.array(z.number()).min(1, 'Selecione pelo menos uma inscrição'),
})

/**
 * POST /api/sge/importar
 * Importa inscrições selecionadas como contatos
 *
 * Body:
 * - inscricaoIds: array de IDs das inscrições a importar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inscricaoIds } = ImportarSchema.parse(body)

    const resultado = await sgeService.importarComoContatos(inscricaoIds)

    return NextResponse.json({
      message: 'Importação concluída',
      ...resultado,
    })
  } catch (error: any) {
    console.error('Erro ao importar inscrições:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Erro ao importar' },
      { status: 500 }
    )
  }
}
