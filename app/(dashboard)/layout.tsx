'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from 'sonner'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background lg:flex">
        <Sidebar />
        {/* Main content com padding top em mobile para header */}
        <main className="flex-1 pt-16 lg:pt-0 min-h-screen">
          <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
        <Toaster position="top-right" richColors closeButton />
      </div>
    </ProtectedRoute>
  )
}
