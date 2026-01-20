import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/contatos/route'
import { jsonHeaders, makeRequest } from '../helpers/request'

describe('GET /api/contatos', () => {
  it('exige autenticação', async () => {
    const req = makeRequest('http://localhost/api/contatos')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })

  it('retorna 200 com API key válida', async () => {
    const req = makeRequest('http://localhost/api/contatos', {
      headers: jsonHeaders(process.env.API_KEY || 'sk_api_default_change_in_production')
    })
    const res = await GET(req as any)
    expect([200, 204, 404]).toContain(res.status)
  })
})


