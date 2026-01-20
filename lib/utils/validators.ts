/**
 * Common Validators Utility
 *
 * Centralized validation functions using Zod schemas for consistent
 * validation across API routes and services.
 */

import { z } from 'zod'
import { validateBrazilianPhone } from './phone-formatter'

/**
 * Common Zod schemas for reuse
 */
export const schemas = {
  // ID schemas
  id: z.coerce.number().int().positive('ID deve ser um número positivo'),
  uuid: z.string().uuid('UUID inválido'),

  // Phone schemas
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').max(15, 'Telefone deve ter no máximo 15 dígitos'),

  brazilianPhone: z.string().refine(
    (val: string) => validateBrazilianPhone(val).valid,
    { message: 'Telefone brasileiro inválido' }
  ),

  // String schemas
  nonEmpty: z.string().min(1, 'Campo obrigatório'),
  email: z.string().email('Email inválido'),
  url: z.string().url('URL inválida'),

  // Pagination schemas
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  // Date schemas
  isoDate: z.string().datetime('Data deve estar no formato ISO 8601'),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }),

  // Message type
  messageType: z.enum(['texto', 'imagem', 'video', 'documento', 'audio']),

  // Status schemas
  contactStatus: z.enum(['ativo', 'inativo']),
  groupStatus: z.enum(['ativo', 'cheio', 'inativo']),
  messageStatus: z.enum(['pendente', 'enviando', 'enviado', 'erro', 'concluido']),
  instanceStatus: z.enum(['disconnected', 'connecting', 'connected', 'qr']),
}

/**
 * Common request body schemas
 */
export const requestSchemas = {
  // Contact creation/update
  createContact: z.object({
    numeroWhatsapp: schemas.brazilianPhone,
    nomeContato: z.string().optional(),
    grupoId: schemas.id.optional(),
    tags: z.array(schemas.id).optional(),
  }),

  // Message sending
  sendMessage: z.object({
    tipo: schemas.messageType,
    conteudo: z.string().optional(),
    caminhoArquivo: z.string().optional(),
    nomeArquivo: z.string().optional(),
    mimeType: z.string().optional(),
    grupoIds: z.array(schemas.id).min(1, 'Selecione pelo menos um grupo'),
  }),

  // Group creation
  createGroup: z.object({
    nome: schemas.nonEmpty,
    capacidadeMaxima: z.coerce.number().int().min(1).max(256).default(256),
  }),

  // Template creation
  createTemplate: z.object({
    nome: schemas.nonEmpty,
    conteudo: schemas.nonEmpty,
    tipo: schemas.messageType,
    ativo: z.boolean().default(true),
  }),

  // Tag creation
  createTag: z.object({
    nome: schemas.nonEmpty,
    cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hexadecimal válido (#RRGGBB)'),
  }),

  // Instance creation
  createInstance: z.object({
    instanceName: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Nome deve conter apenas letras, números, _ e -'),
  }),

  // Scheduling
  createSchedule: z.object({
    mensagemId: schemas.id,
    dataAgendamento: schemas.isoDate,
    recorrencia: z.enum(['unica', 'diaria', 'semanal', 'mensal']).default('unica'),
  }),
}

/**
 * Query parameter schemas
 */
export const querySchemas = {
  // List with pagination
  listPaginated: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    orderBy: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Contact filters
  contactFilters: z.object({
    grupoId: z.coerce.number().int().positive().optional(),
    ativo: z.coerce.boolean().optional(),
    busca: z.string().optional(),
    tagId: z.coerce.number().int().positive().optional(),
  }),

  // Message filters
  messageFilters: z.object({
    tipo: schemas.messageType.optional(),
    status: schemas.messageStatus.optional(),
    limite: z.coerce.number().int().min(1).max(100).default(50),
  }),

  // Date range filter
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
}

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: z.ZodIssue[]
}

/**
 * Validate data against a Zod schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: result.error.issues }
}

/**
 * Parse and validate request body
 */
export async function validateBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    return validate(schema, body)
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          code: 'custom',
          path: [],
          message: 'Invalid JSON body',
        },
      ],
    }
  }
}

/**
 * Parse and validate URL search params
 */
export function validateSearchParams<T>(request: Request, schema: z.ZodSchema<T>): ValidationResult<T> {
  const { searchParams } = new URL(request.url)
  const params = Object.fromEntries(searchParams.entries())
  return validate(schema, params)
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(issues: z.ZodIssue[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}

  for (const issue of issues) {
    const path = issue.path.join('.') || '_root'
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(issue.message)
  }

  return formatted
}

/**
 * Validate that required fields are present
 */
export function requireFields<T extends object>(obj: T, fields: (keyof T)[]): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  for (const field of fields) {
    const value = obj[field]
    if (value === undefined || value === null || value === '') {
      missing.push(String(field))
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Sanitize string input (trim and limit length)
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  return input.trim().slice(0, maxLength)
}

/**
 * Sanitize object keys (remove undefined values)
 */
export function sanitizeObject<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      ;(result as Record<string, unknown>)[key] = value
    }
  }

  return result
}
