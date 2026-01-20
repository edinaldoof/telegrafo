import { NextRequest, NextResponse } from 'next/server'
import { grupoService } from '@/lib/services/grupo.service'

/**
 * DELETE /api/grupos/[id]
 * Deletar grupo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const grupoId = parseInt(id)

    if (isNaN(grupoId)) {
      return NextResponse.json(
        { error: 'ID do grupo inválido' },
        { status: 400 }
      )
    }

    await grupoService.deletarGrupo(grupoId)

    return NextResponse.json({ message: 'Grupo deletado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao deletar grupo:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar grupo' },
      { status: 500 }
    )
  }
}
