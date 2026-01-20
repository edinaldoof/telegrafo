import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { baileysDirectService } from '@/lib/services/baileys-direct.service'
import { whatsappHibridoApi } from '@/lib/services/whatsapp-hibrido-api.service'

const CONNECTED_STATES = new Set(['connected', 'open'])

const normalizeNumber = (value: string): string =>
  value.replace(/\D/g, '')

const normalizeIdArray = (values: unknown[]): number[] =>
  values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      instanceId,
      tipo,
      conteudo,
      destinatarios = [],
      grupos = [],
      filtroTags = [],
      anexo,
    } = body as {
      instanceId?: number | string
      tipo: 'texto' | 'imagem' | 'video' | 'audio' | 'documento'
      conteudo: string
      destinatarios?: string[]
      grupos?: Array<number | string>
      filtroTags?: Array<number | string>
      anexo?: {
        url: string
        mimeType?: string
        fileName?: string
      }
    }

    if (!tipo || !conteudo) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: tipo, conteudo' },
        { status: 400 }
      )
    }

    const grupoIds = normalizeIdArray(grupos)
    const tagIds = normalizeIdArray(filtroTags)

    if (
      destinatarios.length === 0 &&
      grupoIds.length === 0 &&
      tagIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Especifique destinatários, grupos ou tags' },
        { status: 400 }
      )
    }

    // Coletar destinatários individuais primeiro
    const destinatariosSet = new Set<string>(
      destinatarios
        .map((numero) => normalizeNumber(numero))
        .filter((numero) => numero.length >= 10)
    )

    // Array para armazenar grupos que receberão mensagens
    const gruposParaEnviar: Array<{ id: number; whatsappGroupId: string; nome: string }> = []

    if (grupoIds.length > 0) {
      const gruposData = await prisma.grupo.findMany({
        where: {
          id: { in: grupoIds },
          whatsappGroupId: { not: null }
        },
        select: {
          id: true,
          whatsappGroupId: true,
          nome: true,
        },
      })

      gruposData.forEach((grupo) => {
        if (grupo.whatsappGroupId) {
          gruposParaEnviar.push({
            id: grupo.id,
            whatsappGroupId: grupo.whatsappGroupId,
            nome: grupo.nome,
          })
        }
      })
    }

    // Buscar contatos por tags (serão enviados via Twilio)
    if (tagIds.length > 0) {
      const contatosComTags = await prisma.contato.findMany({
        where: {
          ativo: true,
          tags: {
            some: {
              tagId: { in: tagIds },
            },
          },
        },
        select: { numeroWhatsapp: true },
      })

      contatosComTags.forEach((contato) => {
        destinatariosSet.add(normalizeNumber(contato.numeroWhatsapp))
      })
    }

    const destinatariosUnicos = Array.from(destinatariosSet).filter(
      (numero) => numero.length >= 10
    )

    if (destinatariosUnicos.length === 0 && gruposParaEnviar.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum destinatário ou grupo encontrado' },
        { status: 400 }
      )
    }

    // Instância Baileys só é necessária para GRUPOS
    let instance = null
    if (gruposParaEnviar.length > 0) {
      const instanceIdNumber = Number(instanceId)
      if (!instanceId || !Number.isInteger(instanceIdNumber) || instanceIdNumber <= 0) {
        return NextResponse.json(
          { error: 'Para enviar para grupos, selecione uma instância Baileys' },
          { status: 400 }
        )
      }

      instance = await prisma.instance.findUnique({
        where: { id: instanceIdNumber },
      })

      if (!instance) {
        return NextResponse.json(
          { error: 'Instância não encontrada' },
          { status: 404 }
        )
      }

      const normalizedStatus = instance.status?.toLowerCase() ?? ''
      if (!CONNECTED_STATES.has(normalizedStatus)) {
        return NextResponse.json(
          { error: 'Instância não está conectada. Para grupos, precisa de instância Baileys ativa.' },
          { status: 400 }
        )
      }
    }

    let sucessos = 0
    let erros = 0
    const errosDetalhes: Array<{ numero: string; motivo: string }> = []

    // Enviar para GRUPOS via Baileys (requer instância)
    for (const grupo of gruposParaEnviar) {
      try {
        if (tipo === 'texto') {
          await baileysDirectService.sendTextMessage(
            instance!.instanceName,
            grupo.whatsappGroupId,
            conteudo
          )
        } else if (anexo) {
          // Mapear tipo para formato Baileys
          const mediaTypeMap: Record<string, 'image' | 'video' | 'audio' | 'document'> = {
            imagem: 'image',
            video: 'video',
            audio: 'audio',
            documento: 'document',
          }
          const baileysType = mediaTypeMap[tipo] || 'document'

          await baileysDirectService.sendMediaMessage(
            instance!.instanceName,
            grupo.whatsappGroupId,
            {
              media: {
                type: baileysType,
                url: anexo.url,
                caption: tipo !== 'audio' ? conteudo : undefined,
                fileName: anexo.fileName,
              },
            }
          )
        } else {
          throw new Error('Anexo obrigatório para este tipo de mensagem')
        }

        sucessos += 1
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error: any) {
        erros += 1
        errosDetalhes.push({
          numero: `Grupo: ${grupo.nome}`,
          motivo: error?.message ?? 'Erro desconhecido',
        })
      }
    }

    // Enviar para destinatários individuais (se houver) - USAR TWILIO (oficial, seguro)
    for (const numero of destinatariosUnicos) {
      try {
        if (tipo === 'texto') {
          await whatsappHibridoApi.enviarTexto(numero, conteudo)
        } else if (anexo) {
          // Twilio suporta imagem, vídeo, áudio e documentos via mediaUrl
          // A legenda só funciona para imagem e vídeo
          const legenda = (tipo === 'imagem' || tipo === 'video') ? conteudo : undefined
          await whatsappHibridoApi.enviarMidia(numero, anexo.url, legenda)

          // Se for áudio ou documento e tiver mensagem, enviar texto separado
          if ((tipo === 'audio' || tipo === 'documento') && conteudo) {
            await whatsappHibridoApi.enviarTexto(numero, conteudo)
          }
        } else {
          throw new Error('Anexo obrigatório para este tipo de mensagem')
        }

        sucessos += 1
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error: any) {
        erros += 1
        errosDetalhes.push({
          numero,
          motivo: error?.message ?? 'Erro desconhecido',
        })
      }
    }

    return NextResponse.json({
      success: erros === 0,
      totalGrupos: gruposParaEnviar.length,
      totalDestinatarios: destinatariosUnicos.length,
      totalEnvios: gruposParaEnviar.length + destinatariosUnicos.length,
      enviados: sucessos,
      erros,
      errosDetalhes,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar mensagens em massa' },
      { status: 500 }
    )
  }
}
