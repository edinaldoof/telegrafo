import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './service';
import { AuthUser, Permission } from './types';
import { hasPermission } from './permissions';
import { AppError } from '@/lib/observability/errors';
import { logger } from '@/lib/observability/log';

export interface AuthRequest extends NextRequest {
  auth?: {
    user: AuthUser;
    requestId: string;
  };
}

export type AuthenticatedRouteHandler = (
  req: AuthRequest,
  params?: Record<string, any>
) => Promise<Response> | Response;

export function withAuth(
  handler: AuthenticatedRouteHandler,
  options?: {
    required?: boolean;
    permissions?: Permission[];
    roles?: string[];
  }
): (req: NextRequest, params?: Record<string, any>) => Promise<Response> {
  return async (req: NextRequest, params?: Record<string, any>) => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const context = { requestId, path: new URL(req.url).pathname, method: req.method };

    try {
      let user: AuthUser | null = null;

      // Se auth é obrigatório ou se há permissões/roles requeridos, autenticar
      if (options?.required !== false || options?.permissions || options?.roles) {
        try {
          user = await AuthService.authenticate(req);
          logger.info('auth.success', { ...context, userId: user.id, role: user.role });
        } catch (error) {
          logger.warn('auth.failed', { ...context, error: (error as Error).message });
          throw error;
        }
      } else {
        // Tentar autenticar, mas não falhar se não houver auth
        try {
          user = await AuthService.authenticate(req);
        } catch {
          // Ignorar erro se auth não for obrigatório
        }
      }

      // Validar permissões
      if (user && options?.permissions) {
        const missing = options.permissions.filter((p) => !hasPermission(user!, p));
        if (missing.length > 0) {
          throw new AppError(
            `Permissões insuficientes: ${missing.join(', ')}`,
            403,
            'INSUFFICIENT_PERMISSIONS',
            { missing }
          );
        }
      }

      // Validar roles
      if (user && options?.roles) {
        if (!options.roles.includes(user.role)) {
          throw new AppError(
            `Role insuficiente. Requerido: ${options.roles.join(' ou ')}, possui: ${user.role}`,
            403,
            'INSUFFICIENT_ROLE',
            { required: options.roles, actual: user.role }
          );
        }
      }

      // Adicionar auth ao request
      const authReq = req as AuthRequest;
      if (user) {
        authReq.auth = { user, requestId };
      }

      return handler(authReq, params);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn('auth.error', { ...context, error: error.message, code: error.code });
        return NextResponse.json(
          { error: error.message, code: error.code, details: error.details },
          { status: error.status }
        );
      }
      logger.error('auth.unexpected_error', error, context);
      return NextResponse.json({ error: 'Erro de autenticação' }, { status: 500 });
    }
  };
}

