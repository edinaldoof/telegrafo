/**
 * Pagination Utility
 *
 * Provides consistent pagination support for list APIs.
 * Standard format: ?page=1&limit=20
 */

import { z } from 'zod'

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(5000).default(20),
})

export type PaginationParams = z.infer<typeof paginationSchema>

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Parse pagination parameters from request URL
 */
export function parsePaginationParams(request: Request): PaginationParams {
  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page')
  const limit = searchParams.get('limit')

  return paginationSchema.parse({
    page: page || 1,
    limit: limit || 20,
  })
}

/**
 * Calculate Prisma skip/take values from pagination params
 */
export function getPrismaSkipTake(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  }
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit)

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    },
  }
}

/**
 * Helper to build paginated query for Prisma
 */
export function buildPaginatedQuery<T extends Record<string, unknown>>(
  baseQuery: T,
  params: PaginationParams
): T & { skip: number; take: number } {
  const { skip, take } = getPrismaSkipTake(params)
  return {
    ...baseQuery,
    skip,
    take,
  }
}

/**
 * Sorting parameters schema
 */
export const sortingSchema = z.object({
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export type SortingParams = z.infer<typeof sortingSchema>

/**
 * Parse sorting parameters from request URL
 */
export function parseSortingParams(request: Request, defaultOrderBy?: string): SortingParams {
  const { searchParams } = new URL(request.url)

  return sortingSchema.parse({
    orderBy: searchParams.get('orderBy') || defaultOrderBy,
    order: searchParams.get('order') || 'desc',
  })
}

/**
 * Build Prisma orderBy clause from sorting params
 */
export function buildPrismaOrderBy(params: SortingParams): Record<string, 'asc' | 'desc'> | undefined {
  if (!params.orderBy) return undefined

  return {
    [params.orderBy]: params.order,
  }
}

/**
 * Combined pagination and sorting schema
 */
export const listQuerySchema = paginationSchema.merge(sortingSchema).extend({
  search: z.string().optional(),
})

export type ListQueryParams = z.infer<typeof listQuerySchema>

/**
 * Parse all list query parameters
 */
export function parseListQueryParams(request: Request, defaultOrderBy?: string): ListQueryParams {
  const { searchParams } = new URL(request.url)

  return listQuerySchema.parse({
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 20,
    orderBy: searchParams.get('orderBy') || defaultOrderBy,
    order: searchParams.get('order') || 'desc',
    search: searchParams.get('search') || undefined,
  })
}

/**
 * Build search clause for Prisma (OR search across multiple fields)
 */
export function buildSearchClause(
  search: string | undefined,
  fields: string[]
): { OR?: Record<string, { contains: string; mode: 'insensitive' }>[] } | undefined {
  if (!search || search.trim() === '') return undefined

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: search,
        mode: 'insensitive' as const,
      },
    })),
  }
}
