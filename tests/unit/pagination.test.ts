import { describe, it, expect } from 'vitest'
import {
  parsePaginationParams,
  getPrismaSkipTake,
  createPaginatedResponse,
  buildSearchClause,
  parseListQueryParams,
} from '@/lib/utils/pagination'

describe('pagination', () => {
  describe('getPrismaSkipTake', () => {
    it('should calculate correct skip and take for page 1', () => {
      const result = getPrismaSkipTake({ page: 1, limit: 20 })
      expect(result).toEqual({ skip: 0, take: 20 })
    })

    it('should calculate correct skip and take for page 2', () => {
      const result = getPrismaSkipTake({ page: 2, limit: 20 })
      expect(result).toEqual({ skip: 20, take: 20 })
    })

    it('should handle different limit values', () => {
      const result = getPrismaSkipTake({ page: 3, limit: 10 })
      expect(result).toEqual({ skip: 20, take: 10 })
    })
  })

  describe('createPaginatedResponse', () => {
    it('should create correct response for first page', () => {
      const data = [{ id: 1 }, { id: 2 }]
      const result = createPaginatedResponse(data, 50, { page: 1, limit: 20 })

      expect(result.data).toEqual(data)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      })
    })

    it('should create correct response for middle page', () => {
      const data = [{ id: 21 }]
      const result = createPaginatedResponse(data, 50, { page: 2, limit: 20 })

      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPreviousPage).toBe(true)
    })

    it('should create correct response for last page', () => {
      const data = [{ id: 41 }]
      const result = createPaginatedResponse(data, 50, { page: 3, limit: 20 })

      expect(result.pagination.hasNextPage).toBe(false)
      expect(result.pagination.hasPreviousPage).toBe(true)
    })

    it('should handle empty results', () => {
      const result = createPaginatedResponse([], 0, { page: 1, limit: 20 })

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
      expect(result.pagination.hasNextPage).toBe(false)
    })
  })

  describe('buildSearchClause', () => {
    it('should return undefined for empty search', () => {
      expect(buildSearchClause('', ['name'])).toBeUndefined()
      expect(buildSearchClause(undefined, ['name'])).toBeUndefined()
      expect(buildSearchClause('   ', ['name'])).toBeUndefined()
    })

    it('should build OR clause for multiple fields', () => {
      const result = buildSearchClause('test', ['name', 'email'])

      expect(result).toHaveProperty('OR')
      expect(result?.OR).toHaveLength(2)
      expect(result?.OR?.[0]).toHaveProperty('name')
      expect(result?.OR?.[1]).toHaveProperty('email')
    })

    it('should include contains and mode insensitive', () => {
      const result = buildSearchClause('test', ['name'])

      expect(result?.OR?.[0]).toEqual({
        name: {
          contains: 'test',
          mode: 'insensitive',
        },
      })
    })
  })

  describe('parsePaginationParams', () => {
    it('should parse valid params from request', () => {
      const request = new Request('http://localhost?page=2&limit=30')
      const result = parsePaginationParams(request)

      expect(result).toEqual({ page: 2, limit: 30 })
    })

    it('should use defaults for missing params', () => {
      const request = new Request('http://localhost')
      const result = parsePaginationParams(request)

      expect(result).toEqual({ page: 1, limit: 20 })
    })

    it('should coerce string values to numbers', () => {
      const request = new Request('http://localhost?page=5&limit=50')
      const result = parsePaginationParams(request)

      expect(result.page).toBe(5)
      expect(result.limit).toBe(50)
    })
  })

  describe('parseListQueryParams', () => {
    it('should parse all query params', () => {
      const request = new Request('http://localhost?page=2&limit=10&search=test&orderBy=name&order=asc')
      const result = parseListQueryParams(request)

      expect(result).toEqual({
        page: 2,
        limit: 10,
        search: 'test',
        orderBy: 'name',
        order: 'asc',
      })
    })

    it('should use default orderBy when provided', () => {
      const request = new Request('http://localhost')
      const result = parseListQueryParams(request, 'createdAt')

      expect(result.orderBy).toBe('createdAt')
      expect(result.order).toBe('desc')
    })
  })
})
