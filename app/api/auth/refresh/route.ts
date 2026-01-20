import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/service'
import { createErrorResponse } from '@/lib/utils/error-handler'
import { AppError } from '@/lib/observability/errors'

/**
 * POST /api/auth/refresh
 * Refresh JWT tokens using refresh token from cookie or body
 */
export async function POST(request: NextRequest) {
  try {
    // Try to get refresh token from cookie first, then from body
    let refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      const body = await request.json().catch(() => ({}))
      refreshToken = body.refreshToken
    }

    if (!refreshToken) {
      throw new AppError('Refresh token não fornecido', 401, 'MISSING_REFRESH_TOKEN')
    }

    const tokens = await AuthService.refresh(refreshToken)

    const response = NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    })

    // Update refresh token cookie
    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    return createErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
