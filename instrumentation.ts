/**
 * Instrumentation - Executado no startup do servidor
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Executar apenas no servidor Node.js (não no Edge Runtime)
    const { mensagemService } = await import('./lib/services/mensagem.service')
    const { baileysDirectService } = await import('./lib/services/baileys-direct.service')
    const { prisma } = await import('./lib/prisma')
    const { logger } = await import('./lib/observability/log')

    logger.info('server.startup')

    // Recuperar mensagens travadas
    await mensagemService.recuperarMensagensTravadas()

    // Reconectar instâncias Baileys que estavam conectadas
    try {
      const connectedInstances = await prisma.instance.findMany({
        where: { status: 'connected' }
      })

      for (const instance of connectedInstances) {
        try {
          baileysDirectService.connectInstance(instance.instanceName)
        } catch (error) {
          // Error reconnecting instance
        }
      }
    } catch (error) {
      // Error reconnecting instances
    }
  }
}
