export type Role = 'admin' | 'user' | 'viewer' | 'api';

export type Permission = 
  | 'contatos:read'
  | 'contatos:write'
  | 'contatos:delete'
  | 'grupos:read'
  | 'grupos:write'
  | 'grupos:delete'
  | 'mensagens:read'
  | 'mensagens:write'
  | 'mensagens:delete'
  | 'instances:read'
  | 'instances:write'
  | 'instances:delete'
  | 'config:read'
  | 'config:write';

export interface AuthUser {
  id: string | number;
  role: Role;
  permissions: Permission[];
  metadata?: Record<string, unknown>;
}

export interface AuthContext {
  user: AuthUser;
  requestId: string;
}

