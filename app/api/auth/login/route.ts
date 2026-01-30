import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthService } from '@/lib/auth/service'
import { createErrorResponse } from '@/lib/utils/error-handler'
import { auditoriaService } from '@/lib/services/auditoria.service'

const LoginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Password é obrigatório'),
  turnstileToken: z.string().optional(),
})

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, turnstileToken } = LoginSchema.parse(body)

    // Validar Cloudflare Turnstile
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
    if (turnstileSecret) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: { message: 'Verificacao de seguranca necessaria' } },
          { status: 403 }
        )
      }

      const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: request.headers.get('x-forwarded-for') || '',
        }),
      })

      const turnstileData = await turnstileRes.json()
      if (!turnstileData.success) {
        return NextResponse.json(
          { error: { message: 'Verificacao de seguranca falhou. Tente novamente.' } },
          { status: 403 }
        )
      }
    }

    const result = await AuthService.login(username, password)

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'desconhecido'
    const userAgent = request.headers.get('user-agent') || undefined

    await auditoriaService.registrar({
      tipo: 'login',
      descricao: `Usuário ${username} fez login no sistema`,
      usuario: username,
      ip,
      userAgent,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        role: result.user.role,
        permissions: result.user.permissions,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    })

    // Set refresh token as HTTP-only cookie for security
    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }
    return createErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
