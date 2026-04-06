// lib/auth/permissions.ts

import { OrganizationRole, ROLES } from '../constants'

type Action = 
  | 'org:update'
  | 'org:delete'
  | 'org:transfer'
  | 'member:invite'
  | 'member:remove'
  | 'member:update'
  | 'project:create'
  | 'project:update'
  | 'project:delete'

const PERMISSIONS: Record<OrganizationRole, Action[]> = {
  [ROLES.OWNER]: [
    'org:update',
    'org:delete',
    'org:transfer',
    'member:invite',
    'member:remove',
    'member:update',
    'project:create',
    'project:update',
    'project:delete',
  ],
  [ROLES.ADMIN]: [
    'org:update',
    'member:invite',
    'member:remove',
    'member:update',
    'project:create',
    'project:update',
    'project:delete',
  ],
  [ROLES.MEMBER]: [
    'project:create',
    'project:update',
  ],
}

export function hasPermission(role: OrganizationRole, action: Action): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false
}

export function can(role: OrganizationRole, action: Action): boolean {
  return hasPermission(role, action)
}
