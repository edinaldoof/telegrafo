import { NextResponse } from 'next/server'
import { contatoService } from '@/lib/services/contato.service'

/**
 * POST /api/contatos/distribuir
 * Distribuir contatos pendentes nos grupos
 */
export async function POST() {
  try {
    const resultado = await contatoService.distribuirContatosPendentes()

    return NextResponse.json({
      message: 'Distribuição concluída',
      ...resultado,
    })
  } catch (error) {
    console.error('Erro ao distribuir contatos:', error)
    return NextResponse.json(
      { error: 'Erro ao distribuir contatos' },
      { status: 500 }
    )
  }
}
