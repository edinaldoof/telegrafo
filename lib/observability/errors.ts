export class AppError extends Error {
	status: number;
	code?: string;
	details?: unknown;

	constructor(message: string, status = 500, code?: string, details?: unknown) {
		super(message);
		this.name = 'AppError';
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError || (typeof error === 'object' && error !== null && 'status' in error);
}


