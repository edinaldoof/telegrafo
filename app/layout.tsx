import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/providers'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Telegrafo',
  description: 'Sistema avançado de comunicação e gerenciamento de mensagens',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="font-sans dark bg-background text-foreground min-h-screen antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
