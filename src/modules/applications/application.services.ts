import { db } from "../../db"
import { applications } from "../../db/schema"


export const createApplication = async (data: Omit<typeof applications.$inferInsert, 'createdAt' | 'updatedAt' | 'id'>) => {
  const result = await db.insert(applications).values(data).returning()
  return result[0] // <- return the first item because we only inserted one application 
}

export const getApplications = async () => {
  //? SELECT * FROM applications
  // const result = await db.select().from(applications)
  //? SELECT id, name, createdAt FROM applications
  const result = await db.select({
    id: applications.id,
    name: applications.name,
    createdAt: applications.createdAt,
  }).from(applications)
  return result
}