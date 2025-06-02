import { hash, verify } from "argon2"
import { db } from "../../db"
import { users, applications, usersToRoles, roles } from "../../db/schema"
import { eq, and } from "drizzle-orm"

export const createUser = async (data: Omit<typeof users.$inferInsert, 'createdAt' | 'updatedAt' | 'id'>) => {
  const hashedPassword = await hash(data.password)
  const result = await db.insert(users).values({
    ...data,
    password: hashedPassword
  }).returning({
    id: users.id,
    applicationId: users.applicationId,
    email: users.email,
    name: users.name,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt
  })
  return result[0]
}


export const getUsersByApplicationId = async ({ applicationId }: { applicationId: string }) => {
  // SELECT id, email, name, createdAt, updatedAt FROM users WHERE applicationId = ?
  const results = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users).where(
    eq(users.applicationId, applicationId)
  )
  return results
}


export const assignRoleToUser = async (data: typeof usersToRoles.$inferInsert) => {
  const result = await db.insert(usersToRoles).values(data).returning()
  return result[0]
}


export const getUserByEmail = async (
  {
    applicationId,
    email,
    password
  }: {
    applicationId: string,
    email: string,
    password: string
  }
) => {

  const result = await db
    // SELECT id, email, name, applicationId, createdAt, roles 
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      applicationId: users.applicationId,

      password: users.password,
      permissions: roles.permissions,
      createdAt: users.createdAt,
    })
    // FROM users
    .from(users)
    // WHERE applicationId = ? AND email = ?
    .where(
      and(
        eq(users.applicationId, applicationId),
        eq(users.email, email)
      )
    )
    // LEFT JOIN usersToRoles ON users.id = usersToRoles.userId
    .leftJoin(
      usersToRoles,
      eq(users.id, usersToRoles.userId)
    )
    // LEFT JOIN roles ON usersToRoles.roleId = roles.id 
    // AND usersToRoles.applicationId = roles.applicationId
    .leftJoin(
      roles,
      and(
        eq(usersToRoles.roleId, roles.id),
        eq(usersToRoles.applicationId, roles.applicationId)
      )
    )

  // If no user is found, return null
  if (!result.length) return null



  const user = result.reduce(
    (acc, curr) => {

      if (!acc.id) return {
        ...curr,
        permissions: new Set(curr.permissions)
      }

      if (!curr.permissions) return acc


      for (const p of curr.permissions) {
        acc.permissions.add(p)
      }

      return acc
    },
    {} as Omit<(typeof result)[number], 'permissions'> & { permissions: Set<string> }
  )

  const passwordVerified = await verify(user.password, password)

  if (!passwordVerified) return null // <- if the password is incorrect, return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    applicationId: user.applicationId,
    permissions: Array.from(user.permissions),
    createdAt: user.createdAt,
  }
}

