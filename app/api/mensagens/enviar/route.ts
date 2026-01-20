import { mensagemService } from '@/lib/services/mensagem.service'
import { z } from 'zod'
import { withAuthAndErrorHandling, json, AuthRequest } from '@/lib/observability/api'
import { AppError } from '@/lib/observability/errors'

const EnviarMensagemSchema = z.object({
  tipo: z.enum(['texto', 'imagem', 'video', 'documento', 'audio']),
  conteudo: z.string().optional(),
  caminhoArquivo: z.string().optional(),
  nomeArquivo: z.string().optional(),
  mimeType: z.string().optional(),
  grupoIds: z.array(z.number()).optional(),
  enviarParaTodos: z.boolean().default(false),
})

/**
 * POST /api/mensagens/enviar
 * Enviar mensagem para grupos
 */
export const POST = withAuthAndErrorHandling(
  async (request: AuthRequest) => {
    const body = await request.json()
    const validated = EnviarMensagemSchema.parse(body)

    let mensagem

    if (validated.enviarParaTodos) {
      // Enviar para todos os grupos
      mensagem = await mensagemService.enviarParaTodosGrupos({
        tipo: validated.tipo,
        conteudo: validated.conteudo,
        caminhoArquivo: validated.caminhoArquivo,
        nomeArquivo: validated.nomeArquivo,
        mimeType: validated.mimeType,
      })
    } else {
      // Enviar para grupos específicos
      if (!validated.grupoIds || validated.grupoIds.length === 0) {
        throw new AppError('Nenhum grupo selecionado', 400, 'NO_GROUPS_SELECTED')
      }

      mensagem = await mensagemService.enviarMensagem({
        tipo: validated.tipo,
        conteudo: validated.conteudo,
        caminhoArquivo: validated.caminhoArquivo,
        nomeArquivo: validated.nomeArquivo,
        mimeType: validated.mimeType,
        grupoIds: validated.grupoIds,
      })
    }

    return json({
      message: 'Mensagem sendo enviada',
      mensagem,
    })
  },
  {
    required: true,
    permissions: ['mensagens:write'],
  }
)
