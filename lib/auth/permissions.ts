import { Role, Permission } from './types';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'contatos:read',
    'contatos:write',
    'contatos:delete',
    'grupos:read',
    'grupos:write',
    'grupos:delete',
    'mensagens:read',
    'mensagens:write',
    'mensagens:delete',
    'instances:read',
    'instances:write',
    'instances:delete',
    'config:read',
    'config:write',
  ],
  user: [
    'contatos:read',
    'contatos:write',
    'grupos:read',
    'grupos:write',
    'mensagens:read',
    'mensagens:write',
    'instances:read',
    'instances:write',
    'config:read',
  ],
  viewer: [
    'contatos:read',
    'grupos:read',
    'mensagens:read',
    'instances:read',
    'config:read',
  ],
  api: [
    'contatos:read',
    'contatos:write',
    'grupos:read',
    'grupos:write',
    'mensagens:read',
    'mensagens:write',
    'instances:read',
    'instances:write',
  ],
};

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(user: { permissions: Permission[] }, permission: Permission): boolean {
  return user.permissions.includes(permission);
}

export function requirePermission(user: { permissions: Permission[] }, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

