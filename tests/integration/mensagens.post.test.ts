import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/mensagens/enviar/route'
import { jsonHeaders, makeRequest } from '../helpers/request'

describe('POST /api/mensagens/enviar', () => {
  it('valida payload com Zod', async () => {
    const req = makeRequest('http://localhost/api/mensagens/enviar', {
      method: 'POST',
      headers: jsonHeaders(process.env.API_KEY || 'sk_api_default_change_in_production'),
      body: JSON.stringify({ tipo: 'invalido' })
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})


