'use client'

import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

export function Turnstile({ onVerify, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const scriptLoadedRef = useRef(false)

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current)
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme: 'light',
      language: 'pt-br',
      size: 'normal',
    })
  }, [onVerify, onExpire, onError])

  useEffect(() => {
    if (window.turnstile) {
      renderWidget()
      return
    }

    if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true
      window.onTurnstileLoad = renderWidget

      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
      script.async = true
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [renderWidget])

  return <div ref={containerRef} />
}
