export const ALL_PERMISSIONS = [
  // MARK: users
  "users:roles:write", // <- Allowed to add a role to a user
  "users:roles:delete", // <- Allowed to delete a user's role
  // MARK: posts
  "posts:write",
  "posts:read",
  "posts:delete",
  "posts:edit-own",
  // MARK: roles
  "roles:write",
  "roles:read",
  "roles:delete"
] as const



export const PERMISSIONS = ALL_PERMISSIONS.reduce((acc, permission) => {
  acc[permission] = permission
  return acc
}, {} as Record<typeof ALL_PERMISSIONS[number], typeof ALL_PERMISSIONS[number]>)



export const USER_ROLE_PERMISSIONS = [
  PERMISSIONS["posts:write"],
  PERMISSIONS["posts:read"]
]

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  APPLICATION_USER: 'APPLICATION_USER',
} 