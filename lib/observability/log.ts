/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
	requestId?: string;
	path?: string;
	method?: string;
	userId?: string | number;
	duration?: number;
	statusCode?: number;
	service?: string;
	[key: string]: unknown;
}

// Sensitive keys to mask in logs
const SENSITIVE_KEYS = [
	'password',
	'token',
	'apiKey',
	'api_key',
	'secret',
	'authorization',
	'auth',
	'credential',
	'private',
];

/**
 * Get minimum log level based on environment
 */
function getMinLogLevel(): LogLevel {
	const env = process.env.NODE_ENV || 'development';
	const configuredLevel = process.env.LOG_LEVEL as LogLevel | undefined;

	if (configuredLevel) return configuredLevel;
	return env === 'production' ? 'info' : 'debug';
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
	const minLevel = getMinLogLevel();
	return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

/**
 * Mask sensitive data in objects
 */
function maskSensitiveData(obj: unknown, depth = 0): unknown {
	// Prevent deep recursion
	if (depth > 10) return '[MAX_DEPTH_REACHED]';

	if (obj === null || obj === undefined) return obj;

	if (typeof obj === 'string') {
		// Mask if it looks like a token or key
		if (obj.length > 20 && /^(sk_|pk_|Bearer |eyJ)/.test(obj)) {
			return obj.slice(0, 8) + '****' + obj.slice(-4);
		}
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => maskSensitiveData(item, depth + 1));
	}

	if (typeof obj === 'object') {
		const masked: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			const lowerKey = key.toLowerCase();
			if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
				masked[key] = typeof value === 'string' && value.length > 4
					? value.slice(0, 2) + '****'
					: '****';
			} else {
				masked[key] = maskSensitiveData(value, depth + 1);
			}
		}
		return masked;
	}

	return obj;
}

/**
 * Format log entry as JSON
 */
function format(level: LogLevel, message: string, context?: LogContext, error?: unknown): string {
	const base: Record<string, unknown> = {
		level,
		message,
		timestamp: new Date().toISOString(),
		env: process.env.NODE_ENV || 'development',
	};

	// Add masked context
	if (context) {
		const maskedContext = maskSensitiveData(context) as LogContext;
		Object.assign(base, maskedContext);
	}

	// Add error details
	if (error) {
		const err = error as Error & { cause?: unknown; code?: string; status?: number };
		const errorInfo: Record<string, unknown> = {
			name: err?.name,
			message: err?.message,
			code: err?.code,
			status: err?.status,
		};

		// Only include stack in non-production
		if (process.env.NODE_ENV !== 'production' && err?.stack) {
			errorInfo.stack = err.stack;
		}

		if (err?.cause) {
			errorInfo.cause = String(err.cause);
		}

		base.error = errorInfo;
	}

	return JSON.stringify(base);
}

/**
 * Structured logger with sensitive data masking and level filtering
 */
export const logger = {
	debug(message: string, context?: LogContext) {
		if (shouldLog('debug')) {
			console.debug(format('debug', message, context));
		}
	},

	info(message: string, context?: LogContext) {
		if (shouldLog('info')) {
			console.info(format('info', message, context));
		}
	},

	warn(message: string, context?: LogContext) {
		if (shouldLog('warn')) {
			console.warn(format('warn', message, context));
		}
	},

	error(message: string, error?: unknown, context?: LogContext) {
		if (shouldLog('error')) {
			console.error(format('error', message, context, error));
		}
	},

	/**
	 * Log HTTP request start
	 */
	requestStart(request: Request, requestId?: string) {
		const { pathname } = new URL(request.url);
		this.info('Request started', {
			requestId,
			method: request.method,
			path: pathname,
		});
	},

	/**
	 * Log HTTP request end with duration
	 */
	requestEnd(request: Request, statusCode: number, duration: number, requestId?: string) {
		const { pathname } = new URL(request.url);
		const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
		this[level]('Request completed', {
			requestId,
			method: request.method,
			path: pathname,
			statusCode,
			duration,
		});
	},

	/**
	 * Create a child logger with default context
	 */
	child(defaultContext: LogContext) {
		return {
			debug: (message: string, context?: LogContext) =>
				logger.debug(message, { ...defaultContext, ...context }),
			info: (message: string, context?: LogContext) =>
				logger.info(message, { ...defaultContext, ...context }),
			warn: (message: string, context?: LogContext) =>
				logger.warn(message, { ...defaultContext, ...context }),
			error: (message: string, error?: unknown, context?: LogContext) =>
				logger.error(message, error, { ...defaultContext, ...context }),
		};
	},

	/**
	 * Time an async operation
	 */
	async time<T>(label: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
		const start = Date.now();
		try {
			const result = await fn();
			this.debug(`${label} completed`, {
				...context,
				duration: Date.now() - start,
			});
			return result;
		} catch (error) {
			this.error(`${label} failed`, error, {
				...context,
				duration: Date.now() - start,
			});
			throw error;
		}
	},
};


