import { and, eq } from "drizzle-orm"
import { db } from "../../db"
import { roles } from "../../db/schema"


export const createRole = async (data: Omit<typeof roles.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) => {
  const result = await db.insert(roles).values(data).returning()
  return result[0] // <- return the first item because we only inserted one role 
}


export const getRoleByName = async ({ name, applicationId }: { name: string, applicationId: string }) => {
  // SELECT * FROM roles 
  // WHERE name = ? AND applicationId = ?
  const result = await db.select().from(roles).where(
    and(
      eq(roles.name, name),
      eq(roles.applicationId, applicationId)
    )
  ).limit(1)
  if (result.length === 0) return null
  return result[0]

}