import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/service'
import { createErrorResponse } from '@/lib/utils/error-handler'

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.authenticate(request)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        permissions: user.permissions,
      },
    })
  } catch (error) {
    return createErrorResponse(error, request.headers.get('x-request-id') || undefined)
  }
}
