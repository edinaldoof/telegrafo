import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthService } from '@/lib/auth/service'
import { createErrorResponse } from '@/lib/utils/error-handler'
import { auditoriaService } from '@/lib/services/auditoria.service'

const LoginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Password é obrigatório'),
})

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = LoginSchema.parse(body)

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
