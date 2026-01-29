import { NextResponse } from 'next/server'
import { dynamicConfigService } from '@/lib/services/dynamic-config.service'
import Twilio from 'twilio'

export async function GET() {
  try {
    // Buscar configs do banco
    const configs = await dynamicConfigService.getMultiple([
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_WHATSAPP_NUMBER'
    ])

    const accountSid = configs.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || ''
    const authToken = configs.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || ''
    const whatsappNumber = configs.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER || ''

    // Debug info
    const debug = {
      fromDb: {
        sidExists: !!configs.TWILIO_ACCOUNT_SID,
        sidLength: configs.TWILIO_ACCOUNT_SID?.length,
        sidPrefix: configs.TWILIO_ACCOUNT_SID?.slice(0, 4),
        tokenExists: !!configs.TWILIO_AUTH_TOKEN,
        tokenLength: configs.TWILIO_AUTH_TOKEN?.length,
        whatsappNumber: configs.TWILIO_WHATSAPP_NUMBER
      },
      fromEnv: {
        sidExists: !!process.env.TWILIO_ACCOUNT_SID,
        tokenExists: !!process.env.TWILIO_AUTH_TOKEN,
      },
      final: {
        sidLength: accountSid.length,
        sidPrefix: accountSid.slice(0, 4),
        tokenLength: authToken.length,
        whatsappNumber
      }
    }

    // Testar cliente
    let clientTest = 'not tested'
    if (accountSid && authToken) {
      try {
        const client = Twilio(accountSid, authToken)
        const balance = await client.api.accounts(accountSid).balance.fetch()
        clientTest = `OK - Balance: ${balance.balance} ${balance.currency}`
      } catch (e: any) {
        clientTest = `ERRO: ${e.message}`
      }
    }

    return NextResponse.json({
      debug,
      clientTest
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
