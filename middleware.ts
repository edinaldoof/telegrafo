import { NextRequest, NextResponse } from 'next/server';

// Simples rate limiter em memória por IP+rota (janela de 60s)
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE || 120);
const WINDOW_MS = 60_000;
const bucket = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(req: NextRequest) {
	const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
	const path = new URL(req.url).pathname;
	return `${ip}:${path}`;
}

export function middleware(req: NextRequest) {
	const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
	const start = Date.now();

	// Rate limiting
	const key = rateLimitKey(req);
	const now = Date.now();
	const current = bucket.get(key);
	if (!current || current.resetAt < now) {
		bucket.set(key, { count: 1, resetAt: now + WINDOW_MS });
	} else {
		current.count += 1;
		if (current.count > RATE_LIMIT) {
			return new NextResponse(
				JSON.stringify({ error: 'Too Many Requests' }),
				{
					status: 429,
					headers: {
						'content-type': 'application/json',
						'x-request-id': requestId,
						'ratelimit-limit': String(RATE_LIMIT),
						'ratelimit-remaining': '0',
						'ratelimit-reset': String(Math.ceil((current.resetAt - now) / 1000)),
					},
				}
			);
		}
	}

	const res = NextResponse.next({ headers: { 'x-request-id': requestId } });
	const duration = Date.now() - start;
	res.headers.set('server-timing', `total;dur=${duration}`);
	return res;
}

export const config = {
	matcher: ['/api/:path*'],
};


