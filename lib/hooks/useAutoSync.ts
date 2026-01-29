'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const SYNC_INTERVAL_MS = 30 * 60 * 1000 // 30 minutos

/**
 * Hook para sync automática silenciosa do SGE
 * Faz polling a cada 30 minutos e invalida queries relevantes
 */
export function useAutoSync() {
  const queryClient = useQueryClient()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true

    const doSync = async () => {
      try {
        const res = await fetch('/api/sge/sync-auto', { method: 'POST' })
        if (!res.ok) return

        const data = await res.json()

        // Se houve mudanças, invalidar queries relevantes
        if (!data.skipped && isMounted.current) {
          const hasChanges =
            (data.sync?.novos > 0 || data.sync?.atualizados > 0) ||
            (data.import?.importados > 0)

          if (hasChanges) {
            queryClient.invalidateQueries({ queryKey: ['contatos'] })
            queryClient.invalidateQueries({ queryKey: ['sge-stats'] })
            queryClient.invalidateQueries({ queryKey: ['sge-inscricoes'] })
            queryClient.invalidateQueries({ queryKey: ['tags'] })
          }
        }
      } catch {
        // Sync automática silenciosa - não propagar erros
      }
    }

    // Sync inicial ao carregar
    doSync()

    // Polling periódico
    const interval = setInterval(doSync, SYNC_INTERVAL_MS)

    return () => {
      isMounted.current = false
      clearInterval(interval)
    }
  }, [queryClient])
}
