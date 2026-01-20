import { describe, it, expect } from 'vitest'
import {
  ErrorCodes,
  Errors,
  createErrorResponse,
} from '@/lib/utils/error-handler'
import { AppError } from '@/lib/observability/errors'

describe('error-handler', () => {
  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.UNAUTHORIZED).toBe('ERR_UNAUTHORIZED')
      expect(ErrorCodes.NOT_FOUND).toBe('ERR_NOT_FOUND')
      expect(ErrorCodes.VALIDATION_ERROR).toBe('ERR_VALIDATION')
      expect(ErrorCodes.RATE_LIMITED).toBe('ERR_RATE_LIMITED')
      expect(ErrorCodes.INTERNAL).toBe('ERR_INTERNAL')
    })
  })

  describe('Errors helper', () => {
    it('should create validation error', () => {
      const error = Errors.validation('Invalid input', { field: 'email' })

      expect(error).toBeInstanceOf(AppError)
      expect(error.message).toBe('Invalid input')
      expect(error.status).toBe(400)
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should create invalid phone error', () => {
      const error = Errors.invalidPhone('12345')

      expect(error.status).toBe(400)
      expect(error.code).toBe(ErrorCodes.INVALID_PHONE)
      expect(error.message).toContain('12345')
    })

    it('should create not found error', () => {
      const error = Errors.notFound('Contact', 123)

      expect(error.status).toBe(404)
      expect(error.code).toBe(ErrorCodes.NOT_FOUND)
      expect(error.message).toContain('Contact')
      expect(error.message).toContain('123')
    })

    it('should create already exists error', () => {
      const error = Errors.alreadyExists('User', 'email@test.com')

      expect(error.status).toBe(409)
      expect(error.code).toBe(ErrorCodes.ALREADY_EXISTS)
    })

    it('should create unauthorized error', () => {
      const error = Errors.unauthorized()

      expect(error.status).toBe(401)
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED)
    })

    it('should create forbidden error', () => {
      const error = Errors.forbidden()

      expect(error.status).toBe(403)
      expect(error.code).toBe(ErrorCodes.FORBIDDEN)
    })

    it('should create rate limited error', () => {
      const error = Errors.rateLimited('5 minutes')

      expect(error.status).toBe(429)
      expect(error.code).toBe(ErrorCodes.RATE_LIMITED)
      expect(error.message).toContain('5 minutes')
    })

    it('should create external service error', () => {
      const originalError = new Error('Connection refused')
      const error = Errors.externalService('Twilio', originalError)

      expect(error.status).toBe(502)
      expect(error.code).toBe(ErrorCodes.EXTERNAL_SERVICE)
      expect(error.details).toHaveProperty('service', 'Twilio')
      expect(error.details).toHaveProperty('originalError', 'Connection refused')
    })

    it('should create not configured error', () => {
      const error = Errors.notConfigured('Redis')

      expect(error.status).toBe(503)
      expect(error.code).toBe(ErrorCodes.NOT_CONFIGURED)
      expect(error.message).toContain('Redis')
    })
  })

  describe('createErrorResponse', () => {
    it('should handle AppError', async () => {
      const appError = new AppError('Test error', 400, 'TEST_ERROR', { foo: 'bar' })
      const response = createErrorResponse(appError, 'req-123')

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.message).toBe('Test error')
      expect(body.error.code).toBe('TEST_ERROR')
      expect(body.error.status).toBe(400)
      expect(body.error.details).toEqual({ foo: 'bar' })
      expect(body.error.requestId).toBe('req-123')
      expect(body.error.timestamp).toBeDefined()
    })

    it('should handle standard Error', async () => {
      const error = new Error('Something went wrong')
      const response = createErrorResponse(error)

      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body.error.message).toBe('Something went wrong')
      expect(body.error.code).toBe(ErrorCodes.INTERNAL)
    })

    it('should handle "not found" errors', async () => {
      const error = new Error('Contato não encontrado')
      const response = createErrorResponse(error)

      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error.code).toBe(ErrorCodes.NOT_FOUND)
    })

    it('should handle "already exists" errors', async () => {
      const error = new Error('Item já existe')
      const response = createErrorResponse(error)

      expect(response.status).toBe(409)

      const body = await response.json()
      expect(body.error.code).toBe(ErrorCodes.ALREADY_EXISTS)
    })

    it('should handle unknown errors', async () => {
      const response = createErrorResponse('string error')

      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body.error.code).toBe(ErrorCodes.UNKNOWN)
    })
  })
})
