import { NextRequest, NextResponse } from 'next/server'
import { sendTemplate, isConfiguredAsync } from '@/lib/services/twilio.service'
import { prisma } from '@/lib/prisma'
import { auditoriaService } from '@/lib/services/auditoria.service'

export async function POST(request: NextRequest) {
  try {
    if (!(await isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: 'Twilio nao configurado' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { templateSid, destinatarios, filtroTags, variaveis } = body

    if (!templateSid) {
      return NextResponse.json(
        { success: false, error: 'Template SID obrigatorio' },
        { status: 400 }
      )
    }

    // Coletar todos os numeros
    let numerosFinais: string[] = [...(destinatarios || [])]

    // Buscar contatos por tags se especificado
    if (filtroTags && filtroTags.length > 0) {
      const contatosPorTag = await prisma.contato.findMany({
        where: {
          tags: {
            some: {
              tagId: { in: filtroTags }
            }
          },
          ativo: true
        },
        select: { numeroWhatsapp: true }
      })

      const numerosTag = contatosPorTag.map(c => c.numeroWhatsapp)
      numerosFinais = [...new Set([...numerosFinais, ...numerosTag])]
    }

    if (numerosFinais.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum destinatario encontrado' },
        { status: 400 }
      )
    }

    // Enviar para cada destinatario
    const resultados = {
      enviados: 0,
      erros: 0,
      detalhes: [] as any[]
    }

    for (const numero of numerosFinais) {
      try {
        const result = await sendTemplate(numero, templateSid, variaveis || {})
        resultados.enviados++
        resultados.detalhes.push({
          numero,
          sucesso: true,
          sid: result.sid,
          status: result.status
        })
      } catch (error: any) {
        resultados.erros++
        resultados.detalhes.push({
          numero,
          sucesso: false,
          erro: error.message
        })
      }

      // Pequeno delay para nao sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Registrar no historico
    try {
      await prisma.mensagem.create({
        data: {
          tipo: 'template',
          conteudo: 'Template: ' + templateSid,
          status: resultados.erros === 0 ? 'concluido' : 'parcial',
          grupoIds: [],
          totalGrupos: 0,
          totalEnviados: resultados.enviados,
          totalErros: resultados.erros,
        }
      })

      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

      await auditoriaService.registrar({
        tipo: 'mensagem_enviada',
        descricao: 'Envio em massa via template para ' + numerosFinais.length + ' destinatarios',
        usuario: 'Sistema',
        ip,
        dados: {
          templateSid,
          totalDestinatarios: numerosFinais.length,
          enviados: resultados.enviados,
          erros: resultados.erros
        },
      })
    } catch (dbError) {
      console.error('[Twilio] Erro ao salvar no historico:', dbError)
    }

    return NextResponse.json({
      sucesso: true,
      totalDestinatarios: numerosFinais.length,
      totalEnviados: resultados.enviados,
      totalErros: resultados.erros,
      detalhes: resultados.detalhes
    })
  } catch (error: any) {
    console.error('[API Twilio] Erro no envio em massa:', error.message)
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    )
  }
}
