import { AuthUser, Role } from './types';
import { getPermissionsForRole } from './permissions';
import { AppError } from '@/lib/observability/errors';
import { config } from '@/lib/config';
import { validateJWT, generateTokenPair, refreshTokens } from './jwt';

const API_KEY_PREFIX = 'sk_';

interface ApiKeyConfig {
  key: string;
  role: Role;
  metadata?: Record<string, unknown>;
}

/**
 * Get configured API keys from environment variables.
 * In production, API keys MUST be set - no defaults allowed.
 * Returns only valid, non-empty API keys.
 */
function getApiKeys(): ApiKeyConfig[] {
  const keys: ApiKeyConfig[] = [];
  const { adminApiKey, apiKey } = config.security;

  // Admin API key
  if (adminApiKey && adminApiKey.startsWith(API_KEY_PREFIX)) {
    keys.push({
      key: adminApiKey,
      role: 'admin',
    });
  } else if (config.isProduction) {
    console.error('❌ ADMIN_API_KEY not configured or invalid. Admin API access disabled.');
  } else if (config.isDevelopment && !adminApiKey) {
    console.warn('⚠️ ADMIN_API_KEY not set. Set ADMIN_API_KEY in .env.local for admin access.');
  }

  // Regular API key
  if (apiKey && apiKey.startsWith(API_KEY_PREFIX)) {
    keys.push({
      key: apiKey,
      role: 'api',
    });
  } else if (config.isProduction) {
    console.error('❌ API_KEY not configured or invalid. API access disabled.');
  } else if (config.isDevelopment && !apiKey) {
    console.warn('⚠️ API_KEY not set. Set API_KEY in .env.local for API access.');
  }

  return keys;
}

export class AuthService {
  static async validateApiKey(apiKey: string | null): Promise<AuthUser> {
    if (!apiKey) {
      throw new AppError('API key é obrigatória', 401, 'UNAUTHORIZED');
    }

    if (!apiKey.startsWith(API_KEY_PREFIX)) {
      throw new AppError('Formato de API key inválido', 401, 'INVALID_API_KEY');
    }

    const apiKeys = getApiKeys();

    if (apiKeys.length === 0) {
      throw new AppError(
        'Nenhuma API key configurada. Configure ADMIN_API_KEY e/ou API_KEY nas variáveis de ambiente.',
        503,
        'NO_API_KEYS_CONFIGURED'
      );
    }

    const keyConfig = apiKeys.find((k) => k.key === apiKey);
    if (!keyConfig) {
      throw new AppError('API key inválida', 401, 'INVALID_API_KEY');
    }

    return {
      id: 'api',
      role: keyConfig.role,
      permissions: getPermissionsForRole(keyConfig.role),
      metadata: keyConfig.metadata,
    };
  }

  static async validateBearerToken(token: string | null): Promise<AuthUser> {
    if (!token) {
      throw new AppError('Bearer token é obrigatório', 401, 'UNAUTHORIZED');
    }

    // Check if it's an API key (starts with sk_)
    if (token.startsWith(API_KEY_PREFIX)) {
      return this.validateApiKey(token);
    }

    // Otherwise, treat as JWT
    return validateJWT(token);
  }

  static async validateSession(sessionId: string | null): Promise<AuthUser> {
    if (!sessionId) {
      throw new AppError('Session ID é obrigatório', 401, 'UNAUTHORIZED');
    }

    // Session validation requires a Session model in the database.
    // For now, sessions are not fully implemented - use JWT tokens instead.
    // TODO: Implement session model in Prisma schema when needed:
    // model Session {
    //   id        String   @id @default(cuid())
    //   userId    String
    //   expiresAt DateTime
    //   user      User     @relation(fields: [userId], references: [id])
    // }

    throw new AppError(
      'Autenticação por sessão não está habilitada. Use JWT tokens (Bearer) ou API keys.',
      501,
      'SESSION_NOT_IMPLEMENTED'
    );
  }

  /**
   * Login with username/password and return JWT tokens
   */
  static async login(username: string, password: string): Promise<{
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Check admin credentials from environment
    const { adminUsername, adminPassword } = config.security;

    if (adminUsername && adminPassword && username === adminUsername && password === adminPassword) {
      const tokens = await generateTokenPair('admin', 'admin');
      return {
        user: {
          id: 'admin',
          role: 'admin',
          permissions: getPermissionsForRole('admin'),
        },
        ...tokens,
      };
    }

    // TODO: Check database users when user model is available
    throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  /**
   * Refresh authentication tokens
   */
  static async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    return refreshTokens(refreshToken);
  }

  static extractAuthFromRequest(request: Request): {
    apiKey: string | null;
    bearerToken: string | null;
    sessionId: string | null;
  } {
    const headers = request.headers;
    const apiKey = headers.get('x-api-key') || headers.get('apikey');
    const authorization = headers.get('authorization');
    let bearerToken: string | null = null;

    if (authorization?.startsWith('Bearer ')) {
      bearerToken = authorization.slice(7);
    }

    // Extrair session ID de cookies se necessário
    const cookies = headers.get('cookie');
    const sessionId = cookies
      ? cookies.split(';').find((c) => c.trim().startsWith('session='))?.split('=')[1] || null
      : null;

    return { apiKey, bearerToken, sessionId };
  }

  static async authenticate(request: Request): Promise<AuthUser> {
    const { apiKey, bearerToken, sessionId } = this.extractAuthFromRequest(request);

    // Tentar API key primeiro
    if (apiKey) {
      return this.validateApiKey(apiKey);
    }

    // Tentar Bearer token
    if (bearerToken) {
      return this.validateBearerToken(bearerToken);
    }

    // Tentar sessão
    if (sessionId) {
      return this.validateSession(sessionId);
    }

    throw new AppError('Nenhum método de autenticação fornecido', 401, 'NO_AUTH');
  }
}

