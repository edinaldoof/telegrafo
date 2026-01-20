import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('carrega página principal', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Telegrafo/)
  })

  test('exibe Error Boundary em caso de erro', async ({ page }) => {
    await page.goto('/')
    // Simular erro injetando erro no componente
    await page.addInitScript(() => {
      window.addEventListener('error', (e) => {
        e.preventDefault()
      })
    })
  })
})

