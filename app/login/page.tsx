'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageSquare, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import { Turnstile } from '@/components/turnstile'

function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error === 'string') return obj.error
    if (obj.error && typeof obj.error === 'object') {
      const innerError = obj.error as Record<string, unknown>
      if (typeof innerError.message === 'string') return innerError.message
    }
    if (typeof obj.msg === 'string') return obj.msg
  }
  return 'Usuário ou senha inválidos'
}

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(username, password, turnstileToken || undefined)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-4 rounded-full bg-primary/5 border border-primary/10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-green-50/30 overflow-hidden relative">

      {/* Grid de fundo sutil */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 150, 94, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 150, 94, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          backgroundPosition: 'center center'
        }}
      />

      {/* Glow central sutil */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34, 150, 94, 0.08) 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Login Card */}
      <div className={`relative z-10 w-full max-w-md mx-4 transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>

        {/* Sombra suave do card */}
        <div
          className="absolute -inset-1 rounded-2xl blur-2xl opacity-20"
          style={{
            background: 'linear-gradient(180deg, rgba(34, 150, 94, 0.4) 0%, rgba(34, 150, 94, 0.1) 50%, transparent 100%)'
          }}
        />

        <div className="relative bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 shadow-xl shadow-gray-200/50">

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-primary/15 rounded-2xl blur-xl"></div>
              <div className="relative inline-flex items-center justify-center p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Telegrafo</h1>
            <p className="text-gray-400 mt-2 text-sm">Entre com suas credenciais</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-500 text-sm">
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-primary/50 focus:ring-primary/20 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-500 text-sm">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-primary/50 focus:ring-primary/20 pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  onVerify={handleTurnstileVerify}
                  onExpire={handleTurnstileExpire}
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full h-11 mt-2 shadow-md shadow-primary/15"
              disabled={isLoading || !username || !password || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Entrando...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Entrar</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-xs">
              Telegrafo &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
