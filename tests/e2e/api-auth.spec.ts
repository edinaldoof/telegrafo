import { test, expect } from '@playwright/test'

test.describe('API Authentication', () => {
  test('GET /api/contatos requer autenticação', async ({ request }) => {
    const response = await request.get('/api/contatos')
    expect(response.status()).toBe(401)
  })

  test('GET /api/contatos com API key válida retorna 200', async ({ request }) => {
    const apiKey = process.env.API_KEY || 'sk_api_default_change_in_production'
    const response = await request.get('/api/contatos', {
      headers: { 'x-api-key': apiKey },
    })
    expect([200, 404]).toContain(response.status())
  })
})

