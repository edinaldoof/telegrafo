/**
 * Instrumentation - Executado no startup do servidor
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Executar apenas no servidor Node.js (não no Edge Runtime)
    const { mensagemService } = await import('./lib/services/mensagem.service')
    const { baileysDirectService } = await import('./lib/services/baileys-direct.service')
    const { dynamicConfigService } = await import('./lib/services/dynamic-config.service')
    const { prisma } = await import('./lib/prisma')
    const { logger } = await import('./lib/observability/log')

    logger.info('server.startup')

    // Migrar configurações do .env para o banco (apenas na primeira vez)
    try {
      const result = await dynamicConfigService.migrateFromEnv()
      if (result.migrated.length > 0) {
        logger.info(`config.migration.success: ${result.migrated.length} configs migrated`)
      }
    } catch (error) {
      logger.warn('config.migration.error: Could not migrate configs from env')
    }

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
