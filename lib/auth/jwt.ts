/**
 * JWT Authentication Module
 *
 * Provides JWT token generation, validation, and refresh functionality.
 * Uses jose library for modern, secure JWT handling.
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { config } from '@/lib/config'
import { Role, Permission, AuthUser } from './types'
import { getPermissionsForRole } from './permissions'
import { AppError } from '@/lib/observability/errors'

// JWT Configuration
const JWT_ALGORITHM = 'HS256'
const ACCESS_TOKEN_EXPIRY = '15m' // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d' // 7 days

interface JWTConfig {
  secret: Uint8Array
  issuer: string
  audience: string
}

interface TokenPayload extends JWTPayload {
  sub: string // User ID
  role: Role
  type: 'access' | 'refresh'
}

interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Get JWT configuration from environment
 */
function getJWTConfig(): JWTConfig {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    if (config.isProduction) {
      throw new AppError('JWT_SECRET must be set in production', 500, 'JWT_NOT_CONFIGURED')
    }
    // Development fallback - warn but continue
    console.warn('⚠️ JWT_SECRET not set. Using insecure default for development.')
  }

  const secretKey = secret || 'dev-jwt-secret-change-in-production-min-32-chars'

  return {
    secret: new TextEncoder().encode(secretKey),
    issuer: process.env.JWT_ISSUER || 'telegrafo',
    audience: process.env.JWT_AUDIENCE || 'telegrafo-api',
  }
}

/**
 * Generate an access token
 */
export async function generateAccessToken(userId: string, role: Role): Promise<string> {
  const { secret, issuer, audience } = getJWTConfig()

  const token = await new SignJWT({
    role,
    type: 'access',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(userId)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret)

  return token
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(userId: string, role: Role): Promise<string> {
  const { secret, issuer, audience } = getJWTConfig()

  const token = await new SignJWT({
    role,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(userId)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret)

  return token
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(userId: string, role: Role): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId, role),
    generateRefreshToken(userId, role),
  ])

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  }
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const { secret, issuer, audience } = getJWTConfig()

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer,
      audience,
    })

    return payload as TokenPayload
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new AppError('Token expirado', 401, 'TOKEN_EXPIRED')
      }
      if (error.message.includes('signature')) {
        throw new AppError('Token inválido', 401, 'INVALID_TOKEN')
      }
    }
    throw new AppError('Falha na verificação do token', 401, 'TOKEN_VERIFICATION_FAILED')
  }
}

/**
 * Validate a JWT token and return AuthUser
 */
export async function validateJWT(token: string): Promise<AuthUser> {
  const payload = await verifyToken(token)

  if (payload.type !== 'access') {
    throw new AppError('Tipo de token inválido. Use um access token.', 401, 'INVALID_TOKEN_TYPE')
  }

  if (!payload.sub || !payload.role) {
    throw new AppError('Token malformado', 401, 'MALFORMED_TOKEN')
  }

  return {
    id: payload.sub,
    role: payload.role,
    permissions: getPermissionsForRole(payload.role),
  }
}

/**
 * Refresh tokens using a valid refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const payload = await verifyToken(refreshToken)

  if (payload.type !== 'refresh') {
    throw new AppError('Tipo de token inválido. Use um refresh token.', 401, 'INVALID_TOKEN_TYPE')
  }

  if (!payload.sub || !payload.role) {
    throw new AppError('Token malformado', 401, 'MALFORMED_TOKEN')
  }

  // Generate new token pair
  return generateTokenPair(payload.sub, payload.role)
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Check if a token is about to expire (within 5 minutes)
 */
export async function isTokenExpiringSoon(token: string): Promise<boolean> {
  try {
    const payload = await verifyToken(token)
    if (!payload.exp) return false

    const expiresAt = payload.exp * 1000 // Convert to milliseconds
    const fiveMinutes = 5 * 60 * 1000
    return expiresAt - Date.now() < fiveMinutes
  } catch {
    return true // If we can't verify, consider it expiring
  }
}
