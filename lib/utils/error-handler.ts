/**
 * Standardized Error Handler Utility
 *
 * Provides consistent error handling, error codes, and response formatting
 * across all API routes and services.
 */

import { NextResponse } from 'next/server'
import { AppError, isAppError } from '@/lib/observability/errors'

/**
 * Standard error codes for the application
 */
export const ErrorCodes = {
  // Authentication (401)
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  INVALID_API_KEY: 'ERR_INVALID_API_KEY',
  EXPIRED_TOKEN: 'ERR_EXPIRED_TOKEN',
  NO_AUTH: 'ERR_NO_AUTH',

  // Authorization (403)
  FORBIDDEN: 'ERR_FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'ERR_INSUFFICIENT_PERMISSIONS',

  // Validation (400)
  VALIDATION_ERROR: 'ERR_VALIDATION',
  INVALID_PHONE: 'ERR_INVALID_PHONE',
  INVALID_INPUT: 'ERR_INVALID_INPUT',
  MISSING_REQUIRED: 'ERR_MISSING_REQUIRED',

  // Not Found (404)
  NOT_FOUND: 'ERR_NOT_FOUND',
  CONTACT_NOT_FOUND: 'ERR_CONTACT_NOT_FOUND',
  GROUP_NOT_FOUND: 'ERR_GROUP_NOT_FOUND',
  MESSAGE_NOT_FOUND: 'ERR_MESSAGE_NOT_FOUND',
  INSTANCE_NOT_FOUND: 'ERR_INSTANCE_NOT_FOUND',

  // Conflict (409)
  ALREADY_EXISTS: 'ERR_ALREADY_EXISTS',
  DUPLICATE: 'ERR_DUPLICATE',

  // Rate Limiting (429)
  RATE_LIMITED: 'ERR_RATE_LIMITED',

  // External Services (502, 503)
  EXTERNAL_SERVICE: 'ERR_EXTERNAL_SERVICE',
  TWILIO_ERROR: 'ERR_TWILIO',
  WHATSAPP_ERROR: 'ERR_WHATSAPP',
  EVOLUTION_ERROR: 'ERR_EVOLUTION',
  DATABASE_ERROR: 'ERR_DATABASE',

  // Server Errors (500)
  INTERNAL: 'ERR_INTERNAL',
  UNKNOWN: 'ERR_UNKNOWN',

  // Configuration (503)
  NOT_CONFIGURED: 'ERR_NOT_CONFIGURED',
  SERVICE_UNAVAILABLE: 'ERR_SERVICE_UNAVAILABLE',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    message: string
    code: string
    status: number
    details?: unknown
    timestamp: string
    requestId?: string
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | AppError | unknown,
  requestId?: string
): NextResponse<ErrorResponse> {
  const timestamp = new Date().toISOString()

  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code || ErrorCodes.UNKNOWN,
          status: error.status,
          details: error.details,
          timestamp,
          requestId,
        },
      },
      { status: error.status }
    )
  }

  if (error instanceof Error) {
    // Map common error types to appropriate responses
    const { status, code } = mapErrorToStatusAndCode(error)

    return NextResponse.json(
      {
        error: {
          message: error.message,
          code,
          status,
          timestamp,
          requestId,
        },
      },
      { status }
    )
  }

  // Unknown error
  return NextResponse.json(
    {
      error: {
        message: 'An unexpected error occurred',
        code: ErrorCodes.UNKNOWN,
        status: 500,
        timestamp,
        requestId,
      },
    },
    { status: 500 }
  )
}

/**
 * Map error messages to appropriate HTTP status and error codes
 */
function mapErrorToStatusAndCode(error: Error): { status: number; code: ErrorCode } {
  const message = error.message.toLowerCase()

  // Not found patterns
  if (message.includes('não encontrad') || message.includes('not found')) {
    return { status: 404, code: ErrorCodes.NOT_FOUND }
  }

  // Already exists patterns
  if (message.includes('já existe') || message.includes('already exists') || message.includes('duplicate')) {
    return { status: 409, code: ErrorCodes.ALREADY_EXISTS }
  }

  // Validation patterns
  if (
    message.includes('inválid') ||
    message.includes('invalid') ||
    message.includes('obrigatóri') ||
    message.includes('required')
  ) {
    return { status: 400, code: ErrorCodes.VALIDATION_ERROR }
  }

  // Rate limit patterns
  if (message.includes('rate limit') || message.includes('limite')) {
    return { status: 429, code: ErrorCodes.RATE_LIMITED }
  }

  // Authentication patterns
  if (message.includes('unauthorized') || message.includes('não autenticad')) {
    return { status: 401, code: ErrorCodes.UNAUTHORIZED }
  }

  // Permission patterns
  if (message.includes('forbidden') || message.includes('permissão')) {
    return { status: 403, code: ErrorCodes.FORBIDDEN }
  }

  // External service patterns
  if (message.includes('twilio')) {
    return { status: 502, code: ErrorCodes.TWILIO_ERROR }
  }
  if (message.includes('whatsapp')) {
    return { status: 502, code: ErrorCodes.WHATSAPP_ERROR }
  }
  if (message.includes('evolution')) {
    return { status: 502, code: ErrorCodes.EVOLUTION_ERROR }
  }

  // Database patterns
  if (message.includes('prisma') || message.includes('database') || message.includes('banco')) {
    return { status: 500, code: ErrorCodes.DATABASE_ERROR }
  }

  // Default to internal error
  return { status: 500, code: ErrorCodes.INTERNAL }
}

/**
 * Helper to create specific AppErrors
 */
export const Errors = {
  validation: (message: string, details?: unknown) => new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, details),

  invalidPhone: (phone: string) =>
    new AppError(`Número de telefone inválido: ${phone}`, 400, ErrorCodes.INVALID_PHONE, { phone }),

  notFound: (resource: string, id?: string | number) =>
    new AppError(`${resource} não encontrado${id ? `: ${id}` : ''}`, 404, ErrorCodes.NOT_FOUND, { resource, id }),

  alreadyExists: (resource: string, identifier?: string) =>
    new AppError(`${resource} já existe${identifier ? `: ${identifier}` : ''}`, 409, ErrorCodes.ALREADY_EXISTS, {
      resource,
      identifier,
    }),

  unauthorized: (message = 'Não autorizado') => new AppError(message, 401, ErrorCodes.UNAUTHORIZED),

  forbidden: (message = 'Sem permissão') => new AppError(message, 403, ErrorCodes.FORBIDDEN),

  rateLimited: (retryAfter?: string) =>
    new AppError(`Rate limit atingido${retryAfter ? `. Tente novamente em ${retryAfter}` : ''}`, 429, ErrorCodes.RATE_LIMITED, {
      retryAfter,
    }),

  externalService: (service: string, originalError?: Error) =>
    new AppError(`Erro no serviço externo: ${service}`, 502, ErrorCodes.EXTERNAL_SERVICE, {
      service,
      originalError: originalError?.message,
    }),

  notConfigured: (service: string) =>
    new AppError(`${service} não está configurado`, 503, ErrorCodes.NOT_CONFIGURED, { service }),

  internal: (message = 'Erro interno do servidor') => new AppError(message, 500, ErrorCodes.INTERNAL),
}

/**
 * Wrapper for async route handlers with automatic error handling
 */
export function withErrorHandling<T>(
  handler: (request: Request) => Promise<NextResponse<T>>
): (request: Request) => Promise<NextResponse<T | ErrorResponse>> {
  return async (request: Request) => {
    const requestId = request.headers.get('x-request-id') || undefined

    try {
      return await handler(request)
    } catch (error) {
      console.error(`[ERROR] ${requestId || 'no-request-id'}:`, error)
      return createErrorResponse(error, requestId)
    }
  }
}

/**
 * Safe error logging (masks sensitive data)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const safeContext = context ? maskSensitiveData(context) : undefined

  if (error instanceof Error) {
    console.error({
      message: error.message,
      name: error.name,
      stack: error.stack,
      context: safeContext,
    })
  } else {
    console.error({
      error: String(error),
      context: safeContext,
    })
  }
}

/**
 * Mask sensitive data in objects for logging
 */
function maskSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'auth', 'credential']
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()

    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      result[key] = '****'
    } else if (typeof value === 'object' && value !== null) {
      result[key] = maskSensitiveData(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }

  return result
}
