export function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init)
}

export function jsonHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-request-id': 'test-req-1'
  }
  if (apiKey) headers['x-api-key'] = apiKey
  return headers
}


