import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './log';
import { AppError, isAppError } from './errors';
import { withAuth, AuthenticatedRouteHandler, AuthRequest } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/types';

export type { AuthRequest };

export type RouteHandler = (req: NextRequest, params?: Record<string, any>) => Promise<Response> | Response;

export function json(data: unknown, init?: ResponseInit) {
	return NextResponse.json(data, init);
}

export function withErrorHandling(handler: RouteHandler): RouteHandler {
	return async (req: NextRequest, params?: Record<string, any>) => {
		const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
		const context = { requestId, path: new URL(req.url).pathname, method: req.method };

		const start = Date.now();
		try {
			const res = await handler(req, params);
			const durationMs = Date.now() - start;
			logger.info('request.success', { ...context, durationMs });
			return res;
		} catch (error) {
			const durationMs = Date.now() - start;
			if (error instanceof ZodError) {
				logger.warn('request.validation_error', { ...context, durationMs, issues: error.issues as unknown });
				return json({ error: 'Dados inválidos', details: error.issues }, { status: 400 });
			}
			if (isAppError(error)) {
				const appErr = error as AppError;
				logger.warn('request.app_error', { ...context, durationMs, errorCode: appErr.code, errorMessage: appErr.message });
				return json({ error: appErr.message, code: appErr.code, details: appErr.details }, { status: appErr.status });
			}
			logger.error('request.unexpected_error', error, { ...context, durationMs });
			return json({ error: 'Erro interno do servidor' }, { status: 500 });
		}
	};
}

export function withAuthAndErrorHandling(
	handler: AuthenticatedRouteHandler,
	options?: {
		required?: boolean;
		permissions?: Permission[];
		roles?: string[];
	}
): (req: NextRequest, params?: Record<string, any>) => Promise<Response> {
	return withErrorHandling(withAuth(handler, options)) as (req: NextRequest, params?: Record<string, any>) => Promise<Response>;
}


